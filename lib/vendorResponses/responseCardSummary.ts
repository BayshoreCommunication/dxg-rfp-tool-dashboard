import type {
  EvidenceExtractionSummary,
} from "@/app/actions/evidenceExtraction";
import type {
  ExtractedFact,
  HumanReview,
  IntelligenceEvidence,
  VendorIntelligenceResult,
} from "@/app/actions/vendorIntelligence";
import type { VendorResponseItem } from "@/app/actions/vendorResponse";
import { coverageFromRelationship } from "@/lib/proposalIntelligence/coverageVocabulary";
import { isBlockingWarning } from "@/lib/proposalIntelligence/evaluationGate";
import { parseMoney } from "@/lib/vendorResponses/money";

type LoadResult<T> =
  | { success: true; data: T }
  | { success: false; code?: string; message?: string };

export type CardExtractionStatus =
  | EvidenceExtractionSummary["status"]
  | "unavailable";

export type HeadlineFact = {
  factId: string;
  label: string;
  value: string;
  explicitness: "explicit" | "derived";
  source: IntelligenceEvidence;
};

/**
 * How the response answers the proposal's requirements, counted over every
 * mapped requirement (not only mandatory ones) using the shared coverage
 * vocabulary, so the card says the same thing the detail page does.
 */
export type RequirementCoverage = {
  total: number;
  answered: number;
  partlyAnswered: number;
  notAnswered: number;
  conflicting: number;
  mandatoryNotAnswered: number;
};

/**
 * Why the backend will refuse to evaluate or compare this response. Mirrors
 * the server rule: an unreadable or failed extraction, or a source the
 * intelligence run could not use (`SOURCE_UNAVAILABLE`), blocks. Partially
 * readable pages do not block; they are surfaced as `partialSources`.
 */
export type ComparisonBlockReason =
  | "no_version"
  | "source_unavailable"
  | "unreadable"
  | "failed";

export type CommercialTotalCandidate = {
  factId: string;
  amount: number;
  currency: string;
  /** Short name for what this figure is, from the extracted fact key ("Equipment total"). */
  label: string;
  source: IntelligenceEvidence;
};

/**
 * The one price a card may show for a response. A response whose files state
 * several different totals (an equipment subtotal, a labour subtotal and a
 * grand total, say) is not given a number until someone confirms which one
 * applies — the old card picked whichever fact came first and badged it as
 * the lowest bid.
 */
export type CommercialTotal =
  | {
      status: "stated";
      factId: string;
      amount: number;
      currency: string;
      source: IntelligenceEvidence;
      /** The planner accepted or corrected this figure on the response page. */
      confirmed: boolean;
      /** Other distinct totals the files state, set aside by the confirmation. */
      otherTotals: number;
    }
  | { status: "needs_confirmation"; candidates: CommercialTotalCandidate[] }
  | { status: "not_stated" };

export type ResponseCardSummary = {
  extractionStatus: CardExtractionStatus;
  intelligenceStatus: "ready" | "not_started" | "unavailable";
  /** Headline values other than price; see `commercialTotal` for that. */
  headlineFacts: HeadlineFact[];
  commercialTotal: CommercialTotal;
  requirementCoverage: RequirementCoverage | null;
  comparisonBlocked: ComparisonBlockReason | null;
  /** Some pages could not be read; findings may be incomplete but nothing is blocked. */
  partialSources: boolean;
  requiredFields: {
    total: number;
    present: number;
    missing: number;
    conflicts: number;
    missingTitles: string[];
    conflictTitles: string[];
  } | null;
  contradictionCount: number;
  isComparable: boolean;
  needsAttention: boolean;
};

const headlinePriority: Record<string, number> = {
  proposal_validity: 1,
  setup_schedule: 2,
  rehearsal_schedule: 3,
  strike_schedule: 4,
  staff_count: 5,
  coverage_ratio: 6,
  equipment_quantity: 7,
};

const headlineLabels: Record<string, string> = {
  commercial_total: "Total cost",
  proposal_validity: "Proposal validity",
  setup_schedule: "Setup schedule",
  rehearsal_schedule: "Rehearsal schedule",
  strike_schedule: "Strike schedule",
  staff_count: "Staffing",
  coverage_ratio: "Coverage",
  equipment_quantity: "Equipment scope",
};

