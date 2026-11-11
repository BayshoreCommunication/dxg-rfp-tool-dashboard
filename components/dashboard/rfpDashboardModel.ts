// Pure rules for the role dashboards (ORG-402, PRD P0-8). The product calls these "proposals";
// the code and the API keep their older name. The backend decides what each member
// may read (GET /api/v1/rfps and /api/v1/rfps/summary go through rfpListScope); this module only
// picks which views and filters a role is offered and builds the query both endpoints share, so
// the counts always describe the list under them.

import type { CustomerRole } from "@/components/organization/members/types";

export const RFP_STAGES = ["draft", "sent", "receiving_responses", "under_review", "awarded", "archived"] as const;
export type RfpStage = (typeof RFP_STAGES)[number];

export const STAGE_LABELS: Record<RfpStage, string> = {
  draft: "Draft",
  sent: "Sent",
  receiving_responses: "Receiving responses",
  under_review: "Under review",
  awarded: "Awarded",
  archived: "Archived",
};

// Stages a proposal is still moving through (the backend's "active" set).
export const ACTIVE_STAGES: readonly RfpStage[] = ["sent", "receiving_responses", "under_review"];

export type RfpListItem = {
  id: string;
  eventName: string;
  stage: RfpStage;
  status: string | null;
  isDraft: boolean;
  ownerUserId: string | null;
  ownerName: string | null;
  teamId: string | null;
  teamName: string | null;
  eventStartDate: string | null;
  eventEndDate: string | null;
  venueCity: string | null;
  vendorsInvited: number;
  vendorsResponded: number;
  reviewStartedAt: string | null;
  awardedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  // Not sent by the backend yet (see "Needs from other lanes" in the ORG-402 PR). When it is,
  // the deadlines panel shows it instead of the event date.
  responseDueDate?: string | null;
};

export type RfpPagination = { total: number; page: number; limit: number; totalPages: number };
export type RfpList = { items: RfpListItem[]; pagination: RfpPagination };

export type RfpSummary = {
  total: number;
  activeRfps: number;
  responsesReceived: number;
  awardedThisQuarter: number;
  byStage: Record<RfpStage, number>;
  quarter: { label: string; start: string; end: string; timeZone: string } | null;
};

export type DashboardView = "mine" | "team" | "organization" | "shared";

export const VIEW_LABELS: Record<DashboardView, string> = {
  mine: "My Proposals",
  team: "Team",
  organization: "Organization",
  shared: "Shared with me",
};

const ROLE_ORDER: CustomerRole[] = ["owner", "organization_admin", "team_manager", "planner", "viewer"];

// The member's highest role. A session whose roles can't be read gets the Viewer dashboard: it
// offers nothing a member might not be allowed to do, and the backend scopes the list anyway.
export const dashboardRoleOf = (roles: readonly string[] | null | undefined): CustomerRole =>
  ROLE_ORDER.find((role) => roles?.includes(role)) ?? "viewer";

// First entry is the role's default view.
export const viewsFor = (role: CustomerRole): DashboardView[] => {
  if (role === "owner" || role === "organization_admin") return ["organization", "mine"];
  if (role === "team_manager") return ["mine", "team"];
  if (role === "viewer") return ["shared"];
  return ["mine"];
};

export const canCreateRfps = (role: CustomerRole): boolean => role !== "viewer";

export type DashboardFilterKey = "search" | "owner" | "team" | "eventDates" | "venueCity";

// Filters offered per view. Admins get all of them org-wide; a Team Manager's team view adds the
// planner (and team) filter; everyone can search by event name.
export const filtersFor = (view: DashboardView): DashboardFilterKey[] => {
  if (view === "organization") return ["search", "owner", "team", "eventDates", "venueCity"];
  if (view === "team") return ["search", "owner", "team"];
  return ["search"];
};

// The sorts GET /api/v1/rfps accepts (backend rfpDashboard/domain.ts SORT_FIELDS). A column is
// only offered as sortable when its field is in this list: the backend sorts the whole set, the
// dashboard never sorts one page of it.
export const SORT_FIELDS = ["updatedAt", "createdAt", "eventStartDate", "eventName"] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

