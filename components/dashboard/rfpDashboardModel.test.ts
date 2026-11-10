import {
  dashboardErrorMessage,
  dashboardHref,
  dashboardRoleOf,
  daysUntil,
  deadlineOf,
  dueLabel,
  earliestToday,
  upcomingDeadlines,
  filterQuery,
  filtersFor,
  formatDay,
  formatEventDates,
  listQuery,
  optionsFromItems,
  parseDashboardState,
  quarterLabel,
  rfpViewHref,
  scopeQuery,
  stageCountQuery,
  toRfpList,
  toRfpSummary,
  todayIn,
  viewsFor,
  canCreateRfps,
  type RfpListItem,
} from "./rfpDashboardModel";

const USER = "a".repeat(24);
const OTHER = "b".repeat(24);
const TEAM = "c".repeat(24);

describe("role dashboards: which views and filters a role gets", () => {
  test("the member's highest role picks the dashboard; an unreadable session gets the Planner one", () => {
    expect(dashboardRoleOf(["planner", "owner"])).toBe("owner");
    expect(dashboardRoleOf(["organization_admin"])).toBe("organization_admin");
    expect(dashboardRoleOf(["team_manager", "planner"])).toBe("team_manager");
    expect(dashboardRoleOf(["viewer"])).toBe("viewer");
    expect(dashboardRoleOf([])).toBe("planner");
    expect(dashboardRoleOf(null)).toBe("planner");
  });

  test("Planner: My RFPs only. Team Manager: adds Team. Admin and Owner: Organization first. Viewer: Shared with me only", () => {
    expect(viewsFor("planner")).toEqual(["mine"]);
    expect(viewsFor("team_manager")).toEqual(["mine", "team"]);
    expect(viewsFor("organization_admin")).toEqual(["organization", "mine"]);
    expect(viewsFor("owner")).toEqual(["organization", "mine"]);
    expect(viewsFor("viewer")).toEqual(["shared"]);
  });

  test("only Viewers can't create RFPs", () => {
    expect(canCreateRfps("viewer")).toBe(false);
    expect(["owner", "organization_admin", "team_manager", "planner"].every((role) => canCreateRfps(role as never))).toBe(true);
  });

  test("the organization view has every filter, the team view the planner and team filters", () => {
    expect(filtersFor("organization")).toEqual(["search", "owner", "team", "eventDates", "venueCity"]);
    expect(filtersFor("team")).toEqual(["search", "owner", "team"]);
    expect(filtersFor("mine")).toEqual(["search"]);
    expect(filtersFor("shared")).toEqual(["search"]);
  });
});

describe("role dashboards: reading the query string", () => {
  test("a view the role isn't offered falls back to its default", () => {
    expect(parseDashboardState({ view: "organization" }, "planner").view).toBe("mine");
    expect(parseDashboardState({ view: "team" }, "viewer").view).toBe("shared");
    expect(parseDashboardState({ view: "team" }, "team_manager").view).toBe("team");
    expect(parseDashboardState({}, "organization_admin").view).toBe("organization");
  });

  test("filters a view doesn't offer are dropped, so a Planner or Viewer can't send them", () => {
    const raw = { owner: OTHER, team: TEAM, eventFrom: "2026-01-01", eventTo: "2026-02-01", venueCity: "Chicago", search: "summit" };
    expect(parseDashboardState(raw, "planner")).toMatchObject({ owner: "", team: "", eventFrom: "", eventTo: "", venueCity: "", search: "summit" });
    expect(parseDashboardState(raw, "viewer")).toMatchObject({ owner: "", team: "", venueCity: "" });
    expect(parseDashboardState(raw, "organization_admin")).toMatchObject({ owner: OTHER, team: TEAM, eventFrom: "2026-01-01", eventTo: "2026-02-01", venueCity: "Chicago" });
    expect(parseDashboardState({ ...raw, view: "team" }, "team_manager")).toMatchObject({ owner: OTHER, team: TEAM, eventFrom: "", venueCity: "" });
  });

  test("malformed values never reach the backend", () => {
    const state = parseDashboardState(
      { stage: "won", owner: "not-an-id", team: "123", eventFrom: "tomorrow", eventTo: "2026-13-99x", sortBy: "secret", page: "-4" },
      "organization_admin",
    );
    expect(state).toMatchObject({ stage: null, owner: "", team: "", eventFrom: "", eventTo: "", sortBy: "updatedAt", page: 1 });
    expect(parseDashboardState({ stage: ["draft", "sent"], page: "3" }, "planner")).toMatchObject({ stage: "draft", page: 3 });
  });

  test("a date range entered backwards becomes the day it starts on", () => {
    expect(parseDashboardState({ eventFrom: "2026-05-10", eventTo: "2026-05-01" }, "owner")).toMatchObject({ eventFrom: "2026-05-10", eventTo: "2026-05-10" });
  });
});

