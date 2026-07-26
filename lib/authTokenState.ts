export const SESSION_EXPIRED_ERROR = "SessionExpired";
export const REFRESH_RETRY_ERROR = "RefreshAccessTokenError";

type AuthToken = Record<string, unknown>;

export function expireBackendSession(token: AuthToken): AuthToken {
  const expired = { ...token };

  delete expired.accessToken;
  delete expired.accessTokenExpiresAt;
  delete expired.refreshToken;
  delete expired.refreshTokenExpiresAt;
  delete expired.sessionId;

  expired.authError = SESSION_EXPIRED_ERROR;
  return expired;
}

export function hasExpiredBackendSession(
  value: Record<string, unknown> | null | undefined,
): boolean {
  return value?.authError === SESSION_EXPIRED_ERROR;
}
