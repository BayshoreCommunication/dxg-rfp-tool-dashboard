// RFPilot staff paused the member's organization (backend docs/API.md, "What a member of a
// blocked organization gets"). A spec switches the block on through /__e2e/organization-blocked;
// while it is on, the stub answers as the backend does:
//
//   sign-in after the identity is proven   403 { code, errorCode: "ORGANIZATION_BLOCKED" }
//   any request with an access token       401 { code: "ORGANIZATION_BLOCKED" }
//   POST /api/auth/refresh                 401 { code: "REFRESH_SESSION_EXPIRED",
//                                                reason: "organization_blocked" }
//
// The stub also counts the refused requests and the refresh calls, so a spec can show that the
// dashboard does not try a refresh after a refused request.

// The backend's own wording. The dashboard shows its own message for the code, not this text.
const BACKEND_MESSAGE = "Your organization's access to RFPilot is paused. Contact RFPilot support.";

const state = { signIn: false, requests: false, refusedRequests: 0, refreshCalls: 0 };

export const resetOrganizationBlocked = () => {
  Object.assign(state, { signIn: false, requests: false, refusedRequests: 0, refreshCalls: 0 });
};

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

export const handleOrganizationBlocked = async (request, response, url) => {
  const { pathname } = url;

  if (pathname === "/__e2e/organization-blocked") {
    if (request.method === "POST") {
      const body = await readJson(request);
      resetOrganizationBlocked();
      state.signIn = body.signIn === true;
      state.requests = body.requests === true;
    }
    json(response, 200, { ...state });
    return true;
  }

  if (state.signIn && request.method === "POST" && pathname === "/api/auth/login") {
    json(response, 403, {
      code: "ORGANIZATION_BLOCKED",
      errorCode: "ORGANIZATION_BLOCKED",
      message: BACKEND_MESSAGE,
    });
    return true;
  }

  if (!state.requests) return false;

  if (request.method === "POST" && pathname === "/api/auth/refresh") {
    state.refreshCalls += 1;
    json(response, 401, { code: "REFRESH_SESSION_EXPIRED", reason: "organization_blocked" });
    return true;
  }

  if (String(request.headers.authorization || "").startsWith("Bearer ")) {
    state.refusedRequests += 1;
    json(response, 401, { code: "ORGANIZATION_BLOCKED", message: BACKEND_MESSAGE });
    return true;
  }

  return false;
};
