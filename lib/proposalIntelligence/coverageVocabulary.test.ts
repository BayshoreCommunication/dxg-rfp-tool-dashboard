import {
  coverageFromRelationship,
  coverageFromVerdict,
  coverageLabelForRelationship,
  coverageLabelForVerdict,
  coverageLevels,
  coveragePresentation,
} from "./coverageVocabulary";

it("defines one distinct presentation for every level in the closed vocabulary", () => {
  expect(Object.keys(coveragePresentation)).toEqual([...coverageLevels]);
  expect(
    new Set(Object.values(coveragePresentation).map((item) => item.label)).size,
  ).toBe(coverageLevels.length);
});

it.each([
  ["addressed", "answered"],
  ["partially_addressed", "partly_answered"],
  ["not_assessable", "mentioned_only"],
  ["contradictory", "conflicting"],
  ["missing", "not_answered"],
  ["not_applicable", "not_applicable"],
] as const)("maps assessment verdict %s to %s", (verdict, expected) => {
  expect(coverageFromVerdict(verdict)).toBe(expected);
});

it.each([
  ["supports", "answered"],
  ["partially_supports", "partly_answered"],
  ["context_only", "mentioned_only"],
  ["contradicts", "conflicting"],
  ["none", "not_answered"],
] as const)("maps fact-mapping relationship %s to %s", (relationship, expected) => {
  expect(coverageFromRelationship(relationship)).toBe(expected);
});

it.each([
  ["supports", "addressed"],
  ["partially_supports", "partially_addressed"],
  ["context_only", "not_assessable"],
  ["contradicts", "contradictory"],
  ["none", "missing"],
] as const)(
  "shows relationship %s and verdict %s with the same words",
  (relationship, verdict) => {
    expect(coverageLabelForRelationship(relationship)).toBe(
      coverageLabelForVerdict(verdict),
    );
  },
);

it("falls back to 'not answered' rather than inventing a label", () => {
  expect(coverageFromVerdict("something_new")).toBe("not_answered");
  expect(coverageFromRelationship("something_new")).toBe("not_answered");
});
