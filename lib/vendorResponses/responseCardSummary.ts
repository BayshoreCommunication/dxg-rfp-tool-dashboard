import type {
  EvidenceExtractionSummary,
} from "@/app/actions/evidenceExtraction";
import type {
  ExtractedFact,
  IntelligenceEvidence,
  VendorIntelligenceResult,
} from "@/app/actions/vendorIntelligence";
import type { VendorResponseItem } from "@/app/actions/vendorResponse";

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

export type ResponseCardSummary = {
  extractionStatus: CardExtractionStatus;
  intelligenceStatus: "ready" | "not_started" | "unavailable";
  headlineFacts: HeadlineFact[];
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
  commercial_total: 0,
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
  const hasVersion = Boolean(response.submissionId && response.currentVersionId);
  const knownUnusable = ["unreadable", "failed"].includes(extractionStatus);
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
    requiredFields,
    contradictionCount: intelligenceResult?.run.contradictionCount ?? 0,
    isComparable: hasVersion && !knownUnusable,
    needsAttention,
  };
};
