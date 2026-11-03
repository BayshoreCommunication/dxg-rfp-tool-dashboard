import { NextResponse, type NextRequest } from "next/server";

import { AUTH_API_ORIGIN } from "@/lib/authRefresh";
import {
  backendSsoStartUrl,
  createSsoBindValue,
  hashSsoBind,
  parseSsoStartRequest,
  SSO_BIND_COOKIE,
  SSO_BIND_MAX_AGE_SECONDS,
} from "@/lib/auth/sso";

/* D1: starts a Microsoft or company-SSO sign-in.

   GET /api/sso/start?kind=microsoft|company&email=…&invite=…

   Sets the httpOnly bind cookie and sends the browser to the backend's
   public /api/auth/sso/start with bind=sha256(cookie). The cookie value goes
   back to the backend only server-to-server, in /api/auth/sso/exchange, so a
   handoff started in someone else's browser can't finish in this one.

   AUTH_API_ORIGIN (lib/authRefresh.ts, from BACKEND_URL) is the backend's
   externally reachable origin; it is only read here, on the server. */

export const dynamic = "force-dynamic";

const backToStart = (request: NextRequest, code: string, invite: string | null) => {
  // Invite links stay on their own page so the invitation isn't lost.
  const path =
    invite && /^[A-Za-z0-9_-]{16,256}$/.test(invite)
      ? `/invite/${encodeURIComponent(invite)}`
      : "/sign-in";
  const url = new URL(path, request.nextUrl.origin);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url, 303);
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = parseSsoStartRequest(params);
  if (!parsed.ok) return backToStart(request, parsed.code, params.get("invite"));

  const bind = createSsoBindValue();
  const response = NextResponse.redirect(
    backendSsoStartUrl(AUTH_API_ORIGIN, parsed.request, await hashSsoBind(bind)),
    303,
  );
  response.cookies.set(SSO_BIND_COOKIE, bind, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SSO_BIND_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
