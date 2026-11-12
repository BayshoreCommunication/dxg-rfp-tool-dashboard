import { fireEvent, render, screen, within } from "@testing-library/react";

jest.mock("@/auth", () => ({ auth: jest.fn(async () => ({ user: { _id: "session-user" } })) }));
jest.mock("@/lib/server/memberIdentity", () => ({ getMemberIdentity: jest.fn() }));
jest.mock("@/app/actions/rfpDashboard", () => ({
  listDashboardRfpsAction: jest.fn(),
  getDashboardRfpSummaryAction: jest.fn(),
}));
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
import { getDashboardRfpSummaryAction, listDashboardRfpsAction } from "@/app/actions/rfpDashboard";
import { listTeamsAction } from "@/app/actions/teams";
import { loadRfpUsage } from "@/components/entitlements/planGate";
import { getMemberIdentity } from "@/lib/server/memberIdentity";
import RoleDashboard from "./RoleDashboard";
import { toRfpList, toRfpSummary } from "./rfpDashboardModel";

const ME = "a".repeat(24);
const PRIYA = "b".repeat(24);
const TEAM = "c".repeat(24);

const mockedIdentity = jest.mocked(getMemberIdentity);
const mockedList = jest.mocked(listDashboardRfpsAction);
const mockedSummary = jest.mocked(getDashboardRfpSummaryAction);
const mockedMembers = jest.mocked(listMembersAction);
const mockedTeams = jest.mocked(listTeamsAction);
const mockedUsage = jest.mocked(loadRfpUsage);

const listOf = (count: number, total = count, page = 1) =>
  toRfpList({
    items: Array.from({ length: count }, (_, index) => ({
      id: String(index + 1).padStart(24, "0"), eventName: `Event ${index + 1}`, stage: "sent",
      ownerUserId: PRIYA, ownerName: "Priya Planner", teamId: TEAM, teamName: "Corporate Events",
    })),
    pagination: { total, page, limit: 25, totalPages: Math.ceil(total / 25) },
  });

const summaryData = toRfpSummary({ total: 2, activeRfps: 2, responsesReceived: 3, awardedThisQuarter: 0, byStage: { sent: 2 }, quarter: { label: "2026-Q4", start: "", end: "", timeZone: "UTC" } });

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
  mockedMembers.mockResolvedValue({ success: true, message: "OK", data: [] });
  mockedTeams.mockResolvedValue({ success: true, message: "OK", data: [] });
  mockedUsage.mockResolvedValue(null);
});

