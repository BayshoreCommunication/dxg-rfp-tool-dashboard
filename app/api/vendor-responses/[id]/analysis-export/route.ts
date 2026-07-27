import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download the vendor response review as a standalone comparison document.
 *
 * The backend scopes the analysis by proposal as well as response, so the
 * proposalId travels with the request and is validated here before it is
 * forwarded rather than being passed through as an opaque query string.
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
  const proposalId = req.nextUrl.searchParams.get("proposalId") ?? "";
  const objectId = /^[a-fA-F0-9]{24}$/;
  if (!objectId.test(id)) return new Response("Invalid response id", { status: 400 });
  if (!objectId.test(proposalId)) return new Response("Invalid proposal id", { status: 400 });

  let upstream: Response;
  try {
    upstream = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/v1/vendor-responses/${encodeURIComponent(id)}/analysis-export?proposalId=${encodeURIComponent(proposalId)}`,
      { cache: "no-store", signal: req.signal },
    );
  } catch {
    return new Response("Upstream unavailable", { status: 502 });
  }

  if (!upstream.ok) {
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
        upstream.headers.get("content-disposition") ?? 'attachment; filename="vendor-response-review.html"',
      "Cache-Control": "no-store",
    },
  });
}
