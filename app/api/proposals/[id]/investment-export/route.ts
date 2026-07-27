import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download the investment estimate as a standalone budget document.
 *
 * Same shape as the draft export: a plain link, so the browser handles the
 * download natively and the backend's session token is attached server-side.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // /api/proposals and /api/vendor-responses are fully public middleware
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
      `${BACKEND_URL}/api/v1/proposals/${encodeURIComponent(id)}/investment-guidance-reports/export`,
      { cache: "no-store", signal: req.signal },
    );
  } catch {
    return new Response("Upstream unavailable", { status: 502 });
  }

  if (!upstream.ok) {
    // 404 (no estimate generated yet) and 503 (feature off) are normal states,
    // so the backend's status is passed through for the UI to interpret.
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
      "Content-Disposition":
        upstream.headers.get("content-disposition") ?? 'attachment; filename="investment-estimate.html"',
      "Cache-Control": "no-store",
    },
  });
}
