/**
 * One place that turns the backend's codes into sentences a planner can act
 * on: freshness reasons ("assessment_schema_changed"), recommendation
 * confidence reasons ("insufficient_independent_evaluators"), commercial
 * refusal codes ("SUBMITTED_TOTAL_CONTRADICTORY"), risk categories and
 * templated risk titles, job stages and statuses, and file MIME types.
 *
 * Screens used to run each code through a generic "replace underscores and
 * capitalise" helper, so a buyer deciding a contract read "Normalization was
 * refused: SUBMITTED TOTAL CONTRADICTORY" and "Out of date (Assessment schema
 * changed)". Every mapping below falls back to that humanised form for a code
 * it does not know, so nothing is hidden — just never shown raw.
 */

export const readable = (value: string) =>
  value.replaceAll("_", " ").trim().replace(/^./, (letter) => letter.toUpperCase());

const list = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

// ---------------------------------------------------------------------------
// Why a saved comparison or requirements list is out of date
// ---------------------------------------------------------------------------

export const freshnessReasonText: Record<string, string> = {
  proposal_version_changed: "the proposal was edited",
  requirement_set_superseded: "the requirements list was changed or re-approved",
  requirement_policy_changed: "RFPilot's way of drafting requirements was updated",
  evaluation_matrix_superseded: "the scoring criteria or their weights changed",
  submission_version_available: "a vendor sent a newer version of their response",
  evidence_review_changed: "you accepted, rejected or corrected something RFPilot read",
  evaluator_scores_changed: "scores were added or changed",
  evaluation_incomplete: "scoring is not finished for every vendor",
  source_replaced: "a vendor file was replaced",
  extraction_policy_changed: "RFPilot's way of reading files was updated",
  assessment_schema_changed: "RFPilot's way of checking requirements was updated",
  scoring_policy_changed: "RFPilot's scoring method was updated",
  commercial_policy_changed: "RFPilot's way of comparing prices was updated",
  risk_policy_changed: "RFPilot's way of flagging concerns was updated",
  comparison_schema_changed: "RFPilot's comparison format was updated",
  recommendation_policy_changed: "RFPilot's recommendation rules were updated",
};

/** "Since this comparison ran, the proposal was edited and a vendor sent a newer version of their response." */
export const describeFreshnessReasons = (reasons: string[], subject = "this comparison ran") => {
  const texts = [...new Set(reasons)].map((reason) => freshnessReasonText[reason] ?? readable(reason).toLowerCase());
  return texts.length ? `Since ${subject}, ${list(texts)}.` : "";
};

// ---------------------------------------------------------------------------
// Why the recommendation is not confident
// ---------------------------------------------------------------------------

export const confidenceReasonText: Record<string, string> = {
  close_score_margin: "The top scores are close, so a small change could reorder the vendors.",
  unresolved_evidence_reviews: "Some of what RFPilot read for the leader is still flagged for your review.",
  insufficient_independent_evaluators: "Fewer than two people have scored the leader, so the ranking rests mostly on RFPilot's starting scores.",
  high_evaluator_disagreement: "Reviewers disagreed strongly on at least one criterion.",
  mandatory_gaps: "The leader has not answered every must-have requirement.",
  high_risks: "High-severity concerns are recorded against the leader.",
  no_eligible_vendor: "No vendor meets every must-pass requirement.",
};

export const describeConfidenceReason = (reason: string) =>
  confidenceReasonText[reason] ?? readable(reason);

// ---------------------------------------------------------------------------
// Why a vendor's price cannot be compared
// ---------------------------------------------------------------------------

export const refusalCodeText: Record<string, string> = {
  SUBMITTED_TOTAL_MISSING: "No total price was found in the files.",
  SUBMITTED_TOTAL_CONTRADICTORY: "The files state more than one total.",
  UNRESOLVED_OPTIONS_OR_EXCLUSIONS: "Some items are optional or excluded, and it is unclear whether they are in the total.",
  SUBMITTED_TOTAL_INVALID: "The total that was found is not a valid amount.",
};

export const describeRefusalCodes = (codes: string[]) =>
  [...new Set(codes)].map((code) => refusalCodeText[code] ?? `${readable(code.toLowerCase())}.`).join(" ");

// ---------------------------------------------------------------------------
// Risks flagged against a response
// ---------------------------------------------------------------------------

export const riskCategoryLabel: Record<string, string> = {
  mandatory_gap: "Must-have not fully answered",
  commercial_non_comparable: "Price can't be compared yet",
  missing_detail: "Detail missing",
  commercial_exception: "Pricing assumption or exclusion",
  contradiction: "Conflicting statements",
  reference_unverified: "Reference not verified",
};

export const describeRiskCategory = (category: string) =>
  riskCategoryLabel[category] ?? readable(category);

