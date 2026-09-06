import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DashboardTableList, {
  formatDashboardDate,
} from "./DashboardTableList";

const mockCreateViewGrant = jest.fn();

jest.mock("@/app/actions/proposals", () => ({
  createProposalViewAccessGrantAction: (...args: unknown[]) =>
    mockCreateViewGrant(...args),
}));

jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("DashboardTableList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateViewGrant.mockResolvedValue({
      success: true,
      token: "dashboard-grant",
    });
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
  });

  test("formats proposal dates identically in every runtime locale", () => {
    expect(formatDashboardDate("2026-07-27T00:00:00.000Z")).toBe(
      "07/27/2026",
    );
    expect(formatDashboardDate("2026-07-27T23:30:00-05:00")).toBe(
      "07/28/2026",
    );
    expect(formatDashboardDate("not-a-date")).toBe("-");
    expect(formatDashboardDate()).toBe("-");
  });

  test("renders the deterministic date in the proposal row", () => {
    render(
      <DashboardTableList
        proposals={[
          {
            _id: "proposal-1",
            status: "unsubmitted",
            isDraft: true,
            createdAt: "2026-07-27T00:00:00.000Z",
            event: { eventName: "Annual Summit" },
          },
        ]}
      />,
    );

    expect(screen.getByText("07/27/2026")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { name: "Latest Proposals" });
    expect(heading).toHaveClass("whitespace-nowrap");
    expect(heading.parentElement).toHaveClass(
      "shrink-0",
      "whitespace-nowrap",
    );
  });

  test("copies a secure proposal URL from the dashboard", async () => {
    render(
      <DashboardTableList
        proposals={[
          {
            _id: "proposal-1",
            status: "submitted",
            isDraft: false,
            event: { eventName: "Annual Summit" },
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByTitle("Copy Link"));

    await waitFor(() =>
      expect(mockCreateViewGrant).toHaveBeenCalledWith("proposal-1"),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "http://localhost/proposal-view/annual-summit-proposal-1?source=share&accessGrant=dashboard-grant",
    );
  });
});

  test("says the table holds only the most recent proposals, with the true total", () => {
    const proposal = (id: string) => ({ _id: id, status: "unsubmitted", isDraft: true, createdAt: "2026-07-27T00:00:00.000Z", event: { eventName: `Event ${id}` } });
    render(<DashboardTableList proposals={[proposal("1"), proposal("2")]} totalProposals={86} />);
    const footer = screen.getByText(/most recent proposals/);
    expect(footer).toHaveTextContent("Showing 2 of your 2 most recent proposals · 86 in total");
  });
