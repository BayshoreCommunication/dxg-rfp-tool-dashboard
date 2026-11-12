import { fireEvent, render, screen, within } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));
// The row menu's server actions are exercised in ProposalRowActions.test.tsx.
jest.mock("@/app/actions/proposals", () => ({ copyProposalAction: jest.fn(), deleteProposalAction: jest.fn() }));

import type { CustomerRole } from "@/components/organization/members/types";
import RoleDashboardView, { type RoleDashboardViewProps } from "./RoleDashboardView";
import { parseDashboardState, toRfpList, toRfpSummary, type RfpListItem } from "./rfpDashboardModel";
import { RFP_NOUN } from "@/test/wording";

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
    userId: PRIYA,
    state,
    today: "2026-11-10",
    timeZone: "UTC",
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

// Planner, team, city and dates sit in the Filters popover.
const openFilters = () => fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
const chipTexts = () => screen.queryAllByTestId("filter-chip").map((chip) => chip.textContent);

const viewNames = () => {
  const nav = screen.queryByRole("navigation", { name: "Dashboard views" });
  return nav ? within(nav).getAllByRole("link").map((link) => link.textContent) : [];
};

describe("RoleDashboardView", () => {
  test("Planner: My Proposals by status, upcoming deadlines, new submissions and the Admin-visibility note", () => {
    render(<RoleDashboardView {...propsFor("planner")} />);

    expect(screen.getByRole("heading", { name: "My Proposals" })).toBeInTheDocument();
    expect(viewNames()).toEqual([]);
    expect(screen.getByTestId("admin-visibility-note")).toHaveTextContent("Your organization's Admins can see your proposals, including drafts.");

    const status = screen.getByRole("navigation", { name: "Proposal status" });
    expect(within(status).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "All open: 5 proposals", "Draft: 1 proposal", "Sent: 1 proposal", "Receiving responses: 1 proposal", "Under review: 0 proposals", "Awarded: 2 proposals", "Archived: 5 proposals",
    ]);
    expect(within(status).getByRole("link", { name: /Draft/ })).toHaveAttribute("href", "/dashboard?stage=draft");

    const deadlines = screen.getByRole("region", { name: "Upcoming deadlines" });
    expect(within(deadlines).getByRole("link", { name: "Annual Sales Kickoff" })).toBeInTheDocument();
    expect(within(deadlines).getByText("Event starts Feb 10, 2027")).toBeInTheDocument();
    expect(within(deadlines).getByText("In 92 days")).toBeInTheDocument();

    const submissions = screen.getByRole("region", { name: "New submissions" });
    expect(within(submissions).getByRole("link", { name: "Leadership Summit" })).toHaveAttribute("href", `/vendor-responses/proposals/${"2".repeat(24)}`);
    expect(within(submissions).getByText("3 of 4 responded")).toBeInTheDocument();

    // A Planner searches by event name only: no Filters popover, no Apply button, no sort list.
    expect(screen.getByRole("searchbox", { name: "Search proposals by event name" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Filters/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sort by")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Planner" })).not.toBeInTheDocument();

    // Every row is the Planner's own: the name opens the edit page and each row has its menu.
    const table = screen.getByRole("table");
    expect(within(table).getByRole("link", { name: "Annual Sales Kickoff" })).toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${"1".repeat(24)}`);
    expect(within(table).getAllByRole("button", { name: /^Actions for/ }).map((button) => button.getAttribute("aria-label"))).toEqual([
      "Actions for Annual Sales Kickoff", "Actions for Leadership Summit", "Actions for Product Launch",
    ]);
  });

  test("Team Manager: My Proposals plus a Team tab with a planner filter", () => {
    const { unmount } = render(<RoleDashboardView {...propsFor("team_manager")} />);
    expect(viewNames()).toEqual(["My Proposals", "Team"]);
    expect(screen.getByRole("link", { name: "My Proposals" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Team" })).toHaveAttribute("href", "/dashboard?view=team");
    expect(screen.getByTestId("admin-visibility-note")).toBeInTheDocument();
    unmount();

    render(<RoleDashboardView {...propsFor("team_manager", { view: "team", owner: PRIYA })} />);
    expect(screen.getByRole("heading", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /^Filters/ })).toHaveAccessibleName("Filters , 1 applied");
    expect(chipTexts()).toEqual(["Planner: Priya Planner"]);
    expect(screen.getByRole("link", { name: "Remove filter Planner: Priya Planner" })).toHaveAttribute("href", "/dashboard?view=team");
    expect(screen.queryByLabelText("Planner")).not.toBeInTheDocument();
    openFilters();
    const planner = screen.getByLabelText("Planner") as HTMLSelectElement;
    expect(planner.value).toBe(PRIYA);
    expect(within(planner).getAllByRole("option").map((option) => option.textContent)).toEqual(["All planners", "Priya Planner"]);
    expect(screen.getByLabelText("Team", { selector: "select" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Venue city")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Planner" })).toBeInTheDocument();
    expect(screen.queryByTestId("admin-visibility-note")).not.toBeInTheDocument();
    // The status tabs keep the team view and planner filter.
    expect(within(screen.getByRole("navigation", { name: "Proposal status" })).getByRole("link", { name: /Sent/ }))
      .toHaveAttribute("href", `/dashboard?view=team&stage=sent&owner=${PRIYA}`);
  });

  test.each(["organization_admin", "owner"] as const)("%s: organization-wide list, every filter and the summary row", (role) => {
    render(<RoleDashboardView {...propsFor(role, { venueCity: "Chicago" })} />);

    expect(viewNames()).toEqual(["Organization", "My Proposals"]);
    expect(screen.getByRole("heading", { name: "Organization" })).toBeInTheDocument();
    expect(screen.getByText("Every proposal in your organization, drafts included.")).toBeInTheDocument();

    const summaryRow = screen.getByRole("region", { name: "Summary" });
    expect(within(summaryRow).getByTestId("summary-active")).toHaveTextContent("2");
    expect(within(summaryRow).getByTestId("summary-responses")).toHaveTextContent("4");
    expect(within(summaryRow).getByTestId("summary-awarded")).toHaveTextContent("1");
    expect(within(summaryRow).getByText("Awarded in Q4 2026")).toBeInTheDocument();

    expect(chipTexts()).toEqual(["Venue city: Chicago"]);
    expect(screen.getByRole("link", { name: "Clear all" })).toHaveAttribute("href", "/dashboard");
    openFilters();
    const filters = within(screen.getByRole("dialog", { name: "Filters" }));
    for (const label of ["Planner", "Team", "Venue city"]) expect(filters.getByLabelText(label)).toBeInTheDocument();
    expect(filters.getByRole("button", { name: /Event dates/ })).toHaveTextContent("Any dates");
    expect(filters.getByLabelText("Venue city")).toHaveValue("Chicago");
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sort by")).not.toBeInTheDocument();

    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((header) => header.getAttribute("aria-sort"))).toEqual([
      "none", null, null, null, null, "descending", null,
    ]);
    // Sortable headers are links: name and event date in the first column, and Updated.
    const sorts = within(table).getAllByRole("columnheader").flatMap((header) => within(header).queryAllByRole("link"));
    expect(sorts.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Proposal, sort", "/dashboard?venueCity=Chicago&sortBy=eventName"],
      ["Event date, sort", "/dashboard?venueCity=Chicago&sortBy=eventStartDate"],
      ["Updated, sorted descending. Sort ascending", "/dashboard?venueCity=Chicago&sortOrder=asc"],
    ]);
    expect(within(table).getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    const row = within(table).getByRole("row", { name: /Annual Sales Kickoff/ });
    // An Admin or Owner may edit any proposal: the name opens the edit page, as Edit in the menu does.
    expect(within(row).getByRole("link", { name: "Annual Sales Kickoff" })).toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${"1".repeat(24)}`);
    expect(within(row).getByRole("button", { name: "Actions for Annual Sales Kickoff" })).toBeInTheDocument();
    expect(within(row).getByTestId("row-identifier")).toHaveTextContent("Feb 10, 2027 – Feb 12, 2027 · Chicago");
    expect(within(within(table).getByRole("row", { name: /Product Launch/ })).getByTestId("row-identifier")).toHaveTextContent(/^ID 333333$/);
    expect(row).toHaveTextContent("Priya Planner");
    expect(row).toHaveTextContent("Corporate Events");
    expect(row).toHaveTextContent("Feb 10, 2027 – Feb 12, 2027");
    expect(row).toHaveTextContent("1 of 4");
    expect(within(table).getByRole("row", { name: /Product Launch/ })).toHaveTextContent("None invited");
    expect(screen.getByText("Showing 1–3 of 3 proposals")).toBeInTheDocument();

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

    // Read-only: the only controls are links to read a proposal, the status tabs, the sorts and
    // the search box. No row menu, no Filters popover. Nothing creates, edits, sends or comments.
    expect(screen.queryByRole("textbox", { name: /comment/i })).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toEqual([]);
    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href") ?? "");
    expect(hrefs.every((href) => href.startsWith("/dashboard") || href.startsWith("/proposal/"))).toBe(true);
    expect(document.body.textContent).not.toMatch(/comment|new proposal|duplicate|archive this/i);
  });

  test("a Viewer with nothing shared sees a plain explanation, not the create prompt", () => {
    const empty = { items: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } };
    render(<RoleDashboardView {...propsFor("viewer", {}, { list: empty, stageCounts: toRfpSummary(null).byStage })} />);
    expect(screen.getByText("Nothing has been shared with you yet")).toBeInTheDocument();
    expect(screen.queryByTestId("first-run-dashboard")).not.toBeInTheDocument();
  });

  test("a Planner with no proposals at all gets the ways to start; a Team Manager keeps the Team tab", () => {
    const empty = { items: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } };
    const none = { list: empty, stageCounts: toRfpSummary(null).byStage, summary: toRfpSummary(null), deadlines: [], submissions: [] };
    const { unmount } = render(<RoleDashboardView {...propsFor("planner", {}, none)} />);
    expect(screen.getByTestId("first-run-dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    unmount();

    render(<RoleDashboardView {...propsFor("team_manager", {}, none)} />);
    expect(screen.getByTestId("first-run-dashboard")).toBeInTheDocument();
    expect(viewNames()).toEqual(["My Proposals", "Team"]);
  });

  test("filters that match nothing say so and offer to clear them", () => {
    const empty = { items: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } };
    render(<RoleDashboardView {...propsFor("organization_admin", { stage: "awarded", search: "zzz" }, { list: empty })} />);
    expect(screen.getByText("No proposals match these filters")).toBeInTheDocument();
    expect(chipTexts()).toEqual(["Search: zzz"]);
    // "Clear all" keeps the status tab; the empty state's link clears that too.
    expect(screen.getByRole("link", { name: "Clear all" })).toHaveAttribute("href", "/dashboard?stage=awarded");
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByTestId("first-run-dashboard")).not.toBeInTheDocument();
  });

  test("a failed load (for example another organization's data, a 404) shows a plain message with a way back", () => {
    render(
      <RoleDashboardView
        {...propsFor("organization_admin", { team: TEAM }, { list: null, summary: null, stageCounts: null, error: "We couldn't find those proposals. They may have been moved or belong to another organization." })}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("We couldn't find those proposals.");
    expect(within(alert).getByRole("link", { name: "reset the dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Summary" })).not.toBeInTheDocument();
    // Status tabs still render, without counts.
    expect(within(screen.getByRole("navigation", { name: "Proposal status" })).getByRole("link", { name: "Draft" })).toBeInTheDocument();
  });

  test("long lists page with links that keep the filters and the sort", () => {
    const state = { page: "2", stage: "sent", sortBy: "eventName" };
    render(<RoleDashboardView {...propsFor("planner", state, { list: { items, pagination: { total: 53, page: 2, limit: 10, totalPages: 6 } } })} />);
    expect(screen.getByText("Showing 11–13 of 53 proposals")).toBeInTheDocument();
    const pages = within(screen.getByRole("navigation", { name: "Pages" }));
    expect(pages.getByRole("link", { name: /Previous/ })).toHaveAttribute("href", "/dashboard?stage=sent&sortBy=eventName");
    expect(pages.getByRole("link", { name: /Next/ })).toHaveAttribute("href", "/dashboard?stage=sent&sortBy=eventName&page=3");
    expect(pages.getAllByRole("link", { name: /^Page / }).map((link) => link.textContent)).toEqual(["1", "2", "3", "6"]);
    expect(pages.getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    expect(pages.getByRole("link", { name: "Page 6" })).toHaveAttribute("href", "/dashboard?stage=sent&sortBy=eventName&page=6");
  });

  test("the first page has no Previous link and the last no Next", () => {
    const { unmount } = render(<RoleDashboardView {...propsFor("planner", {}, { list: { items, pagination: { total: 13, page: 1, limit: 10, totalPages: 2 } } })} />);
    const first = within(screen.getByRole("navigation", { name: "Pages" }));
    expect(first.queryByRole("link", { name: /Previous/ })).not.toBeInTheDocument();
    expect(first.getByRole("link", { name: /Next/ })).toHaveAttribute("href", "/dashboard?page=2");
    unmount();
    render(<RoleDashboardView {...propsFor("planner", { page: "2" }, { list: { items, pagination: { total: 13, page: 2, limit: 10, totalPages: 2 } } })} />);
    const last = within(screen.getByRole("navigation", { name: "Pages" }));
    expect(last.queryByRole("link", { name: /Next/ })).not.toBeInTheDocument();
    expect(last.getByRole("link", { name: /Previous/ })).toHaveAttribute("href", "/dashboard");
  });

  test("every applied filter has a chip that removes only itself", () => {
    const params = { search: "summit", owner: PRIYA, team: TEAM, venueCity: "Chicago", eventFrom: "2026-11-11", eventTo: "2026-11-14", stage: "sent", page: "3" };
    render(<RoleDashboardView {...propsFor("owner", params)} />);
    expect(chipTexts()).toEqual([
      "Search: summit", "Planner: Priya Planner", "Team: Corporate Events", "Venue city: Chicago", "Event dates: Nov 11, 2026 – Nov 14, 2026",
    ]);
    // Removing one keeps the others and the status tab, and goes back to page one.
    expect(screen.getByRole("link", { name: "Remove filter Event dates: Nov 11, 2026 – Nov 14, 2026" }))
      .toHaveAttribute("href", `/dashboard?stage=sent&owner=${PRIYA}&team=${TEAM}&venueCity=Chicago&search=summit`);
    expect(screen.getByRole("link", { name: "Remove filter Search: summit" }))
      .toHaveAttribute("href", `/dashboard?stage=sent&owner=${PRIYA}&team=${TEAM}&eventFrom=2026-11-11&eventTo=2026-11-14&venueCity=Chicago`);
    expect(screen.getByRole("link", { name: "Clear all" })).toHaveAttribute("href", "/dashboard?stage=sent");
    expect(screen.getByRole("button", { name: /^Filters/ })).toHaveAccessibleName("Filters , 4 applied");
  });

  test("a status badge per stage, in its own colour", () => {
    const stages = ["draft", "sent", "receiving_responses", "under_review", "awarded", "archived"] as const;
    const list = { items: stages.map((stage, index) => rfp({ id: String(index + 1).repeat(24), eventName: `Event ${stage}`, stage })), pagination: { total: 6, page: 1, limit: 10, totalPages: 1 } };
    render(<RoleDashboardView {...propsFor("owner", {}, { list })} />);
    const badges = within(screen.getByRole("table")).getAllByText(/^(Draft|Sent|Receiving responses|Under review|Awarded|Archived)$/);
    expect(badges.map((badge) => [badge.textContent, badge.getAttribute("data-tone")])).toEqual([
      ["Draft", "gray"], ["Sent", "blue"], ["Receiving responses", "amber"], ["Under review", "purple"], ["Awarded", "green"], ["Archived", "muted"],
    ]);
    // An archived proposal has no row menu and opens read-only.
    expect(screen.queryByRole("button", { name: "Actions for Event archived" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Event archived" })).toHaveAttribute("href", `/proposal/event-archived-${"6".repeat(24)}`);
  });

  test("two proposals with one name are told apart by the line under it", () => {
    const list = {
      items: [
        rfp({ id: "0".repeat(18) + "a1b2c3", eventName: "Northstar Leadership Summit 2027" }),
        rfp({ id: "0".repeat(18) + "d4e5f6", eventName: "Northstar Leadership Summit 2027" }),
        rfp({ id: "0".repeat(18) + "0789ab", eventName: "Northstar Leadership Summit 2027", eventStartDate: null, eventEndDate: null, venueCity: null }),
      ],
      pagination: { total: 3, page: 1, limit: 10, totalPages: 1 },
    };
    render(<RoleDashboardView {...propsFor("owner", {}, { list })} />);
    expect(screen.getAllByTestId("row-identifier").map((line) => line.textContent)).toEqual([
      "Feb 10, 2027 – Feb 12, 2027 · ID A1B2C3 · Chicago",
      "Feb 10, 2027 – Feb 12, 2027 · ID D4E5F6 · Chicago",
      "ID 0789AB",
    ]);
  });

  test("when every stat is zero, one card with a create button replaces the three zeros", () => {
    const zero = toRfpSummary({ total: 3, byStage: { draft: 3 }, quarter: { label: "2026-Q4", start: "", end: "", timeZone: "UTC" } });
    const { unmount } = render(<RoleDashboardView {...propsFor("planner", {}, { summary: zero, stageCounts: zero.byStage })} />);
    const card = within(screen.getByRole("region", { name: "Summary" }));
    expect(card.getByRole("heading", { name: "No proposal activity yet" })).toBeInTheDocument();
    expect(card.getByRole("link", { name: "New Proposal" })).toHaveAttribute("href", "/proposals/add-new-proposal");
    for (const id of ["summary-active", "summary-responses", "summary-awarded"]) expect(card.queryByTestId(id)).not.toBeInTheDocument();
    unmount();

    // At the plan's limit there is nothing to offer.
    const atLimit = { used: 2, limit: 2, atLimit: true, planName: "Free trial", onPlan: "on the free trial" };
    const second = render(<RoleDashboardView {...propsFor("planner", { stage: "draft" }, { summary: zero, stageCounts: zero.byStage, rfpUsage: atLimit })} />);
    expect(screen.getByRole("heading", { name: "No activity for these filters yet" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New Proposal" })).not.toBeInTheDocument();
    second.unmount();

    // One non-zero stat brings the three cards back.
    render(<RoleDashboardView {...propsFor("planner", {}, { summary: toRfpSummary({ responsesReceived: 1 }) })} />);
    expect(screen.queryByTestId("summary-empty")).not.toBeInTheDocument();
    expect(screen.getByTestId("summary-responses")).toHaveTextContent("1");
  });

  test.each(["owner", "organization_admin", "team_manager", "planner", "viewer"] as const)("%s: copy says proposal, never RFP as a noun, and shows the role's label", (role) => {
    render(<RoleDashboardView {...propsFor(role)} />);
    expect(document.body.textContent ?? "").not.toMatch(RFP_NOUN);
    const label = { owner: "Owner", organization_admin: "Admin", team_manager: "Team Manager", planner: "Planner", viewer: "Viewer" }[role];
    expect(screen.getByText("Your role:").parentElement).toHaveTextContent(`Your role: ${label}`);
  });
});
