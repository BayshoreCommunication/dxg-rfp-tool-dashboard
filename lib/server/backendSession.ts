import "server-only";

import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";

export async function getBackendSession() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const token = await getToken({
    req: { headers: { cookie: cookieHeader } },
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });
  return {
    accessToken: typeof token?.accessToken === "string" ? token.accessToken : null,
    refreshToken: typeof token?.refreshToken === "string" ? token.refreshToken : null,
    sessionId: typeof token?.sessionId === "string" ? token.sessionId : null,
  };
}

export async function getBackendAccessToken() {
  return (await getBackendSession()).accessToken;
}
