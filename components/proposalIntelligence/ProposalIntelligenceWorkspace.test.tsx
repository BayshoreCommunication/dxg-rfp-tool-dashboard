import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getComparisonWorkspaceAction, recordComparisonDecisionAction, type ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import ProposalIntelligenceWorkspace from "./ProposalIntelligenceWorkspace";

jest.mock("@/app/actions/comparisonOrchestration", () => ({
  getComparisonWorkspaceAction: jest.fn(),
  recordComparisonDecisionAction: jest.fn(),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const runId = "019ff44e-6fd9-7450-98a7-3ba8e912e61a";
const participantId = "019ff44e-6fd9-7450-98a7-3ba8e912e61b";
const workspace = (viewCommercial = true): ComparisonWorkspace => ({
  schemaVersion: "proposal-intelligence-comparison.v1",
  run: { runId, status: "succeeded", progress: 100, progressStage: "completed", participantCount: 2, completedParticipantCount: 2, warnings: [], createdAt: "2026-08-12T00:00:00.000Z", completedAt: "2026-08-12T00:10:00.000Z" },
  freshness: { state: "current", reasons: [] },
  manifest: { manifestId: "manifest", checksum: "a".repeat(64), proposalVersion: "1", requirementSetVersion: 1, evaluationMatrixVersion: 1, priceVisibility: viewCommercial ? "reviewers" : "hidden", policies: { extraction: "v1", assessment: "v1", commercial: "v1", scoring: "v1" } },
  participants: [
    { participantId, vendorLabel: "Northstar AV", submissionId: "1".repeat(24), versionId: "2".repeat(24), status: "succeeded", stage: "completed", warningCount: 0, safeErrorCode: null },
    { participantId: `${participantId.slice(0, -1)}c`, vendorLabel: "Civic Events", submissionId: "3".repeat(24), versionId: "4".repeat(24), status: "succeeded", stage: "completed", warningCount: 0, safeErrorCode: null },
  ],
  jobs: [],
  intelligence: {
    overview: { responseCount: 2, versionCount: 2, approvedRequirementCount: 1, mandatoryGapCount: 0, unresolvedReviewCount: 0, evaluatorCompletedCount: 1, evaluatorAssignedCount: 2 },
    requirements: [{ requirementId: "requirement", key: "technical_audio", kind: "technical", title: "Provide plenary audio", text: "Supply a complete plenary audio system.", mandatoryStatus: "mandatory", eligibility: false, importance: "high", verificationMethod: "document", groupKey: "production", ordinal: 0, vendors: [{ participantId, vendorLabel: "Northstar AV", assessmentId: "assessment", verdict: "addressed", rationale: "The response specifies the proposed system.", confidence: 0.9, needsHumanReview: false, reviewReasons: [], evidence: [{ evidenceId: "evidence", supportRole: "supports", sourceLabel: "Technical response.pdf", sourceChecksum: "b".repeat(64), locator: { page: 12 }, excerpt: "A redundant digital audio system will serve the plenary.", contentChecksum: "c".repeat(64), trustClass: "untrusted_vendor_content", facts: [] }], reviewHistory: [] }] }],
    technical: [], permissions: { viewCommercial },
    commercial: viewCommercial ? [{ participantId, vendorLabel: "Northstar AV", submittedTotal: 100000, submittedCurrency: "USD", basis: "vendor_stated", comparable: true, normalizedTotal: 100000, normalizedCurrency: "USD", arithmeticStatus: "verified_identity", assumptions: [], refusalCodes: [], policyVersion: "v1", lineItems: [] }] : [],
    risks: [], evaluation: [{ participantId, vendorLabel: "Northstar AV", submittedScores: 1, submittedEvaluators: 1, weightedContributionTotal: 72, evaluatorCount: 2, completedEvaluatorCount: 1, conflictCount: 0 }], decisions: [],
  },
});
const runs = (value: ComparisonWorkspace) => [{ schemaVersion: value.schemaVersion, run: value.run, freshness: value.freshness, participants: value.participants, jobs: value.jobs }];

beforeEach(() => jest.clearAllMocks());

test("keeps every tab bound to the same run and opens exact cited evidence", async () => {
  const value = workspace();
  render(<ProposalIntelligenceWorkspace proposalId={"f".repeat(24)} proposalTitle="GIH Annual Conference" tab="requirements" initialWorkspace={value} runs={runs(value)} />);
  expect(screen.getByRole("link", { name: "Commercial" })).toHaveAttribute("href", expect.stringContaining(`${runId}/commercial`));
  expect(screen.getByRole("link", { name: "Executive report" })).toHaveAttribute("href", expect.stringContaining(`${runId}/reports`));
  expect(screen.queryByRole("link", { name: "Audit" })).not.toBeInTheDocument();
  await userEvent.click(screen.getAllByRole("button", { name: /Inspect 1 citation/ })[0]);
  expect(screen.getByRole("dialog", { name: "Provide plenary audio" })).toBeInTheDocument();
  expect(screen.getByText("Technical response.pdf")).toBeInTheDocument();
  expect(screen.getByText(/redundant digital audio system/)).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Comparison run" })).toHaveTextContent("Aug 12, 2026, 12:00 AM UTC");
});

test("shows the comparison snapshot directly as a readable executive report without requiring an export", () => {
  const value = workspace();
  render(<ProposalIntelligenceWorkspace proposalId={"f".repeat(24)} proposalTitle="GIH Annual Conference" tab="reports" initialWorkspace={value} runs={runs(value)} />);
  expect(screen.getByRole("heading", { name: "Your vendor comparison at a glance" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Vendor comparison" })).toBeInTheDocument();
  expect(screen.getByText(/RFPilot organizes the evidence for your team/)).toBeInTheDocument();
  expect(screen.getByText("Comparison ready to review")).toBeInTheDocument();
  expect(screen.queryByText("View comparison details")).not.toBeInTheDocument();
  expect(screen.queryByText("Comparison ID")).not.toBeInTheDocument();
  expect(screen.queryByText(/Read the completed proposal intelligence directly in RFPilot/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Frozen comparison/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Viewing comparison snapshot/i)).not.toBeInTheDocument();
  expect(screen.getByText("$100,000.00")).toBeInTheDocument();
  expect(screen.getByText("1/2 evaluators complete")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Human decision" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Priority review signals" })).not.toBeInTheDocument();
  expect(screen.queryByText(/This report summarizes persisted evidence/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /Export options/i })).not.toBeInTheDocument();
});

test("shows a sealed state without rendering pricing when the API denies commercial access", () => {
  const value = workspace(false);
  render(<ProposalIntelligenceWorkspace proposalId={"f".repeat(24)} proposalTitle="GIH Annual Conference" tab="commercial" initialWorkspace={value} runs={runs(value)} />);
  expect(screen.getByRole("heading", { name: "Commercial values are sealed" })).toBeInTheDocument();
  expect(screen.queryByText("$100,000.00")).not.toBeInTheDocument();
});

test("records only an explicit human selection and starts with no vendor selected", async () => {
  const value = workspace();
  jest.mocked(recordComparisonDecisionAction).mockResolvedValue({ success: true, data: { decisionId: "decision" } });
  jest.mocked(getComparisonWorkspaceAction).mockResolvedValue({ success: true, data: value });
  render(<ProposalIntelligenceWorkspace proposalId={"f".repeat(24)} proposalTitle="GIH Annual Conference" tab="evaluation" initialWorkspace={value} runs={runs(value)} />);
  expect(screen.queryByRole("radio", { name: "Northstar AV" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("radio", { name: "Selection" }));
  const vendor = screen.getByRole("radio", { name: "Northstar AV" });
  expect(vendor).not.toBeChecked();
  await userEvent.click(vendor);
  await userEvent.type(screen.getByLabelText("Decision rationale"), "Best fit after committee review of the frozen evidence.");
  await userEvent.click(screen.getByRole("button", { name: "Record decision" }));
  await waitFor(() => expect(recordComparisonDecisionAction).toHaveBeenCalledWith("f".repeat(24), runId, expect.objectContaining({ decisionType: "selection", selectedParticipantIds: [participantId] })));
});
