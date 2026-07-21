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

export type InvestmentLineItem = {
  category: string;
  label: string;
  currency: string;
  lowMinor: number;
  midMinor: number;
  highMinor: number;
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
  createdAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const asMinor = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const rows = <T,>(value: unknown, parse: (item: Record<string, unknown>) => T | null): T[] =>
  (Array.isArray(value) ? value : []).flatMap((item) => {
    if (!isRecord(item)) return [];
    const parsed = parse(item);
    return parsed === null ? [] : [parsed];
  });

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
      return {
        category: String(item.category ?? ""),
        label: item.label,
        currency: String(item.currency ?? ""),
        lowMinor: asMinor(item.lowMinor) ?? 0,
        midMinor: asMinor(item.midMinor) ?? 0,
        highMinor: asMinor(item.highMinor) ?? 0,
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
