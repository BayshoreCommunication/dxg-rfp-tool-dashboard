import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import { criterionOrigin, explainScoreGap, plainRationale } from "./scoreExplanation";

const criterion = (
  criterionId: string,
  name: string,
  meanScore: number,
  originalWeight: number,
  extra: Partial<{ automatedCount: number; humanCount: number; rationale: string; rubricMaximum: number }> = {},
) => ({
  criterionId, name, meanScore, meanWeightedContribution: 0, spread: 0, rubricMaximum: 5, originalWeight,
  automatedCount: 1, humanCount: 0, rationale: `Automated evidence-derived score for ${name}: 2 addressed, 1 missing. This is a transparent system baseline, not a human reviewer opinion.`,
  ...extra,
});

const vendor = (participantId: string, vendorLabel: string, criteria: ReturnType<typeof criterion>[]) => ({
  participantId, vendorLabel, submittedScores: criteria.length, submittedEvaluators: 1, weightedContributionTotal: 0,
  evaluatorCount: 1, completedEvaluatorCount: 1, conflictCount: 0, criteria,
});

const workspace = {
  intelligence: {
    evaluation: [
      vendor("inspire", "Inspire", [
        criterion("pricing", "Pricing & Value", 5, 40),
        criterion("responsiveness", "Responsiveness & Communication", 5, 40),
        criterion("technical", "Technical Approach", 4, 20),
      ]),
      vendor("manual", "Test Manual Vendor", [
        criterion("pricing", "Pricing & Value", 5, 40),
        criterion("responsiveness", "Responsiveness & Communication", 0, 40, { rationale: "Automated evidence-derived score for Responsiveness & Communication: no mapped requirements. This is a transparent system baseline, not a human reviewer opinion." }),
        criterion("technical", "Technical Approach", 2, 20, { automatedCount: 0, humanCount: 1, rationale: "Weak run-of-show detail." }),
      ]),
    ],
  },
} as unknown as Pick<ComparisonWorkspace, "intelligence">;

it("tells apart your scores from RFPilot's starting scores, and admits when nothing was recorded", () => {
  expect(criterionOrigin({ automatedCount: 1, humanCount: 0 })).toBe("automated");
  expect(criterionOrigin({ automatedCount: 0, humanCount: 2 })).toBe("human");
  expect(criterionOrigin({ automatedCount: 1, humanCount: 1 })).toBe("mixed");
  expect(criterionOrigin({ automatedCount: 0, humanCount: 0 })).toBe("unknown");
});

it("rewrites the engine's audit rationale into the coverage vocabulary and leaves a person's words alone", () => {
  expect(plainRationale("Automated evidence-derived score for Pricing: 2 addressed, 1 partially addressed, 1 missing. This is a transparent system baseline, not a human reviewer opinion."))
    .toBe("Based on the requirements that feed this criterion: 2 answered, 1 partly answered, 1 not answered.");
  expect(plainRationale("Automated evidence-derived score for DEI: no mapped requirements. This is a transparent system baseline, not a human reviewer opinion."))
    .toMatch(/None of your requirements feed this criterion, so RFPilot gave it 0/);
  expect(plainRationale("  Weak run-of-show detail.  ")).toBe("Weak run-of-show detail.");
  expect(plainRationale("")).toBe("");
});

it("attributes the gap to the criteria that caused it, largest first, and says who set the scores", () => {
  const explanation = explainScoreGap(workspace, "inspire", "manual");
  expect(explanation).not.toBeNull();
  expect(explanation!.gap).toBeCloseTo(48, 2);
  expect(explanation!.headline).toBe("Inspire is 48.00 points ahead of Test Manual Vendor.");
  expect(explanation!.rows.map((row) => row.name)).toEqual(["Responsiveness & Communication", "Technical Approach", "Pricing & Value"]);
  expect(explanation!.rows[0].difference).toBeCloseTo(40, 2);
  expect(explanation!.rows[0].rival.rationale).toMatch(/None of your requirements feed this criterion/);
  expect(explanation!.rows[1].rival.origin).toBe("human");
  expect(explanation!.rows[1].rival.rationale).toBe("Weak run-of-show detail.");
  expect(explanation!.drivers).toBe("Inspire gains on Responsiveness & Communication (+40.00) and Technical Approach (+8.00).");
  expect(explanation!.origins).toMatch(/Some of these scores are yours/);
});

it("names the biggest criterion the leader loses on, not only the ones it wins", () => {
  const mixed = {
    intelligence: {
      evaluation: [
        vendor("inspire", "Inspire", [criterion("pricing", "Pricing & Value", 0, 30), criterion("responsiveness", "Responsiveness & Communication", 5, 30), criterion("technical", "Technical Approach", 4, 15)]),
        vendor("manual", "Test Manual Vendor", [criterion("pricing", "Pricing & Value", 1.75, 30), criterion("responsiveness", "Responsiveness & Communication", 3.33, 30), criterion("technical", "Technical Approach", 4.25, 15)]),
      ],
    },
  } as unknown as Pick<ComparisonWorkspace, "intelligence">;
  const explanation = explainScoreGap(mixed, "inspire", "manual")!;
  // Weights 30/30/15 normalise to 40/40/20, so Pricing (−14.00) is the largest row even though the leader wins overall on Responsiveness.
  expect(explanation.rows[0].name).toBe("Pricing & Value");
  expect(explanation.drivers).toBe("Inspire gains on Responsiveness & Communication (+13.36), but gives up 14.00 on Pricing & Value and less on 1 other criterion.");
});

it("says plainly when nobody has scored either vendor", () => {
  const automatedOnly = {
    intelligence: {
      evaluation: workspace.intelligence.evaluation.map((item) => ({
        ...item,
        criteria: item.criteria!.map((entry) => ({ ...entry, automatedCount: 1, humanCount: 0 })),
      })),
    },
  } as Pick<ComparisonWorkspace, "intelligence">;
  expect(explainScoreGap(automatedOnly, "inspire", "manual")!.origins).toMatch(/Nobody has scored these vendors yet/);
});

it("refuses to explain when either vendor lacks per-criterion detail or the rubrics differ", () => {
  const missing = { intelligence: { evaluation: [workspace.intelligence.evaluation[0], { ...workspace.intelligence.evaluation[1], criteria: [] }] } } as Pick<ComparisonWorkspace, "intelligence">;
  expect(explainScoreGap(missing, "inspire", "manual")).toBeNull();
  const mismatch = { intelligence: { evaluation: [workspace.intelligence.evaluation[0], { ...workspace.intelligence.evaluation[1], criteria: workspace.intelligence.evaluation[1].criteria!.map((entry, index) => index === 0 ? { ...entry, rubricMaximum: 10 } : entry) }] } } as Pick<ComparisonWorkspace, "intelligence">;
  expect(explainScoreGap(mismatch, "inspire", "manual")).toBeNull();
  expect(explainScoreGap(workspace, "inspire", "nobody")).toBeNull();
});
