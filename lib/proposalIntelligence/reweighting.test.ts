import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import { canReweight, initialCriterionWeights, rankWithWeights, rebalanceWeights } from "./reweighting";

const evaluation = (participantId: string, vendorLabel: string, technical: number, price: number) => ({
  participantId, vendorLabel, submittedScores: 2, submittedEvaluators: 2, weightedContributionTotal: 0,
  evaluatorCount: 2, completedEvaluatorCount: 2, conflictCount: 0,
  criteria: [
    { criterionId: "technical", name: "Technical", meanScore: technical, meanWeightedContribution: 0, spread: 0, rubricMaximum: 5, originalWeight: 50 },
    { criterionId: "price", name: "Price", meanScore: price, meanWeightedContribution: 0, spread: 0, rubricMaximum: 5, originalWeight: 50 },
  ],
});

const workspace = {
  participants: [{ participantId: "a" }, { participantId: "b" }],
  intelligence: { evaluation: [evaluation("a", "Alpha", 5, 2), evaluation("b", "Beta", 3, 5)] },
  recommendation: { ranking: [{ participantId: "a", eligible: true }, { participantId: "b", eligible: true }] },
} as unknown as ComparisonWorkspace;

it("rebalances every change to exactly 100 percent", () => {
  const weights = rebalanceWeights(initialCriterionWeights(workspace), "technical", 80);
  expect(weights.find((item) => item.criterionId === "technical")?.weight).toBe(80);
  expect(weights.find((item) => item.criterionId === "price")?.weight).toBe(20);
  expect(weights.reduce((total, item) => total + item.weight, 0)).toBeCloseTo(100);
});

it("reranks from frozen criterion means without bypassing eligibility", () => {
  const technicalHeavy = rankWithWeights(workspace, [
    { criterionId: "technical", name: "Technical", weight: 80 },
    { criterionId: "price", name: "Price", weight: 20 },
  ]);
  const priceHeavy = rankWithWeights(workspace, [
    { criterionId: "technical", name: "Technical", weight: 20 },
    { criterionId: "price", name: "Price", weight: 80 },
  ]);
  expect(technicalHeavy[0].vendorLabel).toBe("Alpha");
  expect(priceHeavy[0].vendorLabel).toBe("Beta");

  const ineligible = { ...workspace, recommendation: { ...workspace.recommendation!, ranking: [{ participantId: "a", eligible: false }, { participantId: "b", eligible: true }] } } as ComparisonWorkspace;
  expect(rankWithWeights(ineligible, technicalHeavy[0].breakdown.map((item) => ({ criterionId: item.criterionId, name: item.name, weight: item.weight })))[0].vendorLabel).toBe("Beta");
});

it("fails closed when any vendor lacks frozen criterion inputs", () => {
  const incomplete = { ...workspace, intelligence: { ...workspace.intelligence, evaluation: [workspace.intelligence.evaluation[0], { ...workspace.intelligence.evaluation[1], criteria: [] }] } } as ComparisonWorkspace;
  expect(canReweight(incomplete)).toBe(false);
});

it("fails closed when eligibility, rubric scales, or score bounds are incomplete", () => {
  expect(canReweight({ ...workspace, recommendation: null } as ComparisonWorkspace)).toBe(false);
  const scaleMismatch = { ...workspace, intelligence: { ...workspace.intelligence, evaluation: [workspace.intelligence.evaluation[0], { ...workspace.intelligence.evaluation[1], criteria: workspace.intelligence.evaluation[1].criteria!.map((item, index) => index === 0 ? { ...item, rubricMaximum: 10 } : item) }] } } as ComparisonWorkspace;
  expect(canReweight(scaleMismatch)).toBe(false);
  const outOfBounds = { ...workspace, intelligence: { ...workspace.intelligence, evaluation: [workspace.intelligence.evaluation[0], { ...workspace.intelligence.evaluation[1], criteria: workspace.intelligence.evaluation[1].criteria!.map((item, index) => index === 0 ? { ...item, meanScore: 6 } : item) }] } } as ComparisonWorkspace;
  expect(canReweight(outOfBounds)).toBe(false);
});

it("normalizes valid stored weights to exactly 100 percent", () => {
  const fractional = { ...workspace, intelligence: { evaluation: workspace.intelligence.evaluation.map((vendor) => ({ ...vendor, criteria: vendor.criteria!.map((criterion) => ({ ...criterion, originalWeight: criterion.originalWeight / 100 })) })) } } as ComparisonWorkspace;
  expect(initialCriterionWeights(fractional).reduce((total, criterion) => total + criterion.weight, 0)).toBeCloseTo(100);
  expect(canReweight(fractional)).toBe(true);
});
