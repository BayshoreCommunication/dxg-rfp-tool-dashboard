import { render, screen, within } from "@testing-library/react";
import InvestmentGuidancePanel from "./InvestmentGuidancePanel";
import {
  generateInvestmentGuidanceAction,
  getLatestInvestmentGuidanceAction,
  type InvestmentReport,
} from "@/app/actions/investment";

jest.mock("@/app/actions/investment", () => ({
  generateInvestmentGuidanceAction: jest.fn(),
  getLatestInvestmentGuidanceAction: jest.fn(),
}));

const proposalId = "507f1f77bcf86cd799439011";
const mockedGenerate = generateInvestmentGuidanceAction as jest.MockedFunction<
  typeof generateInvestmentGuidanceAction
>;
const mockedLatest = getLatestInvestmentGuidanceAction as jest.MockedFunction<
  typeof getLatestInvestmentGuidanceAction
>;

const report: InvestmentReport = {
  id: "investment-1",
  proposalVersion: 2,
  engineVersion: "dxg-av-pricing-engine.v2",
  currency: "USD",
  totalLowMinor: 1_250_000,
  totalMidMinor: 1_800_000,
  totalHighMinor: 2_400_000,
  lineItems: [
    {
      category: "audio",
      label: "General session - Main speakers",
      currency: "USD",
      lowMinor: 500_000,
      midMinor: 700_000,
      highMinor: 900_000,
      templateKey: "GENERAL_SESSION",
      componentKey: "gs_line_array",
      kind: "equipment",
      quantity: 4,
      unitLabel: "per box / day",
      implied: false,
      appliedFactors: [
        { kind: "regional", label: "Chicago", factor: 1.2 },
        { kind: "union", label: "Union (standard)", factor: 1.4 },
      ],
      provenance: {
        pricingRecordIds: ["rec-1", "rec-2"],
        ruleIds: ["rule-1"],
        drivers: { days: 3 },
      },
    },
    {
      category: "labor",
      label: "General session - A1 audio lead",
      currency: "USD",
      lowMinor: 200_000,
      midMinor: 300_000,
      highMinor: 400_000,
      templateKey: "GENERAL_SESSION",
      componentKey: "gs_a1",
      kind: "labor",
      quantity: 30,
      unitLabel: "per hour",
      implied: false,
      appliedFactors: [],
      provenance: { pricingRecordIds: ["rec-3"], ruleIds: [], drivers: { hours: 30 } },
    },
  ],
  refusals: [
    {
      category: "lighting",
      reason: "No approved pricing data supports a defensible range for Lighting.",
      ask: "Request line-item lighting pricing from vendors, or load historical cost data for this category.",
    },
  ],
  ancillary: [
    {
      factor: "Venue fees & exclusivity",
      status: "venue_dependent",
      note: "Ask the venue for AV exclusivity, patch and facility fees.",
    },
  ],
  recommendations: [
    {
      ruleKey: "union_venue",
      title: "Union venue labor",
      guidanceText: "Budget for union labor minimums.",
      explanation: "Union venues carry minimum-call requirements.",
    },
  ],
  confidence: {
    score: 72,
    band: "medium",
    deductions: [
      {
        ruleKey: "projection_brightness_lumens_not_stated",
        label: "Projector lumens not stated",
        deduction: 10,
        reason: "Brightness drives the projector class.",
      },
      {
        ruleKey: "union_status_unknown",
        label: "Union status unknown",
        deduction: 18,
        reason: "Union rules materially change labor cost.",
      },
    ],
    note: "Usable planning range. Confirm to tighten it: Union status unknown; Projector lumens not stated.",
  },
  assumptions: [
    {
      key: "general_session_mics",
      label: "General session wireless channels",
      note: "4 wireless channels on the main stage - confirm presenter count.",
    },
    {
      key: "implied_breakout_screen",
      label: "Screen assumed included",
      note: "Breakout rooms pricing includes screen because the rest of the package requires it - assumed included, confirm with the client.",
    },
  ],
  scenarios: [
    {
      key: "base",
      label: "Base - non-union, outside AV",
      lowMinor: 1_000_000,
      midMinor: 1_400_000,
      highMinor: 1_900_000,
      basis: "Approved base rates with the regional factor only.",
    },
    {
      key: "union",
      label: "Union labor - Chicago",
      lowMinor: 1_250_000,
      midMinor: 1_800_000,
      highMinor: 2_400_000,
      basis: "Labor carries the union modifier for this market.",
    },
    {
      key: "in_house",
      label: "Venue / hotel in-house AV",
      lowMinor: 1_600_000,
      midMinor: 2_300_000,
      highMinor: 3_100_000,
      basis: "Equipment carries the in-house markup and the service charge compounds.",
    },
  ],
  basis: {
    market: "Chicago",
    regionalFactor: 1.2,
    unionKey: "union_standard",
    unionFactor: 1.4,
    inHouseKey: "outside_independent_av_baseline",
    inHouseFactor: 1,
    serviceChargeFactor: 1,
    multiDayFactor: 1.8,
    days: 3,
    showDayEquipmentBasis: "Day 1 at full rate; each additional show day at the approved hold-over factor (3 show days).",
  },
  calculationVersion: "deterministic-budget.v1",
  pricingReleaseVersion: "approved-pricing.v1:abc123",
  ruleReleaseVersion: "approved-rules.v1:def456",
  budgetAnalysis: {
    calculationVersion: "deterministic-budget.v1",
    pricingReleaseVersion: "approved-pricing.v1:abc123",
    ruleReleaseVersion: "approved-rules.v1:def456",
    status: "incomplete",
    currency: "USD",
    included: [
      { key: "gs_line_array", label: "Main speakers", source: "approved_pricing_record" },
      { key: "gs_a1", label: "A1 audio lead", source: "approved_pricing_record" },
    ],
    missing: [
      { key: "lighting", label: "Lighting", reason: "No approved lighting rate." },
    ],
    needsConfirmation: [
      { key: "insurance", label: "Insurance", reason: "Confirm coverage." },
    ],
    optional: [],
    possibleSavings: [
      {
        key: "reuse-1",
        label: "Validate shared-equipment alternative",
        reason: "Two non-overlapping rooms may be able to reuse cameras.",
        estimatedImpact: null,
      },
    ],
    categoryBreakdown: [
      {
        category: "audio",
        amount: {
          currency: "USD",
          lowMinor: 500_000,
          midMinor: 700_000,
          highMinor: 900_000,
        },
      },
      {
        category: "labor",
        amount: {
          currency: "USD",
          lowMinor: 200_000,
          midMinor: 300_000,
          highMinor: 400_000,
        },
      },
    ],
    roomBreakdown: [
      {
        roomKey: "main",
        roomLabel: "General Session",
        status: "allocated_range",
        amount: {
          currency: "USD",
          lowMinor: 700_000,
          midMinor: 1_000_000,
          highMinor: 1_300_000,
        },
        allocationBasis: "Approved general-session package lines.",
      },
    ],
    laborSubtotal: {
      currency: "USD",
      lowMinor: 200_000,
      midMinor: 300_000,
      highMinor: 400_000,
    },
    equipmentSubtotal: {
      currency: "USD",
      lowMinor: 500_000,
      midMinor: 700_000,
      highMinor: 900_000,
    },
    sharedServicesSubtotal: {
      currency: "USD",
      lowMinor: 550_000,
      midMinor: 800_000,
      highMinor: 1_100_000,
    },
    estimatedAncillarySubtotal: null,
    calculatedTotal: {
      currency: "USD",
      lowMinor: 1_250_000,
      midMinor: 1_800_000,
      highMinor: 2_400_000,
    },
    completeTotal: null,
    budgetCeiling: {
      amountMinor: 2_000_000,
      currency: "USD",
      source: "explicit_amount",
      label: "Explicit planning ceiling",
    },
    warnings: [
      {
        code: "ESTIMATE_MAY_EXCEED_BUDGET_CEILING",
        severity: "warning",
        explanation: "The approved estimate range may exceed the stated budget ceiling.",
        suggestedNextAction: "Confirm scope and compare value engineering.",
        paths: ["/content/budget/estimatedAvBudget"],
        estimatedImpact: {
          currency: "USD",
          lowMinor: 0,
          midMinor: 0,
          highMinor: 400_000,
        },
      },
    ],
  },
  createdAt: "2026-07-21T10:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGenerate.mockResolvedValue({ success: true, data: report });
});

