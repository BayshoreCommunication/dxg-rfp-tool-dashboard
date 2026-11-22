import { fireEvent, render, screen, within } from "@testing-library/react";

jest.mock("@/auth", () => ({ auth: jest.fn(async () => ({ user: { _id: "session-user" } })) }));
jest.mock("@/lib/server/memberIdentity", () => ({ getMemberIdentity: jest.fn() }));
jest.mock("@/app/actions/rfpDashboard", () => ({
  listDashboardRfpsAction: jest.fn(),
  getDashboardRfpSummaryAction: jest.fn(),
}));
jest.mock("@/app/actions/overview", () => ({ getDashboardOverviewAction: jest.fn() }));
jest.mock("@/app/actions/vendorResponse", () => ({ getVendorResponsesAction: jest.fn() }));
jest.mock("@/app/actions/organizationMembers", () => ({ listMembersAction: jest.fn() }));
jest.mock("@/app/actions/teams", () => ({ listTeamsAction: jest.fn() }));
jest.mock("@/components/entitlements/planGate", () => ({ loadRfpUsage: jest.fn() }));
jest.mock("./VerifyDomainPrompt", () => ({ __esModule: true, default: () => null }));
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));
// The row menu's server actions are exercised in ProposalRowActions.test.tsx.
jest.mock("@/app/actions/proposals", () => ({ copyProposalAction: jest.fn(), deleteProposalAction: jest.fn() }));

import { auth } from "@/auth";
import { listMembersAction } from "@/app/actions/organizationMembers";
import { getDashboardOverviewAction } from "@/app/actions/overview";
import { getVendorResponsesAction } from "@/app/actions/vendorResponse";
import { getDashboardRfpSummaryAction, listDashboardRfpsAction } from "@/app/actions/rfpDashboard";
import { listTeamsAction } from "@/app/actions/teams";
import { loadRfpUsage } from "@/components/entitlements/planGate";
import { getMemberIdentity } from "@/lib/server/memberIdentity";
import RoleDashboard from "./RoleDashboard";
import { toRfpList, toRfpSummary } from "./rfpDashboardModel";
import { RFP_NOUN } from "@/test/wording";

const ME = "a".repeat(24);
const PRIYA = "b".repeat(24);
const TEAM = "c".repeat(24);

const mockedIdentity = jest.mocked(getMemberIdentity);
const mockedList = jest.mocked(listDashboardRfpsAction);
const mockedSummary = jest.mocked(getDashboardRfpSummaryAction);
const mockedOverview = jest.mocked(getDashboardOverviewAction);
const mockedVendorResponses = jest.mocked(getVendorResponsesAction);
const mockedMembers = jest.mocked(listMembersAction);
const mockedTeams = jest.mocked(listTeamsAction);
const mockedUsage = jest.mocked(loadRfpUsage);

const listOf = (count: number, total = count, page = 1) =>
  toRfpList({
    items: Array.from({ length: count }, (_, index) => ({
      id: String(index + 1).padStart(24, "0"), eventName: `Event ${index + 1}`, stage: "sent",
      ownerUserId: PRIYA, ownerName: "Priya Planner", teamId: TEAM, teamName: "Corporate Events",
    })),
    pagination: { total, page, limit: 10, totalPages: Math.ceil(total / 10) },
  });

const summaryData = toRfpSummary({ byStage: { sent: 2 }, quarter: { label: "2026-Q4", start: "", end: "", timeZone: "UTC" } });
// The signed-in member's own totals, whatever the list shows.
const overviewData = { totalProposals: 6, totalEmailSent: 22, totalEmailClicked: 14, totalProposalViews: 1234 };
const vendorResponsesData = { success: true, data: [], pagination: { total: 14, page: 1, limit: 1, totalPages: 14 }, unreadCount: 3 };
const statCards = () => screen.queryByRole("region", { name: "Your totals" });
const cardValue = (id: string) => screen.getByTestId(`stat-card-${id}-value`).textContent;

const signInAs = (roles: string[], userId: string | null = ME) => mockedIdentity.mockResolvedValue({ userId, roles });

const renderDashboard = async (searchParams: Record<string, string> = {}) => render(await RoleDashboard({ searchParams }));

