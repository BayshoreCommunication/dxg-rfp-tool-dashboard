"use server";

import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { getRequirementSetAction, listRequirementSetsAction } from "./requirementRegistry";

type Result<T> = { success: true; data: T } | { success: false; code: string; message: string };
export type ComparisonView = {
  schemaVersion: string;
  run: { runId: string; status: string; progress: number; progressStage: string; participantCount: number; completedParticipantCount: number; warnings: unknown[]; createdAt: string; completedAt: string | null };
  freshness: { state: "current" | "stale"; reasons: string[] };
  participants: Array<{ participantId: string; vendorLabel: string; submissionId: string; versionId: string; status: string; stage: string; warningCount: number; safeErrorCode: string | null }>;
  jobs: Array<{ key: string; type: string; status: string; weight: number; safeErrorCode: string | null; updatedAt: string }>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const num = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const parseView = (value: unknown): ComparisonView | null => {
  if (!isRecord(value) || !isRecord(value.run) || typeof value.run.runId !== "string" || !isRecord(value.freshness)) return null;
  const run = value.run, freshness = value.freshness;
  return {
    schemaVersion: String(value.schemaVersion ?? ""),
    run: { runId: String(run.runId), status: String(run.status ?? ""), progress: num(run.progress), progressStage: String(run.progressStage ?? ""), participantCount: num(run.participantCount), completedParticipantCount: num(run.completedParticipantCount), warnings: Array.isArray(run.warnings) ? run.warnings : [], createdAt: String(run.createdAt ?? ""), completedAt: typeof run.completedAt === "string" ? run.completedAt : null },
    freshness: { state: freshness.state === "stale" ? "stale" : "current", reasons: strings(freshness.reasons) },
    participants: (Array.isArray(value.participants) ? value.participants : []).flatMap((item) => isRecord(item) && typeof item.participantId === "string" ? [{ participantId: item.participantId, vendorLabel: String(item.vendorLabel ?? "Vendor"), submissionId: String(item.submissionId ?? ""), versionId: String(item.versionId ?? ""), status: String(item.status ?? ""), stage: String(item.stage ?? ""), warningCount: num(item.warningCount), safeErrorCode: typeof item.safeErrorCode === "string" ? item.safeErrorCode : null }] : []),
    jobs: (Array.isArray(value.jobs) ? value.jobs : []).flatMap((item) => isRecord(item) && typeof item.key === "string" ? [{ key: item.key, type: String(item.type ?? ""), status: String(item.status ?? ""), weight: num(item.weight), safeErrorCode: typeof item.safeErrorCode === "string" ? item.safeErrorCode : null, updatedAt: String(item.updatedAt ?? "") }] : []),
  };
};
const safe: Record<string, string> = {
  COMPARISON_NOT_FOUND: "This comparison could not be found.",
  COMPARISON_NOT_READY: "Every selected vendor needs completed proposal intelligence and evaluation before comparison.",
  REQUIREMENT_SET_NOT_APPROVED: "Approve the proposal requirements before starting a comparison.",
  EVALUATION_MATRIX_NOT_CONFIRMED: "Confirm an evaluation matrix totaling 100% before starting a comparison.",
  SUBMISSION_VERSION_NOT_FOUND: "A selected vendor version is no longer available.",
  INVALID_COMPARISON_STATE: "This comparison is not in a state that supports that operation.",
};
const call = async <T,>(path: string, init: RequestInit | undefined, parse: (value: unknown) => T | null): Promise<Result<T>> => {
  try {
    const response = await authenticatedBackendFetch(`${BACKEND_URL}${path}`, { ...init, cache: "no-store", headers: { "X-Correlation-ID": crypto.randomUUID(), ...(init?.headers ?? {}) } });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) { const code = String(body.code ?? `HTTP_${response.status}`); return { success: false, code, message: safe[code] ?? String(body.title ?? "Comparison operation failed.") }; }
    const parsed = parse(body.data); return parsed ? { success: true, data: parsed } : { success: false, code: "INVALID_RESPONSE", message: "The comparison service returned an unexpected response." };
  } catch { return { success: false, code: "NETWORK_ERROR", message: "The comparison service could not be reached." }; }
};
const base = (proposalId: string) => `/api/v1/proposals/${encodeURIComponent(proposalId)}/intelligence/comparisons`;

export const listComparisonsAction = async (proposalId: string) => call(base(proposalId), undefined, (value) => Array.isArray(value) ? value.flatMap((item) => parseView(item) ?? []) : null);
export const getComparisonStatusAction = async (proposalId: string, runId: string) => call(`${base(proposalId)}/${encodeURIComponent(runId)}/status`, undefined, parseView);

export const startComparisonAction = async (proposalId: string, participants: Array<{ submissionId: string; versionId: string }>) => {
  const sets = await listRequirementSetsAction(proposalId);
  if (!sets.success) return sets as Result<ComparisonView>;
  const approved = sets.data.find((item) => item.status === "approved" && !item.freshness.stale);
  if (!approved) return { success: false, code: "REQUIREMENT_SET_NOT_APPROVED", message: safe.REQUIREMENT_SET_NOT_APPROVED } as Result<ComparisonView>;
  const registry = await getRequirementSetAction(proposalId, approved.id);
  if (!registry.success) return registry as Result<ComparisonView>;
  if (!registry.data.matrix || registry.data.matrix.status !== "approved" || !registry.data.matrix.weightsConfirmed || registry.data.matrix.totalWeight !== 100)
    return { success: false, code: "EVALUATION_MATRIX_NOT_CONFIRMED", message: safe.EVALUATION_MATRIX_NOT_CONFIRMED };
  const created = await call(`${base(proposalId)}`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ requirementSetId: approved.id, evaluationMatrixVersionId: registry.data.matrix.id, participants, priceVisibility: "reviewers" }) }, (value) => isRecord(value) && typeof value.runId === "string" ? { runId: value.runId } : null);
  if (!created.success) return created as Result<ComparisonView>;
  return getComparisonStatusAction(proposalId, created.data.runId);
};

export const cancelComparisonAction = async (proposalId: string, runId: string) => call(`${base(proposalId)}/${encodeURIComponent(runId)}/cancel`, { method: "POST" }, (value) => isRecord(value) && typeof value.runId === "string" ? { runId: value.runId } : null);
export const retryComparisonAction = async (proposalId: string, runId: string) => call(`${base(proposalId)}/${encodeURIComponent(runId)}/retry`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ reason: "Retry failed comparison branches after planner review." }) }, (value) => isRecord(value) && typeof value.runId === "string" ? { runId: value.runId } : null);
