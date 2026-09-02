import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import VendorEvaluationSection from "./VendorEvaluationSection";
import {
  createEvaluationAction, declareEvaluationConflictAction, getLatestEvaluationAction,
  recordEvaluationScoreAction, reopenEvaluationScoreAction, setCommercialAccessAction,
  type EvaluationView,
} from "@/app/actions/evaluationEngine";

jest.mock("@/app/actions/evaluationEngine", () => ({
  createEvaluationAction: jest.fn(), declareEvaluationConflictAction: jest.fn(), getLatestEvaluationAction: jest.fn(),
  recordEvaluationScoreAction: jest.fn(), reopenEvaluationScoreAction: jest.fn(), setCommercialAccessAction: jest.fn(),
}));
const latest = getLatestEvaluationAction as jest.MockedFunction<typeof getLatestEvaluationAction>;
const record = recordEvaluationScoreAction as jest.MockedFunction<typeof recordEvaluationScoreAction>;
const view: EvaluationView = {
  run: { runId: "run-1", status: "ready", sealedPrice: false, assessmentCount: 1, riskCount: 1, questionCount: 1, scoringPolicyVersion: "confirmed-rubric-score.v1", createdAt: "2026-08-12" },
  permission: { owner: true, assigned: true, canViewCommercial: true },
  assignment: { assignmentId: "assignment-1", role: "combined", conflictStatus: "clear", conflictNote: "", status: "open", version: 2, criterionIds: ["criterion-1"], complete: false, overallScore: null },
  criteria: [{ criterionId: "criterion-1", key: "technical", name: "Technical Approach", description: "Evaluate the cited technical response.", weight: 25, rubricMaximum: 5, rubricAnchors: [{ score: 3, label: "Meets", description: "The cited response evidence adequately meets the approved requirements." }], priceVisibility: "reviewers", humanOnly: false, requirementIds: ["requirement-1"] }],
  assessments: [{ assessmentId: "assessment-1", requirementId: "requirement-1", requirementTitle: "Provide redundant streaming", mandatory: true, eligibility: false, verdict: "partially_addressed", rationale: "Only partial cited coverage exists.", confidence: 0.42, needsHumanReview: true, reviewReasons: ["low_extraction_confidence"], evidence: [{ fragmentId: "fragment-1", sourceLabel: "Vendor.pdf", locator: { page: 8 }, content: "A backup encoder is available as an option." }] }],
  risks: [{ riskId: "risk-1", category: "mandatory_gap", severity: "high", title: "Mandatory item needs disposition", basis: "This is a review flag, not an automatic disqualification.", question: "Please clarify the redundancy plan.", evidence: [] }],
  commercial: { submittedTotal: 120000, submittedCurrency: "USD", comparable: false, normalizedTotal: null, normalizedCurrency: null, arithmeticStatus: "refused", assumptions: [], refusalCodes: ["UNRESOLVED_OPTIONS_OR_EXCLUSIONS"], policyVersion: "commercial-normalization.v1", lineItems: [] },
  scores: [], aggregates: [], assignments: [],
};

beforeEach(() => {
  jest.clearAllMocks(); latest.mockResolvedValue({ success: true, data: view });
  (createEvaluationAction as jest.Mock).mockResolvedValue({ success: true, data: { runId: "run-1" } });
  (declareEvaluationConflictAction as jest.Mock).mockResolvedValue({ success: true, data: { assignmentId: "assignment-1" } });
  record.mockResolvedValue({ success: true, data: { eventId: "event-1" } });
  (reopenEvaluationScoreAction as jest.Mock).mockResolvedValue({ success: true, data: { eventId: "event-2" } });
  (setCommercialAccessAction as jest.Mock).mockResolvedValue({ success: true, data: { eventId: "access-1" } });
});

test("shows how sure the extraction was as review metadata, not a score", async () => {
  render(<VendorEvaluationSection proposalId="proposal" submissionId="submission" versionId="version" />);
  expect(await screen.findByText("Provide redundant streaming")).toBeInTheDocument();
  expect(screen.getByText(/42% sure we read this correctly/)).toBeInTheDocument();
  expect(
    screen.getByText(/RFPilot supplies a starting score from the cited evidence/),
  ).toBeInTheDocument();
});