describe("InvestmentGuidancePanel", () => {
  test("renders headline totals and a refusal card from the latest report", async () => {
    mockedLatest.mockResolvedValue({ success: true, data: report });
    render(<InvestmentGuidancePanel proposalId={proposalId} />);
    // Headline low/mid/high totals formatted from minor units.
    expect(await screen.findByText("$12,500")).toBeInTheDocument();
    expect(screen.getAllByText("$18,000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$24,000").length).toBeGreaterThan(0);
    // The refusal surfaces as a prominent card, not an error.
    expect(
      screen.getByText(
        "No approved pricing data supports a defensible range for Lighting.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mockedLatest).toHaveBeenCalledWith(proposalId);
  });

  test("shows deterministic coverage, warnings, breakdowns, and release versions", async () => {
    mockedLatest.mockResolvedValue({ success: true, data: report });
    render(<InvestmentGuidancePanel proposalId={proposalId} />);
    expect(await screen.findByText("Incomplete estimate")).toBeInTheDocument();
    expect(
      screen.getByText("2 included · 1 missing · 1 to confirm"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The approved estimate range may exceed the stated budget ceiling.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Estimated impact: $0 – $4,000")).toBeInTheDocument();
    expect(screen.getByText("Equipment")).toBeInTheDocument();
    expect(screen.getByText("Labor")).toBeInTheDocument();
    expect(screen.getByText("Shared services")).toBeInTheDocument();
    expect(screen.getByText("General Session")).toBeInTheDocument();
    expect(
      screen.getByText(/Calculation deterministic-budget\.v1/),
    ).toHaveTextContent("approved-pricing.v1:abc123");
  });

  test("refusal cards show the ask so the owner knows what to do next", async () => {
    mockedLatest.mockResolvedValue({ success: true, data: report });
    render(<InvestmentGuidancePanel proposalId={proposalId} />);
    expect(
      await screen.findByText(
        "Request line-item lighting pricing from vendors, or load historical cost data for this category.",
      ),
    ).toBeInTheDocument();
  });

  test("shows the empty state when no report exists yet", async () => {
    mockedLatest.mockResolvedValue({
      success: false,
      code: "INVESTMENT_GUIDANCE_NOT_FOUND",
      message: "No investment guidance has been generated for this proposal yet.",
    });
    render(<InvestmentGuidancePanel proposalId={proposalId} />);
    expect(
      await screen.findByText(
        /Generate investment guidance to see a low \/ typical \/ high range/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("shows the confidence band, score and the deductions behind it", async () => {
    mockedLatest.mockResolvedValue({ success: true, data: report });
    render(<InvestmentGuidancePanel proposalId={proposalId} />);
    expect(await screen.findByText("Medium confidence — confidence 72/100")).toBeInTheDocument();
    // Each deduction is named with the points it cost, never hidden.
    expect(screen.getByText("Projector lumens not stated −10")).toBeInTheDocument();
    expect(screen.getByText("Union status unknown −18")).toBeInTheDocument();
  });

  test("a low confidence band shows the engine note as a prominent warning", async () => {
    const low: InvestmentReport = {
      ...report,
      confidence: {
        score: 41,
        band: "low",
        deductions: [
          { ruleKey: "market_city_unknown", label: "Market not identified", deduction: 20, reason: "" },
        ],
        note: "Indicative range only - too many inputs are unknown to defend these figures. Confirm before quoting: Market not identified.",
      },
    };
    mockedLatest.mockResolvedValue({ success: true, data: low });
    render(<InvestmentGuidancePanel proposalId={proposalId} />);
    expect(await screen.findByText("Low confidence — confidence 41/100")).toBeInTheDocument();
    const note = screen.getByText(/Indicative range only/);
    expect(note).toBeInTheDocument();
    expect(note.className).toMatch(/rose/);
  });

  test("compares the generated range with the selected planning budget", async () => {
    mockedLatest.mockResolvedValue({
      success: true,
      data: { ...report, budgetAnalysis: null },
    });
    render(
      <InvestmentGuidancePanel
        proposalId={proposalId}
        estimatedAvBudget="Premium"
      />,
    );

    expect(await screen.findByText("Premium · $100K–$250K")).toBeInTheDocument();
    expect(
      screen.getByText(/current scope estimate is below the selected planning budget/i),
    ).toBeInTheDocument();
  });

  test("renders every scenario with its label, mid amount and basis", async () => {
    mockedLatest.mockResolvedValue({ success: true, data: report });
    render(<InvestmentGuidancePanel proposalId={proposalId} />);
    expect(await screen.findByText("Base - non-union, outside AV")).toBeInTheDocument();
    expect(screen.getByText("Union labor - Chicago")).toBeInTheDocument();
    expect(screen.getByText("Venue / hotel in-house AV")).toBeInTheDocument();
    expect(screen.getByText("$14,000")).toBeInTheDocument();
    expect(screen.getByText("$23,000")).toBeInTheDocument();
    expect(
      screen.getByText("Approved base rates with the regional factor only."),
    ).toBeInTheDocument();
    // Scenarios are alternatives, and the panel says so.
    expect(screen.getByText(/don't add them up/)).toBeInTheDocument();
  });

  test("composes the basis line and omits neutral 1.0 factors", async () => {
    mockedLatest.mockResolvedValue({ success: true, data: report });
    render(<InvestmentGuidancePanel proposalId={proposalId} />);
    const line = await screen.findByText(/Priced on Chicago ×1.20/);
    expect(line.textContent).toContain(
      "Chicago ×1.20 · union standard ×1.40 · outside AV · 3 show days (equipment ×1.80)",
    );
    // in-house and service charge are 1.0 here, so no multiplier is printed for them.
    expect(line.textContent).not.toContain("×1.00");
    expect(line.textContent).not.toContain("service charge");
  });

  test("line items carry a kind tag, quantity and their applied factors", async () => {
    mockedLatest.mockResolvedValue({ success: true, data: report });
    render(<InvestmentGuidancePanel proposalId={proposalId} />);
    const row = (await screen.findByText("General session - Main speakers")).closest("tr");
    expect(row).not.toBeNull();
    const cell = within(row as HTMLTableRowElement);
    expect(cell.getByText("equipment")).toBeInTheDocument();
    expect(cell.getByText("4 per box / day")).toBeInTheDocument();
    // The multiplier stack lives inside the existing provenance disclosure.
    expect(cell.getByText("Chicago ×1.20")).toBeInTheDocument();
    expect(cell.getByText("Union (standard) ×1.40")).toBeInTheDocument();
    expect(cell.getByText(/2 approved pricing records/)).toBeInTheDocument();
    expect(
      within(
        (screen.getByText("General session - A1 audio lead").closest("tr") as HTMLTableRowElement),
      ).getByText("labor"),
    ).toBeInTheDocument();
  });

  test("implied components render as confirm cards, defaults as muted notes", async () => {
    mockedLatest.mockResolvedValue({ success: true, data: report });
    render(<InvestmentGuidancePanel proposalId={proposalId} />);
    expect(await screen.findByText("Assumed included — confirm (1)")).toBeInTheDocument();
    const implied = screen.getByText("Screen assumed included").closest("li");
    expect(implied?.className).toMatch(/amber/);
    // A defaulted quantity is context, not a decision to confirm.
    const defaulted = screen.getByText("General session wireless channels").closest("li");
    expect(defaulted?.className).not.toMatch(/amber/);
    expect(screen.getByText("Planning assumptions (1)")).toBeInTheDocument();
  });

  test("a legacy report without confidence, scenarios or basis still renders its totals", async () => {
    const legacy: InvestmentReport = {
      ...report,
      lineItems: [
        {
          category: "audio",
          label: "Audio",
          currency: "USD",
          lowMinor: 500_000,
          midMinor: 700_000,
          highMinor: 900_000,
          templateKey: "",
          componentKey: "",
          kind: null,
          quantity: null,
          unitLabel: null,
          implied: false,
          appliedFactors: [],
          provenance: { pricingRecordIds: ["rec-1"], ruleIds: [], drivers: {} },
        },
      ],
      confidence: null,
      assumptions: [],
      scenarios: [],
      basis: null,
      calculationVersion: "",
      pricingReleaseVersion: "",
      ruleReleaseVersion: "",
      budgetAnalysis: null,
    };
    mockedLatest.mockResolvedValue({ success: true, data: legacy });
    render(<InvestmentGuidancePanel proposalId={proposalId} />);
    expect(await screen.findByText("$12,500")).toBeInTheDocument();
    expect(screen.getByText("Audio")).toBeInTheDocument();
    expect(screen.queryByText(/confidence —/)).not.toBeInTheDocument();
    expect(screen.queryByText("Scenarios")).not.toBeInTheDocument();
    expect(screen.queryByText(/Priced on/)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
