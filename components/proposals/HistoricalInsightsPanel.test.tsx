import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import HistoricalInsightsPanel from "./HistoricalInsightsPanel";
import {
  generateHistoricalInsightsAction,
  getLatestHistoricalInsightsAction,
  type HistoricalInsightsReport,
} from "@/app/actions/historicalInsights";
import { getProposalsAction } from "@/app/actions/proposals";

jest.mock("@/app/actions/historicalInsights", () => ({
  generateHistoricalInsightsAction: jest.fn(),
  getLatestHistoricalInsightsAction: jest.fn(),
}));
jest.mock("@/app/actions/proposals", () => ({
  getProposalsAction: jest.fn(),
}));

const currentId = "64b000000000000000000001";
const referenceId = "64b000000000000000000002";
const generated: HistoricalInsightsReport = {
  id: "report-1",
  analysisVersion: "historical-insights.v1",
  currentProposalVersion: 4,
  references: [{ referenceKey: "reference-1", label: "Selected reference 1", proposalVersion: 2 }],
  comparisons: [{
    section: "venueSchedule",
    label: "Venue and schedule",
    status: "reference_only",
    detail: "This planning area appears in a selected reference but not in the current proposal.",
    referenceKeys: ["reference-1"],
    provenance: [{ source: "selected_historical_reference", referenceKey: "reference-1", proposalVersion: 2 }],
  }],
  insights: [{
    id: "insight-1",
    category: "timeline_checklist",
    applicability: "may_apply",
    title: "Consider venue and schedule",
    detail: "Treat it as an idea, not as a fact about the current event.",
    question: "Should venue milestones be confirmed?",
    affectedSection: "venueSchedule",
    provenance: [{ source: "selected_historical_reference", referenceKey: "reference-1", proposalVersion: 2 }],
  }],
  privacy: { redactedByDefault: true, exactPricingExcluded: true, rawContentRetained: false },
  createdAt: "2026-07-29T10:00:00.000Z",
};

const mockedList = getProposalsAction as jest.MockedFunction<typeof getProposalsAction>;
const mockedLatest = getLatestHistoricalInsightsAction as jest.MockedFunction<typeof getLatestHistoricalInsightsAction>;
const mockedGenerate = generateHistoricalInsightsAction as jest.MockedFunction<typeof generateHistoricalInsightsAction>;

describe("HistoricalInsightsPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedList.mockResolvedValue({
      success: true,
      data: [
        { _id: currentId, event: { eventName: "Current proposal" } },
        { _id: referenceId, event: { eventName: "Annual conference" }, updatedAt: "2026-07-28T10:00:00.000Z" },
      ],
    });
    mockedLatest.mockResolvedValue({
      success: false,
      code: "HISTORICAL_INSIGHTS_NOT_FOUND",
      message: "No historical proposal comparison exists yet.",
    });
    mockedGenerate.mockResolvedValue({ success: true, data: generated });
  });

  test("requires explicit selection and excludes the current proposal", async () => {
    render(<HistoricalInsightsPanel proposalId={currentId} />);
    expect(await screen.findByText("Annual conference")).toBeInTheDocument();
    expect(screen.queryByText("Current proposal")).not.toBeInTheDocument();
    const compare = screen.getByRole("button", { name: "Compare selected proposals" });
    expect(compare).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Annual conference/ }));
    expect(compare).toBeEnabled();
    fireEvent.click(compare);
    await waitFor(() => expect(mockedGenerate).toHaveBeenCalledWith(currentId, [referenceId]));
  });

  test("shows provenance, uncertainty and the no-copy boundary", async () => {
    render(<HistoricalInsightsPanel proposalId={currentId} />);
    fireEvent.click(await screen.findByRole("checkbox", { name: /Annual conference/ }));
    fireEvent.click(screen.getByRole("button", { name: "Compare selected proposals" }));
    const insights = await screen.findByRole("list", { name: "Historical planning insights" });
    expect(within(insights).getByText("Consider venue and schedule")).toBeInTheDocument();
    expect(within(insights).getByText("May apply")).toBeInTheDocument();
    expect(within(insights).getByText(/reference-1 · v2/)).toBeInTheDocument();
    expect(screen.getByText(/Historical patterns are not current-event facts/)).toBeInTheDocument();
    expect(screen.getByText(/no automatic field copy/)).toBeInTheDocument();
  });

  test("handles an inaccessible selected reference safely", async () => {
    mockedGenerate.mockResolvedValue({
      success: false,
      code: "HISTORICAL_REFERENCE_UNAVAILABLE",
      message: "A selected proposal is archived, deleted, or no longer accessible. Select active references and try again.",
    });
    render(<HistoricalInsightsPanel proposalId={currentId} />);
    fireEvent.click(await screen.findByRole("checkbox", { name: /Annual conference/ }));
    fireEvent.click(screen.getByRole("button", { name: "Compare selected proposals" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/archived, deleted, or no longer accessible/i);
  });
});
