// ORG-407: a synthetic organization audit log for browser checks. It follows the backend's rules
// (docs/API.md "Organization audit log"): only an Owner or Admin reads it, every other role is
// refused, the filters and the CSV export work on the same set, and RFPilot staff are shown as
// "RFPilot Support". Uses the role accounts of roleDashboardFixture.mjs. No database, no real people.
import { DASHBOARD_ACCOUNTS } from "./roleDashboardFixture.mjs";

const BASE = "/api/v1/organization/audit-events";
const READ_ROLES = ["owner", "organization_admin"];
const A = DASHBOARD_ACCOUNTS;
const OWNER = A["owner-e2e@example.com"];
const ADMIN = A["admin-e2e@example.com"];
const PLANNER = A["planner-e2e@example.com"];
const STAFF_ID = "e".repeat(24);

const CATEGORIES = [
  { key: "sign_in", label: "Sign-in", actions: [["auth.session.created", "Signed in"], ["auth.login.failed", "Sign-in failed"]] },
  { key: "two_factor", label: "Two-factor authentication", actions: [["auth.two_factor.enrolled", "Two-factor turned on"]] },
  { key: "invitations", label: "Invitations", actions: [["organization.invitation.sent", "Invitation sent"]] },
  { key: "members", label: "Members and roles", actions: [["organization.member.role_changed", "Role changed"], ["organization.member.deactivated", "Member deactivated"]] },
  { key: "sharing", label: "RFP sharing", actions: [["proposal.share_granted", "RFP shared"]] },
  { key: "support_access", label: "RFPilot Support access", actions: [["support_access.granted", "Support access granted"], ["support_access.used", "Support access used"], ["support_access.denied", "Support access refused"]] },
  { key: "settings", label: "Organization settings", actions: [["organization.settings.updated", "Organization settings changed"]] },
];
const LABELS = Object.fromEntries(CATEGORIES.flatMap((category) => category.actions.map(([value, label]) => [value, { label, category: category.key }])));
const STAFF_ACTIONS = ["support_access.used", "support_access.denied"];

const member = (account, email) => ({ kind: "member", id: account.userId, name: account.name, email });
const support = { kind: "support", id: STAFF_ID, name: "RFPilot Support" };
const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

// Built per request so "now" never drifts from the test's clock. Newest first.
const events = () => {
  let n = 0;
  const row = (minutes, action, actor, target, decision, reason, details = {}) => ({
    id: (++n).toString(16).padStart(24, "0"), occurredAt: minutesAgo(minutes), action, ...LABELS[action], decision, reason, actor, target, details,
  });
  const owner = member(OWNER, "owner-e2e@example.com");
  const admin = member(ADMIN, "admin-e2e@example.com");
  const planner = member(PLANNER, "planner-e2e@example.com");
  return [
    row(5, "support_access.used", support, { type: "proposal", id: "0".repeat(23) + "1", name: null }, "allowed", "rfp.read", { grantId: "9".repeat(24), operation: "rfp.read" }),
    row(9, "support_access.denied", support, { type: "organization", id: "c".repeat(24), name: null }, "denied", "no_active_grant", { operation: "rfp.list" }),
    row(20, "support_access.granted", admin, { type: "support_access_grant", id: "9".repeat(24), name: null }, "created", "customer_granted", { grantId: "9".repeat(24), scope: "rfp" }),
    row(45, "auth.login.failed", planner, { type: "user", id: PLANNER.userId, name: PLANNER.name }, "denied", "wrong_password", { method: "password" }),
    row(50, "auth.session.created", planner, { type: "refresh_session", id: "s-1", name: null }, "created", "authentication_succeeded"),
    row(90, "organization.member.role_changed", owner, { type: "organization_membership", id: PLANNER.userId, name: PLANNER.name }, "allowed", "role_changed", { previousRole: "viewer", role: "planner" }),
    row(120, "organization.settings.updated", owner, { type: "organization", id: "c".repeat(24), name: null }, "allowed", "two_factor_policy", { setting: "requireTwoFactor", from: false, to: true, signedOutMembers: 2 }),
    row(200, "organization.invitation.sent", admin, { type: "invitation", id: "7".repeat(24), name: null }, "created", "invited", { role: "team_manager" }),
    row(300, "proposal.share_granted", planner, { type: "proposal", id: "0".repeat(23) + "1", name: null }, "created", "shared", { role: "viewer" }),
    row(400, "auth.two_factor.enrolled", owner, { type: "user", id: OWNER.userId, name: OWNER.name }, "allowed", "enrolled"),
    // An event from two days ago, for the date filter.
    row(2 * 24 * 60 + 30, "organization.member.deactivated", owner, { type: "organization_membership", id: "8".repeat(24), name: null }, "allowed", "member_deactivated", { previousStatus: "active" }),
    // Enough older sign-ins for a second page.
    ...Array.from({ length: 55 }, (_, index) => row(3 * 24 * 60 + index * 7, "auth.session.created", index % 2 ? owner : admin, { type: "refresh_session", id: `s-${index}`, name: null }, "created", "authentication_succeeded")),
  ];
};

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};

