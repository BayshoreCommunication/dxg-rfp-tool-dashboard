import type { VendorIntelligenceResult } from "@/app/actions/vendorIntelligence";
import { evaluationCanStart, evaluationGateFromIntelligence, evaluationGateMessage } from "./evaluationGate";

const result = (overrides: Partial<VendorIntelligenceResult["run"]> = {}): VendorIntelligenceResult => ({
  run: {
    runId: "run-1", jobId: "job-1", requirementSetId: "set-1", status: "succeeded", requirementCount: 3,
    mappedRequirementCount: 3, factCount: 2, contradictionCount: 0, warnings: [], safeErrorCode: null,
    createdAt: "2026-08-12T10:00:00Z", completedAt: "2026-08-12T10:01:00Z", ...overrides,
  },
  mappings: [], facts: [], reviews: [],
});

it("only allows starting an evaluation the backend would accept", () => {
  expect(evaluationGateFromIntelligence({ loaded: false })).toEqual({ state: "unknown" });
  expect(evaluationGateFromIntelligence({ loaded: true })).toEqual({ state: "analysis_missing" });
  expect(evaluationGateFromIntelligence({ loaded: true, result: result({ status: "running" }) })).toEqual({ state: "analysis_running" });
  expect(evaluationGateFromIntelligence({ loaded: true, result: result({ status: "failed" }) })).toEqual({ state: "analysis_failed" });
  // Partially readable pages do not block (backend rule); an unavailable source does.
  expect(
    evaluationGateFromIntelligence({
      loaded: true,
      result: result({ warnings: [{ code: "PAGE_COVERAGE_INCOMPLETE", sourceLabel: "Response.pdf", message: "Some PDF pages produced no readable text." }] }),
    }),
  ).toEqual({ state: "ready" });
  expect(
    evaluationGateFromIntelligence({
      loaded: true,
      result: result({ warnings: [
        { code: "PAGE_COVERAGE_INCOMPLETE", sourceLabel: "Response.pdf", message: "Some PDF pages produced no readable text." },
        { code: "SOURCE_UNAVAILABLE", sourceLabel: "Pricing.xlsx", message: "This source was not available to proposal intelligence." },
      ] }),
    }),
  ).toEqual({ state: "coverage_blocked", details: ["Pricing.xlsx: This source was not available to proposal intelligence."] });
  expect(evaluationGateFromIntelligence({ loaded: true, result: result() })).toEqual({ state: "ready" });

  expect(evaluationCanStart({ state: "ready" })).toBe(true);
  expect(evaluationCanStart({ state: "unknown" })).toBe(true);
  expect(evaluationCanStart({ state: "coverage_blocked", details: [] })).toBe(false);
  expect(evaluationCanStart({ state: "analysis_missing" })).toBe(false);
});

it("tells the planner what to do rather than restating the rule", () => {
  expect(evaluationGateMessage({ state: "analysis_missing" })).toMatch(/Analyze this response above/);
  expect(evaluationGateMessage({ state: "coverage_blocked", details: [] })).toMatch(/could not be made available to the analysis/);
  expect(evaluationGateMessage({ state: "ready" })).toMatch(/Start one to score it/);
});
