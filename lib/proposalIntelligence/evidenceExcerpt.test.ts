import {
  buildEvidenceExcerpt,
  evidenceQueryTerms,
  segmentHighlights,
} from "./evidenceExcerpt";

/** The real shape of a stored passage: a whole page, answer buried in it. */
const PAGE = [
  "Page 1 of 9",
  "Order# 0061523 Cash - Buffalo",
  "Quote",
  "Dallas Show Services",
  "9150 N. Royal Ln #150",
  "Irving TX 75063",
  "www.inspiresolutions.com",
  "(972) 241-5444",
  "Order Number: 0061523",
  "Customer Number: 0999CASH",
  "Salesperson: Frank Brewster",
  "Bill To: Grantmakers in Health",
  "Show Agenda Shipping Comments:",
  "Ship: 06/13/2025 09:00 AM",
  "Load In: 06/15/2025 08:00 AM",
  "Show End Date: 06/18/2025 05:00 PM",
  "Strike: 06/19/2025 08:00 AM",
].join("\n");

it("drops requirement wording that matches everything", () => {
  expect(evidenceQueryTerms("What is the Show End Date")).toEqual([
    "show",
    "end",
    "date",
  ]);
});

it("keeps the lines that answer the requirement, not the top of the page", () => {
  const result = buildEvidenceExcerpt(PAGE, evidenceQueryTerms("Show End Date"));
  expect(result.excerpt).toContain("Show End Date: 06/18/2025 05:00 PM");
  expect(result.excerpt).not.toContain("Salesperson: Frank Brewster");
  expect(result.trimmed).toBe(true);
  expect(result.hiddenLineCount).toBeGreaterThan(0);
});

it("keeps surrounding lines so the answer arrives with context", () => {
  const result = buildEvidenceExcerpt(PAGE, evidenceQueryTerms("Show End Date"));
  expect(result.excerpt).toContain("Load In:");
});

it("marks the matched words inside the excerpt", () => {
  const result = buildEvidenceExcerpt(PAGE, evidenceQueryTerms("Show End Date"));
  const marked = result.highlights.map((span) =>
    result.excerpt.slice(span.start, span.end).toLowerCase(),
  );
  expect(marked).toContain("date");
  result.highlights.forEach((span, index) => {
    if (index > 0) expect(span.start).toBeGreaterThanOrEqual(result.highlights[index - 1].end);
  });
});

it("returns a short passage untouched", () => {
  const short = "Union labour is included.\nRates are attached.";
  const result = buildEvidenceExcerpt(short, evidenceQueryTerms("Union Labor"));
  expect(result.excerpt).toBe(short);
  expect(result.trimmed).toBe(false);
  expect(result.hiddenLineCount).toBe(0);
});

it("falls back to the start of the passage when nothing matches", () => {
  const result = buildEvidenceExcerpt(PAGE, evidenceQueryTerms("Sustainability"));
  expect(result.excerpt.startsWith("Page 1 of 9")).toBe(true);
  expect(result.highlights).toEqual([]);
  expect(result.trimmed).toBe(true);
});

it("splits text into plain and matched segments that rebuild the original", () => {
  const segments = segmentHighlights("Show End Date: 06/18", [{ start: 5, end: 8 }]);
  expect(segments.map((segment) => segment.text).join("")).toBe(
    "Show End Date: 06/18",
  );
  expect(segments.filter((segment) => segment.match).map((s) => s.text)).toEqual([
    "End",
  ]);
});

it("returns one plain segment when there is nothing to mark", () => {
  expect(segmentHighlights("plain", [])).toEqual([{ text: "plain", match: false }]);
});
