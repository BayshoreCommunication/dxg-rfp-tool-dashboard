import { render, screen, within } from "@testing-library/react";
import type { CustomerRole } from "@/components/organization/members/types";
import RoleDashboardView, { type RoleDashboardViewProps } from "./RoleDashboardView";
import { parseDashboardState, toRfpList, toRfpSummary, type RfpListItem } from "./rfpDashboardModel";

const PRIYA = "b".repeat(24);
const TEAM = "c".repeat(24);

const rfp = (overrides: Partial<RfpListItem> & { id: string }): RfpListItem => ({
  ...toRfpList({ items: [{ id: overrides.id }] }).items[0],
  eventName: "Annual Sales Kickoff",
  stage: "sent",
  ownerUserId: PRIYA,
  ownerName: "Priya Planner",
  teamId: TEAM,
  teamName: "Corporate Events",
  eventStartDate: "2027-02-10",
  eventEndDate: "2027-02-12",
  venueCity: "Chicago",
  vendorsInvited: 4,
  vendorsResponded: 1,
  updatedAt: "2026-11-09T10:00:00.000Z",
  ...overrides,
});

const items = [
  rfp({ id: "1".repeat(24) }),
  rfp({ id: "2".repeat(24), eventName: "Leadership Summit", stage: "receiving_responses", vendorsResponded: 3 }),
  rfp({ id: "3".repeat(24), eventName: "Product Launch", stage: "draft", vendorsInvited: 0, vendorsResponded: 0, venueCity: null, eventStartDate: null, eventEndDate: null }),
];

const summary = toRfpSummary({
  total: 3, activeRfps: 2, responsesReceived: 4, awardedThisQuarter: 1,
  byStage: { draft: 1, sent: 1, receiving_responses: 1, awarded: 2, archived: 5 },
  quarter: { label: "2026-Q4", start: "", end: "", timeZone: "UTC" },
});

const propsFor = (role: CustomerRole, params: Record<string, string> = {}, overrides: Partial<RoleDashboardViewProps> = {}): RoleDashboardViewProps => {
  const state = parseDashboardState(params, role);
  return {
    role,
    state,
    today: "2026-11-10",
    list: { items, pagination: { total: items.length, page: 1, limit: 25, totalPages: 1 } },
    summary: role === "viewer" ? null : summary,
    stageCounts: summary.byStage,
    deadlines: role === "viewer" || state.view === "organization" ? null : [items[0]],
    submissions: role === "viewer" || state.view === "organization" ? null : [items[1]],
    owners: [{ id: PRIYA, name: "Priya Planner" }],
    teams: [{ id: TEAM, name: "Corporate Events" }],
    error: null,
    ...overrides,
  };
};

const viewNames = () => {
  const nav = screen.queryByRole("navigation", { name: "Dashboard views" });
  return nav ? within(nav).getAllByRole("link").map((link) => link.textContent) : [];
};

