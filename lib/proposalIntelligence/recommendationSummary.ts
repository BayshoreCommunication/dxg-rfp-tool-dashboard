/**
 * Explains a recommendation by comparing vendors, not by reporting numbers.
 *
 * The panel used to lead with "Recorded score 82.54 / 100", a weighted-score
 * margin and evaluator counts. None of that tells a planner *why* one vendor is
 * the better fit, and the numbers invite a precision the underlying scores do
 * not have. This derives the comparison from what vendors actually answered,
 * what they cost, and what is still open against them.
 */
import { coverageFromVerdict } from "@/lib/proposalIntelligence/coverageVocabulary";

type Vendor = { participantId: string; verdict: string };

export type SummaryRequirement = {
  requirementId: string;
  title: string;
  mandatoryStatus: string;
  vendors: Vendor[];
};

export type SummaryCommercial = {
  participantId: string;
  submittedTotal: number | null;
  submittedCurrency: string | null;
};

export type SummaryRanking = {
  participantId: string;
  vendorLabel: string;
  eligible: boolean;
  eligibilityFailures: number;
  highRisks: number;
  unresolvedReviews?: number;
  rank: number | null;
};

export type RecommendationSummary = {
  /** One sentence: what this comparison looked at. */
  overview: string;
  /** Why the leader is ahead, phrased against the other vendors. */
  strengths: string[];
  /** What is still open on the leader. */
  watchOuts: string[];
  /** How each other vendor differs from the leader. */
  alternatives: Array<{ participantId: string; vendorLabel: string; points: string[] }>;
};

const answered = (verdict: string) => coverageFromVerdict(verdict) === "answered";
const unanswered = (verdict: string) =>
  ["not_answered", "mentioned_only"].includes(coverageFromVerdict(verdict));

/**
 * Mandatory counts are derived from the requirement list rather than read off
 * the ranking. A saved comparison keeps the ranking exactly as it was run, so a
 * comparison produced before the two definitions were reconciled still carries
 * the old numbers — deriving here keeps this panel and the comparison overview
 * agreeing on one definition for every run, old or new.
 */
const UNANSWERED = ["not_answered", "mentioned_only", "conflicting"];

const mandatoryCounts = (requirements: SummaryRequirement[], participantId: string) => {
  const mandatory = requirements.filter(
    (requirement) => requirement.mandatoryStatus === "mandatory",
  );
  // A vendor with no assessment row for a requirement has not answered it —
  // the comparison grid already shows that cell as "Not answered".
  const levelFor = (requirement: SummaryRequirement) => {
    const vendor = requirement.vendors.find((item) => item.participantId === participantId);
    return vendor ? coverageFromVerdict(vendor.verdict) : "not_answered";
  };
  return {
    gaps: mandatory.filter((requirement) => UNANSWERED.includes(levelFor(requirement))).length,
    partials: mandatory.filter((requirement) => levelFor(requirement) === "partly_answered").length,
  };
};

const countAnswered = (requirements: SummaryRequirement[], participantId: string) =>
  requirements.filter((requirement) =>
    requirement.vendors.some(
      (vendor) => vendor.participantId === participantId && answered(vendor.verdict),
    ),
  ).length;

const money = (amount: number, currency: string | null) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 0,
  }).format(amount);

const list = (items: string[]) =>
  items.length <= 1
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** Requirements the leader answered and the rival did not. */
const wonRequirements = (
  requirements: SummaryRequirement[],
  leaderId: string,
  rivalId: string,
) =>
  requirements.filter((requirement) => {
    const leader = requirement.vendors.find((v) => v.participantId === leaderId);
    const rival = requirement.vendors.find((v) => v.participantId === rivalId);
    return Boolean(leader && rival && answered(leader.verdict) && unanswered(rival.verdict));
  });

