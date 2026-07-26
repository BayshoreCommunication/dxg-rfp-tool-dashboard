"use server";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
type Result<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };
const safeMessages: Record<string, string> = {
  GUIDANCE_DISABLED:
    "Proposal guidance is not enabled for this environment yet.",
  GUIDANCE_NOT_FOUND: "No readiness check has been run for this proposal yet.",
  PROPOSAL_NOT_FOUND: "This proposal could not be found.",
};
export type GuidanceSeverity = "info" | "warning" | "blocking";
export type GuidanceCategory =
  | "completeness"
  | "schedule"
  | "production"
  | "budget"
  | "risk";
export type GuidanceFinding = {
  code: string;
  severity: GuidanceSeverity;
  category: GuidanceCategory;
  message: string;
  paths: string[];
};
export type GuidanceSectionCompleteness = {
  section: string;
  label: string;
  filled: number;
  total: number;
  score: number;
};
export type GuidanceReport = {
  id: string;
  proposalVersion: number;
  engineVersion: string;
  overallCompleteness: number;
  completeness: GuidanceSectionCompleteness[];
  findings: GuidanceFinding[];
  findingCount: number;
  blockingCount: number;
  createdAt: string;
};
const severities: GuidanceSeverity[] = ["info", "warning", "blocking"];
const categories: GuidanceCategory[] = [
  "completeness",
  "schedule",
  "production",
  "budget",
  "risk",
];
const asScore = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
};
const asCount = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};
const normalize = (raw: GuidanceReport): GuidanceReport => {
  const completeness = (Array.isArray(raw.completeness) ? raw.completeness : [])
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      section: String(s.section ?? ""),
      label: String(s.label || s.section || "Section"),
      filled: asCount(s.filled),
      total: asCount(s.total),
      score: asScore(s.score),
    }));
  const findings = (Array.isArray(raw.findings) ? raw.findings : [])
    .filter((f) => f && typeof f === "object" && typeof f.message === "string")
    .map((f) => ({
      code: String(f.code ?? ""),
      severity: severities.includes(f.severity) ? f.severity : "info",
      category: categories.includes(f.category) ? f.category : "risk",
      message: f.message,
      paths: Array.isArray(f.paths)
        ? f.paths.filter((p): p is string => typeof p === "string")
        : [],
    }));
  return {
    id: String(raw.id ?? ""),
    proposalVersion: asCount(raw.proposalVersion),
    engineVersion: String(raw.engineVersion ?? ""),
    overallCompleteness: asScore(raw.overallCompleteness),
    completeness,
    findings,
    findingCount: asCount(raw.findingCount) || findings.length,
    blockingCount: findings.filter((f) => f.severity === "blocking").length,
    createdAt: String(raw.createdAt ?? ""),
  };
};
const call = async (
  proposalId: string,
  init?: RequestInit,
): Promise<Result<GuidanceReport>> => {
  const suffix = init?.method === "POST" ? "" : "/latest";
  try {
    const r = await authenticatedBackendFetch(
        `${BACKEND_URL}/api/v1/proposals/${encodeURIComponent(proposalId)}/guidance-reports${suffix}`,
        {
          ...init,
          cache: "no-store",
          headers: {
            "X-Correlation-ID": crypto.randomUUID(),
            ...(init?.headers ?? {}),
          },
        },
      ),
      b = await r.json().catch(() => ({}));
    return r.ok
      ? { success: true, data: normalize(b.data as GuidanceReport) }
      : {
          success: false,
          code: String(b.code || `HTTP_${r.status}`),
          message:
            safeMessages[String(b.code || "")] ??
            String(b.title || "The readiness check could not be completed."),
        };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      message: "The guidance service could not be reached.",
    };
  }
};
export const generateGuidanceAction = async (proposalId: string) =>
  await call(proposalId, { method: "POST" });
export const getLatestGuidanceAction = async (proposalId: string) =>
  await call(proposalId);
