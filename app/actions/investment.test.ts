/**
 * The engine's newer fields (confidence / assumptions / scenarios / basis) arrive
 * from a service that also still returns legacy reports, so the normalizer has to
 * survive anything: missing keys, wrong types, out-of-range numbers.
 */
import { getLatestInvestmentGuidanceAction } from "./investment";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));

const respondWith = (data: unknown) => {
  jest.mocked(authenticatedBackendFetch).mockResolvedValue(
    {
      ok: true,
      status: 200,
      json: async () => ({ data }),
    } as Response,
  );
};

const baseReport = {
  id: "investment-1",
  proposalVersion: 2,
  engineVersion: "dxg-av-pricing-engine.v2",
  currency: "USD",
  totalLowMinor: 100,
  totalMidMinor: 200,
  totalHighMinor: 300,
  lineItems: [],
  refusals: [],
  ancillary: [],
  recommendations: [],
  createdAt: "2026-07-21T10:00:00.000Z",
};

const load = async (data: unknown) => {
  respondWith(data);
  const result = await getLatestInvestmentGuidanceAction("507f1f77bcf86cd799439011");
  if (!result.success) throw new Error(`expected success, got ${result.code}`);
  return result.data;
};

describe("investment guidance normalizer", () => {
  test("a legacy report without the engine v2 fields degrades to null / empty", async () => {
    const report = await load(baseReport);
    expect(report.confidence).toBeNull();
    expect(report.basis).toBeNull();
    expect(report.assumptions).toEqual([]);
    expect(report.scenarios).toEqual([]);
    expect(report.totalMidMinor).toBe(200);
  });

  test("null totals stay null rather than collapsing to zero", async () => {
    const report = await load({ ...baseReport, totalLowMinor: null, totalMidMinor: null, totalHighMinor: null });
    expect(report.totalLowMinor).toBeNull();
    expect(report.totalMidMinor).toBeNull();
  });

  test("confidence is clamped, banded and stripped of malformed deductions", async () => {
    const report = await load({
      ...baseReport,
      confidence: {
        score: 140,
        band: "excellent",
        note: "All inputs stated.",
        deductions: [
          { ruleKey: "a", label: "Lumens not stated", deduction: "10" },
          { ruleKey: "b", deduction: 5 },
          { ruleKey: "c", label: "No deduction value" },
          "nonsense",
        ],
      },
    });
    expect(report.confidence?.score).toBe(100);
    // An unknown band is re-derived from the score instead of being trusted.
    expect(report.confidence?.band).toBe("high");
    expect(report.confidence?.deductions).toEqual([
      { ruleKey: "a", label: "Lumens not stated", deduction: 10, reason: "" },
    ]);
  });

  test("confidence without a usable score is dropped entirely", async () => {
    const report = await load({ ...baseReport, confidence: { band: "low", deductions: [] } });
    expect(report.confidence).toBeNull();
  });

  test("scenarios and basis coerce their numbers and drop unusable rows", async () => {
    const report = await load({
      ...baseReport,
      scenarios: [
        { key: "base", label: "Base", lowMinor: 1, midMinor: 2, highMinor: 3, basis: "b" },
        { key: "broken", label: "No mid" },
        { midMinor: 5 },
      ],
      basis: {
        market: "Chicago",
        regionalFactor: "1.2",
        unionKey: "union_standard",
        unionFactor: null,
        inHouseKey: "outside_independent_av_baseline",
        inHouseFactor: "not a number",
        serviceChargeFactor: 1,
        multiDayFactor: 1.8,
        days: 0,
        showDayEquipmentBasis: 42,
      },
    });
    expect(report.scenarios).toEqual([
      { key: "base", label: "Base", lowMinor: 1, midMinor: 2, highMinor: 3, basis: "b" },
    ]);
    expect(report.basis).toEqual({
      market: "Chicago",
      regionalFactor: 1.2,
      unionKey: "union_standard",
      unionFactor: 1,
      inHouseKey: "outside_independent_av_baseline",
      inHouseFactor: 1,
      serviceChargeFactor: 1,
      multiDayFactor: 1.8,
      days: 1,
      showDayEquipmentBasis: "",
    });
  });

  test("line items keep their engine v2 detail and ignore malformed applied factors", async () => {
    const report = await load({
      ...baseReport,
      lineItems: [
        {
          category: "audio",
          label: "Main speakers",
          currency: "USD",
          lowMinor: 1,
          midMinor: 2,
          highMinor: 3,
          templateKey: "GENERAL_SESSION",
          componentKey: "gs_line_array",
          kind: "equipment",
          quantity: 4,
          unitLabel: "per box / day",
          implied: true,
          appliedFactors: [
            { kind: "regional", label: "Chicago", factor: 1.2 },
            { kind: "union", factor: 1.4 },
            { kind: "union", label: "Union", factor: "oops" },
          ],
          provenance: { pricingRecordIds: ["rec-1"], ruleIds: [], drivers: { days: 3 } },
        },
        { category: "audio", label: "Legacy line", currency: "USD", lowMinor: 1, midMinor: 2, highMinor: 3 },
      ],
    });
    expect(report.lineItems[0]).toMatchObject({
      templateKey: "GENERAL_SESSION",
      componentKey: "gs_line_array",
      kind: "equipment",
      quantity: 4,
      unitLabel: "per box / day",
      implied: true,
      appliedFactors: [{ kind: "regional", label: "Chicago", factor: 1.2 }],
    });
    expect(report.lineItems[1]).toMatchObject({
      templateKey: "",
      componentKey: "",
      kind: null,
      quantity: null,
      unitLabel: null,
      implied: false,
      appliedFactors: [],
      provenance: { pricingRecordIds: [], ruleIds: [], drivers: {} },
    });
  });

  test("budget analysis preserves only validated ranges and release metadata", async () => {
    const report = await load({
      ...baseReport,
      calculationVersion: "deterministic-budget.v1",
      pricingReleaseVersion: "approved-pricing.v1:abc",
      ruleReleaseVersion: "approved-rules.v1:def",
      budgetAnalysis: {
        calculationVersion: "deterministic-budget.v1",
        pricingReleaseVersion: "approved-pricing.v1:abc",
        ruleReleaseVersion: "approved-rules.v1:def",
        status: "incomplete",
        currency: "USD",
        included: [{ key: "audio", label: "Audio", source: "approved_pricing_record" }],
        missing: [{ key: "tax", label: "Tax", reason: "No approved rate." }],
        needsConfirmation: [],
        optional: [],
        possibleSavings: [
          {
            key: "reuse",
            label: "Reuse",
            reason: "Validate it.",
            estimatedImpact: { currency: "USD", lowMinor: 1, midMinor: 2 },
          },
        ],
        categoryBreakdown: [
          {
            category: "audio",
            amount: { currency: "USD", lowMinor: 1, midMinor: 2, highMinor: 3 },
          },
        ],
        roomBreakdown: [],
        warnings: [],
      },
    });
    expect(report.budgetAnalysis?.status).toBe("incomplete");
    expect(report.budgetAnalysis?.categoryBreakdown[0].amount.highMinor).toBe(3);
    expect(report.budgetAnalysis?.possibleSavings[0].estimatedImpact).toBeNull();
    expect(report.pricingReleaseVersion).toBe("approved-pricing.v1:abc");
  });

  test("wholly unexpected shapes never throw", async () => {
    respondWith("not an object");
    const result = await getLatestInvestmentGuidanceAction("507f1f77bcf86cd799439011");
    expect(result).toMatchObject({ success: false, code: "INVALID_RESPONSE" });
  });
});
