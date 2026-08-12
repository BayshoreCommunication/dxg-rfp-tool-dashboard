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
  criteria: [{ criterionId: "criterion-1", key: "technical", name: "Technical Approach", description: "Evaluate the cited technical response.", weight: 25, rubricMaximum: 5, priceVisibility: "reviewers", humanOnly: false, requirementIds: ["requirement-1"] }],
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

test("shows cited assessment confidence as review metadata, not a score", async () => {
  render(<VendorEvaluationSection proposalId="proposal" submissionId="submission" versionId="version" />);
  expect(await screen.findByText("Provide redundant streaming")).toBeInTheDocument();
  expect(screen.getByText(/42% extraction confidence/)).toBeInTheDocument();
  expect(screen.getByText(/Only human-submitted rubric scores contribute/)).toBeInTheDocument();
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
