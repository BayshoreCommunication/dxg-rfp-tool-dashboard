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

// The new-organization setup wizard (/welcome). Off until a spec turns it on with
// POST /__e2e/welcome { on: true }: the organization then reads as part-way through onboarding
// (the invite step, or the step a spec names with { on: true, step: "details" | "plan" | "team" })
// and the invitations sent from there are kept for the spec to read back. Saving the details or
// choosing the plan moves the step on, as the backend does.
// The switch is module-global: one stub process serves every test, so it is only safe because the
// Playwright config runs with `workers: 1` and each spec turns it off again afterwards.
let welcome = false;
let welcomeStep = "team";
let welcomeInvitations = [];
const WELCOME_STEPS = ["details", "plan", "team"];
const welcomeProfile = () => ({
  success: true, name: "Northwind Events", type: "corporate", industry: null, country: "US", timeZone: "America/Chicago",
  eventsPerYear: null, plan: "free_trial", onboardingStep: welcomeStep, canManage: true,
});

const readBody = (request) =>
  new Promise((resolve) => {
    let raw = "";
    request.on("data", (chunk) => { raw += chunk; });
    request.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); }
    });
  });

function handleWelcome(request, response, url) {
  const pathname = url.pathname;
  if (pathname === "/__e2e/welcome") {
    if (request.method !== "POST") {
      json(response, 200, { on: welcome, step: welcomeStep, invitations: welcomeInvitations });
      return true;
    }
    void readBody(request).then((input) => {
      welcome = input.on === true;
      welcomeStep = WELCOME_STEPS.includes(input.step) ? input.step : "team";
      welcomeInvitations = [];
      json(response, 200, { on: welcome, step: welcomeStep });
    });
    return true;
  }
  if (!welcome) return false;
  const actor = actorOf(request);
  if (!actor || !isAdmin(actor)) return false;
  if (request.method === "GET" && pathname === "/api/organization/profile") {
    json(response, 200, welcomeProfile());
    return true;
  }
  if (request.method === "PUT" && pathname === "/api/organization/profile") {
    void readBody(request).then(() => {
      welcomeStep = "plan";
      json(response, 200, welcomeProfile());
    });
    return true;
  }
  if (request.method === "POST" && pathname === "/api/organization/onboarding/plan") {
    void readBody(request).then(() => {
      welcomeStep = "team";
      json(response, 200, welcomeProfile());
    });
    return true;
  }
  // The backend lets an Owner or Admin invite any invitable role, with or without a team
  // (invitationRules.ts inviteRefusal).
  if (request.method === "POST" && pathname === "/api/v1/organization/invitations") {
    void readBody(request).then((input) => {
      const invitation = { id: `welcome-invitation-${welcomeInvitations.length + 1}`, email: String(input.email || "").toLowerCase(), role: input.role, teamId: input.teamId ?? null, status: "pending" };
      welcomeInvitations.push(invitation);
      json(response, 201, { success: true, invitation });
    });
    return true;
  }
  return false;
}

export function handleUsersPage(request, response, url) {
  if (handleWelcome(request, response, url)) return true;
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
