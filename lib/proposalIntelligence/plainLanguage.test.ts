import {
  describeConfidenceReason,
  describeJobError,
  describeFreshnessReasons,
  describeRefusalCodes,
  describeRiskCategory,
  describeRunStatus,
  describeStage,
  fileTypeLabel,
  plainRiskBasis,
  plainRiskTitle,
} from "./plainLanguage";

it("explains why a comparison is out of date in one sentence", () => {
  expect(describeFreshnessReasons(["assessment_schema_changed"])).toBe("Since this comparison ran, RFPilot's way of checking requirements was updated.");
  expect(describeFreshnessReasons(["proposal_version_changed", "submission_version_available", "proposal_version_changed"]))
    .toBe("Since this comparison ran, the proposal was edited and a vendor sent a newer version of their response.");
  expect(describeFreshnessReasons(["something_new"])).toBe("Since this comparison ran, something new.");
  expect(describeFreshnessReasons([])).toBe("");
});

it("turns recommendation confidence codes into things to check", () => {
  expect(describeConfidenceReason("insufficient_independent_evaluators")).toMatch(/Fewer than two people have scored the leader/);
  expect(describeConfidenceReason("close_score_margin")).toMatch(/top scores are close/);
  expect(describeConfidenceReason("unknown_reason")).toBe("Unknown reason");
});

it("never shows a refusal code raw", () => {
  expect(describeRefusalCodes(["SUBMITTED_TOTAL_CONTRADICTORY", "UNRESOLVED_OPTIONS_OR_EXCLUSIONS"]))
    .toBe("The files state more than one total. Some items are optional or excluded, and it is unclear whether they are in the total.");
  expect(describeRefusalCodes(["SOMETHING_ELSE"])).toBe("Something else.");
  expect(plainRiskBasis("Normalization was refused: SUBMITTED_TOTAL_CONTRADICTORY, UNRESOLVED_OPTIONS_OR_EXCLUSIONS."))
    .toMatch(/^The files state more than one total\./);
  expect(plainRiskBasis("The response did not fully address a mandatory requirement.")).toBe("The response did not fully address a mandatory requirement.");
});

it("rewrites templated risk titles and keeps the requirement name", () => {
  expect(plainRiskTitle({ category: "mandatory_gap", title: "Mandatory item needs disposition: Non-negotiable constraints" })).toBe("Must-have not fully answered: Non-negotiable constraints");
  expect(plainRiskTitle({ category: "missing_detail", title: "Response detail needed: Union Labor" })).toBe("Missing detail: Union Labor");
  expect(plainRiskTitle({ category: "commercial_non_comparable", title: "Commercial response is not deterministically comparable" })).toBe("The price can't be compared yet");
  expect(plainRiskTitle({ category: "commercial_exception", title: "Commercial assumption or exclusion requires review" })).toBe("Pricing assumption or exclusion to check");
  expect(plainRiskTitle({ category: "custom", title: "Anything else" })).toBe("Anything else");
  expect(describeRiskCategory("commercial_non_comparable")).toBe("Price can't be compared yet");
  expect(describeRiskCategory("brand_new")).toBe("Brand new");
});

it("names background stages, statuses and file types for people", () => {
  expect(describeStage("participant_snapshots")).toBe("Analysing each vendor");
  expect(describeStage("aggregation")).toBe("Combining results");
  expect(describeRunStatus("succeeded")).toBe("Done");
  expect(describeRunStatus("succeeded_with_warnings")).toBe("Done with warnings");
  expect(describeRunStatus("dead_letter")).toBe("Failed");
  expect(describeRunStatus("odd_state")).toBe("Odd state");
  expect(fileTypeLabel("application/pdf")).toBe("PDF");
  expect(fileTypeLabel("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("Excel spreadsheet");
  expect(fileTypeLabel("", "deck.pptx")).toBe("PowerPoint presentation");
  expect(fileTypeLabel("", "notes.md")).toBe("MD file");
  expect(fileTypeLabel(null, "README")).toBe("File");
});

it("explains a failed background job without the code", () => {
  expect(describeJobError("LIVE_AI_PROVIDER_FAILED")).toMatch(/reading service did not respond/);
  expect(describeJobError("SOMETHING_ODD")).toBe("Something odd.");
  expect(describeJobError(null)).toBe("");
});
