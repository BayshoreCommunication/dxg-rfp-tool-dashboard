/** @jest-environment node */

import {
  authBffHeaders,
  createBackendRefreshCommand,
  createBackendRefreshCoordinator,
  verifyBackendRefreshCommand,
} from "./authRefresh";
import {
  REFRESH_RETRY_ERROR,
  SESSION_EXPIRED_ERROR,
} from "./authTokenState";

const token = {
  sub: "user-1",
  accessToken: "access-old",
  accessTokenExpiresAt: 1,
  refreshToken: "refresh-old",
  refreshTokenExpiresAt: 10_000,
  sessionId: "session-1",
};

beforeAll(() => {
  process.env.BFF_SHARED_SECRET = "test-bff-shared-secret";
});

describe("backend refresh coordinator", () => {
  it("fails closed when the BFF shared secret is missing", () => {
    const sharedSecret = process.env.BFF_SHARED_SECRET;
    delete process.env.BFF_SHARED_SECRET;
    expect(authBffHeaders).toThrow("BFF_SHARED_SECRET");
    process.env.BFF_SHARED_SECRET = sharedSecret;
  });

  it("accepts only fresh, untampered server refresh commands", async () => {
    const command = await createBackendRefreshCommand("session-1");
    await expect(
      verifyBackendRefreshCommand(command, "session-1"),
    ).resolves.toBe(true);
    await expect(
      verifyBackendRefreshCommand(
        { ...command, sessionId: "session-2" },
        "session-1",
      ),
    ).resolves.toBe(false);
    await expect(
      verifyBackendRefreshCommand(
        {
          ...command,
          signature: `${command.signature.slice(0, -1)}${
            command.signature.endsWith("0") ? "1" : "0"
          }`,
        },
        "session-1",
      ),
    ).resolves.toBe(false);
  });

  it("rotates once for concurrent refreshes in the same session", async () => {
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetcher = jest.fn(async () => {
      calls += 1;
      await gate;
      return Response.json({
        accessToken: "access-new",
        tokenExpiresAt: 20_000,
        refreshToken: "refresh-new",
        refreshExpiresAt: 30_000,
        sessionId: "session-1",
      });
    }) as unknown as typeof fetch;
    const coordinator = createBackendRefreshCoordinator({
      fetcher,
      now: () => 100,
    });

    const first = coordinator.refresh(token);
    const second = coordinator.refresh(token);
    release();

    await expect(first).resolves.toMatchObject({
      accessToken: "access-new",
      refreshToken: "refresh-new",
    });
    await expect(second).resolves.toMatchObject({
      accessToken: "access-new",
      refreshToken: "refresh-new",
    });
    expect(calls).toBe(1);
    expect(coordinator.getLatest("session-1")).toMatchObject({
      accessToken: "access-new",
      refreshToken: "refresh-new",
    });
    await expect(coordinator.refresh(token)).resolves.toMatchObject({
      accessToken: "access-new",
      refreshToken: "refresh-new",
    });
    expect(calls).toBe(1);
  });

  it("marks rejected and expired refresh sessions as terminal", async () => {
    const rejected = createBackendRefreshCoordinator({
      fetcher: jest.fn(async () =>
        Response.json({}, { status: 401 }),
      ) as unknown as typeof fetch,
      now: () => 100,
    });
    await expect(rejected.refresh(token)).resolves.toMatchObject({
      authError: SESSION_EXPIRED_ERROR,
    });

    const expired = createBackendRefreshCoordinator({ now: () => 20_000 });
    await expect(expired.refresh(token)).resolves.toMatchObject({
      authError: SESSION_EXPIRED_ERROR,
    });
  });

  it("keeps refresh credentials after a transient backend failure", async () => {
    const coordinator = createBackendRefreshCoordinator({
      fetcher: jest.fn(async () =>
        Response.json({}, { status: 503 }),
      ) as unknown as typeof fetch,
      now: () => 100,
    });
    await expect(coordinator.refresh(token)).resolves.toMatchObject({
      refreshToken: "refresh-old",
      authError: REFRESH_RETRY_ERROR,
    });
  });
});
