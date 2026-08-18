import { render, screen } from "@testing-library/react";
import type { IntelligenceOperationsBundle } from "@/app/actions/proposalIntelligenceOperations";
import { AuditOperationsCenter, ReportCenter } from "./ProposalIntelligenceOperationsWorkspace";

jest.mock("@/app/actions/proposalIntelligenceOperations", () => ({
  approveClarificationSetAction: jest.fn(),
  createClarificationSetAction: jest.fn(),
  getIntelligenceOperationsBundleAction: jest.fn(),
  placeIntelligenceLegalHoldAction: jest.fn(),
  recordClarificationDispatchAction: jest.fn(),
  releaseIntelligenceLegalHoldAction: jest.fn(),
  updateClarificationQuestionAction: jest.fn(),
  updateIntelligenceRetentionPolicyAction: jest.fn(),
}));

const proposalId = "f".repeat(24);
const runId = "019ff44e-6fd9-7450-98a7-3ba8e912e61a";
const bundle: IntelligenceOperationsBundle = {
  operations: { schemaVersion: "proposal-intelligence-operations.v1", runId, status: "succeeded", progress: 100, freshnessState: "current", durationMs: 600000, report_export_count: 0, decision_count: 1, clarification_set_count: 0, approved_clarification_count: 0, failed_job_count: 0, participant_warning_count: 0, unresolved_review_count: 0, active_legal_hold_count: 0 },
  clarifications: [],
  audit: {
    schemaVersion: "proposal-intelligence-audit.v1", runId, generatedAt: "2026-08-13T00:00:00.000Z", freshness: { state: "current", reasons: [] },
    manifest: { content_checksum: "a".repeat(64), proposal_version: "1", proposal_checksum: "b".repeat(64), requirement_set_version: 1, requirement_checksum: "c".repeat(64), matrix_version: 1, matrix_checksum: "d".repeat(64), price_visibility: "hidden", created_at: "2026-08-13T00:00:00.000Z" },
    events: [], exports: [], clarificationEvents: [], legalHoldEvents: [], retentionPolicy: { procurement_record_retention_days: 2555, policy_basis: "Default procurement record retention policy.", policy_version: "default-v1", version: 0, updated_at: null },
  },
};

test("optional exports stay on one run and explain sealed pricing", () => {
  render(<ReportCenter proposalId={proposalId} runId={runId} initialBundle={bundle} viewCommercial={false} />);
  expect(screen.getByText(/Commercial values are sealed and omitted from every exported file/)).toBeInTheDocument();
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(2);
  expect(links.every((link) => link.getAttribute("href")?.includes(`/${proposalId}/${runId}/`))).toBe(true);
  expect(screen.getByRole("link", { name: "Export executive PDF" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Download comparison Excel" })).toBeInTheDocument();
  expect(screen.getByText(/sending remains a separately authorized campaign or manual action/i)).toBeInTheDocument();
});

test("keeps completed evaluation and clarification records in the in-app workflow instead of adding downloads", () => {
  const readyBundle: IntelligenceOperationsBundle = {
    ...bundle,
    operations: { ...bundle.operations, decision_count: 0, approved_clarification_count: 1 },
    clarifications: [{ setId: "set", setVersion: 1, status: "approved", manifestChecksum: "m", contentChecksum: "c", lockVersion: 1, approvedAt: "2026-08-13T00:00:00.000Z", dispatchRecordedAt: null, createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z", questions: [] }],
  };
  render(<ReportCenter proposalId={proposalId} runId={runId} initialBundle={readyBundle} viewCommercial />);
  expect(screen.getAllByRole("link")).toHaveLength(2);
  expect(screen.getByRole("heading", { name: "Clarification approval center" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Evaluator report" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Decision record" })).not.toBeInTheDocument();
});

test("audit view exposes additive governance controls without a delete action", () => {
  render(<AuditOperationsCenter proposalId={proposalId} runId={runId} initialBundle={bundle} />);
  expect(screen.getByRole("heading", { name: "Frozen provenance" })).toBeInTheDocument();
  expect(screen.getByText(/does not run destructive cleanup/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Place legal hold" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /delete|purge/i })).not.toBeInTheDocument();
});
