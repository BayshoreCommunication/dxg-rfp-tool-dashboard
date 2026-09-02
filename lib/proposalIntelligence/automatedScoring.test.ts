import {
  humanScoreCount,
  isAutomatedScore,
  isUnmappedCriterion,
  scoreOrigin,
  totalScoreHeading,
} from "./automatedScoring";

const automated = {
  eventType: "submitted",
  scoringPolicyVersion: "evidence-derived-rubric-score.v1",
};
const human = { eventType: "submitted", scoringPolicyVersion: "planner-rubric.v2" };

it("recognises the backend's automated scoring policy", () => {
  expect(isAutomatedScore(automated)).toBe(true);
  expect(isAutomatedScore(human)).toBe(false);
  expect(isAutomatedScore(undefined)).toBe(false);
});

it("treats a later version of the automated policy as automated", () => {
  expect(
    isAutomatedScore({
      eventType: "submitted",
      scoringPolicyVersion: "evidence-derived-rubric-score.v4",
    }),
  ).toBe(true);
});

it.each([
  [automated, "automated"],
  [human, "human"],
  [{ eventType: "draft", scoringPolicyVersion: "planner-rubric.v2" }, "unscored"],
  [{ eventType: "reopened", scoringPolicyVersion: "planner-rubric.v2" }, "unscored"],
  [undefined, "unscored"],
] as const)("reads origin %#", (score, expected) => {
  expect(scoreOrigin(score)).toBe(expected);
});

it("counts only the scores the user submitted", () => {
  expect(humanScoreCount([automated, human, undefined, human])).toBe(2);
});

it("flags a criterion the requirement checklist never feeds", () => {
  expect(
    isUnmappedCriterion({
      criterionRequirementIds: ["r-sustainability"],
      assessedRequirementIds: ["r-attendees", "r-budget"],
    }),
  ).toBe(true);
  expect(
    isUnmappedCriterion({
      criterionRequirementIds: ["r-budget"],
      assessedRequirementIds: ["r-attendees", "r-budget"],
    }),
  ).toBe(false);
  expect(
    isUnmappedCriterion({
      criterionRequirementIds: [],
      assessedRequirementIds: ["r-attendees"],
    }),
  ).toBe(true);
});

it("never presents an all-automated total as a score the user gave", () => {
  expect(totalScoreHeading({ humanScores: 0, automatedScores: 7 })).toBe(
    "RFPilot starting score — you have not scored this vendor yet",
  );
  expect(totalScoreHeading({ humanScores: 7, automatedScores: 0 })).toBe("Your score");
  expect(totalScoreHeading({ humanScores: 3, automatedScores: 4 })).toBe(
    "Score so far (partly yours, partly RFPilot's starting score)",
  );
  expect(totalScoreHeading({ humanScores: 0, automatedScores: 0 })).toBe(
    "Not scored yet",
  );
});
