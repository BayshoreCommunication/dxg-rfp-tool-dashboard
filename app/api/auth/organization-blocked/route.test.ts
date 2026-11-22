/** @jest-environment node */

jest.mock("server-only", () => ({}));
const mockSignOut = jest.fn(async () => undefined);
jest.mock("@/auth", () => ({ signOut: (...args: unknown[]) => mockSignOut(...(args as [])) }));
const mockGetBackendSession = jest.fn();
jest.mock("@/lib/server/backendSession", () => ({
  getBackendSession: () => mockGetBackendSession(),
}));

import { GET, POST } from "./route";

const URL_ = "http://localhost:3000/api/auth/organization-blocked";

const live = {
  accessToken: "access-token",
  accessTokenExpiresAt: Date.now() + 60_000,
  refreshToken: "refresh-token",
  refreshTokenExpiresAt: Date.now() + 120_000,
  sessionId: "session-1",
  expired: false,
  retryableError: false,
};
const ended = {
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshToken: null,
  refreshTokenExpiresAt: null,
  sessionId: null,
  expired: true,
  retryableError: false,
};

const backend = jest.fn();
const realFetch = globalThis.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = backend as unknown as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
});

const call = (method: "GET" | "POST", headers: Record<string, string> = {}) =>
  (method === "GET" ? GET : POST)(new Request(URL_, { method, headers }));

const expectExit = (method: "GET" | "POST", response: Response) => {
  if (method === "GET") {
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/sign-in?error=ORGANIZATION_BLOCKED");
  } else {
    expect(response.status).toBe(200);
    expect(response.headers.get("x-action-redirect")).toBe(
      "/sign-in?error=ORGANIZATION_BLOCKED;replace",
    );
  }
};

describe.each(["GET", "POST"] as const)("organization-blocked exit (%s)", (method) => {
  it("signs out a session the block ended, without asking the backend", async () => {
    mockGetBackendSession.mockResolvedValue({ ...ended, organizationBlocked: true });
    expectExit(method, await call(method));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(backend).not.toHaveBeenCalled();
  });

  it("does not sign out a live session of an organization that is not blocked", async () => {
    mockGetBackendSession.mockResolvedValue(live);
    backend.mockResolvedValue(Response.json({ success: true, data: { unreadCount: 0 } }));
    expectExit(method, await call(method));
    expect(mockSignOut).not.toHaveBeenCalled();
    // The question is asked with the member's own token, of the backend only.
    expect(backend).toHaveBeenCalledTimes(1);
    const [url, init] = backend.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/notifications\/unread-count$/);
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer access-token");
  });

  it.each([
    ["another 401", Response.json({ code: "MEMBERSHIP_INACTIVE" }, { status: 401 })],
    ["a 403", Response.json({ message: "Active organization membership required" }, { status: 403 })],
    ["a 500", new Response("oops", { status: 500 })],
  ])("does not sign out a live session when the backend answers %s", async (_name, answer) => {
    mockGetBackendSession.mockResolvedValue(live);
    backend.mockResolvedValue(answer);
    expectExit(method, await call(method));
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("does not sign out a live session when the backend cannot be reached", async () => {
    mockGetBackendSession.mockResolvedValue(live);
    backend.mockRejectedValue(new Error("network"));
    expectExit(method, await call(method));
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("does not sign out an ordinary expired session, and asks nothing", async () => {
    mockGetBackendSession.mockResolvedValue({ ...ended, organizationBlocked: false });
    expectExit(method, await call(method));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(backend).not.toHaveBeenCalled();
  });

  it("does nothing for a visitor with no session", async () => {
    mockGetBackendSession.mockResolvedValue({ ...ended, expired: false });
    expectExit(method, await call(method));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(backend).not.toHaveBeenCalled();
  });

  it("signs out a live session when the backend says the organization is blocked", async () => {
    mockGetBackendSession.mockResolvedValue(live);
    backend.mockResolvedValue(
      Response.json({ code: "ORGANIZATION_BLOCKED", message: "paused" }, { status: 401 }),
    );
    expectExit(method, await call(method));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a Next.js link prefetch", { "next-router-prefetch": "1" }],
    ["a Next.js segment prefetch", { "next-router-segment-prefetch": "/_tree" }],
    ["a browser prefetch", { "sec-purpose": "prefetch" }],
  ])("never signs out for %s: nobody would see the message", async (_name, headers) => {
    mockGetBackendSession.mockResolvedValue({ ...ended, organizationBlocked: true });
    expectExit(method, await call(method, headers));
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockGetBackendSession).not.toHaveBeenCalled();
  });
});
