/**
 * Works out which vendor responses exist for a proposal but are missing from
 * the comparison the planner is looking at.
 *
 * The intelligence header counts every response that has evidence to read,
 * while the comparison below only ever shows the participants that were in the
 * run. A response blocked by, say, one unreadable page of a 32-page PDF simply
 * vanished between the two, with no notice on the page where the award
 * decision is made.
 */

export type ExclusionReason =
  | "sources_unreadable"
  | "analysis_incomplete"
  | "analysis_failed"
  | "not_in_this_comparison";

export type CandidateResponse = {
  responseId: string;
  vendorLabel: string;
  submissionId: string;
  versionId: string;
  /** Fact-mapping run status, when one exists. */
  intelligenceStatus?: string;
  /** Warnings recorded against the fact-mapping run. */
  warnings?: Array<Record<string, unknown>>;
  /** True once the vendor's scorecard is complete enough to be compared. */
  comparisonReady: boolean;
  error?: string;
};

export type ExcludedVendor = {
  responseId: string;
  vendorLabel: string;
  reason: ExclusionReason;
  /** One sentence a planner can act on. */
  explanation: string;
  /** The underlying messages, so the detail is never hidden. */
  details: string[];
};

const warningText = (warnings: Array<Record<string, unknown>> = []) =>
  warnings
    .map((warning) => {
      const message = typeof warning.message === "string" ? warning.message : "";
      const source = typeof warning.sourceLabel === "string" ? warning.sourceLabel : "";
      return source && message ? `${source}: ${message}` : message || source;
    })
    .filter(Boolean);

const reasonFor = (candidate: CandidateResponse): ExclusionReason => {
  if (candidate.error || candidate.intelligenceStatus === "failed") return "analysis_failed";
  if ((candidate.warnings?.length ?? 0) > 0) return "sources_unreadable";
  if (candidate.intelligenceStatus !== "succeeded" || !candidate.comparisonReady)
    return "analysis_incomplete";
  return "not_in_this_comparison";
};

const explanationFor = (reason: ExclusionReason, vendorLabel: string) => {
  if (reason === "sources_unreadable")
    return `RFPilot could not read part of ${vendorLabel}'s response, so it was left out of this comparison. Ask them for a text-based copy of the file, or add their figures manually, then run the comparison again.`;
  if (reason === "analysis_failed")
    return `RFPilot could not finish reading ${vendorLabel}'s response. Open the response to see what failed and retry it, then run the comparison again.`;
  if (reason === "analysis_incomplete")
    return `${vendorLabel}'s response has not finished being read and scored, so it was not ready when this comparison ran. Finish it, then run the comparison again to include them.`;
  return `${vendorLabel} was not selected when this comparison was run. Run a new comparison to include them.`;
};

export const findExcludedVendors = (input: {
  candidates: CandidateResponse[];
  /** Participants that were actually in the comparison run. */
  comparedKeys: Array<{ submissionId: string; versionId: string }>;
}): ExcludedVendor[] => {
  const compared = new Set(
    input.comparedKeys.map((key) => `${key.submissionId}:${key.versionId}`),
  );
  return input.candidates
    .filter(
      (candidate) => !compared.has(`${candidate.submissionId}:${candidate.versionId}`),
    )
    .map((candidate) => {
      const reason = reasonFor(candidate);
      return {
        responseId: candidate.responseId,
        vendorLabel: candidate.vendorLabel,
        reason,
        explanation: explanationFor(reason, candidate.vendorLabel),
        details: [
          ...warningText(candidate.warnings),
          ...(candidate.error ? [candidate.error] : []),
        ],
      };
    });
};