describe("RoleDashboardView", () => {
  test("Planner: My RFPs by status, upcoming deadlines, new submissions and the Admin-visibility note", () => {
    render(<RoleDashboardView {...propsFor("planner")} />);

    expect(screen.getByRole("heading", { name: "My RFPs" })).toBeInTheDocument();
    expect(viewNames()).toEqual([]);
    expect(screen.getByTestId("admin-visibility-note")).toHaveTextContent("Your organization's Admins can see your RFPs, including drafts.");

    const status = screen.getByRole("navigation", { name: "RFP status" });
    expect(within(status).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "All open5", "Draft1", "Sent1", "Receiving responses1", "Under review0", "Awarded2", "Archived5",
    ]);
    expect(within(status).getByRole("link", { name: /Draft/ })).toHaveAttribute("href", "/dashboard?stage=draft");

    const deadlines = screen.getByRole("region", { name: "Upcoming deadlines" });
    expect(within(deadlines).getByRole("link", { name: "Annual Sales Kickoff" })).toBeInTheDocument();
    expect(within(deadlines).getByText("Event starts Feb 10, 2027")).toBeInTheDocument();
    expect(within(deadlines).getByText("In 92 days")).toBeInTheDocument();

    const submissions = screen.getByRole("region", { name: "New submissions" });
    expect(within(submissions).getByRole("link", { name: "Leadership Summit" })).toHaveAttribute("href", `/vendor-responses/proposals/${"2".repeat(24)}`);
    expect(within(submissions).getByText("3 of 4 responded")).toBeInTheDocument();

    // A Planner filters by event name only: no planner, team, city or date filters.
    expect(screen.getByLabelText("Event name")).toBeInTheDocument();
    for (const label of ["Planner", "Team", "Venue city", "Event starts on or after"]) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("columnheader", { name: "Planner" })).not.toBeInTheDocument();
  });

  test("Team Manager: My RFPs plus a Team tab with a planner filter", () => {
    const { unmount } = render(<RoleDashboardView {...propsFor("team_manager")} />);
    expect(viewNames()).toEqual(["My RFPs", "Team"]);
    expect(screen.getByRole("link", { name: "My RFPs" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Team" })).toHaveAttribute("href", "/dashboard?view=team");
    expect(screen.getByTestId("admin-visibility-note")).toBeInTheDocument();
    unmount();

    render(<RoleDashboardView {...propsFor("team_manager", { view: "team", owner: PRIYA })} />);
    expect(screen.getByRole("heading", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team" })).toHaveAttribute("aria-current", "page");
    const planner = screen.getByLabelText("Planner") as HTMLSelectElement;
    expect(planner.value).toBe(PRIYA);
    expect(within(planner).getAllByRole("option").map((option) => option.textContent)).toEqual(["All planners", "Priya Planner"]);
    expect(screen.getByLabelText("Team", { selector: "select" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Venue city")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Planner" })).toBeInTheDocument();
    expect(screen.queryByTestId("admin-visibility-note")).not.toBeInTheDocument();
    // The status tabs keep the team view and planner filter.
    expect(within(screen.getByRole("navigation", { name: "RFP status" })).getByRole("link", { name: /Sent/ }))
      .toHaveAttribute("href", `/dashboard?view=team&stage=sent&owner=${PRIYA}`);
  });

  test.each(["organization_admin", "owner"] as const)("%s: organization-wide list, every filter and the summary row", (role) => {
    render(<RoleDashboardView {...propsFor(role, { venueCity: "Chicago" })} />);

    expect(viewNames()).toEqual(["Organization", "My RFPs"]);
    expect(screen.getByRole("heading", { name: "Organization" })).toBeInTheDocument();
    expect(screen.getByText("Every RFP in your organization, drafts included.")).toBeInTheDocument();

    const summaryRow = screen.getByRole("region", { name: "Summary" });
    expect(within(summaryRow).getByText("Active RFPs").nextElementSibling).toHaveTextContent("2");
    expect(within(summaryRow).getByText("Responses received").nextElementSibling).toHaveTextContent("4");
    expect(within(summaryRow).getByText("Awarded this quarter").nextElementSibling).toHaveTextContent("1");
    expect(within(summaryRow).getByText("Awarded in Q4 2026")).toBeInTheDocument();

    for (const label of ["Event name", "Planner", "Team", "Venue city", "Event starts on or after", "Event starts on or before", "Sort by"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Venue city")).toHaveValue("Chicago");
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/dashboard");

    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "RFP", "Status", "Planner", "Team", "Event date", "Responses", "Updated",
    ]);
    const row = within(table).getByRole("row", { name: /Annual Sales Kickoff/ });
    expect(within(row).getByRole("link", { name: "Annual Sales Kickoff" })).toHaveAttribute("href", `/proposal/annual-sales-kickoff-${"1".repeat(24)}`);
    expect(row).toHaveTextContent("Priya Planner");
    expect(row).toHaveTextContent("Corporate Events");
    expect(row).toHaveTextContent("Feb 10, 2027 – Feb 12, 2027");
    expect(row).toHaveTextContent("1 of 4");
    expect(within(table).getByRole("row", { name: /Product Launch/ })).toHaveTextContent("None invited");
    expect(screen.getByText("Showing 1–3 of 3 RFPs")).toBeInTheDocument();

    // The organization view has no personal panels and no Planner note.
    expect(screen.queryByRole("region", { name: "Upcoming deadlines" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-visibility-note")).not.toBeInTheDocument();
  });

  test("Viewer: a read-only Shared with me view and nothing else", () => {
    render(<RoleDashboardView {...propsFor("viewer", { view: "organization", owner: PRIYA })} />);

    expect(screen.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-view", "shared");
    expect(screen.getByRole("heading", { name: "Shared with me" })).toBeInTheDocument();
    expect(screen.getByText(/You can read them; you can't edit or send them\./)).toBeInTheDocument();
    expect(viewNames()).toEqual([]);
    expect(screen.queryByRole("region", { name: "Summary" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Upcoming deadlines" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "New submissions" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("admin-visibility-note")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Planner")).not.toBeInTheDocument();

    // Read-only: the only controls are links to read an RFP, the status tabs and the search form.
    // Nothing creates, edits, sends or comments.
    expect(screen.queryByRole("textbox", { name: /comment/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Apply"]);
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? "");
    expect(hrefs.every((href) => href.startsWith("/dashboard") || href.startsWith("/proposal/"))).toBe(true);
    expect(document.body.textContent).not.toMatch(/comment|new rfp|edit rfp/i);
  });

  test("a Viewer with nothing shared sees a plain explanation, not the create prompt", () => {
    const empty = { items: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } };
    render(<RoleDashboardView {...propsFor("viewer", {}, { list: empty, stageCounts: toRfpSummary(null).byStage })} />);
    expect(screen.getByText("Nothing has been shared with you yet")).toBeInTheDocument();
    expect(screen.queryByTestId("first-run-dashboard")).not.toBeInTheDocument();
  });

  test("a Planner with no RFPs at all gets the ways to start; a Team Manager keeps the Team tab", () => {
    const empty = { items: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } };
    const none = { list: empty, stageCounts: toRfpSummary(null).byStage, summary: toRfpSummary(null), deadlines: [], submissions: [] };
    const { unmount } = render(<RoleDashboardView {...propsFor("planner", {}, none)} />);
    expect(screen.getByTestId("first-run-dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    unmount();

    render(<RoleDashboardView {...propsFor("team_manager", {}, none)} />);
    expect(screen.getByTestId("first-run-dashboard")).toBeInTheDocument();
    expect(viewNames()).toEqual(["My RFPs", "Team"]);
  });

  test("filters that match nothing say so and offer to clear them", () => {
    const empty = { items: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } };
    render(<RoleDashboardView {...propsFor("organization_admin", { stage: "awarded", search: "zzz" }, { list: empty })} />);
    expect(screen.getByText("No RFPs match these filters")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Clear filters" })[0]).toHaveAttribute("href", "/dashboard?stage=awarded");
    expect(screen.queryByTestId("first-run-dashboard")).not.toBeInTheDocument();
  });

  test("a failed load (for example another organization's data, a 404) shows a plain message with a way back", () => {
    render(
      <RoleDashboardView
        {...propsFor("organization_admin", { team: TEAM }, { list: null, summary: null, stageCounts: null, error: "We couldn't find those RFPs. They may have been moved or belong to another organization." })}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("We couldn't find those RFPs.");
    expect(within(alert).getByRole("link", { name: "reset the dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Summary" })).not.toBeInTheDocument();
    // Status tabs still render, without counts.
    expect(within(screen.getByRole("navigation", { name: "RFP status" })).getByRole("link", { name: "Draft" })).toBeInTheDocument();
  });

  test("long lists page with links that keep the filters", () => {
    const state = { page: "2", stage: "sent" };
    render(<RoleDashboardView {...propsFor("planner", state, { list: { items, pagination: { total: 53, page: 2, limit: 25, totalPages: 3 } } })} />);
    expect(screen.getByText("Showing 26–28 of 53 RFPs")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Previous/ })).toHaveAttribute("href", "/dashboard?stage=sent");
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute("href", "/dashboard?stage=sent&page=3");
  });

  test.each(["owner", "organization_admin", "team_manager", "planner", "viewer"] as const)("%s: copy says RFP, never proposal, and shows the role's label", (role) => {
    render(<RoleDashboardView {...propsFor(role)} />);
    expect(document.body.textContent).not.toMatch(/proposal/i);
    const label = { owner: "Owner", organization_admin: "Admin", team_manager: "Team Manager", planner: "Planner", viewer: "Viewer" }[role];
    expect(screen.getByText("Your role:").parentElement).toHaveTextContent(`Your role: ${label}`);
  });
});
