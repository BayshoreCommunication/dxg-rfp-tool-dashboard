import { NextRequest } from "next/server";
import { BACKEND_URL } from "@/lib/config";
import { getBackendAccessToken } from "@/lib/server/backendSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Browser EventSource cannot send Authorization headers, so this route
// attaches the backend session token server-side and streams the backend
// Server-Sent Events response through unchanged.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
    return new Response("Invalid proposal id", { status: 400 });
  }

  const token = await getBackendAccessToken();
  if (!token) {
    return new Response("Authentication required", { status: 401 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${BACKEND_URL}/api/v1/proposals/${encodeURIComponent(id)}/conversation/events`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
        cache: "no-store",
        signal: req.signal,
      },
    );
  } catch {
    return new Response("Upstream unavailable", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream unavailable", { status: upstream.status || 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
