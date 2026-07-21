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
});
