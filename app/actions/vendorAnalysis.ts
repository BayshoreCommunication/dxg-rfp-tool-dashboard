"use server";
import { BACKEND_URL } from "@/lib/config";
import { getBackendAccessToken } from "@/lib/server/backendSession";

type Result<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };

const safeMessages: Record<string, string> = {
  VENDOR_ANALYSIS_DISABLED:
    "Vendor response analysis is not enabled for this environment yet.",
  ANALYSIS_RUN_NOT_FOUND: "This response has not been analyzed yet.",
  VENDOR_RESPONSE_NOT_FOUND: "This vendor response could not be found.",
  PROPOSAL_NOT_FOUND: "The proposal for this response could not be found.",
  VENDOR_EVIDENCE_EMPTY:
    "This response has no analyzable text or scanned documents.",
  AUTHORIZATION_DENIED: "You do not have permission to perform this action.",
};

export type VendorAnalysisJob = {
  jobId: string;
  runId: string;
  statusUrl: string;
  resultUrl: string;
};
export type VendorFindingKind =
  | "compliance"
  | "pricing_flag"
  | "production_flag"
  | "vendor_question";
export type VendorVerdict = "addressed" | "partial" | "missing" | "not_applicable" | null;
export type VendorAnalysisFinding = {
  ordinal: number;
  kind: VendorFindingKind;
  requirementPath: string | null;
  requirementLabel: string | null;
  verdict: VendorVerdict;
  message: string;
  confidence: number;
  needsHumanReview: boolean;
  citations: unknown[];
};
export type VendorAnalysisRun = {
  runId: string;
  status: string;
  provider: string | null;
  model: string | null;
  requirementCount: number;
  findingCount: number;
  escalationCount: number;
  safeErrorCode: string | null;
  createdAt: string;
  completedAt: string | null;
};
export type VendorAnalysisResult = {
  run: VendorAnalysisRun;
  findings: VendorAnalysisFinding[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const count = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};
const kinds: VendorFindingKind[] = [
  "compliance",
  "pricing_flag",
  "production_flag",
  "vendor_question",
];
const verdicts = ["addressed", "partial", "missing", "not_applicable"] as const;

const parseAnalysis = (value: unknown): VendorAnalysisResult | null => {
  if (!isRecord(value) || !isRecord(value.run)) return null;
  const run = value.run;
  return {
    run: {
      runId: String(run.runId ?? ""),
      status: String(run.status ?? ""),
      provider: typeof run.provider === "string" ? run.provider : null,
      model: typeof run.model === "string" ? run.model : null,
      requirementCount: count(run.requirementCount),
      findingCount: count(run.findingCount),
      escalationCount: count(run.escalationCount),
      safeErrorCode: typeof run.safeErrorCode === "string" ? run.safeErrorCode : null,
      createdAt: String(run.createdAt ?? ""),
      completedAt: typeof run.completedAt === "string" ? run.completedAt : null,
    },
    findings: (Array.isArray(value.findings) ? value.findings : []).flatMap((item) => {
      if (!isRecord(item) || typeof item.message !== "string") return [];
      return [
        {
          ordinal: count(item.ordinal),
          kind: kinds.includes(item.kind as VendorFindingKind)
            ? (item.kind as VendorFindingKind)
            : "compliance",
          requirementPath: typeof item.requirementPath === "string" ? item.requirementPath : null,
          requirementLabel:
            typeof item.requirementLabel === "string" ? item.requirementLabel : null,
          verdict: verdicts.includes(item.verdict as (typeof verdicts)[number])
            ? (item.verdict as VendorVerdict)
            : null,
          message: item.message,
          confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : 0,
          needsHumanReview: item.needsHumanReview === true,
          citations: Array.isArray(item.citations) ? item.citations : [],
        },
      ];
    }),
  };
};

const call = async <T,>(
  path: string,
  init: RequestInit | undefined,
  parse: (value: unknown) => T | null,
): Promise<Result<T>> => {
  const token = await getBackendAccessToken();
  if (!token)
    return { success: false, code: "AUTHENTICATION_REQUIRED", message: "Your session expired." };
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Correlation-ID": crypto.randomUUID(),
        ...(init?.headers ?? {}),
      },
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const code = String(body.code || `HTTP_${response.status}`);
      return {
        success: false,
        code,
        message:
          safeMessages[code] ?? String(body.title || "The analysis could not be completed safely."),
      };
    }
    const data = parse(body.data);
    return data
      ? { success: true, data }
      : { success: false, code: "INVALID_RESPONSE", message: "The service returned an unexpected response." };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      message: "The analysis service could not be reached.",
    };
  }
};

export const createVendorAnalysisJobAction = async (
  responseId: string,
  proposalId: string,
  idempotencyKey: string,
): Promise<Result<VendorAnalysisJob>> =>
  call(
    `/api/v1/vendor-responses/${encodeURIComponent(responseId)}/analysis-jobs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ proposalId }),
    },
    (value) =>
      isRecord(value) && typeof value.jobId === "string" && typeof value.runId === "string"
        ? {
            jobId: value.jobId,
            runId: value.runId,
            statusUrl: String(value.statusUrl ?? ""),
            resultUrl: String(value.resultUrl ?? ""),
          }
        : null,
  );

export const getLatestVendorAnalysisAction = async (
  responseId: string,
  proposalId: string,
): Promise<Result<VendorAnalysisResult>> =>
  call(
    `/api/v1/vendor-responses/${encodeURIComponent(responseId)}/analysis-runs/latest?proposalId=${encodeURIComponent(proposalId)}`,
    undefined,
    parseAnalysis,
  );
