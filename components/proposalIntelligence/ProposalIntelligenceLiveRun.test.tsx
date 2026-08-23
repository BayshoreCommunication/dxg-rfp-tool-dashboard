import type { ComparisonView } from "@/app/actions/comparisonOrchestration";
import { getDurableJob } from "@/app/actions/durableJobs";
import type { VendorIntelligenceResult } from "@/app/actions/vendorIntelligence";
import { createEvidenceExtractionAction, getEvidenceExtractionsAction } from "@/app/actions/evidenceExtraction";
import { createVendorIntelligenceAction, getLatestVendorIntelligenceAction } from "@/app/actions/vendorIntelligence";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ProposalIntelligenceLiveRun, { type ProposalAnalysisParticipant } from "./ProposalIntelligenceLiveRun";

jest.mock("@/app/actions/durableJobs", () => ({ getDurableJob: jest.fn() }));
jest.mock("@/app/actions/evidenceExtraction", () => ({
  createEvidenceExtractionAction: jest.fn(),
  getEvidenceExtractionsAction: jest.fn(),
}));
jest.mock("@/app/actions/vendorIntelligence", () => ({
  createVendorIntelligenceAction: jest.fn(),
  getLatestVendorIntelligenceAction: jest.fn(),
}));

const evidence = {
  fragmentId: "fragment-1",
  content: "The stated total is USD 125,000.",
  locator: { page: 4 },
  sourceLabel: "pricing.pdf",
};

const intelligence = (relationship = "supports"): VendorIntelligenceResult => ({
  run: {
    runId: "run-1", jobId: "job-1", requirementSetId: "set-1", status: "succeeded",
    requirementCount: 2, mappedRequirementCount: 2, factCount: 1,
    contradictionCount: relationship === "contradicts" ? 1 : 0, warnings: [], safeErrorCode: null,
    createdAt: "2026-08-16T10:00:00.000Z", completedAt: "2026-08-16T10:01:00.000Z",
  },
  mappings: [
    { mappingId: "mapping-1", requirementId: "requirement-1", requirementTitle: "Pricing", requirementKind: "commercial", mandatory: true, relationship, confidence: 0.9, ambiguityReasons: [], evidence: relationship === "none" ? [] : [evidence] },
    { mappingId: "mapping-2", requirementId: "requirement-2", requirementTitle: "Insurance", requirementKind: "legal", mandatory: true, relationship: "none", confidence: 0.8, ambiguityReasons: [], evidence: [] },
  ],
  facts: [{
    factId: "fact-1", factKey: "commercial.total", family: "commercial", factType: "commercial_total",
    statement: "The total is USD 125,000.", valueKind: "money", typedValue: { number: 125000, currency: "USD" },
    normalizedValue: "USD 125000", unit: null, currency: "USD", explicitness: "explicit", confidence: 0.98,
    contradictionGroup: null, citations: [{ ...evidence, role: "supports" }],
  }],
  reviews: [],
});

const participant = (id: string, result = intelligence()): ProposalAnalysisParticipant => ({
  responseId: id,
  vendorLabel: id === "vendor-1" ? "Northstar AV" : "Civic Events",
  submissionId: `submission-${id}`,
  versionId: `version-${id}`,
  documentNames: [`${id}.pdf`],
  extraction: {
    status: "ready",
    runs: [{
      runId: `extraction-${id}`, jobId: `extract-job-${id}`, sourceKind: "document", sourceLabel: `${id}.pdf`,
      mimeType: "application/pdf", status: "succeeded", method: "native_pdf", coverage: 1,
      fragmentCount: 10, tableCount: 1, pageCount: 5, warnings: [], reused: false, preview: [],
      createdAt: "2026-08-16T10:00:00.000Z", completedAt: "2026-08-16T10:00:30.000Z",
    }],
  },
  intelligence: result,
});

const comparison: ComparisonView = {
  schemaVersion: "v1",
  run: { runId: "comparison-1", status: "succeeded", progress: 100, progressStage: "completed", participantCount: 2, completedParticipantCount: 2, warnings: [], createdAt: "2026-08-16T10:00:00.000Z", completedAt: "2026-08-16T10:02:00.000Z" },
  freshness: { state: "current", reasons: [] },
  participants: [],
  jobs: [],
};

