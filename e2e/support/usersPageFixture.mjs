// Local-only stand-in for what Settings > Users reads besides the member and team lists
// (roleDashboardFixture.mjs answers those): the signed-in member, pending invitations and access
// requests. Synthetic data only, for the role accounts in roleDashboardFixture.mjs. Like the real
// backend, Owners and Admins get the lists and everyone else is refused; Team Manager invitations
// are off, which is the organization default.

import { DASHBOARD_ACCOUNTS } from "./roleDashboardFixture.mjs";

const actorOf = (request) => {
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8"));
    if (typeof claims.userId === "string" && Array.isArray(claims.roles)) return claims;
  } catch {
    // Not one of the role accounts' tokens.
  }
  return null;
};

const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};

const isAdmin = (actor) => actor.roles.includes("owner") || actor.roles.includes("organization_admin");

export function handleUsersPage(request, response, url) {
  if (request.method !== "GET") return false;
  const pathname = url.pathname;
  const handled = [
    "/api/auth/me",
    "/api/v1/organization/invitations",
    "/api/v1/organization/access-requests",
    "/api/v1/organization/access-requests/settings",
  ].includes(pathname);
  if (!handled) return false;
  const actor = actorOf(request);
  // Other specs sign in with an opaque token; leave them to the stub's own answers.
  if (!actor) return false;

  if (pathname === "/api/auth/me") {
    const [email, account] = Object.entries(DASHBOARD_ACCOUNTS).find(([, entry]) => entry.userId === actor.userId) ?? [];
    json(response, 200, { success: true, user: { _id: actor.userId, name: account?.name ?? "Member", email: email ?? "", avatar: "" } });
    return true;
  }
  if (!isAdmin(actor)) {
    const code = pathname === "/api/v1/organization/invitations" && actor.roles.includes("team_manager") ? "MANAGER_INVITES_DISABLED" : "FORBIDDEN";
    json(response, 403, { success: false, code, message: "Not allowed" });
    return true;
  }
  if (pathname === "/api/v1/organization/invitations") json(response, 200, { success: true, invitations: [] });
  else if (pathname === "/api/v1/organization/access-requests") json(response, 200, { success: true, data: [] });
  else json(response, 200, { success: true, data: { autoApproveDomain: false, verifiedDomains: [] } });
  return true;
}
