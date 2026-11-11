// ORG-405: a synthetic backend for the support access screen. It follows the backend's rules
// (docs/API.md "Support access grants", ORG-404): only an Owner or Admin may list, grant or
// revoke; every other role gets a plain 403; grants and RFPs belong to one organization and
// are a 404 from anywhere else; staff are "RFPilot Support", never a name. No database and no
// real people, companies or RFPs.
import crypto from "node:crypto";

const NORTHWIND = "0a0a0a0a0a0a0a0a0a0a0a0a";
const CONTOSO = "0b0b0b0b0b0b0b0b0b0b0b0b";
const ACCOUNTS = {
  "support-grants-owner@example.com": { userId: "c1c1c1c1c1c1c1c1c1c1c1c1", name: "Olivia Owner", roles: ["owner"], organizationId: NORTHWIND },
  "support-grants-admin@example.com": { userId: "c2c2c2c2c2c2c2c2c2c2c2c2", name: "Adam Admin", roles: ["organization_admin"], organizationId: NORTHWIND },
  "support-grants-manager@example.com": { userId: "c3c3c3c3c3c3c3c3c3c3c3c3", name: "Mina Manager", roles: ["team_manager"], organizationId: NORTHWIND },
  "support-grants-planner@example.com": { userId: "c4c4c4c4c4c4c4c4c4c4c4c4", name: "Paul Planner", roles: ["planner"], organizationId: NORTHWIND },
  "support-grants-viewer@example.com": { userId: "c5c5c5c5c5c5c5c5c5c5c5c5", name: "Vera Viewer", roles: ["viewer"], organizationId: NORTHWIND },
  // A second organization: nothing of Northwind's may appear for it.
  "support-grants-other-owner@example.com": { userId: "c6c6c6c6c6c6c6c6c6c6c6c6", name: "Casey Contoso", roles: ["owner"], organizationId: CONTOSO },
};
const BY_USER_ID = new Map(Object.values(ACCOUNTS).map((account) => [account.userId, account]));
const MANAGING_ROLES = ["owner", "organization_admin"];
const AGENT_ID = "5e5e5e5e5e5e5e5e5e00ab12";
const DAY = 24 * 60 * 60_000;
const HOUR = 60 * 60_000;

const RFPS = [
  { id: "d1d1d1d1d1d1d1d1d1d1d1d1", organizationId: NORTHWIND, eventName: "Spring Sales Kickoff 2027", ownerName: "Paul Planner" },
  { id: "d2d2d2d2d2d2d2d2d2d2d2d2", organizationId: NORTHWIND, eventName: "Autumn Partner Gala", ownerName: "Olivia Owner" },
  { id: "d3d3d3d3d3d3d3d3d3d3d3d3", organizationId: NORTHWIND, eventName: "Regional Leadership Summit with a deliberately long event name to check wrapping on small screens", ownerName: "Paul Planner" },
  { id: "d4d4d4d4d4d4d4d4d4d4d4d4", organizationId: CONTOSO, eventName: "Contoso Product Launch", ownerName: "Casey Contoso" },
];

const iso = (offset) => new Date(Date.now() + offset).toISOString();
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
// Shaped like the backend's access token. Unsigned: the stub is the only thing that reads it.
const accessToken = (account) => `${encode({ alg: "none", typ: "JWT" })}.${encode({ userId: account.userId, roles: account.roles })}.support-grants-e2e`;

const accountOf = (request) => {
  try {
    const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token.endsWith(".support-grants-e2e")) return null;
    const claims = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8"));
    return BY_USER_ID.get(claims.userId) ?? null;
  } catch {
    return null;
  }
};

