// Local-only stand-in for the backend's dashboard endpoints (GET /api/v1/rfps and
// /api/v1/rfps/summary, ORG-401) and the member and team lists the Admin filters read.
// Synthetic data only. Like the real backend it scopes every answer to the signed-in member's
// role, and the summary is computed from the same filtered set as the list.

const id = (char) => char.repeat(24);

export const DASHBOARD_ACCOUNTS = {
  "owner-e2e@example.com": { userId: id("1"), name: "Olivia Owner", roles: ["owner"] },
  "admin-e2e@example.com": { userId: id("2"), name: "Adam Admin", roles: ["organization_admin"] },
  "manager-e2e@example.com": { userId: id("3"), name: "Maya Manager", roles: ["team_manager"] },
  "planner-e2e@example.com": { userId: id("4"), name: "Priya Planner", roles: ["planner"] },
  "viewer-e2e@example.com": { userId: id("5"), name: "Vera Viewer", roles: ["viewer"] },
};
const PETER = { userId: id("6"), name: "Peter Planner", roles: ["planner"] };
const FIONA = { userId: id("7"), name: "Fiona Field", roles: ["planner"] };
const MEMBERS = [...Object.entries(DASHBOARD_ACCOUNTS).map(([email, member]) => ({ email, ...member })),
  { email: "peter-e2e@example.com", ...PETER }, { email: "fiona-e2e@example.com", ...FIONA }];

const CORPORATE = { id: id("a"), name: "Corporate Events", managers: [id("3")], members: [id("3"), id("4"), id("6")] };
const FIELD = { id: id("b"), name: "Field Marketing", managers: [], members: [id("7")] };
const TEAMS = [CORPORATE, FIELD];
// A team id from "another organization": the stub refuses it the way the backend refuses
// anything outside the caller's organization.
const FOREIGN_TEAM = id("f");

const STAGES = ["draft", "sent", "receiving_responses", "under_review", "awarded", "archived"];
const ACTIVE = ["sent", "receiving_responses", "under_review"];

// Dates are relative to "now" so the deadlines panel always has upcoming rows.
const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const at = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString();

const rfp = (n, eventName, stage, owner, team, city, startOffset, invited, responded, extra = {}) => ({
  id: n.toString(16).padStart(24, "0"),
  eventName,
  stage,
  status: stage === "draft" ? "unsubmitted" : "submitted",
  isDraft: stage === "draft",
  ownerUserId: owner.userId,
  ownerName: owner.name,
  teamId: team?.id ?? null,
  teamName: team?.name ?? null,
  eventStartDate: startOffset === null ? null : day(startOffset),
  eventEndDate: startOffset === null ? null : day(startOffset + 2),
  venueCity: city,
  vendorsInvited: invited,
  vendorsResponded: responded,
  reviewStartedAt: stage === "under_review" || stage === "awarded" ? at(-3) : null,
  awardedAt: stage === "awarded" ? at(-1) : null,
  createdAt: at(-30 - n),
  updatedAt: at(-n),
  sharedWith: [],
  ...extra,
});

