import {
  extractionStatusToIntelligenceStatus,
  intelligenceStatuses,
  intelligenceStatusPresentation,
  jobStatusToIntelligenceStatus,
} from "./statusVocabulary";

it("defines one presentation for every status in the closed vocabulary", () => {
  expect(Object.keys(intelligenceStatusPresentation)).toEqual([
    ...intelligenceStatuses,
  ]);
  expect(
    new Set(
      Object.values(intelligenceStatusPresentation).map(
        (presentation) => presentation.label,
      ),
    ).size,
  ).toBe(intelligenceStatuses.length);
});

it.each([
  ["queued", "queued"],
  ["retry_scheduled", "queued"],
  ["running", "in_progress"],
  ["succeeded", "complete"],
  ["succeeded_with_warnings", "partial"],
  ["failed", "failed"],
  ["dead_letter", "failed"],
  ["cancelled", "unavailable"],
] as const)("maps durable status %s to %s", (source, expected) => {
  expect(jobStatusToIntelligenceStatus(source)).toBe(expected);
});

it.each([
  ["not_started", "not_started"],
  ["processing", "in_progress"],
  ["ready", "complete"],
  ["partial", "partial"],
  ["unreadable", "unavailable"],
  ["unavailable", "unavailable"],
  ["failed", "failed"],
] as const)("maps extraction status %s to %s", (source, expected) => {
  expect(extractionStatusToIntelligenceStatus(source)).toBe(expected);
});
