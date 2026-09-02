import { findExcludedVendors, type CandidateResponse } from "./excludedVendors";

const candidate = (over: Partial<CandidateResponse> = {}): CandidateResponse => ({
  responseId: "r1",
  vendorLabel: "Vendor One",
  submissionId: "s1",
  versionId: "v1",
  intelligenceStatus: "succeeded",
  warnings: [],
  comparisonReady: true,
  ...over,
});

it("returns nothing when every response is in the comparison", () => {
  expect(
    findExcludedVendors({
      candidates: [candidate(), candidate({ responseId: "r2", submissionId: "s2" })],
      comparedKeys: [
        { submissionId: "s1", versionId: "v1" },
        { submissionId: "s2", versionId: "v1" },
      ],
    }),
  ).toEqual([]);
});

it("names the vendor an unreadable page kept out of the comparison", () => {
  const [excluded] = findExcludedVendors({
    candidates: [
      candidate({
        responseId: "dxg",
        vendorLabel: "Digital Experience Group",
        submissionId: "s3",
        comparisonReady: false,
        warnings: [
          {
            sourceLabel: "RFP Example Response 3.pdf",
            message: "A page could not be extracted with OCR.",
          },
        ],
      }),
    ],
    comparedKeys: [{ submissionId: "s1", versionId: "v1" }],
  });
  expect(excluded.vendorLabel).toBe("Digital Experience Group");
  expect(excluded.reason).toBe("sources_unreadable");
  expect(excluded.explanation).toContain("could not read part of");
  expect(excluded.explanation).toContain("run the comparison again");
  expect(excluded.details).toEqual([
    "RFP Example Response 3.pdf: A page could not be extracted with OCR.",
  ]);
});

it("separates a failed analysis from an unfinished one", () => {
  const [failed] = findExcludedVendors({
    candidates: [candidate({ error: "Extraction service unavailable." })],
    comparedKeys: [],
  });
  expect(failed.reason).toBe("analysis_failed");
  expect(failed.details).toContain("Extraction service unavailable.");

  const [pending] = findExcludedVendors({
    candidates: [candidate({ intelligenceStatus: "running", comparisonReady: false })],
    comparedKeys: [],
  });
  expect(pending.reason).toBe("analysis_incomplete");
});

it("reports a ready vendor that simply was not selected for this run", () => {
  const [excluded] = findExcludedVendors({
    candidates: [candidate()],
    comparedKeys: [{ submissionId: "other", versionId: "v1" }],
  });
  expect(excluded.reason).toBe("not_in_this_comparison");
  expect(excluded.explanation).toContain("not selected");
});

it("matches on the exact version, so a newer response counts as excluded", () => {
  const excluded = findExcludedVendors({
    candidates: [candidate({ versionId: "v2" })],
    comparedKeys: [{ submissionId: "s1", versionId: "v1" }],
  });
  expect(excluded).toHaveLength(1);
});
