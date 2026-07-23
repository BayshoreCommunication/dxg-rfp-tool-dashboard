import {
  expireBackendSession,
  hasExpiredBackendSession,
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
});
