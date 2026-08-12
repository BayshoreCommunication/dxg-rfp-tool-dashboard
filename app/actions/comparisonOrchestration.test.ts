import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { getComparisonWorkspaceAction } from "./comparisonOrchestration";

jest.mock("@/lib/server/backendClient", () => ({ authenticatedBackendFetch: jest.fn() }));
jest.mock("@/lib/config", () => ({ BACKEND_URL: "http://backend.test" }));

const runId = "019ff44e-6fd9-7450-98a7-3ba8e912e61a";
const response = (data: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => ({ data }) } as Response);
const validWorkspace = {
  schemaVersion: "proposal-intelligence-comparison.v1",
  run: { runId, status: "succeeded", progress: 100, progressStage: "completed", participantCount: 2, completedParticipantCount: 2, warnings: [], createdAt: "2026-08-12T00:00:00.000Z", completedAt: "2026-08-12T00:10:00.000Z" },
  freshness: { state: "current", reasons: [] }, participants: [], jobs: [],
  manifest: { manifestId: "manifest", checksum: "a".repeat(64), proposalVersion: "1", requirementSetVersion: 1, evaluationMatrixVersion: 1, priceVisibility: "hidden", policies: { extraction: "v1", assessment: "v1", commercial: "v1", scoring: "v1" } },
  intelligence: { overview: { responseCount: 2, versionCount: 2, approvedRequirementCount: 12, mandatoryGapCount: 1, unresolvedReviewCount: 2, evaluatorCompletedCount: 1, evaluatorAssignedCount: 2 }, requirements: [], technical: [], permissions: { viewCommercial: false }, commercial: [], risks: [], evaluation: [], decisions: [] },
};

beforeEach(() => jest.clearAllMocks());

test("accepts one run-bound, permission-aware proposal intelligence contract", async () => {
  jest.mocked(authenticatedBackendFetch).mockImplementation(() => response(validWorkspace));
  const result = await getComparisonWorkspaceAction("f".repeat(24), runId);
  expect(result).toEqual(expect.objectContaining({ success: true, data: expect.objectContaining({ manifest: expect.objectContaining({ priceVisibility: "hidden" }), intelligence: expect.objectContaining({ permissions: { viewCommercial: false } }) }) }));
});

test("fails closed when the intelligence projection is missing", async () => {
  const incomplete: Record<string, unknown> = { ...validWorkspace };
  delete incomplete.intelligence;
  jest.mocked(authenticatedBackendFetch).mockImplementation(() => response(incomplete));
  const result = await getComparisonWorkspaceAction("f".repeat(24), runId);
  expect(result).toEqual({ success: false, code: "INVALID_RESPONSE", message: "The comparison service returned an unexpected response." });
});
