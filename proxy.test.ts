/** @jest-environment node */

// The proxy's own branches, with Auth.js replaced by a pass-through: each test
// sets the session the request arrives with.
jest.mock("./auth", () => ({
  auth: (handler: (request: unknown, event: unknown) => unknown) => handler,
}));

import { NextRequest, type NextFetchEvent } from "next/server";
import { proxy } from "./proxy";

const ORIGIN = "http://localhost:3000";
const EXIT = "/api/auth/organization-blocked";

const user = { name: "Pat", email: "pat@acme.test" };
const blocked = { user, authError: "SessionExpired", authEndReason: "ORGANIZATION_BLOCKED" };
const expired = { user, authError: "SessionExpired" };
const live = { user };

const DOCUMENT = { "sec-fetch-mode": "navigate", "sec-fetch-dest": "document", accept: "text/html" };
const FETCH = { "sec-fetch-mode": "cors", "sec-fetch-dest": "empty", accept: "*/*" };
const RSC = { ...FETCH, rsc: "1" };

const run = async (
  path: string,
  session: Record<string, unknown> | null,
  init: { method?: string; headers?: Record<string, string> } = {},
) => {
  const request = new NextRequest(`${ORIGIN}${path}`, {
    method: init.method ?? "GET",
    headers: init.headers ?? DOCUMENT,
  });
  Object.assign(request, { auth: session });
  const response = (await proxy(request, {} as NextFetchEvent)) as Response;
  const location = response.headers.get("location");
  return {
    response,
    status: response.status,
    location: location ? location.replace(ORIGIN, "") : null,
    passedThrough: response.headers.get("x-middleware-next") === "1",
    // The proxy never writes a cookie itself: the exit route is the only place one is removed.
    setCookie: response.headers.get("set-cookie"),
  };
};

describe("proxy: a session ended because the organization is paused", () => {
  it("sends a page load to the exit that signs out and shows the message", async () => {
    const result = await run("/proposals", blocked);
    expect(result.status).toBe(303);
    expect(result.location).toBe(EXIT);
  });

  it("sends a posted form to the exit as a GET", async () => {
    const result = await run("/proposals", blocked, { method: "POST", headers: DOCUMENT });
    expect(result.status).toBe(303);
    expect(result.location).toBe(EXIT);
  });

  it("treats a page load without fetch metadata as a page load", async () => {
    const result = await run("/dashboard", blocked, { headers: { accept: "text/html,*/*" } });
    expect(result.status).toBe(303);
    expect(result.location).toBe(EXIT);
  });

  it("answers a server action with the redirect an action understands", async () => {
    const result = await run("/proposals", blocked, {
      method: "POST",
      headers: { ...FETCH, "next-action": "abc123" },
    });
    expect(result.status).toBe(200);
    expect(result.location).toBeNull();
    expect(result.response.headers.get("x-action-redirect")).toBe(`${EXIT};replace`);
  });

  it.each([
    ["a background GET", "/api/proposal-pdf", "GET", FETCH],
    ["a background POST", "/api/ai-assistant/events", "POST", FETCH],
    ["a fetch that sends no fetch metadata", "/api/support/attachments", "POST", { accept: "application/json" }],
    ["a router (RSC) request", "/proposals", "GET", RSC],
    ["a Next.js link prefetch", "/proposals", "GET", { ...RSC, "next-router-prefetch": "1" }],
    ["a Next.js segment prefetch", "/proposals", "GET", { ...RSC, "next-router-segment-prefetch": "/_tree" }],
    ["a browser prefetch of a page", "/proposals", "GET", { ...DOCUMENT, "sec-purpose": "prefetch" }],
    ["a browser prerender of a page", "/proposals", "GET", { ...DOCUMENT, "sec-purpose": "prefetch;prerender" }],
    ["a frame, not the tab itself", "/dashboard", "GET", { "sec-fetch-mode": "navigate", "sec-fetch-dest": "iframe" }],
  ])("refuses %s with 401 and leaves the cookie alone", async (_name, path, method, headers) => {
    const result = await run(path, blocked, { method, headers });
    expect(result.status).toBe(401);
    expect(result.location).toBeNull();
    expect(result.response.headers.get("x-action-redirect")).toBeNull();
    expect(result.setCookie).toBeNull();
    await expect(result.response.json()).resolves.toEqual({
      success: false,
      code: "ORGANIZATION_BLOCKED",
      message: "Your organization's access to RFPilot is paused. Contact RFPilot support for help.",
    });
  });

  it.each(["/sign-in", "/sign-up"])("keeps %s reachable", async (path) => {
    const result = await run(`${path}?error=ORGANIZATION_BLOCKED`, blocked);
    expect(result.passedThrough).toBe(true);
    expect(result.setCookie).toBeNull();
  });
});

describe("proxy: every other session is handled as before", () => {
  it("lets a live session through, whatever the request", async () => {
    expect((await run("/proposals", live)).passedThrough).toBe(true);
    expect((await run("/api/ai-assistant/events", live, { method: "POST", headers: FETCH })).passedThrough).toBe(true);
    expect((await run("/proposals", live, { headers: RSC })).passedThrough).toBe(true);
    expect(
      (await run("/proposals", live, { method: "POST", headers: { ...FETCH, "next-action": "abc123" } })).passedThrough,
    ).toBe(true);
  });

  it("sends a live session away from the sign-in page", async () => {
    const result = await run("/sign-in", live);
    expect(result.location).toBe("/dashboard");
  });

  it("sends an ordinary expired session to sign-in quietly, for a page and for a fetch", async () => {
    for (const init of [{}, { method: "POST", headers: FETCH }, { headers: RSC }]) {
      const result = await run("/proposals", expired, init);
      expect(result.status).toBe(307);
      expect(result.location).toBe("/sign-in?callbackUrl=%2Fproposals&reason=session-expired");
    }
  });

  it("sends a visitor with no session to sign-in", async () => {
    const result = await run("/proposals", null);
    expect(result.location).toBe("/sign-in?callbackUrl=%2Fproposals");
  });

  it("does not look at the session for public and Auth.js paths", async () => {
    for (const path of ["/api/auth/organization-blocked", "/api/auth/session", "/proposal-view/abc", "/invite/token"]) {
      expect((await run(path, blocked)).passedThrough).toBe(true);
    }
  });
});
