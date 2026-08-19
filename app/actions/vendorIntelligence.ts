"use server";

import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

type Result<T> = { success: true; data: T } | { success: false; code: string; message: string };
export type IntelligenceEvidence = { fragmentId: string; content: string; locator: Record<string, string | number>; sourceLabel: string };
export type RequirementMapping = {
  mappingId: string; requirementId: string; requirementTitle: string; requirementKind: string; mandatory: boolean;
  relationship: string; confidence: number; ambiguityReasons: string[]; evidence: IntelligenceEvidence[];
};
export type ExtractedFact = {
  factId: string; factKey: string; family: string; factType: string; statement: string; valueKind: string;
  typedValue: Record<string, unknown>; normalizedValue: string; unit: string | null; currency: string | null;
  explicitness: string; confidence: number; contradictionGroup: string | null;
  citations: Array<IntelligenceEvidence & { role: string }>;
};
export type HumanReview = { reviewId: string; targetType: "fact" | "mapping"; targetId: string; decision: string; reasonCode: string; note: string; correctedPayload: Record<string, unknown> | null; actorUserId: string; createdAt: string };
export type VendorIntelligenceResult = {
  run: { runId: string; jobId: string; requirementSetId: string; status: string; requirementCount: number; mappedRequirementCount: number; factCount: number; contradictionCount: number; warnings: Array<Record<string, unknown>>; safeErrorCode: string | null; createdAt: string; completedAt: string | null };
  mappings: RequirementMapping[]; facts: ExtractedFact[]; reviews: HumanReview[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const locator = (value: unknown): Record<string, string | number> => isRecord(value)
  ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string | number] => typeof entry[1] === "string" || typeof entry[1] === "number")) : {};
const evidence = (value: unknown): IntelligenceEvidence | null => isRecord(value) && typeof value.fragmentId === "string"
  ? { fragmentId: value.fragmentId, content: String(value.content ?? ""), locator: locator(value.locator), sourceLabel: String(value.sourceLabel ?? "Evidence") } : null;

const parseResult = (value: unknown): VendorIntelligenceResult | null => {
  if (!isRecord(value) || !isRecord(value.run) || typeof value.run.runId !== "string") return null;
  const run = value.run;
  return {
    run: {
      runId: String(run.runId), jobId: String(run.jobId ?? ""), requirementSetId: String(run.requirementSetId ?? ""), status: String(run.status ?? ""),
      requirementCount: number(run.requirementCount), mappedRequirementCount: number(run.mappedRequirementCount), factCount: number(run.factCount),
      contradictionCount: number(run.contradictionCount), warnings: Array.isArray(run.warnings) ? run.warnings.filter(isRecord) : [],
      safeErrorCode: typeof run.safeErrorCode === "string" ? run.safeErrorCode : null, createdAt: String(run.createdAt ?? ""), completedAt: typeof run.completedAt === "string" ? run.completedAt : null,
    },
    mappings: (Array.isArray(value.mappings) ? value.mappings : []).flatMap((item) => {
      if (!isRecord(item) || typeof item.mappingId !== "string" || typeof item.requirementId !== "string") return [];
      return [{ mappingId: item.mappingId, requirementId: item.requirementId, requirementTitle: String(item.requirementTitle ?? "Requirement"), requirementKind: String(item.requirementKind ?? "requirement"), mandatory: item.mandatory === true, relationship: String(item.relationship ?? "none"), confidence: number(item.confidence), ambiguityReasons: strings(item.ambiguityReasons), evidence: (Array.isArray(item.evidence) ? item.evidence : []).flatMap((row) => evidence(row) ?? []) }];
    }),
    facts: (Array.isArray(value.facts) ? value.facts : []).flatMap((item) => {
      if (!isRecord(item) || typeof item.factId !== "string") return [];
      return [{ factId: item.factId, factKey: String(item.factKey ?? ""), family: String(item.family ?? ""), factType: String(item.factType ?? ""), statement: String(item.statement ?? ""), valueKind: String(item.valueKind ?? "unknown"), typedValue: isRecord(item.typedValue) ? item.typedValue : {}, normalizedValue: String(item.normalizedValue ?? ""), unit: typeof item.unit === "string" ? item.unit : null, currency: typeof item.currency === "string" ? item.currency : null, explicitness: String(item.explicitness ?? ""), confidence: number(item.confidence), contradictionGroup: typeof item.contradictionGroup === "string" ? item.contradictionGroup : null, citations: (Array.isArray(item.citations) ? item.citations : []).flatMap((row) => { const parsed = evidence(row); return parsed && isRecord(row) ? [{ ...parsed, role: String(row.role ?? "supports") }] : []; }) }];
    }),
    reviews: (Array.isArray(value.reviews) ? value.reviews : []).flatMap((item) => isRecord(item) && typeof item.reviewId === "string" ? [{ reviewId: item.reviewId, targetType: item.targetType === "mapping" ? "mapping" as const : "fact" as const, targetId: String(item.targetId ?? ""), decision: String(item.decision ?? ""), reasonCode: String(item.reasonCode ?? ""), note: String(item.note ?? ""), correctedPayload: isRecord(item.correctedPayload) ? item.correctedPayload : null, actorUserId: String(item.actorUserId ?? ""), createdAt: String(item.createdAt ?? "") }] : []),
  };
};