let grants;
let events;
let failList;
let perPage;
const seedGrant = (fields) => ({
  id: crypto.randomBytes(12).toString("hex"), organizationId: NORTHWIND, proposalId: null, reason: null,
  grantedBy: ACCOUNTS["support-grants-owner@example.com"].userId, revokedAt: null, revokedBy: null, ...fields,
});
const reset = (empty = false) => {
  failList = false;
  perPage = 50;
  events = new Map();
  grants = [];
  if (empty) return;
  const active = seedGrant({ proposalId: RFPS[0].id, reason: "Support ticket 4821: vendor totals don't add up", createdAt: iso(-DAY), expiresAt: iso(6 * DAY + HOUR) });
  const revoked = seedGrant({
    proposalId: RFPS[1].id, grantedBy: ACCOUNTS["support-grants-admin@example.com"].userId, createdAt: iso(-9 * DAY), expiresAt: iso(-2 * DAY),
    revokedAt: iso(-5 * DAY), revokedBy: ACCOUNTS["support-grants-owner@example.com"].userId,
  });
  const expired = seedGrant({ createdAt: iso(-20 * DAY), expiresAt: iso(-13 * DAY) });
  grants = [active, revoked, expired];
  events.set(active.id, [
    { at: iso(-2 * HOUR), agentId: AGENT_ID, operation: "vendor_responses.list", proposalId: RFPS[0].id },
    { at: iso(-2 * HOUR - 60_000), agentId: AGENT_ID, operation: "rfp.read", proposalId: RFPS[0].id },
    { at: iso(-3 * HOUR), agentId: AGENT_ID, operation: "ticket.rfp.list", proposalId: null },
  ]);
  events.set(revoked.id, [
    { at: iso(-6 * DAY), agentId: AGENT_ID, operation: "rfp.read", proposalId: RFPS[1].id },
    { at: iso(-6 * DAY - HOUR), agentId: "5e5e5e5e5e5e5e5e5e00cd34", operation: "rfp.list", proposalId: null },
  ]);
};
reset();

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};
const refuse = (response, status, code, message) => json(response, status, { success: false, code, message });
// The body is read here first; the stub's own sign-in handler may need it again.
const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  request[Symbol.asyncIterator] = async function* again() {
    if (raw.length) yield raw;
  };
  try {
    return JSON.parse(raw.toString("utf8") || "{}");
  } catch {
    return {};
  }
};

const rfpOf = (organizationId, proposalId) => RFPS.find((rfp) => rfp.id === proposalId && rfp.organizationId === organizationId) ?? null;
const person = (userId) => (userId ? { id: userId, name: BY_USER_ID.get(userId)?.name ?? null } : null);
const statusOf = (grant) => (grant.revokedAt ? "revoked" : new Date(grant.expiresAt).getTime() <= Date.now() ? "expired" : "active");
const present = (grant) => {
  const used = events.get(grant.id) ?? [];
  return {
    id: grant.id,
    scope: grant.proposalId ? "rfp" : "organization",
    rfp: grant.proposalId ? { id: grant.proposalId, title: rfpOf(grant.organizationId, grant.proposalId)?.eventName ?? null } : null,
    reason: grant.reason,
    status: statusOf(grant),
    grantedBy: person(grant.grantedBy),
    createdAt: grant.createdAt,
    expiresAt: grant.expiresAt,
    revokedAt: grant.revokedAt,
    revokedBy: person(grant.revokedBy),
    activity: { useCount: used.length, lastUsedAt: used[0]?.at ?? null },
  };
};