const rolesOf = (request) => {
  try {
    const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const claims = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8"));
    return Array.isArray(claims.roles) ? claims.roles : [];
  } catch {
    return [];
  }
};

const OBJECT_ID = /^[0-9a-f]{24}$/i;

const filtered = (params) => {
  const actor = params.get("actor") || "";
  const action = params.get("action") || "";
  const category = params.get("category") || "";
  const from = params.get("from");
  const to = params.get("to");
  if (action && !LABELS[action]) return { error: "That action isn't part of the audit log." };
  if (category && !CATEGORIES.some((entry) => entry.key === category)) return { error: "That category isn't part of the audit log." };
  if (actor && actor !== "support" && !OBJECT_ID.test(actor)) return { error: "That user isn't valid." };
  if ([from, to].some((value) => value && Number.isNaN(Date.parse(value)))) return { error: "Dates must be dates." };
  const rows = events().filter((event) =>
    (!action || event.action === action)
    && (!category || event.category === category)
    && (!actor || (actor === "support" ? STAFF_ACTIONS.includes(event.action) : event.actor.kind === "member" && event.actor.id === actor))
    && (!from || event.occurredAt >= new Date(from).toISOString())
    && (!to || event.occurredAt < new Date(to).toISOString()));
  return { rows };
};

const cell = (value) => {
  const raw = value === null || value === undefined ? "" : String(value);
  return `"${(/^\s*[=+\-@]|^[\t\r]/.test(raw) ? `'${raw}` : raw).replace(/"/g, '""')}"`;
};
const HEADER = ["Time (UTC)", "Action", "Category", "Result", "Actor", "Actor email", "Actor type", "Target type", "Target", "Reason", "Details", "Event ID"];
const csvOf = (rows) => [HEADER, ...rows.map((event) => [
  event.occurredAt, event.label, CATEGORIES.find((entry) => entry.key === event.category)?.label ?? event.category, event.decision,
  event.actor.name, event.actor.email ?? "", event.actor.kind, event.target.type, event.target.name ?? event.target.id ?? "", event.reason ?? "",
  Object.entries(event.details).map(([key, value]) => `${key}: ${value}`).join("; "), event.id,
])].map((line) => line.map(cell).join(",")).join("\r\n") + "\r\n";

export function handleAuditLog(request, response, url) {
  const pathname = url.pathname;
  if (request.method !== "GET" || !pathname.startsWith(BASE)) return false;
  // Like the backend's route guard: anyone but an Owner or Admin gets a plain 403.
  if (!rolesOf(request).some((role) => READ_ROLES.includes(role))) {
    json(response, 403, { success: false, message: "Forbidden" });
    return true;
  }
  if (pathname === `${BASE}/filters`) {
    json(response, 200, {
      success: true,
      data: {
        categories: CATEGORIES.map((category) => ({ key: category.key, label: category.label, actions: category.actions.map(([value, label]) => ({ value, label })) })),
        supportActor: { value: "support", label: "RFPilot Support" },
      },
    });
    return true;
  }
  const result = filtered(url.searchParams);
  if (result.error) {
    json(response, 400, { success: false, code: "AUDIT_FILTER_INVALID", message: result.error });
    return true;
  }
  if (pathname === `${BASE}/export`) {
    response.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audit-log.csv"',
      "Cache-Control": "no-store",
      "X-Audit-Export-Rows": String(result.rows.length),
      "X-Audit-Export-Truncated": "false",
    });
    response.end(csvOf(result.rows));
    return true;
  }
  if (pathname !== BASE) return false;
  const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "50", 10) || 50));
  const start = Math.max(0, Number.parseInt(url.searchParams.get("cursor") || "0", 10) || 0);
  const page = result.rows.slice(start, start + limit);
  json(response, 200, { success: true, data: { events: page, nextCursor: start + limit < result.rows.length ? String(start + limit) : null } });
  return true;
}
