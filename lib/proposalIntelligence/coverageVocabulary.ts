/**
 * One vocabulary for "did this vendor answer this requirement?".
 *
 * The backend produces two separate enums for the same underlying question:
 * fact-mapping `relationship` values and assessment `verdict` values. Before
 * this module each screen humanised whichever enum it happened to receive, so
 * a single vendor answer was shown as "Supports", "Addressed" and "Addressed"
 * on three screens, and its opposite as "None", "Missing" and "Not stated".
 * Readers reasonably assumed those were different findings.
 *
 * Both enums now collapse into the closed set below, and every surface renders
 * from it.
 */
import type { IntelligenceStatus } from "@/lib/proposalIntelligence/statusVocabulary";

export const coverageLevels = [
  "answered",
  "partly_answered",
  "mentioned_only",
  "conflicting",
  "not_answered",
  "not_applicable",
] as const;

export type CoverageLevel = (typeof coverageLevels)[number];

export const coveragePresentation: Record<
  CoverageLevel,
  {
    /** Chip text. Sentence case everywhere; screens may uppercase via CSS. */
    label: string;
    /** One plain sentence a first-time reader can act on. */
    description: string;
    /** Shared status vocabulary, so chips match the rest of the product. */
    status: IntelligenceStatus;
    className: string;
  }
> = {
  answered: {
    label: "Answered",
    description: "The vendor answered this requirement and we can show you where.",
    status: "complete",
    className: "bg-emerald-100 text-emerald-800",
  },
  partly_answered: {
    label: "Partly answered",
    description:
      "The vendor answered part of this requirement. Read the quotes and decide whether the rest matters.",
    status: "partial",
    className: "bg-amber-100 text-amber-800",
  },
  mentioned_only: {
    label: "Mentioned, not answered",
    description:
      "The vendor mentions this topic but never answers the requirement itself.",
    status: "attention",
    className: "bg-sky-100 text-sky-800",
  },
  conflicting: {
    label: "Conflicting answers",
    description:
      "The response answers this requirement in two ways that disagree. Ask the vendor which is correct.",
    status: "attention",
    className: "bg-red-100 text-red-800",
  },
  not_answered: {
    label: "Not answered",
    description: "Nothing in this response answers the requirement.",
    status: "unavailable",
    className: "bg-slate-200 text-slate-700",
  },
  not_applicable: {
    label: "Not applicable",
    description: "This requirement does not apply to this vendor.",
    status: "unavailable",
    className: "bg-slate-100 text-slate-600",
  },
};

/** Assessment `verdict` values produced by the evaluation engine. */
const verdictToCoverage: Record<string, CoverageLevel> = {
  addressed: "answered",
  partially_addressed: "partly_answered",
  not_assessable: "mentioned_only",
  contradictory: "conflicting",
  missing: "not_answered",
  not_applicable: "not_applicable",
};

/** Fact-mapping `relationship` values produced by vendor intelligence. */
const relationshipToCoverage: Record<string, CoverageLevel> = {
  supports: "answered",
  partially_supports: "partly_answered",
  context_only: "mentioned_only",
  contradicts: "conflicting",
  none: "not_answered",
};

/** Unknown values read as "not answered" rather than inventing a new label. */
export const coverageFromVerdict = (verdict: string): CoverageLevel =>
  verdictToCoverage[verdict] ?? "not_answered";

export const coverageFromRelationship = (relationship: string): CoverageLevel =>
  relationshipToCoverage[relationship] ?? "not_answered";

export const coverageLabelForVerdict = (verdict: string) =>
  coveragePresentation[coverageFromVerdict(verdict)].label;

export const coverageLabelForRelationship = (relationship: string) =>
  coveragePresentation[coverageFromRelationship(relationship)].label;