/**
 * The evaluation engine stores templated titles ("Mandatory item needs
 * disposition: Union Labor"). Rewrite the known templates and keep the
 * requirement name; anything else is shown as stored.
 */
export const plainRiskTitle = (risk: { category: string; title: string }) => {
  const separator = risk.title.indexOf(": ");
  const subject = separator === -1 ? null : risk.title.slice(separator + 2).trim();
  switch (risk.category) {
    case "mandatory_gap":
      return subject ? `Must-have not fully answered: ${subject}` : "Must-have not fully answered";
    case "missing_detail":
      return subject ? `Missing detail: ${subject}` : "Missing detail";
    case "commercial_non_comparable":
      return "The price can't be compared yet";
    case "commercial_exception":
      return "Pricing assumption or exclusion to check";
    case "contradiction":
      return "The response says two different things";
    case "reference_unverified":
      return "Reference has not been checked";
    default:
      return risk.title;
  }
};

/** Translates a stored "Normalization was refused: CODE, CODE." basis; other text passes through. */
export const plainRiskBasis = (basis: string) => {
  const refused = basis.match(/^Normalization was refused: (.+?)\.?$/);
  if (refused) return describeRefusalCodes(refused[1].split(",").map((code) => code.trim()));
  return basis;
};

// ---------------------------------------------------------------------------
// Background work
// ---------------------------------------------------------------------------

export const jobStageLabel: Record<string, string> = {
  queued: "Queued",
  participant_snapshots: "Analysing each vendor",
  snapshot: "Analysing",
  aggregation: "Combining results",
  aggregate: "Combining results",
  completed: "Done",
  cancelling: "Stopping",
  cancelled: "Stopped",
  comparison_participant_snapshot: "Analysing a vendor",
  comparison_aggregate: "Combining results",
};

export const runStatusLabel: Record<string, string> = {
  queued: "Queued",
  waiting: "Waiting",
  running: "Running",
  succeeded: "Done",
  succeeded_with_warnings: "Done with warnings",
  complete: "Done",
  completed: "Done",
  failed: "Failed",
  dead_letter: "Failed",
  cancelling: "Stopping",
  cancelled: "Stopped",
};

export const describeStage = (stage: string) => jobStageLabel[stage] ?? readable(stage);
export const describeRunStatus = (status: string) => runStatusLabel[status] ?? readable(status);

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

const mimeLabels: Array<[RegExp, string]> = [
  [/pdf/i, "PDF"],
  [/wordprocessingml|msword/i, "Word document"],
  [/spreadsheetml|ms-excel/i, "Excel spreadsheet"],
  [/presentationml|ms-powerpoint/i, "PowerPoint presentation"],
  [/csv/i, "CSV file"],
  [/^text\/plain/i, "Text file"],
  [/^image\//i, "Image"],
  [/zip/i, "ZIP archive"],
];

const extensionLabels: Record<string, string> = {
  pdf: "PDF", doc: "Word document", docx: "Word document", xls: "Excel spreadsheet", xlsx: "Excel spreadsheet",
  ppt: "PowerPoint presentation", pptx: "PowerPoint presentation", csv: "CSV file", txt: "Text file",
  png: "Image", jpg: "Image", jpeg: "Image", gif: "Image", zip: "ZIP archive",
};

/** "application/pdf" → "PDF"; falls back to the file extension, then "File". */
export const fileTypeLabel = (mimeType: string | null | undefined, fileName?: string | null) => {
  const mime = (mimeType ?? "").trim();
  const byMime = mime ? mimeLabels.find(([pattern]) => pattern.test(mime))?.[1] : undefined;
  if (byMime) return byMime;
  const extension = (fileName ?? "").split(".").pop()?.toLowerCase();
  if (extension && extension !== fileName?.toLowerCase() && extensionLabels[extension]) return extensionLabels[extension];
  if (extension && extension !== fileName?.toLowerCase() && extension.length <= 5) return `${extension.toUpperCase()} file`;
  return mime ? readable(mime.split("/").pop() ?? mime) : "File";
};

// ---------------------------------------------------------------------------
// Background job failures
// ---------------------------------------------------------------------------

export const jobErrorText: Record<string, string> = {
  LIVE_AI_PROVIDER_FAILED: "RFPilot's reading service did not respond while analysing a vendor's files. Try again in a few minutes.",
  LIVE_AI_MALFORMED_OUTPUT: "RFPilot's reading service returned something it could not use. Try again in a few minutes.",
  LIVE_AI_DISABLED: "Automatic analysis is switched off in this environment.",
  SOURCE_UNAVAILABLE: "A vendor file could not be made available to the analysis.",
};

/** "LIVE_AI_PROVIDER_FAILED" → a sentence; unknown codes are humanised, never shown raw. */
export const describeJobError = (code: string | null | undefined) =>
  code ? jobErrorText[code] ?? `${readable(code.toLowerCase())}.` : "";
