import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import { render, screen } from "@testing-library/react";
import ProposalVerdict from "./ProposalVerdict";

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

it("names the leader and links every decisive factor and gap to comparison evidence", () => {
  render(<ProposalVerdict workspace={workspace} proposalId="proposal-1" />);
  expect(screen.getByRole("heading", { name: "Alpha is the strongest fit in this comparison." })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Named technical producer/ })).toHaveAttribute("href", "#matrix-cell-req-1-vendor-1");
  expect(screen.getByRole("link", { name: "Insurance certificate" })).toHaveAttribute("href", "#matrix-cell-req-2-vendor-1");
  expect(screen.getByText("Travel is billed separately")).toBeInTheDocument();
  expect(screen.getByText("Close score margin")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Items to review before final decision" })).toBeInTheDocument();
  expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  expect(screen.getByText(/3.00 points behind the leader/)).toBeInTheDocument();
});

it("abstains when no recommendation is stored", () => {
  render(<ProposalVerdict workspace={{ ...workspace, recommendation: null } as ComparisonWorkspace} proposalId="proposal-1" />);
  expect(screen.getByRole("heading", { name: "No recommendation yet" })).toBeInTheDocument();
  expect(screen.getByText(/only names a leading vendor/)).toBeInTheDocument();
});

it("labels a stale close call as historical instead of naming a decisive winner", () => {
  const closeCall = { ...workspace, freshness: { state: "stale", reasons: ["requirement_set_changed"] }, recommendation: { ...workspace.recommendation!, status: "close_call", bestParticipantId: null, strongestParticipantIds: ["vendor-1", "vendor-2"] } } as ComparisonWorkspace;
  render(<ProposalVerdict workspace={closeCall} proposalId="proposal-1" />);
  expect(screen.getByRole("heading", { name: /Alpha and Beta are a close call/ })).toBeInTheDocument();
  expect(screen.getByText("Out of date")).toBeInTheDocument();
  expect(screen.getByText(/Requirement set changed/)).toBeInTheDocument();
});

it("sends 'Record your decision' to the tab that actually has the decision form", () => {
  render(<ProposalVerdict workspace={workspace} proposalId="proposal-1" />);
  // The decision form renders only under tab === "evaluation"; this used to
  // point at the executive report, so the anchor never resolved and the button
  // landed on a page with no form on it.
  const link = screen.getByRole("link", { name: /Record your decision/ });
  expect(link).toHaveAttribute(
    "href",
    `/proposals/proposal-1/intelligence/comparisons/${workspace.run.runId}/evaluation#decision-record-title`,
  );
  expect(link.getAttribute("href")).not.toContain("/reports");
});

it("offers the decision as a primary action beside the recommendation, not buried below it", () => {
  render(<ProposalVerdict workspace={workspace} proposalId="proposal-1" />);
  const link = screen.getByRole("link", { name: /Record your decision/ });
  // One obvious place to act, in the section header rather than the footer row.
  expect(screen.getAllByRole("link", { name: /Record your decision/ })).toHaveLength(1);
  expect(link.closest("header")).not.toBeNull();
  expect(screen.getByText("Nothing is decided until you record it.")).toBeInTheDocument();
});
