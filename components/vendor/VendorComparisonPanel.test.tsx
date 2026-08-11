import { scoreVendorAnalysis } from "./VendorComparisonPanel";
import type { VendorAnalysisResult } from "@/app/actions/vendorAnalysis";

jest.mock("@/app/actions/vendorAnalysis", () => ({
  getLatestVendorAnalysisAction: jest.fn(),
}));

const analysis = (verdicts: Array<"addressed" | "partial" | "missing">): VendorAnalysisResult => ({
  run: {
    runId: "run-1",
    status: "succeeded",
    provider: "test",
    model: "test",
    requirementCount: verdicts.length,
    findingCount: verdicts.length,
    escalationCount: 0,
    safeErrorCode: null,
    createdAt: "2026-08-11T00:00:00.000Z",
    completedAt: "2026-08-11T00:00:01.000Z",
  },
  findings: verdicts.map((verdict, ordinal) => ({
    ordinal,
    kind: "compliance",
    requirementPath: `requirement.${ordinal}`,
    requirementLabel: `Requirement ${ordinal}`,
    verdict,
    message: "Reviewed",
    confidence: 1,
    needsHumanReview: false,
    citations: [],
  })),
  evidence: [],
});

test("scores addressed, partial, and missing verdicts transparently", () => {
  expect(scoreVendorAnalysis(analysis(["addressed", "partial", "missing"]))).toBe(50);
});

test("returns no score when no requirements were rated", () => {
  expect(scoreVendorAnalysis(analysis([]))).toBeNull();
});
