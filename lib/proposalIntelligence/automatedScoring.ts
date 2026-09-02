/**
 * Tells apart a score a person submitted from the baseline RFPilot derives
 * from evidence, and spots criteria that nothing in the requirement checklist
 * can answer.
 *
 * The scorecard previously presented every score the same way, under the
 * heading "Completed human evaluator score", even when no person had scored
 * the vendor — while each rationale underneath said the number was automated.
 * It also showed "0 / 5" for criteria with no mapped requirements, which reads
 * as "the vendor scored nothing" rather than "the RFP never asked about this".
 */

/** Written by the backend on every automatically derived score event. */
const AUTOMATED_POLICY_PREFIX = "evidence-derived-rubric-score";

export type ScoreOrigin = "human" | "automated" | "unscored";

export type ScoreLike = {
  eventType: string;
  scoringPolicyVersion?: string;
  rationale?: string;
} | undefined;

export const isAutomatedScore = (score: ScoreLike) =>
  Boolean(score?.scoringPolicyVersion?.startsWith(AUTOMATED_POLICY_PREFIX));

const isSubmitted = (score: ScoreLike) =>
  score !== undefined && ["submitted", "superseded"].includes(score.eventType);

export const scoreOrigin = (score: ScoreLike): ScoreOrigin => {
  if (!isSubmitted(score)) return "unscored";
  return isAutomatedScore(score) ? "automated" : "human";
};

/**
 * A criterion is unmapped when the approved checklist has no requirement
 * feeding it, so no evidence can ever support or refute it. Its automated
 * score is always 0 and is not a judgement about the vendor.
 */
export const isUnmappedCriterion = (input: {
  criterionRequirementIds: string[];
  assessedRequirementIds: string[];
}) => {
  const assessed = new Set(input.assessedRequirementIds);
  return !input.criterionRequirementIds.some((id) => assessed.has(id));
};

/** How many scores the user actually submitted across a set of score events. */
export const humanScoreCount = (scores: ScoreLike[]) =>
  scores.filter((score) => scoreOrigin(score) === "human").length;

export const scoreOriginPresentation: Record<
  ScoreOrigin,
  { label: string; description: string; className: string }
> = {
  human: {
    label: "You scored this",
    description: "You submitted this score yourself.",
    className: "bg-emerald-100 text-emerald-800",
  },
  automated: {
    label: "RFPilot starting score",
    description:
      "RFPilot calculated this from the cited evidence. It is a starting point, not a judgement — confirm it or change it yourself.",
    className: "bg-sky-100 text-sky-800",
  },
  unscored: {
    label: "Not scored yet",
    description: "You have not scored this criterion.",
    className: "bg-slate-100 text-slate-700",
  },
};

/**
 * Headline wording for a vendor's total, so a total made entirely of
 * automated baselines is never announced as a score someone gave.
 *
 * RFPilot has one user per proposal — there is no panel of reviewers — so this
 * speaks to that person directly rather than inventing a team.
 */
export const totalScoreHeading = (input: {
  humanScores: number;
  automatedScores: number;
}) => {
  if (input.humanScores > 0 && input.automatedScores > 0)
    return "Score so far (partly yours, partly RFPilot's starting score)";
  if (input.humanScores > 0) return "Your score";
  if (input.automatedScores > 0) return "RFPilot starting score — you have not scored this vendor yet";
  return "Not scored yet";
};
