/**
 * Explains why one vendor's total score differs from another's.
 *
 * The recommendation used to show two totals (say 82.54 and 56.44) and one
 * sentence about requirements. When two vendors quoted the same price and
 * answered the same number of requirements, a reader had no way to see where
 * 26 points came from — or that every one of those points was RFPilot's own
 * starting score rather than something a person entered. This derives the
 * gap criterion by criterion from the frozen comparison inputs, names who set
 * each score, and turns the engine's rationale into plain words.
 */
import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";

type Evaluation = ComparisonWorkspace["intelligence"]["evaluation"][number];
type Criterion = NonNullable<Evaluation["criteria"]>[number];

export type CriterionOrigin = "human" | "automated" | "mixed" | "unknown";

export const criterionOrigin = (
  criterion: Pick<Criterion, "automatedCount" | "humanCount">,
): CriterionOrigin => {
  if (criterion.humanCount > 0 && criterion.automatedCount > 0) return "mixed";
  if (criterion.humanCount > 0) return "human";
  if (criterion.automatedCount > 0) return "automated";
  return "unknown";
};

export const criterionOriginLabel: Record<CriterionOrigin, string> = {
  human: "Your score",
  automated: "RFPilot's starting score",
  mixed: "Partly yours, partly RFPilot's",
  unknown: "Not recorded",
};

/** Written by the evaluation engine on every automated score rationale. */
const AUTOMATED_RATIONALE_PREFIX = "Automated evidence-derived score for ";
const AUTOMATED_RATIONALE_SUFFIX = /\.\s*This is a transparent system baseline, not a human reviewer opinion\.?\s*$/;

const verdictWords: Record<string, string> = {
  addressed: "answered",
  "partially addressed": "partly answered",
  missing: "not answered",
  contradictory: "conflicting",
  "not assessable": "could not be checked",
  "not applicable": "not applicable",
};

/**
 * The engine's rationale is written for an audit trail ("Automated
 * evidence-derived score for Pricing: 2 addressed, 1 missing. This is a
 * transparent system baseline…"). A person's rationale is returned unchanged.
 */
export const plainRationale = (rationale: string): string => {
  const trimmed = rationale.trim();
  if (!trimmed.startsWith(AUTOMATED_RATIONALE_PREFIX)) return trimmed;
  const body = trimmed.slice(AUTOMATED_RATIONALE_PREFIX.length).replace(AUTOMATED_RATIONALE_SUFFIX, "");
  const colon = body.indexOf(": ");
  const summary = colon === -1 ? "" : body.slice(colon + 2).trim();
  if (!summary || summary === "no mapped requirements")
    return "None of your requirements fall under this area, so RFPilot gave it 0. That is not a judgement about the vendor.";
  const counts = summary.split(",").map((part) => part.trim()).filter(Boolean).map((part) => {
    const match = part.match(/^(\d+)\s+(.+)$/);
    if (!match) return part;
    const word = verdictWords[match[2]] ?? match[2];
    return `${match[1]} ${word}`;
  });
  return `Requirements in this area: ${counts.join(", ")}.`;
};

export type ScoreGapRow = {
  criterionId: string;
  name: string;
  /** Approved weight as a percentage of the whole rubric. */
  weight: number;
  rubricMaximum: number;
  leader: { score: number; points: number; origin: CriterionOrigin; rationale: string };
  rival: { score: number; points: number; origin: CriterionOrigin; rationale: string };
  /** Leader points minus rival points; positive favours the leader. */
  difference: number;
};

export type ScoreGapExplanation = {
  leader: { participantId: string; vendorLabel: string; total: number };
  rival: { participantId: string; vendorLabel: string; total: number };
  /** Leader total minus rival total. */
  gap: number;
  /** Every criterion, largest absolute difference first. */
  rows: ScoreGapRow[];
  headline: string;
  drivers: string;
  origins: string;
};

const points = (criterion: Criterion, weight: number) =>
  criterion.rubricMaximum > 0 ? (criterion.meanScore / criterion.rubricMaximum) * weight : 0;

