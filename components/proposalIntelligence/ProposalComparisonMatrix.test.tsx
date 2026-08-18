import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ProposalComparisonMatrix from "./ProposalComparisonMatrix";

const evidence = {
  evidenceId: "evidence-1",
  sourceLabel: "technical.pdf",
  sourceChecksum: "source-checksum",
  locator: { page: 7 },
  excerpt: "The vendor provides a dedicated technical producer.",
  contentChecksum: "content-checksum",
  trustClass: "untrusted_vendor_content",
};

const workspace = {
  schemaVersion: "v1",
  run: { runId: "run-1", status: "succeeded", progress: 100, progressStage: "completed", participantCount: 2, completedParticipantCount: 2, warnings: [], createdAt: "2026-08-16", completedAt: "2026-08-16" },
  freshness: { state: "current", reasons: [] },
  participants: [
    { participantId: "vendor-1", vendorLabel: "Northstar AV", submissionId: "submission-1", versionId: "version-111111", status: "succeeded", stage: "completed", warningCount: 0, safeErrorCode: null },
    { participantId: "vendor-2", vendorLabel: "Civic Events", submissionId: "submission-2", versionId: "version-222222", status: "succeeded", stage: "completed", warningCount: 0, safeErrorCode: null },
  ],
  jobs: [],
  manifest: { manifestId: "manifest-1", checksum: "checksum", proposalVersion: "v1", requirementSetVersion: 1, evaluationMatrixVersion: 1, priceVisibility: "reviewers", policies: { extraction: "v1", assessment: "v1", commercial: "v1", scoring: "v1", comparison: "v1", recommendation: "v1" } },
  recommendation: null,
  intelligence: {
    overview: { responseCount: 2, versionCount: 2, approvedRequirementCount: 2, mandatoryGapCount: 1, unresolvedReviewCount: 0, evaluatorCompletedCount: 0, evaluatorAssignedCount: 0 },
    requirements: [
      { requirementId: "requirement-1", key: "staffing", kind: "technical", title: "Dedicated producer", text: "Provide a dedicated producer.", mandatoryStatus: "mandatory", eligibility: false, importance: "high", verificationMethod: "document", groupKey: "technical", ordinal: 1, vendors: [
        { participantId: "vendor-1", vendorLabel: "Northstar AV", assessmentId: "assessment-1", verdict: "addressed", rationale: "A producer is explicitly named.", confidence: 0.9, needsHumanReview: false, reviewReasons: [], evidence: [evidence], reviewHistory: [] },
        { participantId: "vendor-2", vendorLabel: "Civic Events", assessmentId: "assessment-2", verdict: "missing", rationale: "The response does not state this role.", confidence: 0.8, needsHumanReview: false, reviewReasons: [], evidence: [], reviewHistory: [] },
      ] },
      { requirementId: "requirement-2", key: "insurance", kind: "legal", title: "Insurance certificate", text: "Provide insurance.", mandatoryStatus: "mandatory", eligibility: true, importance: "high", verificationMethod: "document", groupKey: "legal", ordinal: 2, vendors: [] },
    ],
    technical: [], permissions: { viewCommercial: false }, commercial: [], risks: [], evaluation: [], decisions: [],
  },
} as ComparisonWorkspace;

it("renders respondents as rows, requirements as columns, and source coverage in the footer", () => {
  render(<ProposalComparisonMatrix workspace={workspace} />);
  const table = screen.getByRole("table");
  expect(within(table).getByRole("rowheader", { name: /Northstar AV/ })).toBeInTheDocument();
  expect(within(table).getByRole("columnheader", { name: /Dedicated producer/ })).toBeInTheDocument();
  expect(screen.getByText("1/2 with source evidence")).toBeInTheDocument();
  expect(screen.getByText("0/2 with source evidence")).toBeInTheDocument();
});

it("opens source context from an addressed cell and treats missing evidence as not stated", () => {
  render(<ProposalComparisonMatrix workspace={workspace} />);
  fireEvent.click(screen.getByRole("button", { name: /Addressed/ }));
  expect(screen.getByRole("dialog")).toHaveTextContent("technical.pdf");
  expect(screen.getByRole("dialog")).toHaveTextContent("page 7");
  expect(screen.getByRole("dialog")).toHaveTextContent("dedicated technical producer");
  fireEvent.click(screen.getByRole("button", { name: "Close source evidence" }));

  const civicRow = screen.getByRole("rowheader", { name: /Civic Events/ }).closest("tr");
  expect(civicRow).not.toBeNull();
  fireEvent.click(within(civicRow!).getAllByRole("button", { name: /Not stated/ })[0]);
  expect(screen.getByRole("dialog")).toHaveTextContent("No source passage stored");
  expect(screen.getByRole("dialog")).toHaveTextContent("does not infer compliance");
});

it("filters the matrix by requirement category with visible counts", () => {
  render(<ProposalComparisonMatrix workspace={workspace} />);
  fireEvent.click(screen.getByRole("button", { name: "Legal · 1" }));
  expect(screen.getByRole("columnheader", { name: /Insurance certificate/ })).toBeInTheDocument();
  expect(screen.queryByRole("columnheader", { name: /Dedicated producer/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Legal · 1" })).toHaveAttribute("aria-pressed", "true");
});