// Dates and names read best ascending; activity newest first.
export const DEFAULT_SORT_ORDER: Record<SortField, SortOrder> = {
  updatedAt: "desc",
  createdAt: "desc",
  eventStartDate: "asc",
  eventName: "asc",
};

export const PAGE_SIZE = 10;

export type DashboardState = {
  view: DashboardView;
  // null is the default list: every stage except archived.
  stage: RfpStage | null;
  owner: string;
  team: string;
  eventFrom: string;
  eventTo: string;
  venueCity: string;
  search: string;
  sortBy: SortField;
  sortOrder: SortOrder;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const first = (value: string | string[] | undefined): string => {
  const picked = Array.isArray(value) ? value[0] : value;
  return typeof picked === "string" ? picked.trim() : "";
};

// Reads the page's query string for a role. Anything the role isn't offered, or that isn't
// well-formed, is dropped here instead of being sent on to the backend.
export const parseDashboardState = (params: RawParams, role: CustomerRole): DashboardState => {
  const views = viewsFor(role);
  const requestedView = first(params.view) as DashboardView;
  const view = views.includes(requestedView) ? requestedView : views[0];
  const offered = filtersFor(view);
  const stage = first(params.stage) as RfpStage;
  const requestedSort = first(params.sortBy) as SortField;
  const sortBy: SortField = SORT_FIELDS.includes(requestedSort) ? requestedSort : "updatedAt";
  const requestedOrder = first(params.sortOrder);
  const page = Number.parseInt(first(params.page), 10);
  const eventFrom = offered.includes("eventDates") && DATE.test(first(params.eventFrom)) ? first(params.eventFrom) : "";
  const eventTo = offered.includes("eventDates") && DATE.test(first(params.eventTo)) ? first(params.eventTo) : "";
  return {
    view,
    stage: RFP_STAGES.includes(stage) ? stage : null,
    owner: offered.includes("owner") && OBJECT_ID.test(first(params.owner)) ? first(params.owner) : "",
    team: offered.includes("team") && OBJECT_ID.test(first(params.team)) ? first(params.team) : "",
    eventFrom,
    // A range entered backwards is read as the single day it starts on.
    eventTo: eventFrom && eventTo && eventTo < eventFrom ? eventFrom : eventTo,
    venueCity: offered.includes("venueCity") ? first(params.venueCity).slice(0, 120) : "",
    search: first(params.search).slice(0, 120),
    sortBy,
    sortOrder: requestedOrder === "asc" || requestedOrder === "desc" ? requestedOrder : DEFAULT_SORT_ORDER[sortBy],
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
};

export const hasActiveFilters = (state: DashboardState): boolean =>
  Boolean(state.owner || state.team || state.eventFrom || state.eventTo || state.venueCity || state.search);

// The filter both endpoints receive (no stage, paging or sorting). "My Proposals" is the member's
// own proposals; the other views are everything the backend lets the member see.
export const scopeQuery = (state: DashboardState, userId: string | null): Record<string, string> => {
  const query: Record<string, string> = {};
  const owner = state.view === "mine" ? userId ?? "" : state.owner;
  if (owner) query.owner = owner;
  if (state.team) query.team = state.team;
  if (state.eventFrom) query.eventFrom = state.eventFrom;
  if (state.eventTo) query.eventTo = state.eventTo;
  if (state.venueCity) query.venueCity = state.venueCity;
  if (state.search) query.search = state.search;
  return query;
};

// The list on screen and the summary row above it: the scope plus the selected stage.
export const filterQuery = (state: DashboardState, userId: string | null): Record<string, string> => ({
  ...scopeQuery(state, userId),
  ...(state.stage ? { stage: state.stage } : {}),
});

export const listQuery = (state: DashboardState, userId: string | null): Record<string, string> => ({
  ...filterQuery(state, userId),
  page: String(state.page),
  limit: String(PAGE_SIZE),
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
});

// Per-stage counts for the status tabs: the same scope across every stage, archived included.
export const stageCountQuery = (state: DashboardState, userId: string | null): Record<string, string> => ({
  ...scopeQuery(state, userId),
  stage: RFP_STAGES.join(","),
});

// A link to the dashboard with some of the state changed. Default values stay out of the URL.
export const dashboardHref = (state: DashboardState, changes: Partial<DashboardState> = {}, defaultView?: DashboardView): string => {
  const next = { ...state, ...changes };
  const params = new URLSearchParams();
  if (next.view !== defaultView) params.set("view", next.view);
  if (next.stage) params.set("stage", next.stage);
  if (next.owner) params.set("owner", next.owner);
  if (next.team) params.set("team", next.team);
  if (next.eventFrom) params.set("eventFrom", next.eventFrom);
  if (next.eventTo) params.set("eventTo", next.eventTo);
  if (next.venueCity) params.set("venueCity", next.venueCity);
  if (next.search) params.set("search", next.search);
  if (next.sortBy !== "updatedAt") params.set("sortBy", next.sortBy);
  if (next.sortOrder !== DEFAULT_SORT_ORDER[next.sortBy]) params.set("sortOrder", next.sortOrder);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
};

// The state with every filter a member can set cleared. The status tab, the sort and the view
// stay; the page goes back to the first.
export const withoutFilters = (state: DashboardState): DashboardState => ({
  ...state, owner: "", team: "", eventFrom: "", eventTo: "", venueCity: "", search: "", page: 1,
});

// Where a column header leads: sorting by a new field starts in that field's usual direction,
// sorting by the current one flips it. Either way the list goes back to its first page.
export const sortHref = (state: DashboardState, field: SortField, defaultView?: DashboardView): string =>
  dashboardHref(
    state,
    {
      sortBy: field,
      sortOrder: state.sortBy === field ? (state.sortOrder === "asc" ? "desc" : "asc") : DEFAULT_SORT_ORDER[field],
      page: 1,
    },
    defaultView,
  );

export const sortDirectionOf = (state: DashboardState, field: SortField): SortOrder | null =>
  state.sortBy === field ? state.sortOrder : null;

const slugOf = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const rfpEditHref = (item: Pick<RfpListItem, "id">): string =>
  `/proposals/proposal-edit?proposalId=${encodeURIComponent(item.id)}`;

export type RowActions = { canEdit: boolean; canDuplicate: boolean; canArchive: boolean };

const NO_ROW_ACTIONS: RowActions = { canEdit: false, canDuplicate: false, canArchive: false };

// What a row offers the member. The backend decides for real (rfpAccessPolicy): this only keeps
// the dashboard from offering what it would refuse. Owners and Admins may change any proposal in
// the organization and every other creator role their own; a Viewer changes nothing. A Team
// Manager's rights over a team's proposals and an edit share aren't in the list response, so
// those rows stay read-only here (see the PR's follow-ups). An archived proposal is restored
// from the proposal list before anything else.
export const rowActionsFor = (
  item: Pick<RfpListItem, "stage" | "ownerUserId">,
  role: CustomerRole,
  userId: string | null,
): RowActions => {
  if (role === "viewer" || item.stage === "archived") return NO_ROW_ACTIONS;
  const organizationWide = role === "owner" || role === "organization_admin";
  const own = Boolean(userId) && item.ownerUserId === userId;
  if (!organizationWide && !own) return NO_ROW_ACTIONS;
  return { canEdit: true, canDuplicate: true, canArchive: true };
};

// Where a row's name leads: the edit page for a proposal the member may edit (the same place as
// Edit in the row menu), the read-only page for everything else.
export const rfpRowHref = (item: Pick<RfpListItem, "id" | "eventName">, actions: Pick<RowActions, "canEdit">): string =>
  actions.canEdit ? rfpEditHref(item) : rfpViewHref(item);

// A short, readable form of the proposal's id: the end of it, which is the part that differs
// between proposals created close together.
export const shortId = (id: string): string => id.slice(-6).toUpperCase();

// The line under each row's name: the event dates when the proposal has them, otherwise its
// short ID. Two rows on the page with the same name and the same line also get their ID, so
// same-named proposals can always be told apart.
export const rowIdentifiers = (items: Pick<RfpListItem, "id" | "eventName" | "eventStartDate" | "eventEndDate">[]): Map<string, string> => {
  const primary = (item: (typeof items)[number]) => (item.eventStartDate ? formatEventDates(item) : `ID ${shortId(item.id)}`);
  const seen = new Map<string, number>();
  const keyOf = (item: (typeof items)[number]) => `${item.eventName.trim().toLowerCase()}|${primary(item)}`;
  for (const item of items) seen.set(keyOf(item), (seen.get(keyOf(item)) ?? 0) + 1);
  return new Map(
    items.map((item) => [
      item.id,
      item.eventStartDate && (seen.get(keyOf(item)) ?? 0) > 1 ? `${primary(item)} · ID ${shortId(item.id)}` : primary(item),
    ]),
  );
};

// The read-only proposal page (same link the proposal list uses).
export const rfpViewHref = (item: Pick<RfpListItem, "id" | "eventName">): string =>
  `/proposal/${slugOf(item.eventName) || "rfp"}-${item.id}`;

export const rfpResponsesHref = (item: Pick<RfpListItem, "id">): string =>
  `/vendor-responses/proposals/${encodeURIComponent(item.id)}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-11-12" -> "Nov 12, 2026". Calendar dates are shown as written, never shifted by a zone.
export const formatDay = (value: string | null | undefined): string => {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!match) return "No date";
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${Number(match[3])}, ${match[1]}` : "No date";
};

// A moment (ISO timestamp) as a date in the organization's time zone.
export const formatInstant = (value: string | null | undefined, timeZone: string | null | undefined): string => {
  const instant = value ? new Date(value) : null;
  if (!instant || Number.isNaN(instant.getTime())) return "No date";
  return formatDay(todayIn(timeZone, instant));
};

export const formatEventDates = (item: Pick<RfpListItem, "eventStartDate" | "eventEndDate">): string => {
  if (!item.eventStartDate) return "No date";
  if (!item.eventEndDate || item.eventEndDate === item.eventStartDate) return formatDay(item.eventStartDate);
  return `${formatDay(item.eventStartDate)} – ${formatDay(item.eventEndDate)}`;
};

// Whole days from `today` (YYYY-MM-DD) to `day`; negative when the day has passed.
export const daysUntil = (day: string, today: string): number | null => {
  const parse = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  };
  const from = parse(today);
  const to = parse(day);
  return from === null || to === null ? null : Math.round((to - from) / 86_400_000);
};

