import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import { fireEvent, render, screen } from "@testing-library/react";
import ProposalReweighting from "./ProposalReweighting";

const workspace = {
  participants: [{ participantId: "a" }, { participantId: "b" }],
  intelligence: { evaluation: [
    { participantId: "a", vendorLabel: "Alpha", criteria: [{ criterionId: "technical", name: "Technical", meanScore: 5, meanWeightedContribution: 50, spread: 0, rubricMaximum: 5, originalWeight: 50 }, { criterionId: "price", name: "Price", meanScore: 2, meanWeightedContribution: 20, spread: 0, rubricMaximum: 5, originalWeight: 50 }] },
    { participantId: "b", vendorLabel: "Beta", criteria: [{ criterionId: "technical", name: "Technical", meanScore: 3, meanWeightedContribution: 30, spread: 0, rubricMaximum: 5, originalWeight: 50 }, { criterionId: "price", name: "Price", meanScore: 5, meanWeightedContribution: 50, spread: 0, rubricMaximum: 5, originalWeight: 50 }] },
  ] },
  recommendation: { ranking: [{ participantId: "a", eligible: true }, { participantId: "b", eligible: true }] },
} as unknown as ComparisonWorkspace;

it("reranks immediately when a bounded criterion weight changes", () => {
  render(<ProposalReweighting workspace={workspace} />);
  expect(screen.getByText("#1 Beta")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Technical weight"), { target: { value: "80" } });
  expect(screen.getByText("#1 Alpha")).toBeInTheDocument();
  expect(screen.getByText("Total 100.0% · Other criteria rebalance proportionally.")).toBeInTheDocument();
});

it("explains why historical aggregate-only runs cannot be reweighted", () => {
  const historical = { ...workspace, intelligence: { ...workspace.intelligence, evaluation: workspace.intelligence.evaluation.map((item) => ({ ...item, criteria: [] })) } } as ComparisonWorkspace;
  render(<ProposalReweighting workspace={historical} />);
  expect(screen.getByText("Not available for this comparison")).toBeInTheDocument();
  expect(screen.queryByRole("slider")).not.toBeInTheDocument();
});
