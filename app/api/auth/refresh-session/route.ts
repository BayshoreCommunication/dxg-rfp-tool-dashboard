import { NextRequest } from "next/server";
import { forceRefreshBackendSession } from "@/lib/server/backendClient";
import { getBackendSession } from "@/lib/server/backendSession";

const safeReturnTo = (value: string | null) =>
  value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";

export async function GET(request: NextRequest) {
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const refreshed = await forceRefreshBackendSession();
  if (refreshed) {
    return new Response(null, {
      status: 303,
      headers: { Location: returnTo },
    });
  }

  const state = await getBackendSession();
  if (state.retryableError) {
    return Response.json(
      {
        success: false,
        code: "AUTH_REFRESH_TEMPORARILY_UNAVAILABLE",
        message: "Session refresh is temporarily unavailable. Please retry.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "3",
        },
      },
    );
  }

  const signIn = new URLSearchParams({
    callbackUrl: returnTo,
    reason: "session-expired",
  });
  return new Response(null, {
    status: 303,
    headers: { Location: `/sign-in?${signIn.toString()}` },
  });
}
