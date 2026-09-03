import { render, screen } from "@testing-library/react";
import DashboardTableList, {
  formatDashboardDate,
} from "./DashboardTableList";

describe("DashboardTableList", () => {
  test("formats proposal dates identically in every runtime locale", () => {
    expect(formatDashboardDate("2026-07-27T00:00:00.000Z")).toBe(
      "27/07/2026",
    );
    expect(formatDashboardDate("2026-07-27T23:30:00-05:00")).toBe(
      "28/07/2026",
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

    expect(screen.getByText("27/07/2026")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { name: "Latest Proposals" });
    expect(heading).toHaveClass("whitespace-nowrap");
    expect(heading.parentElement).toHaveClass(
      "shrink-0",
      "whitespace-nowrap",
    );
  });
});

  test("says the table holds only the most recent proposals, with the true total", () => {
    const proposal = (id: string) => ({ _id: id, status: "unsubmitted", isDraft: true, createdAt: "2026-07-27T00:00:00.000Z", event: { eventName: `Event ${id}` } });
    render(<DashboardTableList proposals={[proposal("1"), proposal("2")]} totalProposals={86} />);
    const footer = screen.getByText(/most recent proposals/);
    expect(footer).toHaveTextContent("Showing 2 of your 2 most recent proposals · 86 in total");
  });