const A = DASHBOARD_ACCOUNTS;
const RFPS = [
  rfp(1, "Annual Sales Kickoff", "receiving_responses", A["planner-e2e@example.com"], CORPORATE, "Chicago", 45, 5, 3, { sharedWith: [id("5")] }),
  rfp(2, "Leadership Summit", "sent", A["planner-e2e@example.com"], CORPORATE, "Austin", 20, 4, 0),
  rfp(3, "Product Launch Evening", "draft", A["planner-e2e@example.com"], CORPORATE, null, null, 0, 0),
  rfp(4, "Customer Advisory Board", "under_review", A["planner-e2e@example.com"], CORPORATE, "New York", 70, 6, 6),
  rfp(5, "Holiday Town Hall", "awarded", A["planner-e2e@example.com"], CORPORATE, "Chicago", 30, 3, 3),
  rfp(6, "Partner Summit 2025", "archived", A["planner-e2e@example.com"], CORPORATE, "Denver", -200, 4, 2),
  rfp(7, "Engineering Offsite", "sent", PETER, CORPORATE, "Seattle", 12, 3, 0),
  rfp(8, "Investor Day", "receiving_responses", PETER, CORPORATE, "New York", 60, 4, 1),
  rfp(9, "Regional Roadshow", "draft", A["manager-e2e@example.com"], CORPORATE, "Chicago", 90, 0, 0),
  rfp(10, "Trade Show Booth AV", "receiving_responses", FIONA, FIELD, "Las Vegas", 25, 5, 2, { sharedWith: [id("5")] }),
  rfp(11, "Field Kickoff", "draft", FIONA, FIELD, "Dallas", 100, 0, 0),
  rfp(12, "Board Meeting AV", "awarded", A["owner-e2e@example.com"], null, "Chicago", 15, 2, 2),
  rfp(13, "All-Hands Broadcast", "sent", A["admin-e2e@example.com"], null, "Chicago", 8, 3, 0),
  // Enough organization-wide rows for a second page.
  ...Array.from({ length: 20 }, (_, index) =>
    rfp(20 + index, `Regional Meetup ${String(index + 1).padStart(2, "0")}`, index % 2 ? "sent" : "draft", FIONA, FIELD, index % 3 ? "Dallas" : "Houston", 120 + index, index % 2 ? 2 : 0, 0)),
];

export const dashboardAccessToken = (account) =>
  `e2e.${Buffer.from(JSON.stringify({ userId: account.userId, roles: account.roles })).toString("base64url")}.stub`;

const actorOf = (request) => {
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8"));
    if (typeof claims.userId === "string" && Array.isArray(claims.roles)) return claims;
  } catch {
    // Not one of this fixture's tokens.
  }
  return null;
};

const isAdmin = (actor) => actor.roles.includes("owner") || actor.roles.includes("organization_admin");

// rfpListScope: everything for Owners and Admins, managed teams' RFPs for Team Managers, own
// RFPs for Planners, plus anything shared with the member.
const visibleTo = (actor) => (row) => {
  if (isAdmin(actor)) return true;
  if (row.sharedWith.includes(actor.userId)) return true;
  if (actor.roles.includes("viewer")) return false;
  if (row.ownerUserId === actor.userId) return true;
  return actor.roles.includes("team_manager") && TEAMS.some((team) => team.id === row.teamId && team.managers.includes(actor.userId));
};

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const filtered = (actor, params) => {
  const stages = (params.get("stage") || "").split(",").map((stage) => stage.trim()).filter(Boolean);
  if (stages.some((stage) => !STAGES.includes(stage))) return { error: "Unknown stage" };
  const owner = params.get("owner");
  const team = params.get("team");
  if (owner && !OBJECT_ID.test(owner)) return { error: "owner must be a user id" };
  if (team && !OBJECT_ID.test(team)) return { error: "team must be a team id" };
  const eventFrom = params.get("eventFrom");
  const eventTo = params.get("eventTo");
  if ([eventFrom, eventTo].some((value) => value && !DATE.test(value))) return { error: "dates must be YYYY-MM-DD" };
  const city = (params.get("venueCity") || "").trim().toLowerCase();
  const search = (params.get("search") || "").trim().toLowerCase();
  const rows = RFPS.filter(visibleTo(actor)).filter((row) =>
    (stages.length ? stages.includes(row.stage) : row.stage !== "archived")
    && (!owner || row.ownerUserId === owner)
    && (!team || row.teamId === team)
    && (!(eventFrom || eventTo) || (row.eventStartDate && (!eventFrom || row.eventStartDate >= eventFrom) && (!eventTo || row.eventStartDate <= eventTo)))
    && (!city || (row.venueCity || "").toLowerCase() === city)
    && (!search || row.eventName.toLowerCase().includes(search)));
  return { rows };
};

