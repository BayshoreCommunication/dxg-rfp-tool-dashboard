import { coverageLevels, coveragePresentation } from "./coverageVocabulary";
import { glossary, glossaryTermCount, searchGlossary } from "./glossary";

const allEntries = glossary.flatMap((group) => group.entries);

it("defines every term once, with a real definition", () => {
  expect(glossaryTermCount).toBe(allEntries.length);
  expect(new Set(allEntries.map((entry) => entry.term)).size).toBe(allEntries.length);
  allEntries.forEach((entry) => {
    expect(entry.term.length).toBeGreaterThan(0);
    expect(entry.definition.length).toBeGreaterThan(20);
  });
});

it("stays in step with the coverage chips shown on screen", () => {
  // Generated from the same table, so a renamed chip cannot leave the glossary
  // defining a word the product no longer uses.
  coverageLevels.forEach((level) => {
    expect(allEntries.map((entry) => entry.term)).toContain(
      coveragePresentation[level].label,
    );
  });
});

it("covers the terms the audit found undefined anywhere in the product", () => {
  const searchable = allEntries
    .flatMap((entry) => [entry.term, ...(entry.aliases ?? [])])
    .map((term) => term.toLowerCase());
  [
    "extraction confidence",
    "mandatory",
    "eligibility",
    "normalized total",
    "requirement registry",
    "stale",
    "citation",
    "automated score",
  ].forEach((term) => expect(searchable).toContain(term));
});

it("says plainly that Proposal Intelligence is not the chat assistant", () => {
  const entry = allEntries.find((item) => item.term === "Proposal Intelligence");
  expect(entry?.definition).toMatch(/not the chat assistant/i);
});

it("finds a term by its on-screen name, an alias, or a word in its definition", () => {
  expect(searchGlossary("normalized").flatMap((g) => g.entries)[0].term).toBe(
    "Comparable total",
  );
  expect(searchGlossary("OCR").flatMap((g) => g.entries)[0].term).toBe(
    "Partly readable",
  );
  expect(
    searchGlossary("weight").flatMap((g) => g.entries).map((e) => e.term),
  ).toContain("Weight");
});

it("returns everything for an empty query and nothing for an unknown one", () => {
  expect(searchGlossary("   ")).toEqual(glossary);
  expect(searchGlossary("zzzzz")).toEqual([]);
});