export const dueLabel = (days: number | null): string => {
  if (days === null) return "";
  if (days < 0) return "Passed";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
};

export type Deadline = { kind: "response_due" | "event_start"; label: string; day: string };

// The next date that matters for a proposal: when vendor responses are due, or, until the dashboard
// API returns that, the day the event starts.
export const deadlineOf = (item: Pick<RfpListItem, "responseDueDate" | "eventStartDate">): Deadline | null => {
  if (item.responseDueDate) return { kind: "response_due", label: "Responses due", day: item.responseDueDate };
  if (item.eventStartDate) return { kind: "event_start", label: "Event starts", day: item.eventStartDate };
  return null;
};

// Today's calendar date in a time zone (the organization's, when the summary names it).
export const todayIn = (timeZone: string | null | undefined, now: Date = new Date()): string => {
  const format = (zone: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  try {
    return format(timeZone || "UTC");
  } catch {
    return format("UTC");
  }
};

// The earliest date that is still "today" in some time zone. The deadlines query starts here
// because the organization's zone is only known once the summary answers.
export const earliestToday = (now: Date = new Date()): string => todayIn("UTC", new Date(now.getTime() - 86_400_000));

// The next few dated proposals from `today` on, soonest first.
export const upcomingDeadlines = <T extends Pick<RfpListItem, "responseDueDate" | "eventStartDate">>(items: T[], today: string, size: number): T[] => {
  const day = (item: T) => deadlineOf(item)?.day ?? "";
  return items
    .filter((item) => day(item) >= today)
    .sort((a, b) => day(a).localeCompare(day(b)))
    .slice(0, size);
};

export const quarterLabel = (quarter: RfpSummary["quarter"]): string => {
  const match = quarter ? /^(\d{4})-Q([1-4])$/.exec(quarter.label) : null;
  return match ? `Q${match[2]} ${match[1]}` : "this quarter";
};

// Backend refusals as plain sentences; codes are never shown.
export const dashboardErrorMessage = (code: string | undefined, status: number | undefined): string => {
  if (code === "DASHBOARD_FILTER_INVALID" || status === 400) return "One of the filters isn't valid. Clear the filters and try again.";
  if (status === 401) return "Your session has ended. Reload the page and sign in again to see your proposals.";
  if (status === 403) return "Your role doesn't include viewing proposals. Ask an Owner or Admin of your organization for access.";
  if (status === 404) return "We couldn't find those proposals. They may have been moved or belong to another organization.";
  if (code === "NETWORK_ERROR") return "We couldn't reach RFPilot. Check your connection and try again.";
  return "We couldn't load your proposals. Try again in a moment.";
};

const emptyByStage = (): Record<RfpStage, number> =>
  Object.fromEntries(RFP_STAGES.map((stage) => [stage, 0])) as Record<RfpStage, number>;

const count = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);
const textOrNull = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value : null);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

