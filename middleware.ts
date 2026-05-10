import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "./auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. NEXTAUTH API ROUTES: Let NextAuth handle these (no session check needed)
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // 2. STATIC ASSETS: Always allow without a session check
  const excludedPrefixes = [
    "/_next/",
    "/favicon.ico",
    "/opengraph-image.jpg",
    "/opengraph-image.png",
    "/assets/",
    "/fonts/",
  ];
  if (excludedPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 3. FULLY PUBLIC PATHS: Skip auth() entirely — no session needed
  // These routes must be accessible to unauthenticated visitors (email links, share links, etc.)
  const publicPrefixes = [
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/proposal-view",
    "/vendor-response",
  ];
  if (publicPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // 4. All remaining routes require a valid session
  const session = await auth();

  // --- OAUTH CALLBACK HANDLING ---
  if (pathname === "/auth/callback") {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // --- ROOT PATH REDIRECT ---
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(session?.user ? "/dashboard" : "/sign-in", request.url),
    );
  }

  // --- AUTHENTICATED USER ON AUTH PAGES ---
  if (session?.user && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // --- UNAUTHENTICATED USER ON PROTECTED ROUTES ---
  if (!session?.user) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|opengraph-image.jpg|opengraph-image.png|assets/|fonts/).*)",
  ],
};

export default middleware;
