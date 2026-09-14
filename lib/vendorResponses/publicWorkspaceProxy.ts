import { BACKEND_URL } from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";

export const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "x-rfpilot-access-grant",
};

export const proposalIdFromRequest = (request: NextRequest): string =>
  request.nextUrl.searchParams.get("proposalId")?.trim() ?? "";

export const publicWorkspaceProxy = async (
  request: NextRequest,
  backendPath: string,
  init: RequestInit = {},
) => {
  const accessGrant =
    request.headers.get("x-rfpilot-access-grant")?.trim() ?? "";
  const proposalId = proposalIdFromRequest(request);
  if (!proposalId || !accessGrant) {
    return NextResponse.json(
      { success: false, message: "A valid vendor invitation is required." },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  }

  const query = new URLSearchParams({ proposalId });
  try {
    const hasMultipartBody =
      typeof FormData !== "undefined" && init.body instanceof FormData;
    const response = await fetch(
      `${BACKEND_URL}/api/vendor-responses${backendPath}?${query.toString()}`,
      {
        ...init,
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(hasMultipartBody ? {} : { "Content-Type": "application/json" }),
          "x-rfpilot-access-grant": accessGrant,
          ...init.headers,
        },
      },
    );
    const data = await response.json().catch(() => ({
      success: false,
      message: "The vendor response service returned an unreadable response.",
    }));
    return NextResponse.json(data, {
      status: response.status,
      headers: PRIVATE_HEADERS,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "The vendor response service is temporarily unavailable.",
      },
      { status: 502, headers: PRIVATE_HEADERS },
    );
  }
};
