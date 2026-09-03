import type { ExtractedFact, VendorIntelligenceResult } from "@/app/actions/vendorIntelligence";
import type { VendorResponseItem } from "@/app/actions/vendorResponse";
import {
  deriveCommercialTotal,
  deriveResponseCardSummary,
  selectHeadlineFacts,
} from "./responseCardSummary";

const response: VendorResponseItem = {
  _id: "response-1",
  proposalId: "proposal-1",
  proposalOwnerId: "owner-1",
  proposalTitle: "Annual Summit",
  vendorName: "Northstar AV",
  submittedBy: "A. Vendor",
  email: "vendor@example.com",
  message: "Response",
  documents: [],
  isRead: true,
  createdAt: "2026-08-10T10:00:00.000Z",
  updatedAt: "2026-08-10T10:00:00.000Z",
  submissionId: "submission-1",
  currentVersionId: "version-1",
};

const source = {
  fragmentId: "fragment-1",
  content: "The total investment is USD 125,000.",
  locator: { page: 4 },
  sourceLabel: "pricing.pdf",
};

const fact = (overrides: Partial<ExtractedFact> = {}): ExtractedFact => ({
  factId: "fact-1",
  factKey: "commercial.total",
  family: "commercial",
  factType: "commercial_total",
  statement: "The total is USD 125,000.",
  valueKind: "money",
  typedValue: { number: 125000, currency: "USD" },
  normalizedValue: "USD 125000",
  unit: null,
  currency: "USD",
  explicitness: "explicit",
  confidence: 0.98,
  contradictionGroup: null,
  citations: [{ ...source, role: "supports" }],
  ...overrides,
});

const intelligence = (overrides: Partial<VendorIntelligenceResult> = {}): VendorIntelligenceResult => ({
  run: {
    runId: "run-1",
    jobId: "job-1",
    requirementSetId: "set-1",
    status: "succeeded",
    requirementCount: 4,
    mappedRequirementCount: 4,
    factCount: 1,
    contradictionCount: 0,
    warnings: [],
    safeErrorCode: null,
    createdAt: "2026-08-10T10:00:00.000Z",
    completedAt: "2026-08-10T10:01:00.000Z",
  },
  mappings: [],
  facts: [fact()],
  reviews: [],
  ...overrides,
});

it("selects only source-backed, non-contradictory headline values in business order", () => {
  const values = selectHeadlineFacts([
    fact({ factId: "staff", factType: "staff_count", normalizedValue: "24 staff" }),
    fact(),
    fact({ factId: "uncited", factType: "setup_schedule", citations: [] }),
    fact({ factId: "conflict", factType: "proposal_validity", contradictionGroup: "conflict-1" }),
  ]);

  // Price is derived separately (deriveCommercialTotal); it never rides along as a headline fact.
  expect(values.map((value) => value.label)).toEqual(["Staffing"]);
  expect(values[0].source).toEqual(expect.objectContaining(source));
});

const dxgTotals = [
  fact({ factId: "equipment", factKey: "equipment_total", normalizedValue: "USD 100180", statement: "The equipment total is $100,180.00." }),
  fact({ factId: "labor", factKey: "production_labor_total", normalizedValue: "USD 81275" }),
  fact({ factId: "travel", factKey: "travel_freight_total", normalizedValue: "USD 25600" }),
  fact({ factId: "proposal", factKey: "total_pricing", normalizedValue: "USD 207055", statement: "The proposal total is $207,055.00." }),
];

it("shows one stated total when the files agree, and nothing when none is cited", () => {
  expect(deriveCommercialTotal([fact()])).toEqual(expect.objectContaining({ status: "stated", amount: 125000, currency: "USD", confirmed: false, otherTotals: 0 }));
  expect(deriveCommercialTotal([fact(), fact({ factId: "repeat", factKey: "total_amount", normalizedValue: "$125,000" })])).toEqual(expect.objectContaining({ status: "stated", amount: 125000 }));
  expect(deriveCommercialTotal([fact({ citations: [] })])).toEqual({ status: "not_stated" });
  expect(deriveCommercialTotal([fact({ normalizedValue: "about a hundred grand" })])).toEqual({ status: "not_stated" });
});

it("refuses to pick a price when the files state several different totals", () => {
  const total = deriveCommercialTotal(dxgTotals);
  expect(total.status).toBe("needs_confirmation");
  if (total.status !== "needs_confirmation") throw new Error("unreachable");
  expect(total.candidates.map((candidate) => [candidate.label, candidate.amount])).toEqual([
    ["Total pricing", 207055],
    ["Equipment total", 100180],
    ["Production labor total", 81275],
    ["Travel freight total", 25600],
  ]);
});

it("lets the planner's fact reviews settle which total applies", () => {
  const review = (targetId: string, decision: string, correctedPayload: Record<string, unknown> | null = null) =>
    ({ reviewId: `review-${targetId}-${decision}`, targetType: "fact" as const, targetId, decision, reasonCode: "human_review", note: "", correctedPayload, actorUserId: "user", createdAt: "2026-09-03T00:00:00.000Z" });
  const accepted = deriveCommercialTotal(dxgTotals, [review("proposal", "accepted")]);
  expect(accepted).toEqual(expect.objectContaining({ status: "stated", amount: 207055, confirmed: true, otherTotals: 3 }));
  const rejected = deriveCommercialTotal(dxgTotals, [review("equipment", "rejected"), review("labor", "rejected"), review("travel", "rejected")]);
  expect(rejected).toEqual(expect.objectContaining({ status: "stated", amount: 207055, confirmed: false, otherTotals: 0 }));
  const corrected = deriveCommercialTotal([fact()], [review("fact-1", "corrected", { normalizedValue: "USD 130000" })]);
  expect(corrected).toEqual(expect.objectContaining({ status: "stated", amount: 130000, confirmed: true }));
  // The newest review wins: accepting then rejecting the same fact removes it.
  const reversed = deriveCommercialTotal([fact()], [review("fact-1", "accepted"), review("fact-1", "rejected")]);
  expect(reversed).toEqual({ status: "not_stated" });
  // Two different confirmed totals is still a conflict.
  expect(deriveCommercialTotal(dxgTotals, [review("proposal", "accepted"), review("equipment", "accepted")]).status).toBe("needs_confirmation");
});