it("renders the five persisted phases, real counts, and grounded values without a bare spinner", () => {
  const { container } = render(
    <ProposalIntelligenceLiveRun
      proposalId="proposal-1"
      initialParticipants={[participant("vendor-1"), participant("vendor-2", intelligence("contradicts"))]}
      autoStart={false}
    />,
  );

  expect(screen.getByText("1. Reading documents")).toBeInTheDocument();
  expect(screen.getByText("2. Locating required fields")).toBeInTheDocument();
  expect(screen.getByText("3. Normalizing values")).toBeInTheDocument();
  expect(screen.getByText("4. Cross-checking conflicts and gaps")).toBeInTheDocument();
  expect(screen.getByText("5. Scoring against criteria")).toBeInTheDocument();
  expect(screen.getByText("1 contradictions · 2 requirements not stated")).toBeInTheDocument();
  expect(screen.getAllByText("USD 125000")).toHaveLength(2);
  const firstValue = screen.getAllByText("USD 125000")[0].closest("div");
  expect(firstValue).not.toBeNull();
  expect(within(firstValue!).getByText("pricing.pdf")).toBeInTheDocument();
  expect(within(firstValue!).getByText("page 4")).toBeInTheDocument();
  expect(container.querySelector(".animate-spin")).toBeNull();
  expect(screen.getByText(/Reviewer scorecards and critical evidence dispositions/)).toBeInTheDocument();
});

