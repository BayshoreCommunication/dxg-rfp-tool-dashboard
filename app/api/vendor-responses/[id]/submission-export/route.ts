import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const versionId = request.nextUrl.searchParams.get("versionId") ?? "";
  const format = request.nextUrl.searchParams.get("format") === "json"
    ? "json"
    : "html";
  if (!/^[a-f0-9]{24}$/i.test(id) || !/^[a-f0-9]{24}$/i.test(versionId)) {
    return new Response("Invalid response export", { status: 400 });
  }
  try {
    const upstream = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/vendor-responses/${encodeURIComponent(id)}/submission-export?versionId=${encodeURIComponent(versionId)}&format=${format}`,
      { cache: "no-store", signal: request.signal },
    );
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type")
          ?? (format === "json" ? "application/json" : "text/html"),
        "Content-Disposition": upstream.headers.get("content-disposition")
          ?? `attachment; filename="vendor-response.${format}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Export unavailable", { status: 502 });
  }
}
