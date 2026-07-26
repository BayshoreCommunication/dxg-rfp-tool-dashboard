import type {
  NextFetchEvent,
  NextMiddleware,
  NextRequest,
} from "next/server";
import type { NextAuthRequest } from "next-auth";
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { SESSION_EXPIRED_ERROR } from "./lib/authTokenState";

const excludedPrefixes = [
  "/_next/",
  "/favicon.ico",
  "/opengraph-image.jpg",
  "/opengraph-image.png",
  "/assets/",
  "/fonts/",
];

const fullyPublicPrefixes = [
  "/forgot-password",
  "/proposal-view",
  "/vendor-response",
  "/api/vendor-responses",
  // /api/metadata is deliberately NOT here. It server-side fetches a
  // caller-supplied URL, so leaving it unauthenticated made it an open SSRF
  // proxy reachable by anyone. The route enforces its own session check too.
  "/api/proposals",
];

const handleAuthenticatedRequest = (
  request: NextAuthRequest,
  _event: NextFetchEvent,
): ReturnType<NextMiddleware> => {
  void _event;
  const { pathname } = request.nextUrl;
  const sessionExpired =
    request.auth?.authError ===
    SESSION_EXPIRED_ERROR;
  const backendAccessExpired =
    request.auth?.backendAccessExpired === true;

  // --- OAUTH CALLBACK HANDLING ---
  if (pathname === "/auth/callback") {
    if (!request.auth?.user || sessionExpired) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // --- ROOT PATH REDIRECT ---
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(
        request.auth?.user && !sessionExpired ? "/dashboard" : "/sign-in",
        request.url,
      ),
    );
  }

  // --- AUTHENTICATED USER ON AUTH PAGES ---
  if (
    request.auth?.user &&
    !sessionExpired &&
    (pathname === "/sign-in" || pathname === "/sign-up")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return NextResponse.next();
  }

  if (
    request.auth?.user &&
    !sessionExpired &&
    backendAccessExpired &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    const refreshUrl = new URL("/api/auth/refresh-session", request.url);
    refreshUrl.searchParams.set(
      "returnTo",
      `${pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(refreshUrl);
  }

  // --- UNAUTHENTICATED USER ON PROTECTED ROUTES ---
  if (!request.auth?.user || sessionExpired) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("callbackUrl", pathname);
    if (sessionExpired) url.searchParams.set("reason", "session-expired");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
};

const withAuth = auth(handleAuthenticatedRequest);

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/auth/") ||
    excludedPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    fullyPublicPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return NextResponse.next();
  }
  return withAuth(request, event);
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|opengraph-image.jpg|opengraph-image.png|assets/|fonts/).*)",
  ],
};

export default middleware;
