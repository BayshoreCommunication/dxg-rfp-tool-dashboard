import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { prepareAutomaticEvaluationAction } from "./evaluationEngine";
import { approveRequirementSetAction, getRequirementSetAction, listRequirementSetsAction, prepareRequirementSetAction } from "./requirementRegistry";
import { prepareComparisonPrerequisitesAction, startComparisonAction } from "./comparisonOrchestration";
import { createVendorIntelligenceAction } from "./vendorIntelligence";

jest.mock("@/lib/server/backendClient", () => ({ authenticatedBackendFetch: jest.fn() }));
jest.mock("@/lib/config", () => ({ BACKEND_URL: "http://backend.test" }));
jest.mock("./evaluationEngine", () => ({ prepareAutomaticEvaluationAction: jest.fn() }));
jest.mock("./requirementRegistry", () => ({
  approveRequirementSetAction: jest.fn(), generateRequirementSetAction: jest.fn(), getRequirementSetAction: jest.fn(),
  listRequirementSetsAction: jest.fn(), prepareRequirementSetAction: jest.fn(), supersedeRequirementSetAction: jest.fn(),
}));
jest.mock("./vendorIntelligence", () => ({ createVendorIntelligenceAction: jest.fn() }));

const draftRegistry = {
  set: { id: "set-1", version: 1, status: "draft" as const, lock_version: 1, proposal_version: "1", content_checksum: "a", validation: { blocking: [], warnings: [] }, approved_at: null, superseded_by_id: null },
  matrix: { id: "matrix-1", status: "draft", totalWeight: 120, weightsConfirmed: false, criteria: [] },
  requirements: [], freshness: { stale: false, reasons: [], currentProposalVersion: "1", currentProposalChecksum: "a" },
};
const preparedRegistry = {
  ...draftRegistry,
  set: { ...draftRegistry.set, status: "in_review" as const, lock_version: 2 },
  matrix: { ...draftRegistry.matrix, status: "in_review", totalWeight: 100, weightsConfirmed: true },
};
const approvedRegistry = {
  ...preparedRegistry,
  set: { ...preparedRegistry.set, status: "approved" as const, lock_version: 3, approved_at: "2026-08-23" },
  matrix: { ...preparedRegistry.matrix, status: "approved" },
};

beforeEach(() => jest.clearAllMocks());

test("prepares, approves, and queues missing vendor intelligence", async () => {
  jest.mocked(listRequirementSetsAction).mockResolvedValue({ success: true, data: [{
    ...draftRegistry.set, requirement_count: 10, freshness: { stale: false, reasons: [] },
  }] });
  jest.mocked(getRequirementSetAction).mockResolvedValue({ success: true, data: draftRegistry });
  jest.mocked(prepareRequirementSetAction).mockResolvedValue({ success: true, data: preparedRegistry });
  jest.mocked(approveRequirementSetAction).mockResolvedValue({ success: true, data: approvedRegistry });
  jest.mocked(createVendorIntelligenceAction)
    .mockResolvedValueOnce({ success: true, data: { runId: "intel-1", jobId: "job-1", requirementSetId: "set-1", status: "queued", requirementCount: 0, mappedRequirementCount: 0, factCount: 0, contradictionCount: 0, warnings: [], safeErrorCode: null, createdAt: "", completedAt: null } })
    .mockResolvedValueOnce({ success: true, data: { runId: "intel-2", jobId: "job-2", requirementSetId: "set-1", status: "succeeded", requirementCount: 10, mappedRequirementCount: 8, factCount: 5, contradictionCount: 0, warnings: [], safeErrorCode: null, createdAt: "", completedAt: "" } });

  const result = await prepareComparisonPrerequisitesAction("proposal-1", [
    { submissionId: "submission-1", versionId: "version-1" },
    { submissionId: "submission-2", versionId: "version-2" },
  ]);

  expect(prepareRequirementSetAction).toHaveBeenCalledWith("proposal-1", "set-1", 1);
  expect(approveRequirementSetAction).toHaveBeenCalledWith("proposal-1", "set-1", 2);
  expect(result).toEqual({ success: true, data: {
    requirementSetId: "set-1",
    jobs: [{ submissionId: "submission-1", versionId: "version-1", jobId: "job-1" }],
  } });
});

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
