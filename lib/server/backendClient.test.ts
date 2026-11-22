/** @jest-environment node */

jest.mock("server-only", () => ({}));
jest.mock("@/auth", () => ({ unstable_update: jest.fn() }));
jest.mock("@/lib/server/backendSession", () => ({
  getBackendSession: jest.fn(),
}));

import {
  createAuthenticatedBackendClient,
  createSessionRefreshSingleFlight,
} from "./backendClient";
import type { BackendSession } from "./backendSession";

const session = (
  accessToken: string | null,
  refreshToken: string | null = "refresh-token",
  accessTokenExpiresAt: number | null = accessToken
    ? Date.now() + 60_000
    : null,
): BackendSession => ({
  accessToken,
  accessTokenExpiresAt,
  refreshToken,
  refreshTokenExpiresAt: refreshToken ? 10_000 : null,
  sessionId: "session-1",
  expired: false,
  retryableError: false,
});

describe("authenticated backend client", () => {
  it("coalesces the complete Auth.js refresh persistence operation", async () => {
    let release: ((value: BackendSession) => void) | undefined;
    const operation = jest.fn(
      () =>
        new Promise<BackendSession>((resolve) => {
          release = resolve;
        }),
    );
    const singleFlight = createSessionRefreshSingleFlight();

    const first = singleFlight("session-1", operation);
    const second = singleFlight("session-1", operation);

    expect(operation).toHaveBeenCalledTimes(1);
    const refreshed = session("access-new");
    release?.(refreshed);
    await expect(Promise.all([first, second])).resolves.toEqual([
      refreshed,
      refreshed,
    ]);

    await singleFlight("session-1", async () => session("access-next"));
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("refreshes an expired access token before the protected request", async () => {
    const sessions = [
      session("access-old", "refresh-token", Date.now() - 1),
      session("access-new"),
    ];
    const readSession = jest.fn(async () => sessions.shift() ?? session("access-new"));
    const forceRefresh = jest.fn(async () => session("access-new"));
    const fetcher = jest.fn(async () =>
      Response.json({ ok: true }),
    ) as unknown as typeof fetch;
    const client = createAuthenticatedBackendClient({
      readSession,
      forceRefresh,
      fetcher,
    });

    const response = await client("https://backend.test/api/protected");

    expect(response.status).toBe(200);
    expect(forceRefresh).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(
      new Headers((fetcher as jest.Mock).mock.calls[0][1].headers).get(
        "authorization",
      ),
    ).toBe("Bearer access-new");
  });

  it("refreshes after one 401 and retries once with the new token", async () => {
    const readSession = jest.fn(async () => session("access-old"));
    const forceRefresh = jest.fn(async () => session("access-new"));
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(Response.json({}, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ ok: true })) as unknown as typeof fetch;
    const client = createAuthenticatedBackendClient({
      readSession,
      forceRefresh,
      fetcher,
    });

    const response = await client("https://backend.test/api/protected");

    expect(response.status).toBe(200);
    expect(forceRefresh).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const firstHeaders = new Headers(
      (fetcher as jest.Mock).mock.calls[0][1].headers,
    );
    const retryHeaders = new Headers(
      (fetcher as jest.Mock).mock.calls[1][1].headers,
    );
    expect(firstHeaders.get("authorization")).toBe("Bearer access-old");
    expect(retryHeaders.get("authorization")).toBe("Bearer access-new");
  });

  it("ends the session without a refresh or a retry on 401 ORGANIZATION_BLOCKED", async () => {
    const forceRefresh = jest.fn(async () => session("access-new"));
    const endOrganizationBlockedSession = jest.fn(async () => undefined);
    const fetcher = jest.fn(async () =>
      Response.json(
        { code: "ORGANIZATION_BLOCKED", message: "paused" },
        { status: 401 },
      ),
    ) as unknown as typeof fetch;
    const client = createAuthenticatedBackendClient({
      readSession: jest.fn(async () => session("access-old")),
      forceRefresh,
      fetcher,
      endOrganizationBlockedSession,
    });

    const response = await client("https://backend.test/api/protected");

    expect(response.status).toBe(401);
    // The caller can still read the backend's answer.
    await expect(response.json()).resolves.toMatchObject({
      code: "ORGANIZATION_BLOCKED",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(forceRefresh).not.toHaveBeenCalled();
    expect(endOrganizationBlockedSession).toHaveBeenCalledTimes(1);
  });

  it("leaves every other 401 on the refresh path", async () => {
    const endOrganizationBlockedSession = jest.fn(async () => undefined);
    const forceRefresh = jest.fn(async () => null);
    const client = createAuthenticatedBackendClient({
      readSession: jest.fn(async () => session("access-old")),
      forceRefresh,
      fetcher: jest.fn(async () =>
        Response.json({ code: "MEMBERSHIP_INACTIVE" }, { status: 401 }),
      ) as unknown as typeof fetch,
      endOrganizationBlockedSession,
    });

    const response = await client("https://backend.test/api/protected");

    expect(response.status).toBe(401);
    expect(forceRefresh).toHaveBeenCalledTimes(1);
    expect(endOrganizationBlockedSession).not.toHaveBeenCalled();
  });

  it("never retries a second 401", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(Response.json({}, { status: 401 })) as unknown as typeof fetch;
    const client = createAuthenticatedBackendClient({
      readSession: jest.fn(async () => session("access-old")),
      forceRefresh: jest.fn(async () => session("access-new")),
      fetcher,
    });

    const response = await client("https://backend.test/api/protected");

    expect(response.status).toBe(401);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("returns a local 401 when no backend credentials exist", async () => {
    const fetcher = jest.fn() as unknown as typeof fetch;
    const client = createAuthenticatedBackendClient({
      readSession: jest.fn(async () => session(null, null)),
      forceRefresh: jest.fn(async () => null),
      fetcher,
    });

    const response = await client("https://backend.test/api/protected");

    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
    });
  });
});
