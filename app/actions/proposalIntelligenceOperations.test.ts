import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { getIntelligenceOperationsBundleAction, recordClarificationDispatchAction } from "./proposalIntelligenceOperations";

jest.mock("@/lib/server/backendClient", () => ({ authenticatedBackendFetch: jest.fn() }));
jest.mock("@/lib/config", () => ({ BACKEND_URL: "http://backend.test" }));

const proposalId = "f".repeat(24);
const runId = "019ff44e-6fd9-7450-98a7-3ba8e912e61a";
const ok = (data: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => ({ data }) } as Response);

beforeEach(() => jest.clearAllMocks());

test("loads audit, operations, and clarification state in parallel from one run", async () => {
  jest.mocked(authenticatedBackendFetch).mockImplementation((url) => {
    const path = String(url);
    if (path.endsWith("/audit")) return ok({ schemaVersion: "proposal-intelligence-audit.v1", runId, generatedAt: "2026-08-13T00:00:00.000Z", freshness: { state: "current", reasons: [] }, manifest: { content_checksum: "a".repeat(64), proposal_version: "1", proposal_checksum: "b".repeat(64), requirement_set_version: 1, requirement_checksum: "c".repeat(64), matrix_version: 1, matrix_checksum: "d".repeat(64), price_visibility: "hidden", created_at: "2026-08-13T00:00:00.000Z" }, events: [], exports: [], clarificationEvents: [], legalHoldEvents: [], retentionPolicy: { procurement_record_retention_days: 2555, policy_basis: "Default procurement record retention policy.", policy_version: "default-v1", version: 0, updated_at: null } });
    if (path.endsWith("/operations")) return ok({ schemaVersion: "proposal-intelligence-operations.v1", runId, status: "succeeded", progress: 100, freshnessState: "current", durationMs: 1200, report_export_count: 0, decision_count: 0, clarification_set_count: 0, approved_clarification_count: 0, failed_job_count: 0, participant_warning_count: 0, unresolved_review_count: 0, active_legal_hold_count: 0 });
    return ok([]);
  });
  const result = await getIntelligenceOperationsBundleAction(proposalId, runId);
  expect(result).toEqual(expect.objectContaining({ success: true, data: expect.objectContaining({ audit: expect.objectContaining({ runId }), operations: expect.objectContaining({ runId }), clarifications: [] }) }));
  expect(authenticatedBackendFetch).toHaveBeenCalledTimes(3);
  expect(jest.mocked(authenticatedBackendFetch).mock.calls.every(([url]) => String(url).includes(runId))).toBe(true);
});

test("clarification dispatch action records an external event instead of sending email", async () => {
  jest.mocked(authenticatedBackendFetch).mockImplementation(() => ok({ setId: "set-1", setVersion: 1, status: "dispatch_recorded", manifestChecksum: "a".repeat(64), contentChecksum: "b".repeat(64), lockVersion: 3, approvedAt: "2026-08-13T00:00:00.000Z", dispatchRecordedAt: "2026-08-13T01:00:00.000Z", createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T01:00:00.000Z", questions: [] }));
  const result = await recordClarificationDispatchAction(proposalId, runId, "set-1", { channel: "manual", externalReference: "procurement-log-44", recipientCount: 2 });
  expect(result).toEqual(expect.objectContaining({ success: true, data: expect.objectContaining({ status: "dispatch_recorded" }) }));
  const [url, init] = jest.mocked(authenticatedBackendFetch).mock.calls[0]!;
  expect(String(url)).toContain("/record-dispatch");
  expect(String(url)).not.toContain("send-email");
  expect(init).toEqual(expect.objectContaining({ method: "POST", body: expect.stringContaining("procurement-log-44") }));
});
