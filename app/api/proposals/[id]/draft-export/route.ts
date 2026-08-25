import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download the reviewed draft as an RFP document.
 *
 * A plain link rather than a server action: the response is a file with its own
 * Content-Disposition, and letting the browser handle the download natively
 * avoids buffering the whole document into client memory just to re-offer it.
 * The backend session token is attached here, server-side, the same way the
 * conversation SSE proxy does it.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // /api/proposals and /api/vendor-responses are fully public proxy
  // prefixes (the public proposal view and the vendor submission form live
  // under them), so this route enforces its own session check rather than
  // relying on one that was never applied to it.
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
    return new Response("Invalid proposal id", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/v1/proposals/${encodeURIComponent(id)}/draft-export`,
      { cache: "no-store", signal: req.signal },
    );
  } catch {
    return new Response("Upstream unavailable", { status: 502 });
  }

  if (!upstream.ok) {
    // The backend's own codes are meaningful here — 409 NO_ACCEPTED_SECTIONS is
    // a normal state, not a fault — so the status is passed through for the UI
    // to interpret rather than collapsed into a generic failure.
    const body = await upstream.text().catch(() => "");
    return new Response(body || "Export unavailable", {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "text/plain" },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "text/html; charset=utf-8",
      // Preserve the filename the backend chose from the event name.
      "Content-Disposition":
        upstream.headers.get("content-disposition") ?? 'attachment; filename="proposal-rfp.html"',
      "Cache-Control": "no-store",
    },
  });
}