export const buildRecommendationSummary = (input: {
  leaderId: string;
  ranking: SummaryRanking[];
  requirements: SummaryRequirement[];
  commercial: SummaryCommercial[];
  /** Hide every price line when the viewer may not see commercial data. */
  canViewCommercial: boolean;
}): RecommendationSummary | null => {
  const leader = input.ranking.find((item) => item.participantId === input.leaderId);
  if (!leader) return null;
  const others = input.ranking.filter((item) => item.participantId !== input.leaderId);
  const total = input.requirements.length;
  const leaderAnswered = countAnswered(input.requirements, input.leaderId);
  const priceOf = (participantId: string) =>
    input.canViewCommercial
      ? input.commercial.find((item) => item.participantId === participantId) ?? null
      : null;
  const leaderPrice = priceOf(input.leaderId);
  const leaderMandatory = mandatoryCounts(input.requirements, input.leaderId);

  // Only claim the leader answered more when it actually did — vendors often
  // answer the same number and differ on which ones.
  const bestRival = others.reduce(
    (most, other) => Math.max(most, countAnswered(input.requirements, other.participantId)),
    0,
  );
  const answeredClause = !others.length
    ? ""
    : leaderAnswered > bestRival
      ? `, more than ${others.length === 1 ? "the other vendor" : "any other vendor"}`
      : leaderAnswered === bestRival
        ? `, the same as ${others.length === 1 ? "the other vendor" : "the next vendor"} &mdash; what separates them is which ones`
        : "";
  const overview = `RFPilot compared ${input.ranking.length} ${input.ranking.length === 1 ? "vendor" : "vendors"} against all ${total} of your approved requirements. ${leader.vendorLabel} answered ${leaderAnswered} of them${answeredClause}.`.replace("&mdash;", "\u2014");

  const strengths: string[] = [];
  const beatenOn = others.flatMap((other) =>
    wonRequirements(input.requirements, input.leaderId, other.participantId),
  );
  const uniqueBeaten = [...new Map(beatenOn.map((r) => [r.requirementId, r])).values()];
  if (uniqueBeaten.length)
    strengths.push(
      `Answered ${list(uniqueBeaten.slice(0, 3).map((r) => r.title))}${
        uniqueBeaten.length > 3 ? ` and ${uniqueBeaten.length - 3} more` : ""
      } where another vendor did not.`,
    );

  const mandatoryBetter = others.filter(
    (other) => mandatoryCounts(input.requirements, other.participantId).gaps > leaderMandatory.gaps,
  );
  if (mandatoryBetter.length)
    strengths.push(
      leaderMandatory.gaps === 0
        ? "Answered every must-have requirement, which not every vendor did."
        : `Left fewer must-have requirements unanswered than ${list(mandatoryBetter.map((o) => o.vendorLabel))}.`,
    );

  const riskBetter = others.filter((other) => other.highRisks > leader.highRisks);
  if (riskBetter.length)
    strengths.push(
      leader.highRisks === 0
        ? "Raised no high-severity concerns, unlike other responses here."
        : `Raised fewer high-severity concerns than ${list(riskBetter.map((o) => o.vendorLabel))}.`,
    );

  if (leaderPrice?.submittedTotal !== null && leaderPrice !== null) {
    const cheaperThan = others.filter((other) => {
      const price = priceOf(other.participantId);
      return price?.submittedTotal !== null && price !== null
        && price.submittedTotal! > leaderPrice.submittedTotal!;
    });
    if (cheaperThan.length)
      strengths.push(
        `Quoted ${money(leaderPrice.submittedTotal!, leaderPrice.submittedCurrency)}, less than ${list(cheaperThan.map((o) => o.vendorLabel))}.`,
      );
  }

  const watchOuts: string[] = [];
  if (leaderMandatory.gaps > 0)
    watchOuts.push(
      `${leaderMandatory.gaps} must-have requirement${leaderMandatory.gaps === 1 ? " is" : "s are"} still unanswered — ask before you award.`,
    );
  if (leaderMandatory.partials > 0)
    watchOuts.push(
      `${leaderMandatory.partials} must-have requirement${leaderMandatory.partials === 1 ? " is" : "s are"} only partly answered — check the remaining detail matters.`,
    );
  if (leader.highRisks > 0)
    watchOuts.push(
      `${leader.highRisks} high-severity concern${leader.highRisks === 1 ? "" : "s"} recorded against this response.`,
    );
  if ((leader.unresolvedReviews ?? 0) > 0)
    watchOuts.push(
      `${leader.unresolvedReviews} piece${leader.unresolvedReviews === 1 ? "" : "s"} of flagged evidence ${leader.unresolvedReviews === 1 ? "has" : "have"} not been reviewed yet.`,
    );
  if (leaderAnswered < total)
    watchOuts.push(
      `${total - leaderAnswered} of your ${total} requirements ${total - leaderAnswered === 1 ? "is" : "are"} not fully answered.`,
    );

  const alternatives = others.map((other) => {
    const points: string[] = [];
    if (!other.eligible)
      points.push(
        `Missed ${other.eligibilityFailures} must-pass requirement${other.eligibilityFailures === 1 ? "" : "s"}, so it is out of the running.`,
      );
    const gap = leaderAnswered - countAnswered(input.requirements, other.participantId);
    if (gap > 0)
      points.push(`Answered ${gap} fewer requirement${gap === 1 ? "" : "s"}.`);
    else if (gap < 0)
      points.push(`Answered ${-gap} more requirement${gap === -1 ? "" : "s"}.`);
    const otherMandatory = mandatoryCounts(input.requirements, other.participantId);
    if (otherMandatory.gaps > 0)
      points.push(
        `${otherMandatory.gaps} must-have requirement${otherMandatory.gaps === 1 ? "" : "s"} unanswered.`,
      );
    if (otherMandatory.partials > 0)
      points.push(
        `${otherMandatory.partials} must-have requirement${otherMandatory.partials === 1 ? "" : "s"} only partly answered.`,
      );
    const price = priceOf(other.participantId);
    if (
      price?.submittedTotal !== null && price !== null
      && leaderPrice?.submittedTotal !== null && leaderPrice !== null
    ) {
      const difference = price.submittedTotal! - leaderPrice.submittedTotal!;
      if (difference !== 0)
        points.push(
          `Quoted ${money(Math.abs(difference), price.submittedCurrency)} ${difference > 0 ? "more" : "less"}.`,
        );
    }
    if (other.highRisks > leader.highRisks)
      points.push(
        `${other.highRisks} high-severity concern${other.highRisks === 1 ? "" : "s"}.`,
      );
    if (!points.length) points.push("Closely matched on requirements, price and risk.");
    return { participantId: other.participantId, vendorLabel: other.vendorLabel, points };
  });

  return { overview, strengths, watchOuts, alternatives };
};