export async function handleSupportGrants(request, response, url) {
  const path = url.pathname;

  if (path === "/__e2e/support-grants" && request.method === "POST") {
    const input = await readJson(request);
    if (input.reset) reset(input.empty === true);
    if (input.failList !== undefined) failList = input.failList === true;
    if (typeof input.perPage === "number") perPage = input.perPage;
    // The grant disappears from the organization, as another organization's grant would.
    if (input.vanish) grants = grants.filter((grant) => rfpOf(grant.organizationId, grant.proposalId)?.eventName !== input.vanish);
    json(response, 200, { grants: grants.map(present) });
    return true;
  }

  if (request.method === "POST" && path === "/api/auth/login") {
    const { email } = await readJson(request);
    const account = ACCOUNTS[String(email || "").toLowerCase()];
    if (!account) return false;
    const expiresAt = Date.now() + 60 * 60_000;
    json(response, 200, {
      user: { _id: account.userId, email: String(email).toLowerCase(), name: account.name, avatar: "" },
      accessToken: accessToken(account),
      tokenExpiresAt: expiresAt,
      refreshToken: `support-grants-e2e-refresh-${account.userId}`,
      refreshExpiresAt: expiresAt + 24 * 60 * 60_000,
      sessionId: crypto.randomUUID(),
    });
    return true;
  }

  // Everything below answers only the accounts above, so other specs keep the stub's defaults.
  const account = accountOf(request);
  if (!account) return false;
  const manages = account.roles.some((role) => MANAGING_ROLES.includes(role));
  const organizationId = account.organizationId;

  // The Security page (where the way in lives): the member's own 2FA, then the Owner/Admin block.
  if (request.method === "GET" && path === "/api/auth/2fa/status") {
    json(response, 200, { success: true, enabled: false, pendingEnrolment: false, recoveryCodesRemaining: 0, requiredByOrganization: false });
    return true;
  }
  if (request.method === "GET" && path === "/api/organization/security") {
    if (!manages) json(response, 403, { success: false, message: "Forbidden" });
    else json(response, 200, { success: true, security: { requireTwoFactor: false }, requireTwoFactor: false, activeMembers: 5, membersWithoutTwoFactor: 5 });
    return true;
  }
  if (request.method === "GET" && path === "/api/organization/domains") {
    if (!manages) json(response, 403, { success: false, message: "Forbidden" });
    else json(response, 200, { success: true, domains: [] });
    return true;
  }

  // The RFP picker (GET /api/v1/rfps, ORG-401): the organization's own RFPs only.
  if (request.method === "GET" && path === "/api/v1/rfps") {
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const items = RFPS.filter((rfp) => rfp.organizationId === organizationId && rfp.eventName.toLowerCase().includes(search))
      // Every field of the documented list item: the role dashboard (ORG-402) reads this list too.
      .map((rfp) => ({
        id: rfp.id, eventName: rfp.eventName, stage: "sent", status: "submitted", isDraft: false,
        ownerUserId: ACCOUNTS["support-grants-owner@example.com"].userId, ownerName: rfp.ownerName, teamId: null, teamName: null,
        eventStartDate: null, eventEndDate: null, venueCity: null, vendorsInvited: 0, vendorsResponded: 0,
        reviewStartedAt: null, awardedAt: null, createdAt: iso(-30 * DAY), updatedAt: iso(-DAY),
      }));
    json(response, 200, { success: true, data: { items, pagination: { total: items.length, page: 1, limit: 20, totalPages: 1 } } });
    return true;
  }

  if (!path.startsWith("/api/v1/organization/support-grants")) return false;
  // authorizeAction("organization:manage"): a plain 403 with no code for every other role.
  if (!manages) {
    json(response, 403, { success: false, message: "Forbidden" });
    return true;
  }
  const own = grants.filter((grant) => grant.organizationId === organizationId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rest = path.slice("/api/v1/organization/support-grants".length);

  if (rest === "" && request.method === "GET") {
    if (failList) {
      refuse(response, 500, "SUPPORT_ACCESS_INTERNAL_ERROR", "The support access request could not be completed.");
      return true;
    }
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
    json(response, 200, {
      success: true,
      data: {
        grants: own.slice((page - 1) * perPage, page * perPage).map(present),
        pagination: { page, perPage, total: own.length, totalPages: Math.max(1, Math.ceil(own.length / perPage)) },
      },
    });
    return true;
  }

  if (rest === "" && request.method === "POST") {
    const input = await readJson(request);
    let proposalId = null;
    if (input.proposalId) {
      const rfp = rfpOf(organizationId, String(input.proposalId));
      if (!rfp) {
        refuse(response, 404, "PROPOSAL_NOT_FOUND", "RFP not found.");
        return true;
      }
      proposalId = rfp.id;
    }
    const days = input.expiresInDays === undefined ? 7 : Number(input.expiresInDays);
    if (!Number.isInteger(days) || days < 1 || days > 30) {
      refuse(response, 400, "INVALID_GRANT_EXPIRY", "Support access lasts between 1 and 30 days.");
      return true;
    }
    const reason = typeof input.reason === "string" && input.reason.trim() ? input.reason.trim() : null;
    const grant = { id: crypto.randomBytes(12).toString("hex"), organizationId, proposalId, reason, grantedBy: account.userId, createdAt: iso(0), expiresAt: iso(days * DAY), revokedAt: null, revokedBy: null };
    grants.push(grant);
    json(response, 201, { success: true, data: present(grant) });
    return true;
  }

  const match = /^\/([^/]+)(\/revoke)?$/.exec(rest);
  if (!match) return false;
  const grant = own.find((item) => item.id === match[1]);
  if (!grant) {
    refuse(response, 404, "SUPPORT_GRANT_NOT_FOUND", "Support access grant not found.");
    return true;
  }
  if (!match[2] && request.method === "GET") {
    json(response, 200, {
      success: true,
      data: {
        ...present(grant),
        events: (events.get(grant.id) ?? []).map((event) => ({
          at: event.at,
          agent: { id: event.agentId, label: "RFPilot Support" },
          operation: event.operation,
          rfp: event.proposalId ? { id: event.proposalId, title: rfpOf(organizationId, event.proposalId)?.eventName ?? null } : null,
        })),
      },
    });
    return true;
  }
  if (match[2] && request.method === "POST") {
    if (statusOf(grant) === "expired") {
      refuse(response, 409, "SUPPORT_GRANT_EXPIRED", "This support access has already expired.");
      return true;
    }
    if (!grant.revokedAt) {
      grant.revokedAt = iso(0);
      grant.revokedBy = account.userId;
    }
    json(response, 200, { success: true, data: present(grant) });
    return true;
  }
  return false;
}