// The queries the dashboard sent, without paging and sorting.
const listQueries = () => mockedList.mock.calls.map(([query]) => query ?? {});
const summaryQueries = () => mockedSummary.mock.calls.map(([query]) => query ?? {});
const mainListQuery = () => listQueries().find((query) => query.page !== undefined)!;
// Planner, team, city and dates sit in the Filters popover.
const openFilters = () => fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockResolvedValue({ success: true, message: "OK", data: listOf(2) });
  mockedSummary.mockResolvedValue({ success: true, message: "OK", data: summaryData });
  mockedOverview.mockResolvedValue({ success: true, message: "OK", data: overviewData });
  mockedVendorResponses.mockResolvedValue(vendorResponsesData);
  mockedMembers.mockResolvedValue({ success: true, message: "OK", data: [] });
  mockedTeams.mockResolvedValue({ success: true, message: "OK", data: [] });
  mockedUsage.mockResolvedValue(null);
});

describe("RoleDashboard", () => {
  test("Planner: everything is asked for the planner's own proposals, and the status counts use the list's scope", async () => {
    signInAs(["planner"]);
    await renderDashboard({ stage: "sent", search: "gala", owner: PRIYA, view: "organization" });

    expect(screen.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-role", "planner");
    expect(screen.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-view", "mine");
    const { page, limit, sortBy, sortOrder, ...listFilters } = mainListQuery();
    expect(listFilters).toEqual({ owner: ME, search: "gala", stage: "sent" });
    expect({ page, limit, sortBy, sortOrder }).toEqual({ page: "1", limit: "10", sortBy: "updatedAt", sortOrder: "desc" });
    // PRD P0-8: the status-tab counts come from the same scope as the list, across every stage.
    // That is the only summary read: the filtered summary went with the three summary cards.
    expect(summaryQueries()).toEqual([{ owner: ME, search: "gala", stage: "draft,sent,receiving_responses,under_review,awarded,archived" }]);
    // Deadlines and new submissions are the planner's own too.
    expect(listQueries().every((query) => query.owner === ME)).toBe(true);
    expect(listQueries()).toContainEqual(expect.objectContaining({ stage: "receiving_responses", limit: "5" }));
    expect(listQueries()).toContainEqual(expect.objectContaining({ stage: "sent,receiving_responses,under_review", sortBy: "eventStartDate", sortOrder: "asc" }));
    expect(mockedMembers).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /New Proposal/ })).toBeInTheDocument();
    expect(screen.getByTestId("admin-visibility-note")).toBeInTheDocument();
  });

  test("Team Manager: the Team tab asks for everything in scope and builds the planner filter from it", async () => {
    signInAs(["team_manager"]);
    await renderDashboard({ view: "team", owner: PRIYA });

    const { owner, page } = mainListQuery();
    expect({ owner, page }).toEqual({ owner: PRIYA, page: "1" });
    expect(summaryQueries()).toEqual([{ owner: PRIYA, stage: "draft,sent,receiving_responses,under_review,awarded,archived" }]);
    expect(mockedMembers).not.toHaveBeenCalled();
    openFilters();
    const planner = screen.getByLabelText("Planner");
    expect(within(planner).getAllByRole("option").map((option) => option.textContent)).toEqual(["All planners", "Priya Planner"]);
    expect(within(screen.getByLabelText("Team", { selector: "select" })).getAllByRole("option").map((option) => option.textContent)).toEqual(["All teams", "Corporate Events"]);
  });

  test("Admin: organization-wide by default, with planners and teams from the member and team lists", async () => {
    signInAs(["organization_admin"]);
    mockedMembers.mockResolvedValue({
      success: true, message: "OK",
      data: [
        { userId: PRIYA, membershipId: "m1", name: "Priya Planner", email: "priya@example.com", role: "planner", roles: ["planner"], teams: [], status: "active", lastSignedInAt: null, version: 1, joinedAt: null },
        { userId: "d".repeat(24), membershipId: "m2", name: "Vera Viewer", email: "vera@example.com", role: "viewer", roles: ["viewer"], teams: [], status: "active", lastSignedInAt: null, version: 1, joinedAt: null },
      ],
    });
    mockedTeams.mockResolvedValue({ success: true, message: "OK", data: [{ id: TEAM, name: "Corporate Events" }, { id: "e".repeat(24), name: "Old team", archived: true }] });
    await renderDashboard({ team: TEAM, venueCity: "Chicago", eventFrom: "2027-01-01", eventTo: "2027-03-31" });

    expect(screen.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-view", "organization");
    const { page, limit, sortBy, sortOrder, ...listFilters } = mainListQuery();
    expect(listFilters).toEqual({ team: TEAM, venueCity: "Chicago", eventFrom: "2027-01-01", eventTo: "2027-03-31" });
    expect([page, limit, sortBy, sortOrder]).toEqual(["1", "10", "updatedAt", "desc"]);
    expect(summaryQueries()).toEqual([{ ...listFilters, stage: "draft,sent,receiving_responses,under_review,awarded,archived" }]);
    // No personal panels on the organization view: one list call only.
    expect(mockedList).toHaveBeenCalledTimes(1);
    // Viewers can't own proposals and archived teams aren't offered.
    openFilters();
    expect(within(screen.getByLabelText("Planner")).getAllByRole("option").map((option) => option.textContent)).toEqual(["All planners", "Priya Planner"]);
    expect(within(screen.getByLabelText("Team", { selector: "select" })).getAllByRole("option").map((option) => option.textContent)).toEqual(["All teams", "Corporate Events"]);
    // The cards are the Admin's own totals, not the organization's, and the summary row is gone.
    expect(within(statCards()!).getByTestId("stat-card-proposals-value")).toHaveTextContent("6");
    expect(screen.queryByRole("region", { name: "Summary" })).not.toBeInTheDocument();
  });

  test("Owner: My Proposals narrows to the Owner's own proposals", async () => {
    signInAs(["owner"]);
    await renderDashboard({ view: "mine", owner: PRIYA });
    expect(mainListQuery().owner).toBe(ME);
  });

  test("Viewer: one scoped list, no stat cards, no create button, and filters from the URL are ignored", async () => {
    signInAs(["viewer"]);
    await renderDashboard({ view: "organization", owner: PRIYA, team: TEAM, venueCity: "Chicago" });

    expect(screen.getByRole("heading", { name: "Shared with me" })).toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledTimes(1);
    const { page, limit, sortBy, sortOrder, ...listFilters } = mainListQuery();
    expect(listFilters).toEqual({});
    expect([page, limit, sortBy, sortOrder]).toEqual(["1", "10", "updatedAt", "desc"]);
    // Only the status-tab counts are asked of the summary endpoint.
    expect(summaryQueries()).toEqual([{ stage: "draft,sent,receiving_responses,under_review,awarded,archived" }]);
    expect(screen.queryByRole("link", { name: /New Proposal/ })).not.toBeInTheDocument();
    // A Viewer owns nothing: no cards, and the totals aren't even asked for.
    expect(statCards()).not.toBeInTheDocument();
    expect(mockedOverview).not.toHaveBeenCalled();
    expect(mockedVendorResponses).not.toHaveBeenCalled();
    expect(mockedMembers).not.toHaveBeenCalled();
  });

  test("the URL's filters, sort and page reach both loaders and nothing else does", async () => {
    signInAs(["owner"]);
    await renderDashboard({ search: " summit ", sortBy: "eventName", sortOrder: "desc", page: "3", stage: "draft", owner: "nope", bogus: "1" });
    const { page, limit, sortBy, sortOrder, ...listFilters } = mainListQuery();
    expect(listFilters).toEqual({ search: "summit", stage: "draft" });
    expect([page, limit, sortBy, sortOrder]).toEqual(["3", "10", "eventName", "desc"]);
    expect(summaryQueries()).toEqual([{ search: "summit", stage: "draft,sent,receiving_responses,under_review,awarded,archived" }]);
    expect(screen.getByRole("searchbox")).toHaveValue("summit");
  });

  test("row menus follow the role: an Owner gets one on every row, a Planner only on their own, a Viewer none", async () => {
    signInAs(["owner"]);
    const { unmount } = await renderDashboard();
    expect(screen.getAllByRole("button", { name: /^Actions for/ })).toHaveLength(2);
    expect(within(screen.getByRole("table")).getByRole("link", { name: "Event 1" })).toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${"1".padStart(24, "0")}`);
    unmount();

    // Priya's proposals, seen by another planner through a share: read-only.
    signInAs(["planner"]);
    const second = await renderDashboard();
    expect(screen.queryByRole("button", { name: /^Actions for/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByRole("link", { name: "Event 1" })).toHaveAttribute("href", `/proposal/event-1-${"1".padStart(24, "0")}`);
    second.unmount();

    signInAs(["planner"], PRIYA);
    const third = await renderDashboard();
    expect(screen.getAllByRole("button", { name: /^Actions for/ })).toHaveLength(2);
    third.unmount();

    signInAs(["viewer"], PRIYA);
    await renderDashboard();
    expect(screen.queryByRole("button", { name: /^Actions for/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
  });

  test.each([["planner"], ["team_manager"], ["organization_admin"], ["owner"]])("%s: the five stat cards show the member's own totals, read on the server with the page's other reads", async (role) => {
    signInAs([role]);
    await renderDashboard({ stage: "sent", search: "gala" });

    // Asked once each, with no filter, view or role: they are the member's own whatever the list shows.
    expect(mockedOverview.mock.calls).toEqual([[]]);
    expect(mockedVendorResponses.mock.calls).toEqual([[{ page: 1, limit: 1 }]]);
    expect(["proposals", "sent", "clicked", "views", "vendor-responses"].map(cardValue)).toEqual(["6", "22", "14", "1,234", "14"]);
    expect(screen.getByTestId("stat-card-vendor-responses-badge")).toHaveTextContent("3 unread");
    expect(within(statCards()!).getByText("Counts for the proposals you own. The view and filters below don't change them.")).toBeInTheDocument();
  });

  test("a failed overview leaves its cards unavailable, with no made-up zeros, and the rest of the dashboard renders", async () => {
    signInAs(["planner"]);
    mockedOverview.mockResolvedValue({ success: false, message: "Error fetching dashboard overview", status: 500 });
    const { unmount } = await renderDashboard();

    expect(["proposals", "sent", "clicked", "views"].map(cardValue)).toEqual(["—", "—", "—", "—"]);
    expect(cardValue("vendor-responses")).toBe("14");
    expect(within(statCards()!).queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-stat-cards-unavailable")).toHaveTextContent("We couldn't load some of your totals. Reload the page to try again.");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("region", { name: "Upcoming deadlines" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    unmount();

    // An answer with no totals in it, and a vendor-responses read that failed too.
    mockedOverview.mockResolvedValue({ success: true, message: "OK", data: null });
    mockedVendorResponses.mockResolvedValue({ success: false, message: "Error fetching vendor responses", data: [] });
    await renderDashboard();
    expect(["proposals", "sent", "clicked", "views", "vendor-responses"].map(cardValue)).toEqual(["—", "—", "—", "—", "—"]);
    expect(screen.queryByTestId("stat-card-vendor-responses-badge")).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-stat-cards-unavailable")).toHaveTextContent("We couldn't load your totals.");
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  test("the three summary cards and their empty card are gone, whatever the summary endpoint answers", async () => {
    signInAs(["planner"]);
    // Only drafts: this used to swap the three cards for a "No proposal activity yet" card.
    mockedSummary.mockResolvedValue({ success: true, message: "OK", data: toRfpSummary({ byStage: { draft: 2 } }) });
    await renderDashboard();
    expect(screen.queryByRole("region", { name: "Summary" })).not.toBeInTheDocument();
    for (const id of ["summary-active", "summary-responses", "summary-awarded", "summary-empty", "summary-empty-create"]) {
      expect(screen.queryByTestId(id)).not.toBeInTheDocument();
    }
    expect(statCards()).toBeInTheDocument();
    // The way to start a proposal is still the header's button.
    expect(screen.getByRole("link", { name: /New Proposal/ })).toHaveAttribute("href", "/proposals/add-new-proposal");
  });

  test("a brand-new account gets the ways to start instead of five zeros", async () => {
    signInAs(["planner"]);
    mockedList.mockResolvedValue({ success: true, message: "OK", data: listOf(0) });
    mockedSummary.mockResolvedValue({ success: true, message: "OK", data: toRfpSummary(null) });
    mockedOverview.mockResolvedValue({ success: true, message: "OK", data: { totalProposals: 0, totalEmailSent: 0, totalEmailClicked: 0, totalProposalViews: 0 } });
    await renderDashboard();
    expect(screen.getByTestId("first-run-dashboard")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create your first proposal" })).toBeInTheDocument();
    expect(statCards()).not.toBeInTheDocument();
  });

  test("a refused load (404 for another organization's data) renders a message instead of throwing", async () => {
    signInAs(["organization_admin"]);
    mockedList.mockResolvedValue({ success: false, message: "Not found", status: 404, code: "NOT_FOUND" });
    mockedSummary.mockResolvedValue({ success: false, message: "Not found", status: 404, code: "NOT_FOUND" });
    await renderDashboard({ team: TEAM });
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't find those proposals. They may have been moved or belong to another organization.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("a page past the end shows the last page instead", async () => {
    signInAs(["planner"]);
    mockedList.mockImplementation(async (query = {}) => ({
      success: true, message: "OK",
      data: query.page === "9" ? listOf(0, 30, 9) : listOf(2, 30, Number(query.page ?? 1)),
    }));
    const { unmount } = await renderDashboard({ page: "9", stage: "sent" });
    // 30 proposals, ten to a page: the list is asked for again at page 3, with the same filters.
    const pages = listQueries().filter((query) => query.page !== undefined);
    expect(pages.map((query) => query.page)).toEqual(["9", "3"]);
    expect(pages[1]).toEqual({ ...pages[0], page: "3" });
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Previous/ })).toHaveAttribute("href", "/dashboard?stage=sent&page=2");
    unmount();

    // A last page that is simply empty isn't asked for twice.
    mockedList.mockClear();
    mockedList.mockResolvedValue({ success: true, message: "OK", data: listOf(0, 30, 3) });
    await renderDashboard({ page: "3", stage: "sent" });
    expect(listQueries().filter((query) => query.page !== undefined)).toHaveLength(1);
    expect(screen.getByText("No proposals match these filters")).toBeInTheDocument();
  });

  test("a session whose token has no user id falls back to the session's id", async () => {
    signInAs(["planner"], null);
    await renderDashboard();
    expect(mainListQuery().owner).toBe("session-user");
  });

  test("My Proposals is never asked without knowing who is asking", async () => {
    jest.mocked(auth).mockResolvedValueOnce(null as never);
    signInAs(["planner"], null);
    await renderDashboard();
    expect(mockedList).not.toHaveBeenCalled();
    expect(mockedSummary).not.toHaveBeenCalled();
    expect(mockedOverview).not.toHaveBeenCalled();
    expect(statCards()).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Your session has ended.");
    expect(screen.queryByRole("link", { name: /New Proposal/ })).not.toBeInTheDocument();
  });

  test("a session whose roles can't be read gets the read-only dashboard", async () => {
    signInAs([]);
    await renderDashboard();
    expect(screen.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-role", "viewer");
    expect(screen.queryByRole("link", { name: /New Proposal/ })).not.toBeInTheDocument();
  });

  // ORG-602: the plan's proposal counter and the create button at the limit.
  test("free trial: the counter sits with the New Proposal button", async () => {
    signInAs(["planner"]);
    mockedUsage.mockResolvedValue({ used: 1, limit: 2, atLimit: false, planName: "Free trial", onPlan: "on the free trial" });
    await renderDashboard();

    expect(screen.getByRole("link", { name: /New Proposal/ })).toHaveAttribute("href", "/proposals/add-new-proposal");
    expect(screen.getByTestId("rfp-usage")).toHaveTextContent("1 of 2 proposals used on the free trial");
    expect(screen.queryByTestId("rfp-limit")).not.toBeInTheDocument();
  });

  test("at the limit: the button is off and says why, with a way to ask for an upgrade", async () => {
    signInAs(["owner"]);
    mockedUsage.mockResolvedValue({ used: 2, limit: 2, atLimit: true, planName: "Free trial", onPlan: "on the free trial" });
    await renderDashboard();

    expect(screen.queryByRole("link", { name: /New Proposal/ })).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: /New Proposal/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(/2 of 2 proposals used\. Your plan includes 2 proposals and your organization has used both\./);
    const limit = within(screen.getByTestId("rfp-limit"));
    expect(limit.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/support");
    expect(screen.getByTestId("rfp-limit")).not.toHaveTextContent(RFP_NOUN);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("no counter on a plan with no limit, and none asked for a Viewer", async () => {
    signInAs(["planner"]);
    await renderDashboard();
    expect(screen.getByRole("link", { name: /New Proposal/ })).toBeInTheDocument();
    expect(screen.queryByTestId("rfp-usage")).not.toBeInTheDocument();

    mockedUsage.mockClear();
    signInAs(["viewer"]);
    await renderDashboard();
    expect(mockedUsage).not.toHaveBeenCalled();
  });
});
