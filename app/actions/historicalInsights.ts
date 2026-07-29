"use server";

import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

type Result<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };

export type HistoricalProvenance = {
  source: "selected_historical_reference";
  referenceKey: string;
  proposalVersion: number;
};
export type HistoricalComparison = {
  section: string;
  label: string;
  status:
    | "exists_in_both"
    | "reference_only"
    | "current_only"
    | "not_present";
  detail: string;
  referenceKeys: string[];
  provenance: HistoricalProvenance[];
};
export type HistoricalInsight = {
  id: string;
  category: string;
  applicability: "may_apply" | "needs_confirmation";
  title: string;
  detail: string;
  question: string | null;
  affectedSection: string;
  provenance: HistoricalProvenance[];
};
export type HistoricalInsightsReport = {
  id: string;
  analysisVersion: string;
  currentProposalVersion: number;
  references: Array<{
    referenceKey: string;
    label: string;
    proposalVersion: number;
  }>;
  comparisons: HistoricalComparison[];
  insights: HistoricalInsight[];
  privacy: {
    redactedByDefault: boolean;
    exactPricingExcluded: boolean;
    rawContentRetained: boolean;
  };
  createdAt: string;
};

const safeMessages: Record<string, string> = {
  HISTORICAL_INSIGHTS_DISABLED:
    "Historical proposal insights are not enabled for this environment.",
  HISTORICAL_INSIGHTS_NOT_FOUND:
    "No historical proposal comparison exists yet.",
  HISTORICAL_REFERENCE_UNAVAILABLE:
    "A selected proposal is archived, deleted, or no longer accessible. Select active references and try again.",
  HISTORICAL_REFERENCES_REQUIRED:
    "Select at least one historical proposal.",
  HISTORICAL_REFERENCES_INVALID:
    "Select up to five different historical proposals.",
  PROPOSAL_NOT_FOUND: "The current proposal could not be found.",
};

const text = (value: unknown) => (typeof value === "string" ? value : "");
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const list = (value: unknown) => (Array.isArray(value) ? value : []);
const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};
const provenance = (value: unknown): HistoricalProvenance[] =>
  list(value).flatMap((item) => {
    const row = record(item);
    return row.source === "selected_historical_reference" &&
      typeof row.referenceKey === "string"
      ? [{
          source: "selected_historical_reference" as const,
          referenceKey: row.referenceKey,
          proposalVersion: number(row.proposalVersion),
        }]
      : [];
  });

const normalize = (value: unknown): HistoricalInsightsReport => {
  const raw = record(value);
  const statuses: HistoricalComparison["status"][] = [
    "exists_in_both",
    "reference_only",
    "current_only",
    "not_present",
  ];
  return {
    id: text(raw.id),
    analysisVersion: text(raw.analysisVersion),
    currentProposalVersion: number(raw.currentProposalVersion),
    references: list(raw.references).slice(0, 5).flatMap((item) => {
      const row = record(item);
      return typeof row.referenceKey === "string"
        ? [{
            referenceKey: row.referenceKey,
            label: text(row.label) || "Selected reference",
            proposalVersion: number(row.proposalVersion),
          }]
        : [];
    }),
    comparisons: list(raw.comparisons).slice(0, 12).flatMap((item) => {
      const row = record(item);
      if (typeof row.section !== "string" || typeof row.label !== "string")
        return [];
      return [{
        section: row.section,
        label: row.label,
        status: statuses.includes(row.status as HistoricalComparison["status"])
          ? (row.status as HistoricalComparison["status"])
          : ("not_present" as const),
        detail: text(row.detail),
        referenceKeys: list(row.referenceKeys)
          .filter((key): key is string => typeof key === "string")
          .slice(0, 5),
        provenance: provenance(row.provenance),
      }];
    }),
    insights: list(raw.insights).slice(0, 16).flatMap((item) => {
      const row = record(item);
      if (typeof row.id !== "string" || typeof row.title !== "string")
        return [];
      return [{
        id: row.id,
        category: text(row.category),
        applicability:
          row.applicability === "needs_confirmation"
            ? ("needs_confirmation" as const)
            : ("may_apply" as const),
        title: row.title,
        detail: text(row.detail),
        question: typeof row.question === "string" ? row.question : null,
        affectedSection: text(row.affectedSection),
        provenance: provenance(row.provenance),
      }];
    }),
    privacy: {
      redactedByDefault: true,
      exactPricingExcluded: true,
      rawContentRetained: false,
    },
    createdAt: text(raw.createdAt),
  };
};

const parseResponse = async (
  response: Response,
): Promise<Result<HistoricalInsightsReport>> => {
  let payload: Record<string, unknown> = {};
  try {
    payload = record(await response.json());
  } catch {
    // A non-JSON gateway failure still maps to a safe message.
  }
  if (!response.ok) {
    const code = text(payload.code) || "HISTORICAL_INSIGHTS_FAILED";
    return {
      success: false,
      code,
      message:
        safeMessages[code] ||
        "The historical proposal comparison could not be completed.",
    };
  }
  return { success: true, data: normalize(payload.data) };
};

export const generateHistoricalInsightsAction = async (
  proposalId: string,
  referenceProposalIds: string[],
): Promise<Result<HistoricalInsightsReport>> => {
  try {
    const response = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/v1/proposals/${encodeURIComponent(proposalId)}/historical-insights`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceProposalIds }),
        cache: "no-store",
      },
    );
    return parseResponse(response);
  } catch {
    return {
      success: false,
      code: "HISTORICAL_INSIGHTS_UNAVAILABLE",
      message: "The historical proposal comparison is temporarily unavailable.",
    };
  }
};

export const getLatestHistoricalInsightsAction = async (
  proposalId: string,
): Promise<Result<HistoricalInsightsReport>> => {
  try {
    const response = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/v1/proposals/${encodeURIComponent(proposalId)}/historical-insights/latest`,
      { method: "GET", cache: "no-store" },
    );
    return parseResponse(response);
  } catch {
    return {
      success: false,
      code: "HISTORICAL_INSIGHTS_UNAVAILABLE",
      message: "The historical proposal comparison is temporarily unavailable.",
    };
  }
};