it("separates required fields with support, missing evidence, and contradictions", () => {
  const result = intelligence({
    mappings: [
      { mappingId: "m1", requirementId: "r1", requirementTitle: "Price", requirementKind: "commercial", mandatory: true, relationship: "supports", confidence: 0.9, ambiguityReasons: [], evidence: [source] },
      { mappingId: "m2", requirementId: "r2", requirementTitle: "Staffing", requirementKind: "technical", mandatory: true, relationship: "partially_supports", confidence: 0.7, ambiguityReasons: ["Role coverage is ambiguous"], evidence: [source] },
      { mappingId: "m3", requirementId: "r3", requirementTitle: "Insurance", requirementKind: "legal", mandatory: true, relationship: "none", confidence: 0.8, ambiguityReasons: [], evidence: [] },
      { mappingId: "m4", requirementId: "r4", requirementTitle: "Accessibility", requirementKind: "technical", mandatory: true, relationship: "contradicts", confidence: 0.9, ambiguityReasons: [], evidence: [source] },
      { mappingId: "m5", requirementId: "r5", requirementTitle: "Optional references", requirementKind: "experience", mandatory: false, relationship: "none", confidence: 0.8, ambiguityReasons: [], evidence: [] },
    ],
  });
  const summary = deriveResponseCardSummary({
    response,
    extraction: { success: true, data: { status: "ready", runs: [] } },
    intelligence: { success: true, data: result },
  });

  expect(summary.requiredFields).toEqual({
    total: 4,
    present: 2,
    missing: 1,
    conflicts: 1,
    missingTitles: ["Insurance"],
    conflictTitles: ["Accessibility"],
  });
  expect(summary.needsAttention).toBe(true);
  expect(summary.requirementCoverage).toEqual({
    total: 5,
    answered: 1,
    partlyAnswered: 1,
    notAnswered: 2,
    conflicting: 1,
    mandatoryNotAnswered: 1,
  });
  expect(summary.comparisonBlocked).toBeNull();
  expect(summary.partialSources).toBe(false);
  expect(summary.isComparable).toBe(true);
});

it("flags partially readable sources without excluding the response, matching the backend coverage rule", () => {
  const byExtraction = deriveResponseCardSummary({
    response,
    extraction: { success: true, data: { status: "partial", runs: [] } },
    intelligence: { success: true, data: intelligence() },
  });
  expect(byExtraction.comparisonBlocked).toBeNull();
  expect(byExtraction.partialSources).toBe(true);
  expect(byExtraction.isComparable).toBe(true);

  const byPageWarning = deriveResponseCardSummary({
    response,
    extraction: { success: true, data: { status: "ready", runs: [] } },
    intelligence: {
      success: true,
      data: intelligence({ run: { ...intelligence().run, warnings: [{ code: "PAGE_COVERAGE_INCOMPLETE", message: "Some PDF pages produced no readable text." }] } }),
    },
  });
  expect(byPageWarning.comparisonBlocked).toBeNull();
  expect(byPageWarning.partialSources).toBe(true);

  const byUnavailable = deriveResponseCardSummary({
    response,
    extraction: { success: true, data: { status: "ready", runs: [] } },
    intelligence: {
      success: true,
      data: intelligence({ run: { ...intelligence().run, warnings: [{ code: "SOURCE_UNAVAILABLE", message: "This source was not available to proposal intelligence." }] } }),
    },
  });
  expect(byUnavailable.comparisonBlocked).toBe("source_unavailable");
  expect(byUnavailable.partialSources).toBe(false);
  expect(byUnavailable.isComparable).toBe(false);
});

it("does not treat absent analysis as compliance and excludes known unreadable responses", () => {
  const summary = deriveResponseCardSummary({
    response,
    extraction: { success: true, data: { status: "unreadable", runs: [] } },
    intelligence: { success: false, code: "INTELLIGENCE_RUN_NOT_FOUND", message: "Not generated" },
  });

  expect(summary.requiredFields).toBeNull();
  expect(summary.headlineFacts).toEqual([]);
  expect(summary.intelligenceStatus).toBe("not_started");
  expect(summary.requirementCoverage).toBeNull();
  expect(summary.comparisonBlocked).toBe("unreadable");
  expect(summary.isComparable).toBe(false);
  expect(summary.needsAttention).toBe(true);
});

it("keeps a versioned response comparable when only its summary lookup is temporarily unavailable", () => {
  const summary = deriveResponseCardSummary({
    response,
    extraction: { success: false, code: "NETWORK_ERROR", message: "Unavailable" },
    intelligence: { success: false, code: "NETWORK_ERROR", message: "Unavailable" },
  });

  expect(summary.extractionStatus).toBe("unavailable");
  expect(summary.intelligenceStatus).toBe("unavailable");
  expect(summary.isComparable).toBe(true);
  expect(summary.needsAttention).toBe(true);
});