/**
 * The same comparison when no single vendor leads — a close call, or nothing
 * eligible. Each vendor gets its own facts rather than a difference from a
 * leader that does not exist.
 */
export const buildVendorComparison = (input: {
  ranking: SummaryRanking[];
  requirements: SummaryRequirement[];
  commercial: SummaryCommercial[];
  canViewCommercial: boolean;
}): Array<{ participantId: string; vendorLabel: string; points: string[] }> =>
  input.ranking.map((vendor) => {
    const points = [
      `Answered ${countAnswered(input.requirements, vendor.participantId)} of ${input.requirements.length} requirements.`,
    ];
    const price = input.canViewCommercial
      ? input.commercial.find((item) => item.participantId === vendor.participantId)
      : undefined;
    if (price && price.submittedTotal !== null)
      points.push(`Quoted ${money(price.submittedTotal, price.submittedCurrency)}.`);
    if (!vendor.eligible)
      points.push(
        `Missed ${vendor.eligibilityFailures} must-pass requirement${vendor.eligibilityFailures === 1 ? "" : "s"}.`,
      );
    const mandatory = mandatoryCounts(input.requirements, vendor.participantId);
    if (mandatory.gaps > 0)
      points.push(
        `${mandatory.gaps} must-have requirement${mandatory.gaps === 1 ? "" : "s"} unanswered.`,
      );
    if (mandatory.partials > 0)
      points.push(
        `${mandatory.partials} must-have requirement${mandatory.partials === 1 ? "" : "s"} only partly answered.`,
      );
    if (vendor.highRisks > 0)
      points.push(
        `${vendor.highRisks} high-severity concern${vendor.highRisks === 1 ? "" : "s"}.`,
      );
    return { participantId: vendor.participantId, vendorLabel: vendor.vendorLabel, points };
  });
