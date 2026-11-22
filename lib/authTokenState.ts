import { ORGANIZATION_BLOCKED_CODE } from "@/lib/auth/organizationBlocked";

export const SESSION_EXPIRED_ERROR = "SessionExpired";
export const REFRESH_RETRY_ERROR = "RefreshAccessTokenError";
export const FORCE_BACKEND_REFRESH = "forceBackendRefresh";

// Why an expired session ended, when the sign-in page has something to say
// about it. Kept beside authError on the token and the session.
export type SessionEndReason = typeof ORGANIZATION_BLOCKED_CODE;

export type AuthToken = Record<string, unknown>;

export function expireBackendSession(
  token: AuthToken,
  reason?: SessionEndReason,
): AuthToken {
  const expired = { ...token };

  delete expired.accessToken;
  delete expired.accessTokenExpiresAt;
  delete expired.refreshToken;
  delete expired.refreshTokenExpiresAt;
  delete expired.sessionId;

  expired.authError = SESSION_EXPIRED_ERROR;
  if (reason) expired.authEndReason = reason;
  else delete expired.authEndReason;
  return expired;
}

// The session ended because RFPilot paused the member's organization.
export function hasOrganizationBlockedSession(
  value: Record<string, unknown> | null | undefined,
): boolean {
  return (
    value?.authError === SESSION_EXPIRED_ERROR &&
    value.authEndReason === ORGANIZATION_BLOCKED_CODE
  );
}

export function hasExpiredBackendSession(
  value: Record<string, unknown> | null | undefined,
): boolean {
  return value?.authError === SESSION_EXPIRED_ERROR;
}

export function hasRetryableBackendSessionError(
  value: Record<string, unknown> | null | undefined,
): boolean {
  return value?.authError === REFRESH_RETRY_ERROR;
}

export function readJwtExpiresAt(value: unknown): number | null {
  if (typeof value !== "string") return null;
  try {
    const payload = value.split(".")[1];
    if (!payload) return null;
    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decoded = JSON.parse(globalThis.atob(normalized)) as {
      exp?: unknown;
    };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}