const signed = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}`;

const list = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const originsSentence = (rows: ScoreGapRow[]) => {
  const all = rows.flatMap((row) => [row.leader.origin, row.rival.origin]);
  if (all.length === 0) return "";
  if (all.every((origin) => origin === "unknown"))
    return "This comparison did not record who set each score. Run a new comparison to see that.";
  if (all.every((origin) => origin === "automated"))
    return "No one has scored these vendors by hand yet. These are RFPilot's starting scores: they show how much of each area the vendor answered, not how good the answers are.";
  if (all.every((origin) => origin === "human")) return "All of these are your scores.";
  return "Some of these scores are yours; the rest are RFPilot's starting scores where you have not scored a criterion yet.";
};

/**
 * Returns null when either vendor lacks per-criterion detail (older
 * comparisons only saved totals) or the two vendors were scored on different
 * rubrics, so a row-by-row comparison would mislead.
 */
export const explainScoreGap = (
  workspace: Pick<ComparisonWorkspace, "intelligence">,
  leaderId: string,
  rivalId: string,
): ScoreGapExplanation | null => {
  const evaluation = workspace.intelligence.evaluation ?? [];
  const leader = evaluation.find((item) => item.participantId === leaderId);
  const rival = evaluation.find((item) => item.participantId === rivalId);
  if (!leader?.criteria?.length || !rival?.criteria?.length) return null;
  const rivalById = new Map(rival.criteria.map((criterion) => [criterion.criterionId, criterion]));
  const weightTotal = leader.criteria.reduce((sum, criterion) => sum + criterion.originalWeight, 0);
  if (!Number.isFinite(weightTotal) || weightTotal <= 0) return null;

  const rows: ScoreGapRow[] = [];
  for (const criterion of leader.criteria) {
    const other = rivalById.get(criterion.criterionId);
    if (!other || other.rubricMaximum !== criterion.rubricMaximum || other.originalWeight !== criterion.originalWeight) return null;
    const weight = (criterion.originalWeight / weightTotal) * 100;
    const leaderPoints = points(criterion, weight);
    const rivalPoints = points(other, weight);
    rows.push({
      criterionId: criterion.criterionId,
      name: criterion.name,
      weight,
      rubricMaximum: criterion.rubricMaximum,
      leader: { score: criterion.meanScore, points: leaderPoints, origin: criterionOrigin(criterion), rationale: plainRationale(criterion.rationale) },
      rival: { score: other.meanScore, points: rivalPoints, origin: criterionOrigin(other), rationale: plainRationale(other.rationale) },
      difference: leaderPoints - rivalPoints,
    });
  }
  if (rows.length !== rival.criteria.length) return null;
  rows.sort((left, right) => Math.abs(right.difference) - Math.abs(left.difference) || left.name.localeCompare(right.name));

  const leaderTotal = rows.reduce((sum, row) => sum + row.leader.points, 0);
  const rivalTotal = rows.reduce((sum, row) => sum + row.rival.points, 0);
  const gap = leaderTotal - rivalTotal;

  const headline = Math.abs(gap) < 0.005
    ? `${leader.vendorLabel} and ${rival.vendorLabel} are level on points.`
    : `${leader.vendorLabel} is ${Math.abs(gap).toFixed(2)} points ${gap > 0 ? "ahead of" : "behind"} ${rival.vendorLabel}.`;

  // Name the criteria the leader gains on, and the biggest one it loses on,
  // so a reader is never told "most of that comes from X" while a larger
  // difference points the other way further down the table.
  const favouring = rows.filter((row) => row.difference > 0.005);
  const against = rows.filter((row) => row.difference < -0.005);
  const gains = favouring.length === 0
    ? ""
    : `${leader.vendorLabel} gains on ${list(favouring.slice(0, 2).map((row) => `${row.name} (${signed(row.difference)})`))}${favouring.length > 2 ? ` and ${favouring.length - 2} other ${favouring.length - 2 === 1 ? "area" : "areas"}` : ""}`;
  const loses = against.length === 0
    ? ""
    : `gives up ${Math.abs(against[0].difference).toFixed(2)} on ${against[0].name}${against.length > 1 ? ` and less on ${against.length - 1} other ${against.length - 1 === 1 ? "area" : "areas"}` : ""}`;
  const drivers = gains && loses ? `${gains}, but ${loses}.` : gains ? `${gains}.` : loses ? `${leader.vendorLabel} ${loses}.` : "";

  return {
    leader: { participantId: leader.participantId, vendorLabel: leader.vendorLabel, total: leaderTotal },
    rival: { participantId: rival.participantId, vendorLabel: rival.vendorLabel, total: rivalTotal },
    gap,
    rows,
    headline,
    drivers,
    origins: originsSentence(rows),
  };
};

export const formatSigned = signed;
