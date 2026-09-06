import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import { criterionOrigin, type CriterionOrigin } from "@/lib/proposalIntelligence/scoreExplanation";

export type CriterionWeight = { criterionId: string; name: string; weight: number };
export type ReweightedVendor = {
  participantId: string;
  vendorLabel: string;
  eligible: boolean;
  score: number;
  breakdown: Array<{ criterionId: string; name: string; meanScore: number; rubricMaximum: number; weight: number; contribution: number; origin: CriterionOrigin }>;
};

export const initialCriterionWeights = (workspace: ComparisonWorkspace): CriterionWeight[] => {
  const criteria = workspace.intelligence.evaluation.find((item) => item.criteria?.length)?.criteria ?? [];
  const total = criteria.reduce((sum, criterion) => sum + criterion.originalWeight, 0);
  if (!Number.isFinite(total) || total <= 0) return [];
  return criteria.map((criterion) => ({ criterionId: criterion.criterionId, name: criterion.name, weight: criterion.originalWeight / total * 100 }));
};

export const canReweight = (workspace: ComparisonWorkspace) => {
  const weights = initialCriterionWeights(workspace);
  if (weights.length === 0 || workspace.participants.length < 2 || workspace.intelligence.evaluation.length !== workspace.participants.length || !workspace.recommendation) return false;
  const participantIds = new Set(workspace.participants.map((item) => item.participantId));
  if (participantIds.size !== workspace.participants.length || workspace.recommendation.ranking.length !== participantIds.size || workspace.recommendation.ranking.some((item) => !participantIds.has(item.participantId))) return false;
  const reference = workspace.intelligence.evaluation[0]?.criteria ?? [];
  const referenceById = new Map(reference.map((criterion) => [criterion.criterionId, criterion]));
  return workspace.intelligence.evaluation.every((item) => {
    if (!participantIds.has(item.participantId) || (item.criteria ?? []).length !== reference.length) return false;
    return (item.criteria ?? []).every((criterion) => {
      const expected = referenceById.get(criterion.criterionId);
      return Boolean(expected) && criterion.rubricMaximum > 0 && Number.isFinite(criterion.meanScore) && criterion.meanScore >= 0 && criterion.meanScore <= criterion.rubricMaximum && criterion.rubricMaximum === expected!.rubricMaximum && criterion.originalWeight === expected!.originalWeight;
    });
  });
};

export const rebalanceWeights = (
  weights: CriterionWeight[],
  criterionId: string,
  nextValue: number,
): CriterionWeight[] => {
  const bounded = Math.max(0, Math.min(100, nextValue));
  if (weights.length <= 1) return weights.map((item) => ({ ...item, weight: 100 }));
  const others = weights.filter((item) => item.criterionId !== criterionId);
  const otherTotal = others.reduce((total, item) => total + item.weight, 0);
  const remaining = 100 - bounded;
  return weights.map((item) => {
    if (item.criterionId === criterionId) return { ...item, weight: bounded };
    return { ...item, weight: otherTotal > 0 ? item.weight / otherTotal * remaining : remaining / others.length };
  });
};

export const rankWithWeights = (
  workspace: ComparisonWorkspace,
  weights: CriterionWeight[],
): ReweightedVendor[] => {
  const weightMap = new Map(weights.map((item) => [item.criterionId, item]));
  const eligibility = new Map(workspace.recommendation?.ranking.map((item) => [item.participantId, item.eligible]) ?? []);
  return workspace.intelligence.evaluation.map((vendor) => {
    const breakdown = (vendor.criteria ?? []).flatMap((criterion) => {
      const weight = weightMap.get(criterion.criterionId);
      if (!weight || criterion.rubricMaximum <= 0) return [];
      return [{
        criterionId: criterion.criterionId,
        name: criterion.name,
        meanScore: criterion.meanScore,
        rubricMaximum: criterion.rubricMaximum,
        weight: weight.weight,
        contribution: criterion.meanScore / criterion.rubricMaximum * weight.weight,
        origin: criterionOrigin(criterion),
      }];
    });
    return {
      participantId: vendor.participantId,
      vendorLabel: vendor.vendorLabel,
      eligible: eligibility.get(vendor.participantId) ?? true,
      score: breakdown.reduce((total, item) => total + item.contribution, 0),
      breakdown,
    };
  }).sort((left, right) => Number(right.eligible) - Number(left.eligible) || right.score - left.score || left.vendorLabel.localeCompare(right.vendorLabel));
};