const supportingSource = (fact: ExtractedFact) =>
  fact.citations.find((citation) => citation.role === "supports");

export const selectHeadlineFacts = (facts: ExtractedFact[]): HeadlineFact[] => {
  const eligible = facts
    .filter(
      (fact) =>
        fact.normalizedValue.trim().length > 0 &&
        !fact.contradictionGroup &&
        headlinePriority[fact.factType] !== undefined &&
        Boolean(supportingSource(fact)),
    )
    .sort((left, right) => {
      const priority =
        headlinePriority[left.factType] - headlinePriority[right.factType];
      if (priority !== 0) return priority;
      return right.confidence - left.confidence;
    });

  const seenTypes = new Set<string>();
  return eligible.flatMap((fact) => {
    if (seenTypes.has(fact.factType)) return [];
    const source = supportingSource(fact);
    if (!source) return [];
    seenTypes.add(fact.factType);
    return [{
      factId: fact.factId,
      label: headlineLabels[fact.factType] ?? fact.factType.replaceAll("_", " "),
      value: fact.normalizedValue,
      explicitness: fact.explicitness === "derived" ? "derived" as const : "explicit" as const,
      source,
    }];
  }).slice(0, 3);
};

const humanizeKey = (key: string) =>
  key.replaceAll(/[._]/g, " ").trim().replace(/^./, (letter) => letter.toUpperCase());

/** The newest review per fact; later entries supersede earlier ones. */
const latestFactReviews = (reviews: HumanReview[]) => {
  const latest = new Map<string, HumanReview>();
  reviews.forEach((review) => {
    if (review.targetType === "fact") latest.set(review.targetId, review);
  });
  return latest;
};

export const deriveCommercialTotal = (
  facts: ExtractedFact[],
  reviews: HumanReview[] = [],
): CommercialTotal => {
  const latest = latestFactReviews(reviews);
  const candidates = facts.flatMap((fact) => {
    if (fact.factType !== "commercial_total") return [];
    const source = supportingSource(fact);
    if (!source) return [];
    const review = latest.get(fact.factId);
    if (review?.decision === "rejected") return [];
    const corrected = review?.decision === "corrected" && typeof review.correctedPayload?.normalizedValue === "string"
      ? parseMoney(review.correctedPayload.normalizedValue)
      : null;
    const money = corrected ?? parseMoney(fact.normalizedValue);
    if (!money) return [];
    return [{
      factId: fact.factId,
      amount: money.amount,
      currency: money.currency,
      label: humanizeKey(fact.factKey),
      source,
      confirmed: review?.decision === "accepted" || review?.decision === "corrected",
    }];
  });
  if (candidates.length === 0) return { status: "not_stated" };

  const distinct = new Map<string, (typeof candidates)[number][]>();
  candidates.forEach((candidate) => {
    const key = `${candidate.currency}:${candidate.amount}`;
    distinct.set(key, [...(distinct.get(key) ?? []), candidate]);
  });
  const groups = [...distinct.values()];
  const stated = (group: (typeof candidates)[number][], otherTotals: number) => {
    const chosen = group.find((candidate) => candidate.confirmed) ?? group[0];
    return {
      status: "stated" as const,
      factId: chosen.factId,
      amount: chosen.amount,
      currency: chosen.currency,
      source: chosen.source,
      confirmed: group.some((candidate) => candidate.confirmed),
      otherTotals,
    };
  };
  if (groups.length === 1) return stated(groups[0], 0);

  // Several different figures: only a planner's confirmation picks one.
  const confirmedGroups = groups.filter((group) => group.some((candidate) => candidate.confirmed));
  if (confirmedGroups.length === 1) return stated(confirmedGroups[0], groups.length - 1);
  return {
    status: "needs_confirmation",
    candidates: groups
      .map((group) => group[0])
      .sort((left, right) => right.amount - left.amount)
      .map(({ factId, amount, currency, label, source }) => ({ factId, amount, currency, label, source })),
  };
};

