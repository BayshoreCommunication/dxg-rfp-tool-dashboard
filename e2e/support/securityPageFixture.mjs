// Settings > Security for the role accounts of roleDashboardFixture.mjs, and the support button's
// unread count. It follows the backend's rules: any member reads their own two-factor status;
// only an Owner or Admin reads the organization's security settings, verified domains and single
// sign-on, and every other role gets a plain 403. No database, no real people.

const MANAGING_ROLES = ["owner", "organization_admin"];

// Tickets with a reply from RFPilot the member has not read: what the support button's badge
// counts. A spec seeds it with POST /__e2e/support-desk { unreadTickets } and sets it back to 0.
let unreadTickets = 0;

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};

const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
};

// Only the role accounts' tokens (dashboardAccessToken): other specs keep the stub's defaults.
const rolesOf = (request) => {
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token.startsWith("e2e.") || !token.endsWith(".stub")) return null;
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8"));
    return Array.isArray(claims.roles) ? claims.roles : null;
  } catch {
    return null;
  }
};

export async function handleSecurityPage(request, response, url) {
  const path = url.pathname;

  if (path === "/__e2e/support-desk" && request.method === "POST") {
    const input = await readJson(request);
    unreadTickets = typeof input.unreadTickets === "number" ? input.unreadTickets : 0;
    json(response, 200, { unreadTickets });
    return true;
  }

  if (request.method !== "GET") return false;
  const roles = rolesOf(request);
  if (!roles) return false;
  const manages = roles.some((role) => MANAGING_ROLES.includes(role));
  const forbidden = () => json(response, 403, { success: false, message: "Forbidden" });

  if (path === "/api/auth/2fa/status") {
    json(response, 200, { success: true, enabled: false, pendingEnrolment: false, recoveryCodesRemaining: 0, requiredByOrganization: false });
    return true;
  }
  if (path === "/api/organization/security") {
    if (!manages) forbidden();
    else json(response, 200, { success: true, security: { requireTwoFactor: false }, requireTwoFactor: false, activeMembers: 5, membersWithoutTwoFactor: 5 });
    return true;
  }
  if (path === "/api/organization/domains") {
    if (!manages) forbidden();
    else json(response, 200, { success: true, domains: [] });
    return true;
  }
  if (path === "/api/organization/sso") {
    if (!manages) forbidden();
    else json(response, 200, { success: true, connection: null, requireSso: false, redirectUri: "https://api.example.com/api/auth/sso/callback", verifiedDomains: [] });
    return true;
  }
  // The support button's unread count, once a spec seeds one.
  if (path === "/api/v1/support/tickets/unread-count" && unreadTickets > 0) {
    json(response, 200, { success: true, data: { unreadTickets } });
    return true;
  }
  return false;
}