describe("role dashboards: the list and its counts share one query", () => {
  const state = parseDashboardState({ stage: "sent", owner: OTHER, team: TEAM, venueCity: "Chicago", eventFrom: "2026-01-01", search: "gala", page: "2" }, "owner");

  test("My RFPs is the member's own RFPs, whatever owner the URL names", () => {
    const mine = parseDashboardState({ view: "mine", owner: OTHER }, "organization_admin");
    expect(scopeQuery(mine, USER)).toEqual({ owner: USER });
    expect(scopeQuery(parseDashboardState({}, "planner"), USER)).toEqual({ owner: USER });
  });

  test("the shared view sends no owner: the backend returns what was shared with the Viewer", () => {
    expect(scopeQuery(parseDashboardState({}, "viewer"), USER)).toEqual({});
  });

  test("the summary gets exactly the list's filters; the list adds only paging and sorting", () => {
    const filters = filterQuery(state, USER);
    expect(filters).toEqual({ owner: OTHER, team: TEAM, venueCity: "Chicago", eventFrom: "2026-01-01", search: "gala", stage: "sent" });
    const { page, limit, sortBy, sortOrder, ...rest } = listQuery(state, USER);
    expect(rest).toEqual(filters);
    expect({ page, limit, sortBy, sortOrder }).toEqual({ page: "2", limit: "25", sortBy: "updatedAt", sortOrder: "desc" });
  });

  test("status tab counts use the same scope across every stage", () => {
    expect(stageCountQuery(state, USER)).toEqual({
      owner: OTHER, team: TEAM, venueCity: "Chicago", eventFrom: "2026-01-01", search: "gala",
      stage: "draft,sent,receiving_responses,under_review,awarded,archived",
    });
  });

  test("event date and name sort ascending", () => {
    expect(listQuery(parseDashboardState({ sortBy: "eventStartDate" }, "planner"), USER).sortOrder).toBe("asc");
    expect(listQuery(parseDashboardState({ sortBy: "createdAt" }, "planner"), USER).sortOrder).toBe("desc");
  });
});

describe("role dashboards: links and labels", () => {
  test("links keep the filters and leave defaults out of the URL", () => {
    const state = parseDashboardState({ view: "team", stage: "draft", owner: OTHER, page: "3" }, "team_manager");
    expect(dashboardHref(parseDashboardState({}, "planner"), {}, "mine")).toBe("/dashboard");
    expect(dashboardHref(state, { page: 1 }, "mine")).toBe(`/dashboard?view=team&stage=draft&owner=${OTHER}`);
    expect(dashboardHref(state, { stage: null, page: 2 }, "mine")).toBe(`/dashboard?view=team&owner=${OTHER}&page=2`);
  });

  test("an RFP links to its read-only page", () => {
    expect(rfpViewHref({ id: USER, eventName: "Annual Sales Kickoff 2027!" })).toBe(`/proposal/annual-sales-kickoff-2027-${USER}`);
    expect(rfpViewHref({ id: USER, eventName: "—" })).toBe(`/proposal/rfp-${USER}`);
  });

  test("dates read as written", () => {
    expect(formatDay("2026-11-12")).toBe("Nov 12, 2026");
    expect(formatDay("2026-11-12T23:30:00.000Z")).toBe("Nov 12, 2026");
    expect(formatDay(null)).toBe("No date");
    expect(formatEventDates({ eventStartDate: "2026-03-01", eventEndDate: "2026-03-03" })).toBe("Mar 1, 2026 – Mar 3, 2026");
    expect(formatEventDates({ eventStartDate: "2026-03-01", eventEndDate: "2026-03-01" })).toBe("Mar 1, 2026");
    expect(formatEventDates({ eventStartDate: null, eventEndDate: null })).toBe("No date");
  });

  test("deadlines count whole days from today", () => {
    expect(daysUntil("2026-11-12", "2026-11-10")).toBe(2);
    expect(daysUntil("2026-03-01", "2026-02-27")).toBe(2);
    expect(daysUntil("bad", "2026-02-27")).toBeNull();
    expect([dueLabel(-1), dueLabel(0), dueLabel(1), dueLabel(9), dueLabel(null)]).toEqual(["Passed", "Today", "Tomorrow", "In 9 days", ""]);
  });

  test("the response due date wins over the event date once the backend sends it", () => {
    expect(deadlineOf({ responseDueDate: "2026-12-01", eventStartDate: "2027-01-10" })).toEqual({ kind: "response_due", label: "Responses due", day: "2026-12-01" });
    expect(deadlineOf({ eventStartDate: "2027-01-10" })).toEqual({ kind: "event_start", label: "Event starts", day: "2027-01-10" });
    expect(deadlineOf({ eventStartDate: null })).toBeNull();
  });

  test("today follows the organization's time zone and survives a bad one", () => {
    const instant = new Date("2026-11-10T03:00:00.000Z");
    expect(todayIn("America/Chicago", instant)).toBe("2026-11-09");
    expect(todayIn("Asia/Dhaka", instant)).toBe("2026-11-10");
    expect(todayIn("Not/AZone", instant)).toBe("2026-11-10");
    expect(todayIn(null, instant)).toBe("2026-11-10");
  });

  test("the deadlines panel takes the soonest dates from today on", () => {
    expect(earliestToday(new Date("2026-11-10T03:00:00.000Z"))).toBe("2026-11-09");
    const rows = [
      { id: "late", eventStartDate: "2027-03-01" },
      { id: "past", eventStartDate: "2026-11-09" },
      { id: "due", eventStartDate: "2027-06-01", responseDueDate: "2026-11-20" },
      { id: "today", eventStartDate: "2026-11-10" },
      { id: "undated", eventStartDate: null },
    ];
    expect(upcomingDeadlines(rows, "2026-11-10", 2).map((row) => row.id)).toEqual(["today", "due"]);
  });

  test("quarter label", () => {
    expect(quarterLabel({ label: "2026-Q4", start: "", end: "", timeZone: "UTC" })).toBe("Q4 2026");
    expect(quarterLabel(null)).toBe("this quarter");
  });

  test("refusals are plain sentences that never show a code, and say RFP", () => {
    const messages = [
      dashboardErrorMessage("DASHBOARD_FILTER_INVALID", 400),
      dashboardErrorMessage(undefined, 401),
      dashboardErrorMessage("FORBIDDEN", 403),
      dashboardErrorMessage("NOT_FOUND", 404),
      dashboardErrorMessage("NETWORK_ERROR", undefined),
      dashboardErrorMessage("DASHBOARD_INTERNAL_ERROR", 500),
    ];
    expect(new Set(messages).size).toBe(messages.length);
    for (const message of messages) {
      expect(message).not.toMatch(/[A-Z]{3,}_[A-Z]/);
      expect(message.toLowerCase()).not.toContain("proposal");
    }
    expect(dashboardErrorMessage("NOT_FOUND", 404)).toContain("another organization");
  });
});