// Backend payloads are read defensively: a missing field becomes an empty value, never a crash.
export const toRfpSummary = (value: unknown): RfpSummary => {
  const data = isRecord(value) ? value : {};
  const byStage = emptyByStage();
  if (isRecord(data.byStage)) for (const stage of RFP_STAGES) byStage[stage] = count(data.byStage[stage]);
  const quarter = isRecord(data.quarter) && typeof data.quarter.label === "string"
    ? {
        label: data.quarter.label,
        start: String(data.quarter.start ?? ""),
        end: String(data.quarter.end ?? ""),
        timeZone: typeof data.quarter.timeZone === "string" ? data.quarter.timeZone : "UTC",
      }
    : null;
  return {
    total: count(data.total),
    activeRfps: count(data.activeRfps),
    responsesReceived: count(data.responsesReceived),
    awardedThisQuarter: count(data.awardedThisQuarter),
    byStage,
    quarter,
  };
};

// A draft nobody has named yet.
const rfpName = (value: unknown): string => textOrNull(value)?.trim() || "Untitled proposal";

export const toRfpList = (value: unknown): RfpList => {
  const data = isRecord(value) ? value : {};
  const items = (Array.isArray(data.items) ? data.items : []).filter(isRecord).flatMap((item): RfpListItem[] => {
    const id = textOrNull(item.id);
    if (!id) return [];
    const stage = RFP_STAGES.includes(item.stage as RfpStage) ? (item.stage as RfpStage) : "draft";
    return [{
      id,
      eventName: rfpName(item.eventName),
      stage,
      status: textOrNull(item.status),
      isDraft: item.isDraft === true,
      ownerUserId: textOrNull(item.ownerUserId),
      ownerName: textOrNull(item.ownerName),
      teamId: textOrNull(item.teamId),
      teamName: textOrNull(item.teamName),
      eventStartDate: textOrNull(item.eventStartDate),
      eventEndDate: textOrNull(item.eventEndDate),
      venueCity: textOrNull(item.venueCity),
      vendorsInvited: count(item.vendorsInvited),
      vendorsResponded: count(item.vendorsResponded),
      reviewStartedAt: textOrNull(item.reviewStartedAt),
      awardedAt: textOrNull(item.awardedAt),
      createdAt: textOrNull(item.createdAt),
      updatedAt: textOrNull(item.updatedAt),
      responseDueDate: textOrNull(item.responseDueDate),
    }];
  });
  const pagination = isRecord(data.pagination) ? data.pagination : {};
  return {
    items,
    pagination: {
      total: count(pagination.total),
      page: count(pagination.page) || 1,
      limit: count(pagination.limit) || PAGE_SIZE,
      totalPages: count(pagination.totalPages),
    },
  };
};

export type FilterOption = { id: string; name: string };

// Planner and team choices for a member who can't read the member directory (a Team Manager):
// the owners and teams of the proposals they can see.
export const optionsFromItems = (items: RfpListItem[]): { owners: FilterOption[]; teams: FilterOption[] } => {
  const owners = new Map<string, string>();
  const teams = new Map<string, string>();
  for (const item of items) {
    if (item.ownerUserId && !owners.has(item.ownerUserId)) owners.set(item.ownerUserId, item.ownerName ?? "Unnamed member");
    if (item.teamId && !teams.has(item.teamId)) teams.set(item.teamId, item.teamName ?? "Unnamed team");
  }
  const sorted = (map: Map<string, string>) =>
    [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  return { owners: sorted(owners), teams: sorted(teams) };
};
