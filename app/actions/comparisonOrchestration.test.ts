import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { getComparisonWorkspaceAction, recordComparisonDecisionAction } from "./comparisonOrchestration";

jest.mock("@/lib/server/backendClient", () => ({ authenticatedBackendFetch: jest.fn() }));
jest.mock("@/lib/config", () => ({ BACKEND_URL: "http://backend.test" }));

const runId = "019ff44e-6fd9-7450-98a7-3ba8e912e61a";
const response = (data: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => ({ data }) } as Response);
const validWorkspace = {
  schemaVersion: "proposal-intelligence-comparison.v1",
  run: { runId, status: "succeeded", progress: 100, progressStage: "completed", participantCount: 2, completedParticipantCount: 2, warnings: [], createdAt: "2026-08-12T00:00:00.000Z", completedAt: "2026-08-12T00:10:00.000Z" },
  freshness: { state: "current", reasons: [] }, participants: [], jobs: [],
  manifest: { manifestId: "manifest", checksum: "a".repeat(64), proposalVersion: "1", requirementSetVersion: 1, evaluationMatrixVersion: 1, priceVisibility: "hidden", policies: { extraction: "v1", assessment: "v1", commercial: "v1", scoring: "v1", comparison: "v3", recommendation: "human-rubric-recommendation.v1" } },
  snapshot: { recommendation: { policyVersion: "human-rubric-recommendation.v1", status: "recommended", bestParticipantId: "participant-1", strongestParticipantIds: ["participant-1"], confidence: "high", margin: 8, rationale: "Participant 1 leads the completed human rubric after eligibility gates.", ranking: [{ participantId: "participant-1", vendorLabel: "Northstar AV", score: 72, eligible: true, eligibilityFailures: 0, mandatoryGaps: 0, unresolvedReviews: 0, highRisks: 0, rank: 1 }] } },
  intelligence: { overview: { responseCount: 2, versionCount: 2, approvedRequirementCount: 12, mandatoryGapCount: 1, unresolvedReviewCount: 2, evaluatorCompletedCount: 1, evaluatorAssignedCount: 2 }, requirements: [], technical: [], permissions: { viewCommercial: false }, commercial: [], risks: [], evaluation: [], decisions: [] },
};

beforeEach(() => jest.clearAllMocks());

test("accepts one run-bound, permission-aware proposal intelligence contract", async () => {
  jest.mocked(authenticatedBackendFetch).mockImplementation(() => response(validWorkspace));
  const result = await getComparisonWorkspaceAction("f".repeat(24), runId);
  expect(result).toEqual(expect.objectContaining({ success: true, data: expect.objectContaining({ manifest: expect.objectContaining({ priceVisibility: "hidden", policies: expect.objectContaining({ recommendation: "human-rubric-recommendation.v1" }) }), recommendation: expect.objectContaining({ bestParticipantId: "participant-1", confidence: "high" }), intelligence: expect.objectContaining({ permissions: { viewCommercial: false } }) }) }));
});

test("fails closed when the intelligence projection is missing", async () => {
  const incomplete: Record<string, unknown> = { ...validWorkspace };
  delete incomplete.intelligence;
  jest.mocked(authenticatedBackendFetch).mockImplementation(() => response(incomplete));
  const result = await getComparisonWorkspaceAction("f".repeat(24), runId);
  expect(result).toEqual({ success: false, code: "INVALID_RESPONSE", message: "The comparison service returned an unexpected response." });
});

test("explains that incomplete evaluator scorecards block a comparison decision", async () => {
  jest.mocked(authenticatedBackendFetch).mockResolvedValue({
    ok: false,
    status: 409,
    json: async () => ({ code: "COMPARISON_EVALUATION_INCOMPLETE", title: "unsafe backend detail" }),
  } as Response);

  const result = await recordComparisonDecisionAction("f".repeat(24), runId, {
    decisionType: "selection",
    selectedParticipantIds: ["participant-1"],
    rationale: "This rationale is deliberately long enough.",
    acknowledgeStale: false,
  });

  expect(result).toEqual({
    success: false,
    code: "COMPARISON_EVALUATION_INCOMPLETE",
    message: "Complete every eligible evaluator scorecard before comparing or selecting vendors.",
  });
});
