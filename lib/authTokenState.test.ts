import {
  expireBackendSession,
  hasExpiredBackendSession,
  readJwtExpiresAt,
  SESSION_EXPIRED_ERROR,
} from "./authTokenState";

describe("backend authentication token state", () => {
  it("removes all backend credentials when the refresh session expires", () => {
    const result = expireBackendSession({
      sub: "user-1",
      email: "planner@example.com",
      accessToken: "expired-access",
      accessTokenExpiresAt: 1,
      refreshToken: "expired-refresh",
      refreshTokenExpiresAt: 2,
      sessionId: "session-1",
    });

    expect(result).toEqual({
      sub: "user-1",
      email: "planner@example.com",
      authError: SESSION_EXPIRED_ERROR,
    });
    expect(hasExpiredBackendSession(result)).toBe(true);
  });

  it("does not classify a retryable refresh failure as an expired session", () => {
    expect(
      hasExpiredBackendSession({ authError: "RefreshAccessTokenError" }),
    ).toBe(false);
  });

  it("reads a legacy access token expiry without trusting any other claims", () => {
    const payload = Buffer.from(JSON.stringify({ exp: 1_800_000_000 }))
      .toString("base64url");
    expect(readJwtExpiresAt(`header.${payload}.signature`)).toBe(
      1_800_000_000_000,
    );
    expect(readJwtExpiresAt("not-a-jwt")).toBeNull();
  });
});