describe("RoleDashboard", () => {
  test("Planner: everything is asked for the planner's own proposals, and the summary uses the list's filters", async () => {
    signInAs(["planner"]);
    await renderDashboard({ stage: "sent", search: "gala", owner: PRIYA, view: "organization" });

    expect(screen.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-role", "planner");
    expect(screen.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-view", "mine");
    const { page, limit, sortBy, sortOrder, ...listFilters } = mainListQuery();
    expect(listFilters).toEqual({ owner: ME, search: "gala", stage: "sent" });
    expect({ page, limit, sortBy, sortOrder }).toEqual({ page: "1", limit: "10", sortBy: "updatedAt", sortOrder: "desc" });
    // PRD P0-8: the counts come from the same scoped query as the list.
    expect(summaryQueries()).toContainEqual(listFilters);
    expect(summaryQueries()).toContainEqual({ owner: ME, search: "gala", stage: "draft,sent,receiving_responses,under_review,awarded,archived" });
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
    expect(summaryQueries()).toContainEqual({ owner: PRIYA });
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
    expect(summaryQueries()).toContainEqual(listFilters);
    // No personal panels on the organization view: one list call only.
    expect(mockedList).toHaveBeenCalledTimes(1);
    // Viewers can't own proposals and archived teams aren't offered.
    openFilters();
    expect(within(screen.getByLabelText("Planner")).getAllByRole("option").map((option) => option.textContent)).toEqual(["All planners", "Priya Planner"]);
    expect(within(screen.getByLabelText("Team", { selector: "select" })).getAllByRole("option").map((option) => option.textContent)).toEqual(["All teams", "Corporate Events"]);
    expect(within(screen.getByRole("region", { name: "Summary" })).getByTestId("summary-responses")).toHaveTextContent("3");
  });

  test("Owner: My Proposals narrows to the Owner's own proposals", async () => {
    signInAs(["owner"]);
    await renderDashboard({ view: "mine", owner: PRIYA });
    expect(mainListQuery().owner).toBe(ME);
  });

  test("Viewer: one scoped list, no summary row, no create button, and filters from the URL are ignored", async () => {
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
    expect(screen.queryByRole("region", { name: "Summary" })).not.toBeInTheDocument();
    expect(mockedMembers).not.toHaveBeenCalled();
  });

  test("the URL's filters, sort and page reach both loaders and nothing else does", async () => {
    signInAs(["owner"]);
    await renderDashboard({ search: " summit ", sortBy: "eventName", sortOrder: "desc", page: "3", stage: "draft", owner: "nope", bogus: "1" });
    const { page, limit, sortBy, sortOrder, ...listFilters } = mainListQuery();
    expect(listFilters).toEqual({ search: "summit", stage: "draft" });
    expect([page, limit, sortBy, sortOrder]).toEqual(["3", "10", "eventName", "desc"]);
    expect(summaryQueries()).toContainEqual(listFilters);
    expect(screen.getByRole("searchbox")).toHaveValue("summit");
  });

  test("row menus follow the role: an Owner gets one on every row, a Planner only on their own, a Viewer none", async () => {
    signInAs(["owner"]);
    const { unmount } = await renderDashboard();
    expect(screen.getAllByRole("button", { name: /^Actions for/ })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Event 1" })).toHaveAttribute("href", `/proposals/proposal-edit?proposalId=${"1".padStart(24, "0")}`);
    unmount();

    // Priya's proposals, seen by another planner through a share: read-only.
    signInAs(["planner"]);
    const second = await renderDashboard();
    expect(screen.queryByRole("button", { name: /^Actions for/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Event 1" })).toHaveAttribute("href", `/proposal/event-1-${"1".padStart(24, "0")}`);
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

  test("when every stat is zero one card replaces them, with a create button unless the plan is at its limit", async () => {
    signInAs(["planner"]);
    mockedSummary.mockResolvedValue({ success: true, message: "OK", data: toRfpSummary({ total: 2, byStage: { draft: 2 } }) });
    const { unmount } = await renderDashboard();
    const summary = screen.getByRole("region", { name: "Summary" });
    expect(within(summary).getByTestId("summary-empty")).toHaveTextContent("No proposal activity yet");
    expect(within(summary).queryByTestId("summary-active")).not.toBeInTheDocument();
    expect(within(summary).getByRole("link", { name: "New Proposal" })).toHaveAttribute("href", "/proposals/add-new-proposal");
    unmount();

    mockedUsage.mockResolvedValue({ used: 2, limit: 2, atLimit: true, planName: "Free trial", onPlan: "on the free trial" });
    await renderDashboard();
    expect(screen.getByTestId("summary-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-empty-create")).not.toBeInTheDocument();
  });

  test("a refused load (404 for another organization's data) renders a message instead of throwing", async () => {
    signInAs(["organization_admin"]);
    mockedList.mockResolvedValue({ success: false, message: "Not found", status: 404, code: "NOT_FOUND" });
    mockedSummary.mockResolvedValue({ success: false, message: "Not found", status: 404, code: "NOT_FOUND" });
    await renderDashboard({ team: TEAM });
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't find those proposals. They may have been moved or belong to another organization.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("a page past the end goes to the last page", async () => {
    signInAs(["planner"]);
    mockedList.mockResolvedValue({ success: true, message: "OK", data: listOf(0, 30, 9) });
    await expect(renderDashboard({ page: "9", stage: "sent" })).rejects.toThrow("REDIRECT:/dashboard?stage=sent&page=2");
    // The last page itself never redirects to itself.
    mockedList.mockResolvedValue({ success: true, message: "OK", data: listOf(0, 30, 2) });
    await renderDashboard({ page: "2", stage: "sent" });
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
    expect(screen.getByTestId("rfp-limit")).not.toHaveTextContent(/\bRFPs?\b/);
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
