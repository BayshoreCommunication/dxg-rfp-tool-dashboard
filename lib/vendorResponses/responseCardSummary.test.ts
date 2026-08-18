import type { ExtractedFact, VendorIntelligenceResult } from "@/app/actions/vendorIntelligence";
import type { VendorResponseItem } from "@/app/actions/vendorResponse";
import {
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

  expect(values.map((value) => value.label)).toEqual(["Total cost", "Staffing"]);
  expect(values[0].source).toEqual(expect.objectContaining(source));
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
