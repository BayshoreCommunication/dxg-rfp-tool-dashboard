import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "./auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. PUBLIC PATHS: Accessible to everyone (Guests + Users)
  // Only auth-related pages are public, root "/" is blocked
  const publicPaths = ["/sign-in", "/sign-up", "/forgot-password"];

  // 2. STATIC ASSETS: Always allow
  const excludedPaths = [
    "/_next/",
    "/favicon.ico",
    "/opengraph-image.png",
    "/assets/",
  ];

  // 3. NEXTAUTH API ROUTES: Let NextAuth handle these
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Check for static assets
  if (excludedPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get session using NextAuth auth function
  const session = await auth();

  // --- OAUTH CALLBACK HANDLING ---
  if (pathname === "/auth/callback") {
    if (!session || !session.user) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    console.log(
      "✅ [Middleware] OAuth login successful, redirecting to dashboard",
    );
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // --- ROOT PATH REDIRECT ---
  // Block "/" and redirect based on authentication status
  if (pathname === "/") {
    if (session?.user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  // --- AUTH PAGE REDIRECT (UX Improvement) ---
  // If user is already logged in, don't let them see Sign-In/Up pages
  if (session?.user && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow other public paths
  if (
    publicPaths.some(
      (path) => pathname === path || pathname.startsWith(path + "/"),
    )
  ) {
    return NextResponse.next();
  }

  // --- PROTECTED ROUTES ---

  // Require Authentication for all non-public routes
  if (!session || !session.user) {
    // Redirect to sign-in, but remember where they wanted to go
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // User is authenticated, allow access to all routes
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|assets/).*)"],
};

export default middleware;
