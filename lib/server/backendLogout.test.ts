/** @jest-environment node */

jest.mock("server-only", () => ({}));
jest.mock("@/lib/server/backendSession", () => ({
  getBackendSession: jest.fn(),
}));

import { createBackendSessionRevoker } from "./backendLogout";
import type { BackendSession } from "./backendSession";

beforeAll(() => {
  process.env.BFF_SHARED_SECRET = "test-bff-shared-secret";
});

const session = (
  accessToken: string | null,
  refreshToken: string | null,
): BackendSession => ({
  accessToken,
  accessTokenExpiresAt: accessToken ? 1 : null,
  refreshToken,
  refreshTokenExpiresAt: refreshToken ? 10_000 : null,
  sessionId: refreshToken ? "session-1" : null,
  expired: false,
  retryableError: false,
});

describe("backend session logout", () => {
  it("revokes by refresh credential when the access token is unavailable", async () => {
    const fetcher = jest.fn(async () =>
      Response.json({ success: true }),
    ) as unknown as typeof fetch;
    const revoke = createBackendSessionRevoker({
      readSession: jest.fn(async () => session(null, "refresh-token")),
      fetcher,
    });

    await expect(revoke()).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect((fetcher as jest.Mock).mock.calls[0][0]).toContain(
      "/api/auth/logout-session",
    );
    const init = (fetcher as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      refreshToken: "refresh-token",
    });
  });

  it("falls back to the legacy access-token logout for old sessions", async () => {
    const fetcher = jest.fn(async () =>
      Response.json({ success: true }),
    ) as unknown as typeof fetch;
    const revoke = createBackendSessionRevoker({
      readSession: jest.fn(async () => session("access-token", null)),
      fetcher,
    });

    await expect(revoke()).resolves.toBe(true);
    const init = (fetcher as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer access-token",
    );
  });

  it("is idempotent when the local session has no backend credentials", async () => {
    const fetcher = jest.fn() as unknown as typeof fetch;
    const revoke = createBackendSessionRevoker({
      readSession: jest.fn(async () => session(null, null)),
      fetcher,
    });

    await expect(revoke()).resolves.toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