test("keeps submitted price visible while refusing an unsafe normalized value", async () => {
  render(<VendorEvaluationSection proposalId="proposal" submissionId="submission" versionId="version" />);
  await screen.findByText("Provide redundant streaming");
  fireEvent.click(screen.getByRole("button", { name: "Commercial" }));
  expect(screen.getByText("$120,000.00")).toBeInTheDocument();
  expect(screen.getByText("Not comparable")).toBeInTheDocument();
  expect(screen.getByText(/unresolved options or exclusions/i)).toBeInTheDocument();
});

test("submits a human rubric score with rationale and cited vendor evidence", async () => {
  render(<VendorEvaluationSection proposalId="proposal" submissionId="submission" versionId="version" />);
  await screen.findByText("Provide redundant streaming");
  fireEvent.click(screen.getByRole("button", { name: "Scorecard" }));
  fireEvent.change(screen.getByLabelText("Technical Approach score"), { target: { value: "4" } });
  fireEvent.change(screen.getByLabelText("Technical Approach rationale"), { target: { value: "Strong approach with one option dependency." } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Submit score" }));
  await waitFor(() => expect(record).toHaveBeenCalledWith("proposal", "submission", "version", "run-1", {
    criterionId: "criterion-1", eventType: "submitted", score: 4, rationale: "Strong approach with one option dependency.", evidenceFragmentIds: ["fragment-1"],
  }));
});

test("sealed price returns no hidden value and offers explicit owner authorization", async () => {
  latest.mockResolvedValue({ success: true, data: { ...view, run: { ...view.run, sealedPrice: true }, permission: { ...view.permission, canViewCommercial: false }, commercial: null } });
  render(<VendorEvaluationSection proposalId="proposal" submissionId="submission" versionId="version" />);
  await screen.findByText("Provide redundant streaming");
  fireEvent.click(screen.getByRole("button", { name: "Commercial" }));
  expect(screen.getByText("Commercial values are sealed")).toBeInTheDocument();
  expect(screen.queryByText("$120,000.00")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Grant my assignment access" })).toBeInTheDocument();
});

test("observer assignments can inspect the evaluation but cannot enter scores", async () => {
  latest.mockResolvedValue({
    success: true,
    data: { ...view, assignment: { ...view.assignment!, role: "observer" } },
  });
  render(<VendorEvaluationSection proposalId="proposal" submissionId="submission" versionId="version" />);
  await screen.findByText("Provide redundant streaming");
  fireEvent.click(screen.getByRole("button", { name: "Scorecard" }));

  expect(screen.getByText(/observer assignment is read-only/i)).toBeInTheDocument();
  expect(screen.queryByLabelText("Technical Approach score")).not.toBeInTheDocument();
  expect(record).not.toHaveBeenCalled();
});

/** An automated baseline used to be presented as "Completed human evaluator score". */
const automatedScored: EvaluationView = {
  ...view,
  assignment: { ...view.assignment!, complete: true, overallScore: 56.44 },
  scores: [{
    eventId: "event-auto", assignmentId: "assignment-1", criterionId: "criterion-1",
    eventType: "submitted", score: 4.25, rubricMaximum: 5, criterionWeight: 25,
    weightedContribution: 21.25,
    rationale: "Automated evidence-derived score for Technical Approach: 1 partially addressed. This is a transparent system baseline, not a human reviewer opinion.",
    evidenceFragmentIds: ["fragment-1"], scoringPolicyVersion: "evidence-derived-rubric-score.v1",
    createdAt: "2026-08-12",
  }],
  aggregates: [{ criterionId: "criterion-1", submittedCount: 1, assignedCount: 1, mean: 4.25, minimum: 4.25, maximum: 4.25, spread: 0, meanWeightedContribution: 21.25 }],
};

test("never presents an automated baseline as a score the user gave", async () => {
  latest.mockResolvedValue({ success: true, data: automatedScored });
  render(<VendorEvaluationSection proposalId="proposal" submissionId="submission" versionId="version" />);
  fireEvent.click(await screen.findByRole("button", { name: "Scorecard" }));

  expect(screen.queryByText(/Completed human evaluator score/i)).not.toBeInTheDocument();
  expect(
    screen.getByText("RFPilot starting score — you have not scored this vendor yet"),
  ).toBeInTheDocument();
  expect(screen.getByText("56.44 / 100")).toBeInTheDocument();
  expect(screen.getByText(/You have not scored this vendor yet/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Score this yourself" })).toBeInTheDocument();
});

test("reports the score plainly instead of a mean and a spread of zero", async () => {
  latest.mockResolvedValue({ success: true, data: automatedScored });
  render(<VendorEvaluationSection proposalId="proposal" submissionId="submission" versionId="version" />);
  fireEvent.click(await screen.findByRole("button", { name: "Scorecard" }));

  expect(screen.queryByText(/spread/i)).not.toBeInTheDocument();
  expect(
    screen.getByText("RFPilot starting score 4.25 · you have not scored it"),
  ).toBeInTheDocument();
});

test("explains a criterion no requirement feeds instead of showing it as zero out of five", async () => {
  latest.mockResolvedValue({
    success: true,
    data: {
      ...automatedScored,
      criteria: [{ ...view.criteria[0], name: "Sustainability & DEI Practices", weight: 5, requirementIds: ["requirement-none"] }],
      scores: [{ ...automatedScored.scores[0], score: 0, weightedContribution: 0, rationale: "Automated evidence-derived score for Sustainability & DEI Practices: no mapped requirements. This is a transparent system baseline, not a human reviewer opinion." }],
    },
  });
  render(<VendorEvaluationSection proposalId="proposal" submissionId="submission" versionId="version" />);
  fireEvent.click(await screen.findByRole("button", { name: "Scorecard" }));

  expect(screen.getByText("Not scored — nothing to score it against")).toBeInTheDocument();
  expect(screen.getByText(/no requirement feeding/)).toBeInTheDocument();
  expect(screen.getByText(/set its weight to 0%/)).toBeInTheDocument();
  expect(screen.queryByText(/0 \/ 5/)).not.toBeInTheDocument();
});

test("does not offer an evaluation the server would refuse, and explains why", async () => {
  latest.mockResolvedValue({ success: false, code: "EVALUATION_RUN_NOT_FOUND", message: "No evaluation snapshot exists for this response version." });
  render(<VendorEvaluationSection proposalId="p" submissionId="s" versionId="v" gate={{ state: "coverage_blocked", details: ["Response.pdf: A page could not be extracted with OCR."] }} />);
  expect(await screen.findByText(/Scoring is blocked until every page/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Start evaluation" })).toBeDisabled();
  expect(screen.getByText("Response.pdf: A page could not be extracted with OCR.")).toBeInTheDocument();
  expect(screen.queryByText(/Hide pricing from evaluators/)).not.toBeInTheDocument();
  expect(screen.queryByText(/approve your requirement checklist first/)).not.toBeInTheDocument();
});

test("offers to start an evaluation with plain-language price sealing when the analysis is ready", async () => {
  latest.mockResolvedValue({ success: false, code: "EVALUATION_RUN_NOT_FOUND", message: "No evaluation snapshot exists for this response version." });
  render(<VendorEvaluationSection proposalId="p" submissionId="s" versionId="v" gate={{ state: "ready" }} />);
  const button = await screen.findByRole("button", { name: "Start evaluation" });
  await waitFor(() => expect(button).toBeEnabled());
  expect(screen.getByText(/Start one to score it against your approved criteria/)).toBeInTheDocument();
  expect(screen.getByLabelText("Hide pricing from evaluators until you release it")).toBeInTheDocument();
  expect(screen.getByText(/see the price only after you grant access/)).toBeInTheDocument();
});