it("restores a completed comparison as complete without starting another run", () => {
  render(
    <ProposalIntelligenceLiveRun
      proposalId="proposal-1"
      initialParticipants={[participant("vendor-1"), participant("vendor-2")]}
      comparison={comparison}
    />,
  );

  expect(screen.getAllByText("Complete").length).toBeGreaterThanOrEqual(5);
  expect(screen.getByText("2 of 2 persisted vendor snapshots complete")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Run extraction and mapping" })).not.toBeInTheDocument();
});

it("keeps unreadable responses explicit and does not manufacture requirement or score counts", () => {
  const unreadable = {
    ...participant("vendor-2"),
    extraction: { status: "unreadable" as const, runs: [] },
    intelligence: null,
  };
  render(
    <ProposalIntelligenceLiveRun
      proposalId="proposal-1"
      initialParticipants={[participant("vendor-1"), unreadable]}
      autoStart={false}
    />,
  );

  expect(screen.getAllByText("Partial").length).toBeGreaterThan(0);
  expect(screen.getByText(/1 failed items/)).toBeInTheDocument();
  expect(screen.getByText("Unavailable")).toBeInTheDocument();
  expect(screen.getByText(/Fewer than two responses survived extraction/)).toBeInTheDocument();
  expect(screen.queryByText("0 of 0 persisted vendor snapshots complete")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry extraction" })).toBeInTheDocument();
});

it("retries only the failed vendor extraction and keeps the document named", async () => {
  const failed = { ...participant("vendor-2"), extraction: { status: "failed" as const, runs: [] }, intelligence: null, error: "PDF parsing failed." };
  jest.mocked(createEvidenceExtractionAction).mockResolvedValue({ success: true, data: { runs: [], unavailable: [] } });
  jest.mocked(getEvidenceExtractionsAction).mockResolvedValue({ success: true, data: failed.extraction });
  jest.mocked(getLatestVendorIntelligenceAction).mockResolvedValue({ success: false, code: "INTELLIGENCE_RUN_NOT_FOUND", message: "Not started." });
  render(<ProposalIntelligenceLiveRun proposalId="proposal-1" initialParticipants={[participant("vendor-1"), failed]} autoStart={false} />);
  expect(screen.getByText("vendor-2.pdf · no extraction result")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry extraction" }));
  await waitFor(() => expect(createEvidenceExtractionAction).toHaveBeenCalledWith("proposal-1", "submission-vendor-2", "version-vendor-2", expect.any(String)));
  expect(createEvidenceExtractionAction).toHaveBeenCalledTimes(1);
});

it("retries all cached mapping failures and explains safe recovery", async () => {
  const failedIntelligence = (id: string): VendorIntelligenceResult => ({
    ...intelligence(),
    run: {
      ...intelligence().run,
      runId: `run-${id}`,
      jobId: `job-${id}`,
      status: "failed",
      safeErrorCode: "SCHEMA_VALIDATION_FAILED",
      completedAt: "2026-08-16T10:01:00.000Z",
    },
  });
  jest.mocked(createVendorIntelligenceAction).mockImplementation(async (_proposalId, _submissionId, versionId) => ({
    success: true,
    data: {
      ...failedIntelligence(versionId).run,
      status: "queued",
      safeErrorCode: null,
      completedAt: null,
    },
  }));
  render(<ProposalIntelligenceLiveRun
    proposalId="proposal-1"
    initialParticipants={[
      participant("vendor-1", failedIntelligence("vendor-1")),
      participant("vendor-2", failedIntelligence("vendor-2")),
    ]}
    autoStart={false}
  />);

  expect(screen.getAllByText(/generated mapping was incomplete/i)).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Retry all failed steps" }));
  await waitFor(() => expect(createVendorIntelligenceAction).toHaveBeenCalledTimes(2));
  expect(createVendorIntelligenceAction).toHaveBeenCalledWith("proposal-1", "submission-vendor-1", "version-vendor-1", expect.any(String));
  expect(createVendorIntelligenceAction).toHaveBeenCalledWith("proposal-1", "submission-vendor-2", "version-vendor-2", expect.any(String));
});

it("explains when production policy blocks confidential vendor mapping", () => {
  const blocked = intelligence();
  blocked.run = {
    ...blocked.run,
    status: "failed",
    safeErrorCode: "LIVE_AI_CLASSIFICATION_DENIED",
  };

  render(<ProposalIntelligenceLiveRun
    proposalId="proposal-1"
    initialParticipants={[participant("vendor-1", blocked), participant("vendor-2")]}
    autoStart={false}
  />);

  expect(screen.getByText(/vendor-response ai processing is not enabled/i)).toBeInTheDocument();
});

it("stops an unreachable background job from polling and appearing in progress forever", async () => {
  jest.useFakeTimers();
  const queued = {
    ...intelligence(),
    run: {
      ...intelligence().run,
      status: "running" as const,
      completedAt: null,
    },
  };
  jest.mocked(getDurableJob).mockResolvedValue({
    success: false,
    code: "JOB_NOT_FOUND",
    message: "The job is no longer available.",
    correlationId: "test-correlation-id",
  });
  render(<ProposalIntelligenceLiveRun
    proposalId="proposal-1"
    initialParticipants={[participant("vendor-1", queued), participant("vendor-2")]}
    autoStart={false}
  />);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await act(async () => {
      jest.advanceTimersByTime(2_000);
      await Promise.resolve();
    });
  }
  expect(getDurableJob).toHaveBeenCalledTimes(5);
  expect(screen.getByText(/background job stopped reporting status/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Retry requirement mapping" })).toBeInTheDocument();
  expect(screen.queryByText("In progress")).not.toBeInTheDocument();
  jest.useRealTimers();
});

it("settles the run when preparation fails before a background job is created", async () => {
  const waiting = (id: string): ProposalAnalysisParticipant => ({
    ...participant(id),
    extraction: { status: "not_started", runs: [] },
    intelligence: null,
  });
  jest.mocked(createEvidenceExtractionAction).mockClear();
  jest.mocked(createEvidenceExtractionAction).mockResolvedValue({
    success: false,
    code: "PROPOSAL_NOT_FOUND",
    message: "Proposal was not found.",
  });

  render(<ProposalIntelligenceLiveRun
    proposalId="proposal-1"
    initialParticipants={[waiting("vendor-1"), waiting("vendor-2")]}
  />);

  await waitFor(() => expect(createEvidenceExtractionAction).toHaveBeenCalledTimes(2));
  await waitFor(() => {
    expect(screen.getAllByText("Proposal was not found.")).toHaveLength(2);
    expect(screen.getByText("2 failed items")).toBeInTheDocument();
    expect(screen.queryByText("In progress")).not.toBeInTheDocument();
  });
});

it("marks a completed stale comparison as historical attention", () => {
  render(<ProposalIntelligenceLiveRun proposalId="proposal-1" initialParticipants={[participant("vendor-1"), participant("vendor-2")]} comparison={{ ...comparison, freshness: { state: "stale", reasons: ["requirement_set_changed"] } }} />);
  expect(screen.getAllByText("Needs attention").length).toBeGreaterThan(0);
  expect(screen.getByText(/persisted vendor snapshots complete · historical inputs/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Run extraction and mapping" })).not.toBeInTheDocument();
});
