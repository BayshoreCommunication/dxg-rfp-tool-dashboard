import "server-only";

import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import {
  hasExpiredBackendSession,
  hasRetryableBackendSessionError,
} from "@/lib/authTokenState";

export type BackendSession = {
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: number | null;
  sessionId: string | null;
  expired: boolean;
  retryableError: boolean;
};

export async function getBackendSession() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const token = await getToken({
    req: { headers: { cookie: cookieHeader } },
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });
  const expired = hasExpiredBackendSession(token);
  if (expired) {
    return {
      accessToken: null,
      accessTokenExpiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      sessionId: null,
      expired: true,
      retryableError: false,
    } satisfies BackendSession;
  }
  return {
    accessToken: typeof token?.accessToken === "string" ? token.accessToken : null,
    accessTokenExpiresAt:
      typeof token?.accessTokenExpiresAt === "number"
        ? token.accessTokenExpiresAt
        : null,
    refreshToken: typeof token?.refreshToken === "string" ? token.refreshToken : null,
    refreshTokenExpiresAt:
      typeof token?.refreshTokenExpiresAt === "number"
        ? token.refreshTokenExpiresAt
        : null,
    sessionId: typeof token?.sessionId === "string" ? token.sessionId : null,
    expired: false,
    retryableError: hasRetryableBackendSessionError(token),
  } satisfies BackendSession;
}

export async function getBackendAccessToken() {
  return (await getBackendSession()).accessToken;
}