describe("role dashboards: reading backend payloads", () => {
  test("a summary with missing fields reads as zeros", () => {
    expect(toRfpSummary(null)).toMatchObject({ total: 0, activeRfps: 0, responsesReceived: 0, awardedThisQuarter: 0, quarter: null });
    const summary = toRfpSummary({ total: 4, activeRfps: 2, responsesReceived: 7, awardedThisQuarter: 1, byStage: { draft: 1, sent: 2, awarded: 1 }, quarter: { label: "2026-Q4", start: "s", end: "e", timeZone: "America/Chicago" } });
    expect(summary.byStage).toEqual({ draft: 1, sent: 2, receiving_responses: 0, under_review: 0, awarded: 1, archived: 0 });
    expect(summary.quarter?.timeZone).toBe("America/Chicago");
  });

  test("list rows without an id are dropped and unknown stages read as draft", () => {
    const list = toRfpList({
      items: [{ id: USER, eventName: "", stage: "mystery", vendorsInvited: 3, vendorsResponded: "2" }, { eventName: "No id" }, "junk"],
      pagination: { total: 1, page: 1, limit: 25, totalPages: 1 },
    });
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({ id: USER, eventName: "Untitled RFP", stage: "draft", vendorsInvited: 3, vendorsResponded: 0, ownerName: null });
    expect(toRfpList({ items: [{ id: USER, eventName: "Untitled proposal" }, { id: OTHER, eventName: " Gala " }] }).items.map((item) => item.eventName)).toEqual(["Untitled RFP", "Gala"]);
    expect(toRfpList(undefined)).toEqual({ items: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } });
  });

  test("a Team Manager's planner and team choices come from the RFPs they can see", () => {
    const item = (overrides: Partial<RfpListItem>) => ({ ...toRfpList({ items: [{ id: USER }] }).items[0], ...overrides });
    const options = optionsFromItems([
      item({ ownerUserId: OTHER, ownerName: "Priya Planner", teamId: TEAM, teamName: "Corporate Events" }),
      item({ ownerUserId: OTHER, ownerName: "Priya Planner", teamId: TEAM, teamName: "Corporate Events" }),
      item({ ownerUserId: USER, ownerName: "Alex Manager", teamId: null }),
    ]);
    expect(options.owners).toEqual([{ id: USER, name: "Alex Manager" }, { id: OTHER, name: "Priya Planner" }]);
    expect(options.teams).toEqual([{ id: TEAM, name: "Corporate Events" }]);
  });
});
