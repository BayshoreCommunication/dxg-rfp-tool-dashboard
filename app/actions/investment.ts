"use server";
import { BACKEND_URL } from "@/lib/config";
import { getBackendAccessToken } from "@/lib/server/backendSession";

type Result<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };

const safeMessages: Record<string, string> = {
  INVESTMENT_GUIDANCE_DISABLED:
    "Investment guidance is not enabled for this environment yet.",
  INVESTMENT_GUIDANCE_NOT_FOUND:
    "No investment guidance has been generated for this proposal yet.",
  PROPOSAL_NOT_FOUND: "This proposal could not be found.",
  AUTHORIZATION_DENIED: "You do not have permission to perform this action.",
};

/** One multiplier the engine applied to a line (regional, union, in-house, …). */
export type InvestmentAppliedFactor = {
  kind: string;
  label: string;
  factor: number;
};
export type InvestmentLineItem = {
  category: string;
  label: string;
  currency: string;
  lowMinor: number;
  midMinor: number;
  highMinor: number;
  /** Engine v2 fields. Legacy reports predate them, so they degrade to null / [] / false. */
  templateKey: string;
  componentKey: string;
  kind: "equipment" | "labor" | null;
  quantity: number | null;
  unitLabel: string | null;
  implied: boolean;
  appliedFactors: InvestmentAppliedFactor[];
  provenance: {
    pricingRecordIds: string[];
    ruleIds: string[];
    drivers: Record<string, number>;
  };
};
export type InvestmentRefusal = { category: string; reason: string; ask: string };
export type InvestmentAncillary = {
  factor: string;
  status: "estimated" | "venue_dependent" | "no_data";
  note: string;
  lowMinor?: number;
  midMinor?: number;
  highMinor?: number;
};
export type InvestmentRecommendation = {
  ruleKey: string;
  title: string;
  guidanceText: string;
  explanation: string;
};
export type InvestmentConfidenceBand = "high" | "medium" | "low";
export type InvestmentConfidenceDeduction = {
  ruleKey: string;
  label: string;
  deduction: number;
  reason: string;
};
export type InvestmentConfidence = {
  score: number;
  band: InvestmentConfidenceBand;
  deductions: InvestmentConfidenceDeduction[];
  note: string;
};
export type InvestmentAssumption = { key: string; label: string; note: string };
export type InvestmentScenario = {
  key: string;
  label: string;
  lowMinor: number;
  midMinor: number;
  highMinor: number;
  basis: string;
};
export type InvestmentBasis = {
  market: string | null;
  regionalFactor: number;
  unionKey: string;
  unionFactor: number;
  inHouseKey: string;
  inHouseFactor: number;
  serviceChargeFactor: number;
  multiDayFactor: number;
  days: number;
  showDayEquipmentBasis: string;
};
export type InvestmentReport = {
  id: string;
  proposalVersion: number;
  engineVersion: string;
  currency: string | null;
  totalLowMinor: number | null;
  totalMidMinor: number | null;
  totalHighMinor: number | null;
  lineItems: InvestmentLineItem[];
  refusals: InvestmentRefusal[];
  ancillary: InvestmentAncillary[];
  recommendations: InvestmentRecommendation[];
  /** Engine v2 reasoning. Legacy reports carry none of it, hence null / []. */
  confidence: InvestmentConfidence | null;
  assumptions: InvestmentAssumption[];
  scenarios: InvestmentScenario[];
  basis: InvestmentBasis | null;
  createdAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const asMinor = (value: unknown): number | null => {
  // Number(null) is 0, which would turn "no total" into "$0". Treat blanks as absent.
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
/** A multiplier we are willing to print. Non-numeric or absurd values collapse to the neutral 1. */
const asFactor = (value: unknown): number => {
  const n = asMinor(value);
  return n !== null && n > 0 && n < 1000 ? n : 1;
};
const text = (value: unknown): string => (typeof value === "string" ? value : "");
const rows = <T,>(value: unknown, parse: (item: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(value) ? value : []).flatMap((item) => {
    if (!isRecord(item)) return [];
    const parsed = parse(item);
    return parsed === null ? [] : [parsed];
  });

const BANDS: InvestmentConfidenceBand[] = ["high", "medium", "low"];
const bandFor = (value: unknown, score: number): InvestmentConfidenceBand => {
  const band = BANDS.find((candidate) => candidate === value);
  // An unrecognised band is re-derived from the score rather than dropped.
  return band ?? (score >= 85 ? "high" : score >= 65 ? "medium" : "low");
};

const parseConfidence = (value: unknown): InvestmentConfidence | null => {
  if (!isRecord(value)) return null;
  const raw = asMinor(value.score);
  if (raw === null) return null;
  const score = Math.round(Math.min(100, Math.max(0, raw)));
  return {
    score,
    band: bandFor(value.band, score),
    deductions: rows(value.deductions, (item) => {
      const deduction = asMinor(item.deduction);
      if (typeof item.label !== "string" || deduction === null) return null;
      return {
        ruleKey: String(item.ruleKey ?? ""),
        label: item.label,
        deduction: Math.max(0, Math.round(deduction)),
        reason: text(item.reason),
      };
    }),
    note: text(value.note),
  };
};

const parseBasis = (value: unknown): InvestmentBasis | null => {
  if (!isRecord(value)) return null;
  const days = asMinor(value.days);
  return {
    market: typeof value.market === "string" && value.market ? value.market : null,
    regionalFactor: asFactor(value.regionalFactor),
    unionKey: text(value.unionKey),
    unionFactor: asFactor(value.unionFactor),
    inHouseKey: text(value.inHouseKey),
    inHouseFactor: asFactor(value.inHouseFactor),
    serviceChargeFactor: asFactor(value.serviceChargeFactor),
    multiDayFactor: asFactor(value.multiDayFactor),
    days: days !== null && days > 0 ? Math.round(days) : 1,
    showDayEquipmentBasis: text(value.showDayEquipmentBasis),
  };
};

const normalize = (raw: unknown): InvestmentReport | null => {
  if (!isRecord(raw)) return null;
  return {
    id: String(raw.id ?? ""),
    proposalVersion: asMinor(raw.proposalVersion) ?? 0,
    engineVersion: String(raw.engineVersion ?? ""),
    currency: typeof raw.currency === "string" && raw.currency ? raw.currency : null,
    totalLowMinor: asMinor(raw.totalLowMinor),
    totalMidMinor: asMinor(raw.totalMidMinor),
    totalHighMinor: asMinor(raw.totalHighMinor),
    lineItems: rows(raw.lineItems, (item) => {
      if (typeof item.label !== "string") return null;
      const provenance = isRecord(item.provenance) ? item.provenance : {};
      const drivers = isRecord(provenance.drivers) ? provenance.drivers : {};
      const quantity = asMinor(item.quantity);
      return {
        category: String(item.category ?? ""),
        label: item.label,
        currency: String(item.currency ?? ""),
        lowMinor: asMinor(item.lowMinor) ?? 0,
        midMinor: asMinor(item.midMinor) ?? 0,
        highMinor: asMinor(item.highMinor) ?? 0,
        templateKey: text(item.templateKey),
        componentKey: text(item.componentKey),
        kind: item.kind === "equipment" || item.kind === "labor" ? item.kind : null,
        quantity: quantity !== null && quantity > 0 ? quantity : null,
        unitLabel: typeof item.unitLabel === "string" && item.unitLabel ? item.unitLabel : null,
        implied: item.implied === true,
        appliedFactors: rows(item.appliedFactors, (factor) =>
          typeof factor.label === "string" && asMinor(factor.factor) !== null
            ? { kind: text(factor.kind), label: factor.label, factor: asFactor(factor.factor) }
            : null,
        ),
        provenance: {
          pricingRecordIds: strings(provenance.pricingRecordIds),
          ruleIds: strings(provenance.ruleIds),
          drivers: Object.fromEntries(
            Object.entries(drivers).flatMap(([name, quantity]) =>
              Number.isFinite(Number(quantity)) ? [[name, Number(quantity)]] : [],
            ),
          ),
        },
      };
    }),
    refusals: rows(raw.refusals, (item) =>
      typeof item.reason === "string" && typeof item.ask === "string"
        ? { category: String(item.category ?? ""), reason: item.reason, ask: item.ask }
        : null,
    ),
    ancillary: rows(raw.ancillary, (item) => {
      if (typeof item.factor !== "string") return null;
      const status = item.status === "estimated" || item.status === "venue_dependent" || item.status === "no_data"
        ? item.status
        : "no_data";
      const low = asMinor(item.lowMinor), mid = asMinor(item.midMinor), high = asMinor(item.highMinor);
      return {
        factor: item.factor,
        status,
        note: String(item.note ?? ""),
        ...(low !== null ? { lowMinor: low } : {}),
        ...(mid !== null ? { midMinor: mid } : {}),
        ...(high !== null ? { highMinor: high } : {}),
      };
    }),
    recommendations: rows(raw.recommendations, (item) =>
      typeof item.title === "string" && typeof item.guidanceText === "string"
        ? {
            ruleKey: String(item.ruleKey ?? ""),
            title: item.title,
            guidanceText: item.guidanceText,
            explanation: String(item.explanation ?? ""),
          }
        : null,
    ),
    confidence: parseConfidence(raw.confidence),
    assumptions: rows(raw.assumptions, (item) =>
      typeof item.label === "string"
        ? { key: String(item.key ?? ""), label: item.label, note: text(item.note) }
        : null,
    ),
    scenarios: rows(raw.scenarios, (item) => {
      const mid = asMinor(item.midMinor);
      if (typeof item.label !== "string" || mid === null) return null;
      return {
        key: String(item.key ?? item.label),
        label: item.label,
        lowMinor: asMinor(item.lowMinor) ?? mid,
        midMinor: mid,
        highMinor: asMinor(item.highMinor) ?? mid,
        basis: text(item.basis),
      };
    }),
    basis: parseBasis(raw.basis),
    createdAt: String(raw.createdAt ?? ""),
  };
};

const call = async (
  proposalId: string,
  init?: RequestInit,
): Promise<Result<InvestmentReport>> => {
  const token = await getBackendAccessToken();
  if (!token)
    return { success: false, code: "AUTHENTICATION_REQUIRED", message: "Your session expired." };
  const suffix = init?.method === "POST" ? "" : "/latest";
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/v1/proposals/${encodeURIComponent(proposalId)}/investment-guidance-reports${suffix}`,
      {
        ...init,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Correlation-ID": crypto.randomUUID(),
          ...(init?.headers ?? {}),
        },
      },
    );
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const code = String(body.code || `HTTP_${response.status}`);
      return {
        success: false,
        code,
        message:
          safeMessages[code] ??
          String(body.title || "Investment guidance could not be completed."),
      };
    }
    const report = normalize(body.data);
    return report
      ? { success: true, data: report }
      : { success: false, code: "INVALID_RESPONSE", message: "The service returned an unexpected response." };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      message: "The investment guidance service could not be reached.",
    };
  }
};

export const generateInvestmentGuidanceAction = async (proposalId: string) =>
  await call(proposalId, { method: "POST" });
export const getLatestInvestmentGuidanceAction = async (proposalId: string) =>
  await call(proposalId);
