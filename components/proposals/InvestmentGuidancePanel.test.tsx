import { render, screen } from "@testing-library/react";
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
  engineVersion: "invest-1.0.0",
  currency: "USD",
  totalLowMinor: 1_250_000,
  totalMidMinor: 1_800_000,
  totalHighMinor: 2_400_000,
  lineItems: [
    {
      category: "audio",
      label: "Audio",
      currency: "USD",
      lowMinor: 500_000,
      midMinor: 700_000,
      highMinor: 900_000,
      provenance: {
        pricingRecordIds: ["rec-1", "rec-2"],
        ruleIds: ["rule-1"],
        drivers: { days: 3 },
      },
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
    expect(screen.getByText("$18,000")).toBeInTheDocument();
    expect(screen.getByText("$24,000")).toBeInTheDocument();
    // The refusal surfaces as a prominent card, not an error.
    expect(
      screen.getByText(
        "No approved pricing data supports a defensible range for Lighting.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mockedLatest).toHaveBeenCalledWith(proposalId);
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
});
