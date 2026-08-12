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
export type ComparisonEvidence = {
  evidenceId: string;
  supportRole?: string;
  sourceLabel: string;
  sourceChecksum: string;
  locator: Record<string, unknown>;
  excerpt: string;
  contentChecksum: string;
  trustClass: string;
  facts?: Array<{ factId: string; key: string; family: string; type: string; statement: string; valueKind: string; typedValue: Record<string, unknown>; normalizedValue: string; unit: string | null; currency: string | null; confidence: number; contradictionGroup: string | null; supportRole: string }>;
};
export type ComparisonRequirement = {
  requirementId: string; key: string; kind: string; title: string; text: string; mandatoryStatus: string; eligibility: boolean;
  importance: string; verificationMethod: string; groupKey: string; ordinal: number;
  vendors: Array<{ participantId: string; vendorLabel: string; assessmentId: string | null; verdict: string; rationale: string; confidence: number | null; needsHumanReview: boolean; reviewReasons: string[]; evidence: ComparisonEvidence[]; reviewHistory: Array<{ reviewId: string; decision: string; reasonCode: string; note: string; actorUserId: string; createdAt: string }> }>;
};
export type ComparisonWorkspace = ComparisonView & {
  manifest: { manifestId: string; checksum: string; proposalVersion: string; requirementSetVersion: number; evaluationMatrixVersion: number; priceVisibility: "reviewers" | "committee" | "hidden"; policies: { extraction: string; assessment: string; commercial: string; scoring: string } };
  intelligence: {
    overview: { responseCount: number; versionCount: number; approvedRequirementCount: number; mandatoryGapCount: number; unresolvedReviewCount: number; evaluatorCompletedCount: number; evaluatorAssignedCount: number };
    requirements: ComparisonRequirement[];
    technical: ComparisonRequirement[];
    permissions: { viewCommercial: boolean };
    commercial: Array<{ participantId: string; vendorLabel: string; submittedTotal: number | null; submittedCurrency: string | null; basis: string | null; comparable: boolean; normalizedTotal: number | null; normalizedCurrency: string | null; arithmeticStatus: string | null; assumptions: unknown[]; refusalCodes: string[]; policyVersion: string | null; lineItems: Array<{ lineItemId: string; category: string; description: string; amount: number | null; currency: string | null; optionOrExclusion: boolean }> }>;
    risks: Array<{ participantId: string; vendorLabel: string; riskId: string; requirementId: string | null; category: string; severity: string; title: string; basis: string; disposition: string; questionId: string | null; question: string | null; evidence: ComparisonEvidence[] }>;
    evaluation: Array<{ participantId: string; vendorLabel: string; submittedScores: number; submittedEvaluators: number; weightedContributionTotal: number; evaluatorCount: number; completedEvaluatorCount: number; conflictCount: number }>;
    decisions: Array<{ decisionId: string; decisionType: "shortlist" | "selection" | "no_award"; selectedParticipantIds: string[]; rationale: string; staleAcknowledged: boolean; manifestChecksum: string; supersedesDecisionId: string | null; createdAt: string }>;
  };
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
const nullableString = (value: unknown) => typeof value === "string" ? value : null;
const parseEvidence = (value: unknown): ComparisonEvidence | null => {
  if (!isRecord(value) || typeof value.evidenceId !== "string" || typeof value.sourceLabel !== "string" || typeof value.excerpt !== "string" || !isRecord(value.locator) || typeof value.contentChecksum !== "string") return null;
  return {
    evidenceId: value.evidenceId, supportRole: typeof value.supportRole === "string" ? value.supportRole : undefined,
    sourceLabel: value.sourceLabel, sourceChecksum: String(value.sourceChecksum ?? ""), locator: value.locator,
    excerpt: value.excerpt, contentChecksum: value.contentChecksum, trustClass: String(value.trustClass ?? "untrusted_vendor_content"),
    facts: (Array.isArray(value.facts) ? value.facts : []).flatMap((fact) => isRecord(fact) && typeof fact.factId === "string" ? [{ factId: fact.factId, key: String(fact.key ?? ""), family: String(fact.family ?? ""), type: String(fact.type ?? ""), statement: String(fact.statement ?? ""), valueKind: String(fact.valueKind ?? "unknown"), typedValue: isRecord(fact.typedValue) ? fact.typedValue : {}, normalizedValue: String(fact.normalizedValue ?? ""), unit: nullableString(fact.unit), currency: nullableString(fact.currency), confidence: num(fact.confidence), contradictionGroup: nullableString(fact.contradictionGroup), supportRole: String(fact.supportRole ?? "supports") }] : []),
  };
};
const parseRequirement = (value: unknown): ComparisonRequirement | null => {
  if (!isRecord(value) || typeof value.requirementId !== "string" || typeof value.title !== "string" || !Array.isArray(value.vendors)) return null;
  const vendors = value.vendors.flatMap((vendor) => {
    if (!isRecord(vendor) || typeof vendor.participantId !== "string" || typeof vendor.vendorLabel !== "string") return [];
    return [{ participantId: vendor.participantId, vendorLabel: vendor.vendorLabel, assessmentId: nullableString(vendor.assessmentId), verdict: String(vendor.verdict ?? "not_assessable"), rationale: String(vendor.rationale ?? ""), confidence: vendor.confidence === null ? null : num(vendor.confidence), needsHumanReview: vendor.needsHumanReview === true, reviewReasons: strings(vendor.reviewReasons), evidence: (Array.isArray(vendor.evidence) ? vendor.evidence : []).flatMap((item) => parseEvidence(item) ?? []), reviewHistory: (Array.isArray(vendor.reviewHistory) ? vendor.reviewHistory : []).flatMap((review) => isRecord(review) && typeof review.reviewId === "string" ? [{ reviewId: review.reviewId, decision: String(review.decision ?? ""), reasonCode: String(review.reasonCode ?? ""), note: String(review.note ?? ""), actorUserId: String(review.actorUserId ?? ""), createdAt: String(review.createdAt ?? "") }] : []) }];
  });
  return { requirementId: value.requirementId, key: String(value.key ?? ""), kind: String(value.kind ?? ""), title: value.title, text: String(value.text ?? ""), mandatoryStatus: String(value.mandatoryStatus ?? ""), eligibility: value.eligibility === true, importance: String(value.importance ?? ""), verificationMethod: String(value.verificationMethod ?? ""), groupKey: String(value.groupKey ?? ""), ordinal: num(value.ordinal), vendors };
};
const parseWorkspace = (value: unknown): ComparisonWorkspace | null => {
  const view = parseView(value);
  if (!view || !isRecord(value) || !isRecord(value.manifest) || !isRecord(value.intelligence)) return null;
  const manifest = value.manifest, intelligence = value.intelligence;
  if (!isRecord(intelligence.overview) || !isRecord(intelligence.permissions)) return null;
  const priceVisibility = ["reviewers", "committee", "hidden"].includes(String(manifest.priceVisibility)) ? manifest.priceVisibility as ComparisonWorkspace["manifest"]["priceVisibility"] : null;
  if (!priceVisibility || typeof manifest.manifestId !== "string" || typeof manifest.checksum !== "string") return null;
  const requirements = (Array.isArray(intelligence.requirements) ? intelligence.requirements : []).flatMap((item) => parseRequirement(item) ?? []);
  const technical = (Array.isArray(intelligence.technical) ? intelligence.technical : []).flatMap((item) => parseRequirement(item) ?? []);
  const overview = intelligence.overview;
  const commercial = (Array.isArray(intelligence.commercial) ? intelligence.commercial : []).flatMap((item) => isRecord(item) && typeof item.participantId === "string" ? [{ participantId: item.participantId, vendorLabel: String(item.vendorLabel ?? "Vendor"), submittedTotal: item.submittedTotal === null ? null : num(item.submittedTotal), submittedCurrency: nullableString(item.submittedCurrency), basis: nullableString(item.basis), comparable: item.comparable === true, normalizedTotal: item.normalizedTotal === null ? null : num(item.normalizedTotal), normalizedCurrency: nullableString(item.normalizedCurrency), arithmeticStatus: nullableString(item.arithmeticStatus), assumptions: Array.isArray(item.assumptions) ? item.assumptions : [], refusalCodes: strings(item.refusalCodes), policyVersion: nullableString(item.policyVersion), lineItems: (Array.isArray(item.lineItems) ? item.lineItems : []).flatMap((line) => isRecord(line) && typeof line.lineItemId === "string" ? [{ lineItemId: line.lineItemId, category: String(line.category ?? ""), description: String(line.description ?? ""), amount: line.amount === null ? null : num(line.amount), currency: nullableString(line.currency), optionOrExclusion: line.optionOrExclusion === true }] : []) }] : []);
  const risks = (Array.isArray(intelligence.risks) ? intelligence.risks : []).flatMap((item) => isRecord(item) && typeof item.riskId === "string" && typeof item.participantId === "string" ? [{ participantId: item.participantId, vendorLabel: String(item.vendorLabel ?? "Vendor"), riskId: item.riskId, requirementId: nullableString(item.requirementId), category: String(item.category ?? ""), severity: String(item.severity ?? ""), title: String(item.title ?? ""), basis: String(item.basis ?? ""), disposition: String(item.disposition ?? ""), questionId: nullableString(item.questionId), question: nullableString(item.question), evidence: (Array.isArray(item.evidence) ? item.evidence : []).flatMap((evidence) => parseEvidence(evidence) ?? []) }] : []);
  const evaluation = (Array.isArray(intelligence.evaluation) ? intelligence.evaluation : []).flatMap((item) => isRecord(item) && typeof item.participantId === "string" ? [{ participantId: item.participantId, vendorLabel: String(item.vendorLabel ?? "Vendor"), submittedScores: num(item.submittedScores), submittedEvaluators: num(item.submittedEvaluators), weightedContributionTotal: num(item.weightedContributionTotal), evaluatorCount: num(item.evaluatorCount), completedEvaluatorCount: num(item.completedEvaluatorCount), conflictCount: num(item.conflictCount) }] : []);
  const decisions = (Array.isArray(intelligence.decisions) ? intelligence.decisions : []).flatMap((item) => isRecord(item) && typeof item.decisionId === "string" && ["shortlist", "selection", "no_award"].includes(String(item.decisionType)) ? [{ decisionId: item.decisionId, decisionType: item.decisionType as "shortlist" | "selection" | "no_award", selectedParticipantIds: strings(item.selectedParticipantIds), rationale: String(item.rationale ?? ""), staleAcknowledged: item.staleAcknowledged === true, manifestChecksum: String(item.manifestChecksum ?? ""), supersedesDecisionId: nullableString(item.supersedesDecisionId), createdAt: String(item.createdAt ?? "") }] : []);
  return { ...view, manifest: { manifestId: manifest.manifestId, checksum: manifest.checksum, proposalVersion: String(manifest.proposalVersion ?? ""), requirementSetVersion: num(manifest.requirementSetVersion), evaluationMatrixVersion: num(manifest.evaluationMatrixVersion), priceVisibility, policies: isRecord(manifest.policies) ? { extraction: String(manifest.policies.extraction ?? ""), assessment: String(manifest.policies.assessment ?? ""), commercial: String(manifest.policies.commercial ?? ""), scoring: String(manifest.policies.scoring ?? "") } : { extraction: "", assessment: "", commercial: "", scoring: "" } }, intelligence: { overview: { responseCount: num(overview.responseCount), versionCount: num(overview.versionCount), approvedRequirementCount: num(overview.approvedRequirementCount), mandatoryGapCount: num(overview.mandatoryGapCount), unresolvedReviewCount: num(overview.unresolvedReviewCount), evaluatorCompletedCount: num(overview.evaluatorCompletedCount), evaluatorAssignedCount: num(overview.evaluatorAssignedCount) }, requirements, technical, permissions: { viewCommercial: intelligence.permissions.viewCommercial === true }, commercial, risks, evaluation, decisions } };
};
const safe: Record<string, string> = {
  COMPARISON_NOT_FOUND: "This comparison could not be found.",
  COMPARISON_NOT_READY: "Every selected vendor needs completed proposal intelligence and evaluation before comparison.",
  REQUIREMENT_SET_NOT_APPROVED: "Approve the proposal requirements before starting a comparison.",
  EVALUATION_MATRIX_NOT_CONFIRMED: "Confirm an evaluation matrix totaling 100% before starting a comparison.",
  SUBMISSION_VERSION_NOT_FOUND: "A selected vendor version is no longer available.",
  INVALID_COMPARISON_STATE: "This comparison is not in a state that supports that operation.",
  DECISION_RATIONALE_REQUIRED: "Provide a clear rationale of at least 20 characters.",
  DECISION_PARTICIPANTS_INVALID: "Choose vendors that belong to this comparison.",
  DECISION_RUN_NOT_COMPLETE: "Wait for the comparison to finish before recording a decision.",
  STALE_ACKNOWLEDGEMENT_REQUIRED: "Acknowledge the stale historical run before recording a decision.",
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
export const getComparisonWorkspaceAction = async (proposalId: string, runId: string) => call(`${base(proposalId)}/${encodeURIComponent(runId)}`, undefined, parseWorkspace);

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
export const recordComparisonDecisionAction = async (proposalId: string, runId: string, input: { decisionType: "shortlist" | "selection" | "no_award"; selectedParticipantIds: string[]; rationale: string; acknowledgeStale: boolean }) => call(`${base(proposalId)}/${encodeURIComponent(runId)}/decisions`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(input) }, (value) => isRecord(value) && typeof value.decisionId === "string" ? { decisionId: value.decisionId } : null);
