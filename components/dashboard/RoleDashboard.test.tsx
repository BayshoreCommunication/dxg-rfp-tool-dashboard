import { render, screen, within } from "@testing-library/react";

jest.mock("@/auth", () => ({ auth: jest.fn(async () => ({ user: { _id: "session-user" } })) }));
jest.mock("@/lib/server/memberIdentity", () => ({ getMemberIdentity: jest.fn() }));
jest.mock("@/app/actions/rfpDashboard", () => ({
  listDashboardRfpsAction: jest.fn(),
  getDashboardRfpSummaryAction: jest.fn(),
}));
jest.mock("@/app/actions/organizationMembers", () => ({ listMembersAction: jest.fn() }));
jest.mock("@/app/actions/teams", () => ({ listTeamsAction: jest.fn() }));
jest.mock("./VerifyDomainPrompt", () => ({ __esModule: true, default: () => null }));
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { listMembersAction } from "@/app/actions/organizationMembers";
import { getDashboardRfpSummaryAction, listDashboardRfpsAction } from "@/app/actions/rfpDashboard";
import { listTeamsAction } from "@/app/actions/teams";
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

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockResolvedValue({ success: true, message: "OK", data: listOf(2) });
  mockedSummary.mockResolvedValue({ success: true, message: "OK", data: summaryData });
  mockedMembers.mockResolvedValue({ success: true, message: "OK", data: [] });
  mockedTeams.mockResolvedValue({ success: true, message: "OK", data: [] });
});

describe("RoleDashboard", () => {
  test("Planner: everything is asked for the planner's own RFPs, and the summary uses the list's filters", async () => {
    signInAs(["planner"]);
    await renderDashboard({ stage: "sent", search: "gala", owner: PRIYA, view: "organization" });

    expect(screen.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-role", "planner");
    expect(screen.getByTestId("role-dashboard")).toHaveAttribute("data-dashboard-view", "mine");
    const { page, limit, sortBy, sortOrder, ...listFilters } = mainListQuery();
    expect(listFilters).toEqual({ owner: ME, search: "gala", stage: "sent" });
    expect({ page, limit, sortBy, sortOrder }).toEqual({ page: "1", limit: "25", sortBy: "updatedAt", sortOrder: "desc" });
    // PRD P0-8: the counts come from the same scoped query as the list.
    expect(summaryQueries()).toContainEqual(listFilters);
    expect(summaryQueries()).toContainEqual({ owner: ME, search: "gala", stage: "draft,sent,receiving_responses,under_review,awarded,archived" });
    // Deadlines and new submissions are the planner's own too.
    expect(listQueries().every((query) => query.owner === ME)).toBe(true);
    expect(listQueries()).toContainEqual(expect.objectContaining({ stage: "receiving_responses", limit: "5" }));
    expect(listQueries()).toContainEqual(expect.objectContaining({ stage: "sent,receiving_responses,under_review", sortBy: "eventStartDate", sortOrder: "asc" }));
    expect(mockedMembers).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /New RFP/ })).toBeInTheDocument();
    expect(screen.getByTestId("admin-visibility-note")).toBeInTheDocument();
  });

  test("Team Manager: the Team tab asks for everything in scope and builds the planner filter from it", async () => {
    signInAs(["team_manager"]);
    await renderDashboard({ view: "team", owner: PRIYA });

    const { owner, page } = mainListQuery();
    expect({ owner, page }).toEqual({ owner: PRIYA, page: "1" });
    expect(summaryQueries()).toContainEqual({ owner: PRIYA });
    expect(mockedMembers).not.toHaveBeenCalled();
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
    expect([page, limit, sortBy, sortOrder]).toEqual(["1", "25", "updatedAt", "desc"]);
    expect(summaryQueries()).toContainEqual(listFilters);
    // No personal panels on the organization view: one list call only.
    expect(mockedList).toHaveBeenCalledTimes(1);
    // Viewers can't own RFPs and archived teams aren't offered.
    expect(within(screen.getByLabelText("Planner")).getAllByRole("option").map((option) => option.textContent)).toEqual(["All planners", "Priya Planner"]);
    expect(within(screen.getByLabelText("Team", { selector: "select" })).getAllByRole("option").map((option) => option.textContent)).toEqual(["All teams", "Corporate Events"]);
    expect(within(screen.getByRole("region", { name: "Summary" })).getByText("Responses received").nextElementSibling).toHaveTextContent("3");
  });

  test("Owner: My RFPs narrows to the Owner's own RFPs", async () => {
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
    expect([page, limit, sortBy, sortOrder]).toEqual(["1", "25", "updatedAt", "desc"]);
    // Only the status-tab counts are asked of the summary endpoint.
    expect(summaryQueries()).toEqual([{ stage: "draft,sent,receiving_responses,under_review,awarded,archived" }]);
    expect(screen.queryByRole("link", { name: /New RFP/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Summary" })).not.toBeInTheDocument();
    expect(mockedMembers).not.toHaveBeenCalled();
  });

  test("a refused load (404 for another organization's data) renders a message instead of throwing", async () => {
    signInAs(["organization_admin"]);
    mockedList.mockResolvedValue({ success: false, message: "Not found", status: 404, code: "NOT_FOUND" });
    mockedSummary.mockResolvedValue({ success: false, message: "Not found", status: 404, code: "NOT_FOUND" });
    await renderDashboard({ team: TEAM });
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't find those RFPs. They may have been moved or belong to another organization.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("a page past the end goes to the last page", async () => {
    signInAs(["planner"]);
    mockedList.mockResolvedValue({ success: true, message: "OK", data: listOf(0, 30, 9) });
    await expect(renderDashboard({ page: "9", stage: "sent" })).rejects.toThrow("REDIRECT:/dashboard?stage=sent&page=2");
  });

  test("a session whose token has no user id falls back to the session's id", async () => {
    signInAs(["planner"], null);
    await renderDashboard();
    expect(mainListQuery().owner).toBe("session-user");
  });
});
