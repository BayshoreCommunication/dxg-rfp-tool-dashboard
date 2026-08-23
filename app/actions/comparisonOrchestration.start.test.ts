import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { prepareAutomaticEvaluationAction } from "./evaluationEngine";
import { getRequirementSetAction, listRequirementSetsAction } from "./requirementRegistry";
import { startComparisonAction } from "./comparisonOrchestration";

jest.mock("@/lib/server/backendClient", () => ({ authenticatedBackendFetch: jest.fn() }));
jest.mock("@/lib/config", () => ({ BACKEND_URL: "http://backend.test" }));
jest.mock("./evaluationEngine", () => ({ prepareAutomaticEvaluationAction: jest.fn() }));
jest.mock("./requirementRegistry", () => ({ getRequirementSetAction: jest.fn(), listRequirementSetsAction: jest.fn() }));

test("prepares every vendor evaluation before creating the comparison", async () => {
  jest.mocked(listRequirementSetsAction).mockResolvedValue({ success: true, data: [{
    id: "set-1", version: 1, status: "approved", requirement_count: 10,
    lock_version: 1, proposal_version: "1", content_checksum: "a",
    validation: { blocking: [], warnings: [] }, approved_at: "2026-08-23", superseded_by_id: null,
    freshness: { stale: false, reasons: [] },
  }] });
  jest.mocked(getRequirementSetAction).mockResolvedValue({ success: true, data: {
    set: { id: "set-1", version: 1, status: "approved", lock_version: 1, proposal_version: "1", content_checksum: "a", validation: { blocking: [], warnings: [] }, approved_at: "2026-08-23", superseded_by_id: null },
    matrix: { id: "matrix-1", status: "approved", totalWeight: 100, weightsConfirmed: true, criteria: [] },
    requirements: [], freshness: { stale: false, reasons: [], currentProposalVersion: "1", currentProposalChecksum: "a" },
  } });
  jest.mocked(prepareAutomaticEvaluationAction).mockResolvedValue({ success: true, data: {} as never });
  jest.mocked(authenticatedBackendFetch)
    .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { runId: "run-1" } }) } as Response)
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: {
      schemaVersion: "comparison.v1",
      run: { runId: "run-1", status: "running", progress: 0, progressStage: "queued", participantCount: 2, completedParticipantCount: 0, warnings: [], createdAt: "2026-08-23", completedAt: null },
      freshness: { state: "current", reasons: [] }, participants: [], jobs: [],
    } }) } as Response);

  const result = await startComparisonAction("proposal-1", [
    { submissionId: "submission-1", versionId: "version-1" },
    { submissionId: "submission-2", versionId: "version-2" },
  ]);

  expect(result).toEqual(expect.objectContaining({ success: true }));
  expect(prepareAutomaticEvaluationAction).toHaveBeenNthCalledWith(1, "proposal-1", "submission-1", "version-1");
  expect(prepareAutomaticEvaluationAction).toHaveBeenNthCalledWith(2, "proposal-1", "submission-2", "version-2");
  expect(authenticatedBackendFetch).toHaveBeenNthCalledWith(1,
    "http://backend.test/api/v1/proposals/proposal-1/intelligence/comparisons",
    expect.objectContaining({ method: "POST" }));
});
