import {
  expireBackendSession,
  hasExpiredBackendSession,
  hasOrganizationBlockedSession,
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

  it("keeps why the session ended when RFPilot paused the organization", () => {
    const blocked = expireBackendSession(
      { sub: "user-1", accessToken: "a", refreshToken: "r", sessionId: "s" },
      "ORGANIZATION_BLOCKED",
    );
    expect(blocked).toEqual({
      sub: "user-1",
      authError: SESSION_EXPIRED_ERROR,
      authEndReason: "ORGANIZATION_BLOCKED",
    });
    expect(hasExpiredBackendSession(blocked)).toBe(true);
    expect(hasOrganizationBlockedSession(blocked)).toBe(true);

    // Any other ending carries no reason, and drops a stale one.
    const expired = expireBackendSession({ ...blocked });
    expect(expired).toEqual({ sub: "user-1", authError: SESSION_EXPIRED_ERROR });
    expect(hasOrganizationBlockedSession(expired)).toBe(false);
    expect(
      hasOrganizationBlockedSession({ authEndReason: "ORGANIZATION_BLOCKED" }),
    ).toBe(false);
    expect(hasOrganizationBlockedSession(null)).toBe(false);
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
