import { fireEvent, render, screen } from "@testing-library/react";
import GuidancePanel from "./GuidancePanel";
import {
  generateGuidanceAction,
  getLatestGuidanceAction,
  type GuidanceReport,
} from "@/app/actions/guidance";

jest.mock("@/app/actions/guidance", () => ({
  generateGuidanceAction: jest.fn(),
  getLatestGuidanceAction: jest.fn(),
}));

const proposalId = "507f1f77bcf86cd799439011";
const mockedGenerate = generateGuidanceAction as jest.MockedFunction<
  typeof generateGuidanceAction
>;
const mockedLatest = getLatestGuidanceAction as jest.MockedFunction<
  typeof getLatestGuidanceAction
>;

const report: GuidanceReport = {
  id: "guidance-1",
  proposalVersion: 3,
  engineVersion: "1.0.0",
  overallCompleteness: 0.62,
  completeness: [
    { section: "event", label: "Event overview", filled: 5, total: 8, score: 0.625 },
  ],
  findings: [
    {
      code: "POWER_DROP_COUNT_MISSING",
      severity: "info",
      category: "production",
      message: "Power drops are required but the count is not specified.",
      paths: ["/content/venue/numberOfPowerDrops"],
      scopeCategory: "needs_confirmation",
      scopeSeverity: "needs_venue_confirmation",
      question: "How many power drops can the venue support?",
    },
    {
      code: "EVENT_DATES_REVERSED",
      severity: "blocking",
      category: "schedule",
      message: "The event start date is after the end date.",
      paths: ["/content/event/startDate", "/content/event/endDate"],
    },
  ],
  findingCount: 2,
  blockingCount: 1,
  createdAt: "2026-07-21T10:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedLatest.mockResolvedValue({
    success: false,
    code: "GUIDANCE_NOT_FOUND",
    message: "No readiness check has been run for this proposal yet.",
  });
});

describe("GuidancePanel", () => {
  test("shows the empty state and renders a fresh report after running the check", async () => {
    mockedGenerate.mockResolvedValue({ success: true, data: report });
    render(<GuidancePanel proposalId={proposalId} />);
    // GUIDANCE_NOT_FOUND is a normal empty state, not an error.
    expect(
      await screen.findByText(
        "Run the readiness check to see completeness and risk findings.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Run readiness check" }),
    );
    expect(await screen.findByText("62%")).toBeInTheDocument();
    expect(mockedGenerate).toHaveBeenCalledWith(proposalId);
    expect(
      screen.getByText("The event start date is after the end date."),
    ).toBeInTheDocument();
  });

  test("renders blocking findings before info findings", async () => {
    mockedLatest.mockResolvedValue({ success: true, data: report });
    render(<GuidancePanel proposalId={proposalId} />);
    const blocking = await screen.findByText(
      "The event start date is after the end date.",
    );
    const info = screen.getByText(
      "Power drops are required but the count is not specified.",
    );
    // Blocking findings appear above info findings even though the report
    // lists the info finding first.
    expect(
      blocking.compareDocumentPosition(info) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("shows friendly field names and navigates to the relevant form step", async () => {
    const onNavigateToStep = jest.fn();
    mockedLatest.mockResolvedValue({ success: true, data: report });
    render(
      <GuidancePanel
        proposalId={proposalId}
        onNavigateToStep={onNavigateToStep}
      />,
    );

    expect(await screen.findByText("number of power drops")).toBeInTheDocument();
    expect(
      screen.queryByText("/content/venue/numberOfPowerDrops"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Fix in Venue & Technical" }),
    );
    expect(onNavigateToStep).toHaveBeenCalledWith(7);
    expect(screen.getByText("Needs Venue Confirmation")).toBeInTheDocument();
    expect(
      screen.getByText("How many power drops can the venue support?"),
    ).toBeInTheDocument();
  });

  test("shows the bounded proposal summary, next action, and stale warning", async () => {
    mockedLatest.mockResolvedValue({
      success: true,
      data: {
        ...report,
        currentProposalVersion: 4,
        stale: true,
        analysisVersion: "proposal-analysis.v2",
        summary: {
          eventName: "Leadership Summit",
          eventFormat: "Hybrid",
          dateRange: "2026-10-01 to 2026-10-03",
          attendeeCount: 1500,
          roomCount: 6,
        },
        findings: report.findings.map((finding) => ({
          ...finding,
          suggestedNextStep: "Correct the event date range before pricing.",
        })),
      },
    });
    render(<GuidancePanel proposalId={proposalId} />);

    expect(await screen.findByText("Leadership Summit")).toBeInTheDocument();
    expect(screen.getByText("1,500 attendees")).toBeInTheDocument();
    expect(
      screen.getByText(/proposal is now version 4/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Correct the event date range before pricing.").length,
    ).toBeGreaterThan(0);
  });
});
