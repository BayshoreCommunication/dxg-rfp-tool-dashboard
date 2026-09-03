import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import { fireEvent, render, screen } from "@testing-library/react";
import ScoreGapExplanation from "./ScoreGapExplanation";

const criterion = (criterionId: string, name: string, meanScore: number, originalWeight: number, extra: Record<string, unknown> = {}) => ({
  criterionId, name, meanScore, meanWeightedContribution: 0, spread: 0, rubricMaximum: 5, originalWeight,
  automatedCount: 1, humanCount: 0, rationale: `Automated evidence-derived score for ${name}: 1 addressed. This is a transparent system baseline, not a human reviewer opinion.`, ...extra,
});

const workspace = {
  recommendation: {
    bestParticipantId: "inspire",
    ranking: [
      { participantId: "inspire", vendorLabel: "Inspire", eligible: true },
      { participantId: "manual", vendorLabel: "Test Manual Vendor", eligible: true },
      { participantId: "dxg", vendorLabel: "DXG", eligible: true },
    ],
  },
  intelligence: {
    evaluation: [
      { participantId: "inspire", vendorLabel: "Inspire", criteria: [criterion("pricing", "Pricing & Value", 5, 50), criterion("technical", "Technical Approach", 4, 50)] },
      { participantId: "manual", vendorLabel: "Test Manual Vendor", criteria: [criterion("pricing", "Pricing & Value", 5, 50), criterion("technical", "Technical Approach", 2, 50, { automatedCount: 0, humanCount: 1, rationale: "Thin crew plan." })] },
      { participantId: "dxg", vendorLabel: "DXG", criteria: [criterion("pricing", "Pricing & Value", 3, 50), criterion("technical", "Technical Approach", 4, 50)] },
    ],
  },
} as unknown as ComparisonWorkspace;

it("shows where the leader's margin comes from and who set each score", () => {
  render(<ScoreGapExplanation workspace={workspace} />);
  expect(screen.getByRole("heading", { name: "Why the scores differ" })).toBeInTheDocument();
  expect(screen.getByText(/Inspire is 20.00 points ahead of Test Manual Vendor/)).toBeInTheDocument();
  expect(screen.getByText(/Inspire gains on Technical Approach \(\+20.00\)/)).toBeInTheDocument();
  expect(screen.getByText(/Some of these scores are yours/)).toBeInTheDocument();
  expect(screen.getAllByText("RFPilot's starting score").length).toBeGreaterThan(0);
  expect(screen.getByText("Your score")).toBeInTheDocument();
  expect(screen.getByText("Thin crew plan.")).toBeInTheDocument();
  expect(screen.getAllByText("Based on the requirements that feed this criterion: 1 answered.").length).toBeGreaterThan(0);
});

it("lets the reader pick which other vendor to compare against", () => {
  render(<ScoreGapExplanation workspace={workspace} />);
  fireEvent.click(screen.getByRole("button", { name: "DXG" }));
  expect(screen.getByText(/Inspire is 20.00 points ahead of DXG/)).toBeInTheDocument();
  expect(screen.getByText(/Inspire gains on Pricing & Value \(\+20.00\)/)).toBeInTheDocument();
});

it("says so when an older comparison saved no per-criterion detail", () => {
  const historical = { ...workspace, intelligence: { evaluation: workspace.intelligence.evaluation.map((item) => ({ ...item, criteria: [] })) } } as unknown as ComparisonWorkspace;
  render(<ScoreGapExplanation workspace={historical} />);
  expect(screen.getByText(/did not save per-criterion scores/)).toBeInTheDocument();
});

it("renders nothing without a ranked leader and at least one other vendor", () => {
  const { container } = render(<ScoreGapExplanation workspace={{ ...workspace, recommendation: null } as ComparisonWorkspace} />);
  expect(container).toBeEmptyDOMElement();
});
