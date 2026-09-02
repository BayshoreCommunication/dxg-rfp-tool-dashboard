"use server";

import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { prepareAutomaticEvaluationAction } from "./evaluationEngine";
import {
  approveRequirementSetAction,
  generateRequirementSetAction,
  getRequirementSetAction,
  listRequirementSetsAction,
  prepareRequirementSetAction,
  supersedeRequirementSetAction,
  type RequirementRegistryView,
} from "./requirementRegistry";
import { createVendorIntelligenceAction } from "./vendorIntelligence";

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
export type ComparisonRecommendation = {
  policyVersion: string;
  status: "recommended" | "close_call" | "no_eligible_vendor";
  bestParticipantId: string | null;
  strongestParticipantIds: string[];
  confidence: "high" | "medium" | "low";
  confidenceReasons: string[];
  margin: number | null;
  rationale: string;
  ranking: Array<{ participantId: string; vendorLabel: string; score: number; evaluatorCount: number; maxCriterionSpread: number; eligible: boolean; eligibilityFailures: number; mandatoryGaps: number; mandatoryPartials: number; unresolvedReviews: number; highRisks: number; rank: number | null }>;
};
export type ComparisonWorkspace = ComparisonView & {
  manifest: { manifestId: string; checksum: string; proposalVersion: string; requirementSetVersion: number; evaluationMatrixVersion: number; priceVisibility: "reviewers" | "committee" | "hidden"; policies: { extraction: string; assessment: string; commercial: string; scoring: string; comparison: string; recommendation: string } };
  recommendation: ComparisonRecommendation | null;
  intelligence: {
    overview: { responseCount: number; versionCount: number; approvedRequirementCount: number; mandatoryGapCount: number; mandatoryPartialCount: number; unresolvedReviewCount: number; evaluatorCompletedCount: number; evaluatorAssignedCount: number };
    requirements: ComparisonRequirement[];
    technical: ComparisonRequirement[];
    permissions: { viewCommercial: boolean };
    commercial: Array<{ participantId: string; vendorLabel: string; submittedTotal: number | null; submittedCurrency: string | null; basis: string | null; comparable: boolean; normalizedTotal: number | null; normalizedCurrency: string | null; arithmeticStatus: string | null; assumptions: unknown[]; refusalCodes: string[]; policyVersion: string | null; lineItems: Array<{ lineItemId: string; category: string; description: string; amount: number | null; currency: string | null; optionOrExclusion: boolean }> }>;
    risks: Array<{ participantId: string; vendorLabel: string; riskId: string; requirementId: string | null; category: string; severity: string; title: string; basis: string; disposition: string; questionId: string | null; question: string | null; evidence: ComparisonEvidence[] }>;
    evaluation: Array<{ participantId: string; vendorLabel: string; submittedScores: number; submittedEvaluators: number; weightedContributionTotal: number; evaluatorCount: number; completedEvaluatorCount: number; conflictCount: number; criteria?: Array<{ criterionId: string; name: string; meanScore: number; meanWeightedContribution: number; spread: number; rubricMaximum: number; originalWeight: number }> }>;
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
const parseRecommendation = (value: unknown): ComparisonRecommendation | null => {
  if (!isRecord(value) || !["recommended", "close_call", "no_eligible_vendor"].includes(String(value.status)) || !["high", "medium", "low"].includes(String(value.confidence)) || !Array.isArray(value.ranking)) return null;
  const ranking = value.ranking.flatMap((item) => isRecord(item) && typeof item.participantId === "string" ? [{
    participantId: item.participantId, vendorLabel: String(item.vendorLabel ?? "Vendor"), score: num(item.score), eligible: item.eligible === true,
    evaluatorCount: num(item.evaluatorCount), maxCriterionSpread: num(item.maxCriterionSpread), eligibilityFailures: num(item.eligibilityFailures), mandatoryGaps: num(item.mandatoryGaps), mandatoryPartials: num(item.mandatoryPartials), unresolvedReviews: num(item.unresolvedReviews), highRisks: num(item.highRisks), rank: item.rank === null ? null : num(item.rank),
  }] : []);
  if (ranking.length !== value.ranking.length) return null;
  return {
    policyVersion: String(value.policyVersion ?? ""), status: value.status as ComparisonRecommendation["status"],
    bestParticipantId: nullableString(value.bestParticipantId), strongestParticipantIds: strings(value.strongestParticipantIds),
    confidence: value.confidence as ComparisonRecommendation["confidence"], confidenceReasons: strings(value.confidenceReasons), margin: value.margin === null ? null : num(value.margin),
    rationale: String(value.rationale ?? ""), ranking,
  };
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
  const evaluation = (Array.isArray(intelligence.evaluation) ? intelligence.evaluation : []).flatMap((item) => isRecord(item) && typeof item.participantId === "string" ? [{ participantId: item.participantId, vendorLabel: String(item.vendorLabel ?? "Vendor"), submittedScores: num(item.submittedScores), submittedEvaluators: num(item.submittedEvaluators), weightedContributionTotal: num(item.weightedContributionTotal), evaluatorCount: num(item.evaluatorCount), completedEvaluatorCount: num(item.completedEvaluatorCount), conflictCount: num(item.conflictCount), criteria: (Array.isArray(item.criteria) ? item.criteria : []).flatMap((criterion) => isRecord(criterion) && typeof criterion.criterionId === "string" ? [{ criterionId: criterion.criterionId, name: String(criterion.name ?? "Criterion"), meanScore: num(criterion.meanScore), meanWeightedContribution: num(criterion.meanWeightedContribution), spread: num(criterion.spread), rubricMaximum: num(criterion.rubricMaximum), originalWeight: num(criterion.originalWeight) }] : []) }] : []);
  const decisions = (Array.isArray(intelligence.decisions) ? intelligence.decisions : []).flatMap((item) => isRecord(item) && typeof item.decisionId === "string" && ["shortlist", "selection", "no_award"].includes(String(item.decisionType)) ? [{ decisionId: item.decisionId, decisionType: item.decisionType as "shortlist" | "selection" | "no_award", selectedParticipantIds: strings(item.selectedParticipantIds), rationale: String(item.rationale ?? ""), staleAcknowledged: item.staleAcknowledged === true, manifestChecksum: String(item.manifestChecksum ?? ""), supersedesDecisionId: nullableString(item.supersedesDecisionId), createdAt: String(item.createdAt ?? "") }] : []);
  const policies = isRecord(manifest.policies) ? manifest.policies : {};
  const snapshot = isRecord(value.snapshot) ? value.snapshot : null;
  return { ...view, manifest: { manifestId: manifest.manifestId, checksum: manifest.checksum, proposalVersion: String(manifest.proposalVersion ?? ""), requirementSetVersion: num(manifest.requirementSetVersion), evaluationMatrixVersion: num(manifest.evaluationMatrixVersion), priceVisibility, policies: { extraction: String(policies.extraction ?? ""), assessment: String(policies.assessment ?? ""), commercial: String(policies.commercial ?? ""), scoring: String(policies.scoring ?? ""), comparison: String(policies.comparison ?? ""), recommendation: String(policies.recommendation ?? "") } }, recommendation: parseRecommendation(snapshot?.recommendation), intelligence: { overview: { responseCount: num(overview.responseCount), versionCount: num(overview.versionCount), approvedRequirementCount: num(overview.approvedRequirementCount), mandatoryGapCount: num(overview.mandatoryGapCount), mandatoryPartialCount: num(overview.mandatoryPartialCount), unresolvedReviewCount: num(overview.unresolvedReviewCount), evaluatorCompletedCount: num(overview.evaluatorCompletedCount), evaluatorAssignedCount: num(overview.evaluatorAssignedCount) }, requirements, technical, permissions: { viewCommercial: intelligence.permissions.viewCommercial === true }, commercial, risks, evaluation, decisions } };
};
const safe: Record<string, string> = {
  COMPARISON_NOT_FOUND: "This comparison could not be found.",
  COMPARISON_NOT_READY: "Every selected vendor needs completed proposal intelligence and evaluation before comparison.",
  COMPARISON_EVALUATION_INCOMPLETE: "Complete every eligible evaluator scorecard before comparing or selecting vendors.",
  COMPARISON_CRITICAL_REVIEW_INCOMPLETE: "Review every mandatory or eligibility mapping and every contradictory fact for each vendor before comparison.",
  COMPARISON_EVALUATOR_PANEL_MISMATCH: "Every vendor must be scored against the same criteria before they can be compared.",
  REQUIREMENT_SET_NOT_APPROVED: "Approve the proposal requirements before starting a comparison.",
  EVALUATION_MATRIX_NOT_CONFIRMED: "Confirm an evaluation matrix totaling 100% before starting a comparison.",
  SUBMISSION_VERSION_NOT_FOUND: "A selected vendor version is no longer available.",
  INVALID_COMPARISON_STATE: "This comparison is not in a state that supports that operation.",
  DECISION_RATIONALE_REQUIRED: "Provide a clear rationale of at least 20 characters.",
  DECISION_PARTICIPANTS_INVALID: "Choose vendors that belong to this comparison.",
  DECISION_RUN_NOT_COMPLETE: "Wait for the comparison to finish before recording a decision.",
  STALE_ACKNOWLEDGEMENT_REQUIRED: "Acknowledge the stale historical run before recording a decision.",
};
const contextualComparisonMessage = (code: string, title: unknown) => {
  if (code !== "COMPARISON_NOT_READY" || typeof title !== "string") return null;
  const trimmed = title.trim();
  return /^Complete proposal intelligence and evaluation for [^\r\n]{1,200} before comparison\.$/.test(trimmed)
    ? trimmed
    : null;
};
const call = async <T,>(path: string, init: RequestInit | undefined, parse: (value: unknown) => T | null): Promise<Result<T>> => {
  try {
    const response = await authenticatedBackendFetch(`${BACKEND_URL}${path}`, { ...init, cache: "no-store", headers: { "X-Correlation-ID": crypto.randomUUID(), ...(init?.headers ?? {}) } });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) { const code = String(body.code ?? `HTTP_${response.status}`); return { success: false, code, message: contextualComparisonMessage(code, body.title) ?? safe[code] ?? String(body.title ?? "Comparison operation failed.") }; }
    const parsed = parse(body.data); return parsed ? { success: true, data: parsed } : { success: false, code: "INVALID_RESPONSE", message: "The comparison service returned an unexpected response." };
  } catch { return { success: false, code: "NETWORK_ERROR", message: "The comparison service could not be reached." }; }
};
const base = (proposalId: string) => `/api/v1/proposals/${encodeURIComponent(proposalId)}/intelligence/comparisons`;

const confirmedRegistry = (registry: RequirementRegistryView) =>
  registry.set.status === "approved"
  && !registry.freshness.stale
  && registry.matrix?.status === "approved"
  && registry.matrix.weightsConfirmed
  && Math.abs(registry.matrix.totalWeight - 100) <= 0.001;

const ensureApprovedRequirementRegistry = async (proposalId: string): Promise<Result<RequirementRegistryView>> => {
  const sets = await listRequirementSetsAction(proposalId);
  if (!sets.success) return sets as Result<RequirementRegistryView>;

  const approved = sets.data.find((item) => item.status === "approved" && !item.freshness.stale);
  if (approved) {
    const registry = await getRequirementSetAction(proposalId, approved.id);
    if (!registry.success) return registry;
    if (!confirmedRegistry(registry.data)) return {
      success: false,
      code: "EVALUATION_MATRIX_NOT_CONFIRMED",
      message: safe.EVALUATION_MATRIX_NOT_CONFIRMED,
    };
    return registry;
  }

  const editable = sets.data.find((item) =>
    !item.freshness.stale && (item.status === "draft" || item.status === "in_review"));
  let registry: Result<RequirementRegistryView>;
  if (editable) registry = await getRequirementSetAction(proposalId, editable.id);
  else {
    const staleApproved = sets.data.find((item) => item.status === "approved");
    registry = staleApproved
      ? await supersedeRequirementSetAction(proposalId, staleApproved.id)
      : await generateRequirementSetAction(proposalId);
  }
  if (!registry.success) return registry;

  const prepared = await prepareRequirementSetAction(
    proposalId,
    registry.data.set.id,
    registry.data.set.lock_version,
  );
  if (!prepared.success) return prepared;
  if (prepared.data.set.validation.blocking.length > 0) return {
    success: false,
    code: "REQUIREMENT_SET_NOT_READY",
    message: "Automatic requirement preparation found an item that still needs your decision.",
  };
  const approvedRegistry = await approveRequirementSetAction(
    proposalId,
    prepared.data.set.id,
    prepared.data.set.lock_version,
  );
  if (!approvedRegistry.success) return approvedRegistry;
  if (!confirmedRegistry(approvedRegistry.data)) return {
    success: false,
    code: "EVALUATION_MATRIX_NOT_CONFIRMED",
    message: safe.EVALUATION_MATRIX_NOT_CONFIRMED,
  };
  return approvedRegistry;
};

export type ComparisonPreparation = {
  requirementSetId: string;
  jobs: Array<{ submissionId: string; versionId: string; jobId: string }>;
};

export const prepareComparisonPrerequisitesAction = async (
  proposalId: string,
  participants: Array<{ submissionId: string; versionId: string }>,
): Promise<Result<ComparisonPreparation>> => {
  const registry = await ensureApprovedRequirementRegistry(proposalId);
  if (!registry.success) return registry as Result<ComparisonPreparation>;

  const intelligence = await Promise.all(participants.map(async (participant) => ({
    participant,
    result: await createVendorIntelligenceAction(
      proposalId,
      participant.submissionId,
      participant.versionId,
      crypto.randomUUID(),
    ),
  })));
  const failed = intelligence.find((item) => !item.result.success);
  if (failed && !failed.result.success) return {
    success: false,
    code: failed.result.code,
    message: `Automatic vendor preparation could not start: ${failed.result.message}`,
  };
  return {
    success: true,
    data: {
      requirementSetId: registry.data.set.id,
      jobs: intelligence.flatMap(({ participant, result }) => result.success
        && result.data.status !== "succeeded"
        && result.data.jobId
        ? [{ ...participant, jobId: result.data.jobId }]
        : []),
    },
  };
};

export const listComparisonsAction = async (proposalId: string) => {
  const result = await call(base(proposalId), undefined, (value) => Array.isArray(value) ? value.flatMap((item) => parseView(item) ?? []) : null);
  // A proposal nothing has run against yet has no record to look up. That is an
  // empty list, not a failure — surfacing the 404 put a red "Proposal was not
  // found" banner on a page that was displaying the proposal.
  if (!result.success && result.code === "PROPOSAL_NOT_FOUND") return { success: true as const, data: [] };
  return result;
};
export const getComparisonStatusAction = async (proposalId: string, runId: string) => call(`${base(proposalId)}/${encodeURIComponent(runId)}/status`, undefined, parseView);
export const getComparisonWorkspaceAction = async (proposalId: string, runId: string) => call(`${base(proposalId)}/${encodeURIComponent(runId)}`, undefined, parseWorkspace);

export const startComparisonAction = async (proposalId: string, participants: Array<{ submissionId: string; versionId: string }>) => {
  const registry = await ensureApprovedRequirementRegistry(proposalId);
  if (!registry.success) return registry as Result<ComparisonView>;
  const automaticEvaluations = await Promise.all(participants.map((participant) =>
    prepareAutomaticEvaluationAction(proposalId, participant.submissionId, participant.versionId)));
  const failedEvaluation = automaticEvaluations.find((result) => !result.success);
  if (failedEvaluation && !failedEvaluation.success) return {
    success: false,
    code: failedEvaluation.code,
    message: `Automatic vendor evaluation could not finish: ${failedEvaluation.message}`,
  } as Result<ComparisonView>;
  const created = await call(`${base(proposalId)}`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ requirementSetId: registry.data.set.id, evaluationMatrixVersionId: registry.data.matrix!.id, participants, priceVisibility: "reviewers" }) }, (value) => isRecord(value) && typeof value.runId === "string" ? { runId: value.runId } : null);
  if (!created.success) return created as Result<ComparisonView>;
  return getComparisonStatusAction(proposalId, created.data.runId);
};

export const cancelComparisonAction = async (proposalId: string, runId: string) => call(`${base(proposalId)}/${encodeURIComponent(runId)}/cancel`, { method: "POST" }, (value) => isRecord(value) && typeof value.runId === "string" ? { runId: value.runId } : null);
export const retryComparisonAction = async (proposalId: string, runId: string) => call(`${base(proposalId)}/${encodeURIComponent(runId)}/retry`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ reason: "Retry failed comparison branches after planner review." }) }, (value) => isRecord(value) && typeof value.runId === "string" ? { runId: value.runId } : null);
export const recordComparisonDecisionAction = async (proposalId: string, runId: string, input: { decisionType: "shortlist" | "selection" | "no_award"; selectedParticipantIds: string[]; rationale: string; acknowledgeStale: boolean }) => call(`${base(proposalId)}/${encodeURIComponent(runId)}/decisions`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(input) }, (value) => isRecord(value) && typeof value.decisionId === "string" ? { decisionId: value.decisionId } : null);