const requiredFieldSummary = (result: VendorIntelligenceResult) => {
  const requiredMappings = result.mappings.filter((mapping) => mapping.mandatory);
  if (requiredMappings.length === 0) return null;

  const present = requiredMappings.filter(
    (mapping) =>
      ["supports", "partially_supports"].includes(mapping.relationship) &&
      mapping.evidence.length > 0,
  );
  const conflicts = requiredMappings.filter(
    (mapping) =>
      mapping.relationship === "contradicts" && mapping.evidence.length > 0,
  );
  const missing = requiredMappings.filter(
    (mapping) => !present.includes(mapping) && !conflicts.includes(mapping),
  );

  return {
    total: requiredMappings.length,
    present: present.length,
    missing: missing.length,
    conflicts: conflicts.length,
    missingTitles: missing.map((mapping) => mapping.requirementTitle),
    conflictTitles: conflicts.map((mapping) => mapping.requirementTitle),
  };
};

const requirementCoverageSummary = (
  result: VendorIntelligenceResult,
): RequirementCoverage => {
  const coverage: RequirementCoverage = {
    total: 0,
    answered: 0,
    partlyAnswered: 0,
    notAnswered: 0,
    conflicting: 0,
    mandatoryNotAnswered: 0,
  };
  result.mappings.forEach((mapping) => {
    const level = coverageFromRelationship(mapping.relationship);
    if (level === "not_applicable") return;
    coverage.total += 1;
    if (level === "answered") coverage.answered += 1;
    else if (level === "partly_answered") coverage.partlyAnswered += 1;
    else if (level === "conflicting") coverage.conflicting += 1;
    else {
      coverage.notAnswered += 1;
      if (mapping.mandatory) coverage.mandatoryNotAnswered += 1;
    }
  });
  return coverage;
};

export const deriveResponseCardSummary = ({
  response,
  extraction,
  intelligence,
}: {
  response: VendorResponseItem;
  extraction: LoadResult<EvidenceExtractionSummary> | null;
  intelligence: LoadResult<VendorIntelligenceResult> | null;
}): ResponseCardSummary => {
  const extractionStatus: CardExtractionStatus = extraction?.success
    ? extraction.data.status
    : extraction
      ? "unavailable"
      : "not_started";
  const intelligenceResult = intelligence?.success ? intelligence.data : null;
  const intelligenceStatus = intelligenceResult
    ? "ready"
    : intelligence?.success === false && intelligence.code !== "INTELLIGENCE_RUN_NOT_FOUND"
      ? "unavailable"
      : "not_started";
  const requiredFields = intelligenceResult
    ? requiredFieldSummary(intelligenceResult)
    : null;
  const requirementCoverage = intelligenceResult
    ? requirementCoverageSummary(intelligenceResult)
    : null;
  const hasVersion = Boolean(response.submissionId && response.currentVersionId);
  const comparisonBlocked: ComparisonBlockReason | null = !hasVersion
    ? "no_version"
    : extractionStatus === "unreadable"
      ? "unreadable"
      : extractionStatus === "failed"
        ? "failed"
        : intelligenceResult?.run.warnings.some(isBlockingWarning)
          ? "source_unavailable"
          : null;
  const partialSources =
    comparisonBlocked === null &&
    (extractionStatus === "partial" || (intelligenceResult?.run.warnings.length ?? 0) > 0);
  const needsAttention =
    !hasVersion ||
    extractionStatus !== "ready" ||
    intelligenceStatus !== "ready" ||
    Boolean(requiredFields && (requiredFields.missing > 0 || requiredFields.conflicts > 0)) ||
    Boolean(intelligenceResult?.run.contradictionCount);

  return {
    extractionStatus,
    intelligenceStatus,
    headlineFacts: intelligenceResult
      ? selectHeadlineFacts(intelligenceResult.facts)
      : [],
    commercialTotal: intelligenceResult
      ? deriveCommercialTotal(intelligenceResult.facts, intelligenceResult.reviews)
      : { status: "not_stated" },
    requirementCoverage,
    comparisonBlocked,
    partialSources,
    requiredFields,
    contradictionCount: intelligenceResult?.run.contradictionCount ?? 0,
    isComparable: comparisonBlocked === null,
    needsAttention,
  };
};
