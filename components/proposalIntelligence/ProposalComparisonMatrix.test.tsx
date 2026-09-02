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
    overview: { responseCount: 2, versionCount: 2, approvedRequirementCount: 2, mandatoryGapCount: 1, mandatoryPartialCount: 0, unresolvedReviewCount: 0, evaluatorCompletedCount: 0, evaluatorAssignedCount: 0 },
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

it("opens source context from an answered cell and shows unanswered requirements as not answered", () => {
  render(<ProposalComparisonMatrix workspace={workspace} />);
  fireEvent.click(screen.getAllByRole("button", { name: /Answered/ })[0]);
  expect(screen.getByRole("dialog")).toHaveTextContent("technical.pdf");
  expect(screen.getByRole("dialog")).toHaveTextContent("page 7");
  expect(screen.getByRole("dialog")).toHaveTextContent("dedicated technical producer");
  fireEvent.click(screen.getByRole("button", { name: "Close source evidence" }));

  const civicRow = screen.getByRole("rowheader", { name: /Civic Events/ }).closest("tr");
  expect(civicRow).not.toBeNull();
  fireEvent.click(within(civicRow!).getAllByRole("button", { name: /Not answered/ })[0]);
  expect(screen.getByRole("dialog")).toHaveTextContent("No supporting text found");
  expect(screen.getByRole("dialog")).toHaveTextContent("never assumes a requirement is met");
});

it("filters the matrix by requirement category with visible counts", () => {
  render(<ProposalComparisonMatrix workspace={workspace} />);
  fireEvent.click(screen.getByRole("button", { name: "Legal · 1" }));
  expect(screen.getByRole("columnheader", { name: /Insurance certificate/ })).toBeInTheDocument();
  expect(screen.queryByRole("columnheader", { name: /Dedicated producer/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Legal · 1" })).toHaveAttribute("aria-pressed", "true");
});

it("uses one set of words for coverage, whichever verdict the backend sent", () => {
  render(<ProposalComparisonMatrix workspace={workspace} />);
  // "addressed" and "missing" used to render as "Addressed" and "Not stated";
  // "not_assessable" shared the latter, hiding a real difference.
  expect(screen.getAllByText("Answered").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Not answered").length).toBeGreaterThan(0);
  expect(screen.queryByText("Addressed")).not.toBeInTheDocument();
  expect(screen.queryByText("Not stated")).not.toBeInTheDocument();
  expect(screen.queryByText("Missing")).not.toBeInTheDocument();
});

it("shows the lines of a long passage that answer the requirement, and keeps the rest one click away", () => {
  const page = [
    "Page 1 of 9",
    "Order# 0061523 Cash - Buffalo",
    "Dallas Show Services",
    "9150 N. Royal Ln #150",
    "Irving TX 75063",
    "Salesperson: Frank Brewster",
    "Bill To: Grantmakers in Health",
    "Ship: 06/13/2025 09:00 AM",
    "A dedicated producer is assigned to this show.",
    "Strike: 06/19/2025 08:00 AM",
  ].join("\n");
  const wide = JSON.parse(JSON.stringify(workspace)) as ComparisonWorkspace;
  wide.intelligence.requirements[0].vendors[0].evidence = [{ ...evidence, excerpt: page }];
  render(<ProposalComparisonMatrix workspace={wide} />);
  fireEvent.click(screen.getAllByRole("button", { name: /Answered/ })[0]);

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent(/A dedicated producer is assigned/);
  expect(dialog).not.toHaveTextContent("Salesperson: Frank Brewster");

  fireEvent.click(within(dialog).getByRole("button", { name: /Show the full page/ }));
  expect(screen.getByRole("dialog")).toHaveTextContent("Salesperson: Frank Brewster");
});