const base = (proposalId: string, submissionId: string, versionId: string) => `/api/v1/proposals/${encodeURIComponent(proposalId)}/intelligence/submissions/${encodeURIComponent(submissionId)}/versions/${encodeURIComponent(versionId)}`;
const messages: Record<string, string> = {
  INTELLIGENCE_RUN_NOT_FOUND: "Proposal intelligence has not been generated for this response version.",
  REQUIREMENT_SET_NOT_APPROVED: "Approve the RFP requirements before generating proposal intelligence.",
  SOURCE_NOT_READY: "Extract this response’s evidence before generating proposal intelligence.",
  CITATION_VALIDATION_FAILED: "The generated claims could not be tied safely to this vendor’s evidence.",
  CITATION_GROUNDING_FAILED: "A generated numeric claim did not appear in its cited vendor text, so the run was rejected.",
  SCHEMA_VALIDATION_FAILED: "The generated intelligence did not meet the required data contract.",
  AUTHORIZATION_DENIED: "You do not have permission to review this response.",
};
const call = async <T,>(path: string, init: RequestInit | undefined, parse: (value: unknown) => T | null): Promise<Result<T>> => {
  try {
    const response = await authenticatedBackendFetch(`${BACKEND_URL}${path}`, { ...init, cache: "no-store", headers: { "X-Correlation-ID": crypto.randomUUID(), ...(init?.headers ?? {}) } });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) { const code = String(body.code ?? `HTTP_${response.status}`); return { success: false, code, message: messages[code] ?? String(body.title ?? "Proposal intelligence could not be completed.") }; }
    const parsed = parse(body.data); return parsed ? { success: true, data: parsed } : { success: false, code: "INVALID_RESPONSE", message: "The intelligence service returned an unexpected response." };
  } catch { return { success: false, code: "NETWORK_ERROR", message: "The intelligence service could not be reached." }; }
};

export const getLatestVendorIntelligenceAction = async (proposalId: string, submissionId: string, versionId: string): Promise<Result<VendorIntelligenceResult>> =>
  await call(`${base(proposalId, submissionId, versionId)}/fact-mapping-runs/latest`, undefined, parseResult);

export const createVendorIntelligenceAction = async (proposalId: string, submissionId: string, versionId: string, idempotencyKey: string): Promise<Result<VendorIntelligenceResult["run"]>> =>
  await call(`${base(proposalId, submissionId, versionId)}/fact-mapping-jobs`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: "{}" }, (value) => isRecord(value) && typeof value.runId === "string" ? { runId: value.runId, jobId: String(value.jobId ?? ""), requirementSetId: String(value.requirementSetId ?? ""), status: String(value.status ?? ""), requirementCount: number(value.requirementCount), mappedRequirementCount: number(value.mappedRequirementCount), factCount: number(value.factCount), contradictionCount: number(value.contradictionCount), warnings: Array.isArray(value.warnings) ? value.warnings.filter(isRecord) : [], safeErrorCode: typeof value.safeErrorCode === "string" ? value.safeErrorCode : null, createdAt: String(value.createdAt ?? ""), completedAt: typeof value.completedAt === "string" ? value.completedAt : null } : null);

export const reviewVendorIntelligenceAction = async (proposalId: string, submissionId: string, versionId: string, runId: string, review: { targetType: "fact" | "mapping"; targetId: string; decision: "accepted" | "rejected" | "corrected" | "escalated"; reasonCode: string; note: string; correctedPayload: Record<string, unknown> | null }, idempotencyKey: string): Promise<Result<{ reviewId: string }>> =>
  await call(`${base(proposalId, submissionId, versionId)}/fact-mapping-runs/${encodeURIComponent(runId)}/reviews`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(review) }, (value) => isRecord(value) && typeof value.reviewId === "string" ? { reviewId: value.reviewId } : null);
