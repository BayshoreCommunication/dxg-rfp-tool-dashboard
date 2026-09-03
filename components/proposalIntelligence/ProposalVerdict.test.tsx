import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import { render, screen } from "@testing-library/react";
import ProposalVerdict from "./ProposalVerdict";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const workspace = {
  run: { runId: "run-1" },
  freshness: { state: "current", reasons: [] },
  recommendation: {
    status: "recommended", bestParticipantId: "vendor-1", strongestParticipantIds: ["vendor-1"], confidence: "medium", confidenceReasons: ["close_score_margin", "two_evaluators"], margin: 3, rationale: "Alpha has the highest eligibility-gated human score.",
    ranking: [
      { participantId: "vendor-1", vendorLabel: "Alpha", score: 85, evaluatorCount: 2, maxCriterionSpread: 1, eligible: true, eligibilityFailures: 0, mandatoryGaps: 1, unresolvedReviews: 0, highRisks: 1, rank: 1 },
      { participantId: "vendor-2", vendorLabel: "Beta", score: 82, evaluatorCount: 2, maxCriterionSpread: 1, eligible: true, eligibilityFailures: 0, mandatoryGaps: 2, unresolvedReviews: 1, highRisks: 0, rank: 2 },
    ],
  },
  intelligence: {
    requirements: [
      { requirementId: "req-1", title: "Named technical producer", vendors: [{ participantId: "vendor-1", verdict: "addressed", rationale: "A named producer is cited.", evidence: [{ evidenceId: "e-1" }] }, { participantId: "vendor-2", verdict: "missing", rationale: "Not stated.", evidence: [] }] },
      { requirementId: "req-2", title: "Insurance certificate", vendors: [{ participantId: "vendor-1", verdict: "missing", rationale: "Not stated.", evidence: [] }, { participantId: "vendor-2", verdict: "addressed", rationale: "Certificate supplied.", evidence: [{ evidenceId: "e-2" }] }] },
    ],
    risks: [{ participantId: "vendor-1", riskId: "risk-1", requirementId: "req-2", severity: "high", title: "Insurance unresolved", basis: "Certificate was not supplied." }],
    commercial: [{ participantId: "vendor-1", assumptions: ["Travel is billed separately"] }],
  },
} as unknown as ComparisonWorkspace;

it("no longer offers a 'Record your decision' action", () => {
  render(<ProposalVerdict workspace={workspace} proposalId="proposal-1" />);
  expect(screen.queryByRole("link", { name: /Record your decision/ })).not.toBeInTheDocument();
});

it("names the leader and links every decisive factor and gap to comparison evidence", () => {
  render(<ProposalVerdict workspace={workspace} proposalId="proposal-1" />);
  expect(screen.getByRole("heading", { name: "Alpha is the strongest fit in this comparison." })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Named technical producer/ })).toHaveAttribute("href", "#matrix-cell-req-1-vendor-1");
  expect(screen.getByRole("link", { name: "Insurance certificate" })).toHaveAttribute("href", "#matrix-cell-req-2-vendor-1");
  expect(screen.getByText("Travel is billed separately")).toBeInTheDocument();
  expect(screen.getByText(/The top scores are close/)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Items to review before final decision" })).toBeInTheDocument();
  expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  expect(screen.getByText(/3.00 points behind the leader/)).toBeInTheDocument();
});

it("abstains when no recommendation is stored", () => {
  render(<ProposalVerdict workspace={{ ...workspace, recommendation: null } as ComparisonWorkspace} proposalId="proposal-1" />);
  expect(screen.getByRole("heading", { name: "No recommendation yet" })).toBeInTheDocument();
  expect(screen.getByText(/only names a leading vendor/)).toBeInTheDocument();
});

it("still explains where the points come from in a close call, without repeating the gap count", () => {
  const criteria = (technical: number) => [{ criterionId: "technical", name: "Technical", meanScore: technical, meanWeightedContribution: 0, spread: 0, rubricMaximum: 5, originalWeight: 100, automatedCount: 1, humanCount: 0, rationale: "" }];
  const closeCall = { ...workspace, recommendation: { ...workspace.recommendation!, status: "close_call", bestParticipantId: null, strongestParticipantIds: ["vendor-1", "vendor-2"] }, intelligence: { ...workspace.intelligence, evaluation: [{ participantId: "vendor-1", vendorLabel: "Alpha", criteria: criteria(4.5) }, { participantId: "vendor-2", vendorLabel: "Beta", criteria: criteria(4.4) }] } } as unknown as ComparisonWorkspace;
  render(<ProposalVerdict workspace={closeCall} proposalId="proposal-1" />);
  expect(screen.getByRole("heading", { name: "Why the scores differ" })).toBeInTheDocument();
  expect(screen.getByText(/Alpha is 2.00 points ahead of Beta/)).toBeInTheDocument();
  expect(screen.getByText(/85.00 points · 1 mandatory gap · 1 high risk/)).toBeInTheDocument();
  expect(screen.queryByText(/mandatory gaps · 1 mandatory gap/)).not.toBeInTheDocument();
});

it("labels a stale close call as historical instead of naming a decisive winner", () => {
  const closeCall = { ...workspace, freshness: { state: "stale", reasons: ["requirement_set_superseded"] }, recommendation: { ...workspace.recommendation!, status: "close_call", bestParticipantId: null, strongestParticipantIds: ["vendor-1", "vendor-2"] } } as ComparisonWorkspace;
  render(<ProposalVerdict workspace={closeCall} proposalId="proposal-1" />);
  expect(screen.getByRole("heading", { name: "Out-of-date result: Alpha and Beta were a close call." })).toBeInTheDocument();
  expect(screen.getByText("Out of date")).toBeInTheDocument();
  // The banner and the header both offer the rerun; there is no decision link any more.
  expect(screen.getAllByRole("button", { name: "Run a new comparison" })).toHaveLength(2);
  expect(screen.queryByRole("link", { name: "Record your decision" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Record a decision on this old result anyway/ })).not.toBeInTheDocument();
  expect(screen.getByText(/Since this comparison ran, the requirements list was changed or re-approved\./)).toBeInTheDocument();
});



it("keeps the present-tense verdict and no rerun controls while the result is current", () => {
  render(<ProposalVerdict workspace={workspace} proposalId="proposal-1" />);
  expect(screen.getByRole("heading", { name: "Alpha is the strongest fit in this comparison." })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Run a new comparison" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Record your decision/ })).not.toBeInTheDocument();
});