const SORT_KEYS = { updatedAt: "updatedAt", createdAt: "createdAt", eventStartDate: "eventStartDate", eventName: "eventName" };

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};

const publicRow = (row) => {
  const copy = { ...row };
  delete copy.sharedWith;
  return copy;
};

export function handleRoleDashboard(request, response, url) {
  if (request.method !== "GET") return false;
  const pathname = url.pathname;
  const handled = ["/api/v1/rfps", "/api/v1/rfps/summary", "/api/organization/members", "/api/v1/teams"].includes(pathname);
  if (!handled) return false;
  const actor = actorOf(request);
  // The older specs sign in with an opaque token: a member with no RFPs.
  if (!actor) {
    if (pathname === "/api/v1/rfps") json(response, 200, { success: true, data: { items: [], pagination: { total: 0, page: 1, limit: 25, totalPages: 0 } } });
    else if (pathname === "/api/v1/rfps/summary") json(response, 200, { success: true, data: { total: 0, activeRfps: 0, responsesReceived: 0, awardedThisQuarter: 0, byStage: Object.fromEntries(STAGES.map((stage) => [stage, 0])), quarter: { label: "2026-Q4", start: at(-30), end: at(30), timeZone: "UTC" } } });
    else json(response, 403, { success: false, code: "FORBIDDEN", message: "Not allowed" });
    return true;
  }

  if (pathname === "/api/organization/members") {
    if (!isAdmin(actor)) {
      json(response, 403, { success: false, code: "FORBIDDEN", message: "Not allowed" });
      return true;
    }
    json(response, 200, {
      success: true,
      data: {
        members: MEMBERS.map((member, index) => ({
          userId: member.userId, membershipId: `m${index}`, name: member.name, email: member.email,
          role: member.roles[0], roles: member.roles, status: "active", version: 1, lastSignedInAt: null, joinedAt: null,
          teams: TEAMS.filter((team) => team.members.includes(member.userId)).map((team) => ({ id: team.id, name: team.name })),
        })),
      },
    });
    return true;
  }

  if (pathname === "/api/v1/teams") {
    json(response, 200, {
      success: true,
      data: TEAMS.map((team) => isAdmin(actor)
        ? { id: team.id, name: team.name, archived: false, members: team.members.map((userId) => ({ userId, isManager: team.managers.includes(userId) })) }
        : { id: team.id, name: team.name }),
    });
    return true;
  }

  if (url.searchParams.get("team") === FOREIGN_TEAM) {
    json(response, 404, { success: false, code: "NOT_FOUND", message: "Not found" });
    return true;
  }
  const result = filtered(actor, url.searchParams);
  if (result.error) {
    json(response, 400, { success: false, code: "DASHBOARD_FILTER_INVALID", message: result.error });
    return true;
  }
  const rows = result.rows;

  if (pathname === "/api/v1/rfps/summary") {
    const byStage = Object.fromEntries(STAGES.map((stage) => [stage, rows.filter((row) => row.stage === stage).length]));
    json(response, 200, {
      success: true,
      data: {
        total: rows.length,
        activeRfps: rows.filter((row) => ACTIVE.includes(row.stage)).length,
        responsesReceived: rows.reduce((sum, row) => sum + row.vendorsResponded, 0),
        awardedThisQuarter: rows.filter((row) => row.stage === "awarded").length,
        byStage,
        quarter: { label: "2026-Q4", start: at(-40), end: at(50), timeZone: "UTC" },
      },
    });
    return true;
  }

  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "25", 10) || 25));
  const key = SORT_KEYS[url.searchParams.get("sortBy") || "updatedAt"] || "updatedAt";
  const direction = url.searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const sorted = [...rows].sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? "")) * direction);
  json(response, 200, {
    success: true,
    data: {
      items: sorted.slice((page - 1) * limit, page * limit).map(publicRow),
      pagination: { total: rows.length, page, limit, totalPages: Math.ceil(rows.length / limit) },
    },
  });
  return true;
}
