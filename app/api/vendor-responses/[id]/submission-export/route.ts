import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { renderHtmlToPdf } from "@/lib/server/proposalPdf";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const FORMATS = ["json", "html", "pdf"] as const;
type ExportFormat = (typeof FORMATS)[number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const versionId = request.nextUrl.searchParams.get("versionId") ?? "";
  const requested = request.nextUrl.searchParams.get("format");
  const format: ExportFormat = FORMATS.includes(requested as ExportFormat)
    ? (requested as ExportFormat)
    : "html";
  if (!/^[a-f0-9]{24}$/i.test(id) || !/^[a-f0-9]{24}$/i.test(versionId)) {
    return new Response("Invalid response export", { status: 400 });
  }
  // The backend renders the review document as HTML; the PDF is that same
  // document printed here, so the two downloads can never disagree.
  const upstreamFormat = format === "json" ? "json" : "html";
  let upstream: Response;
  try {
    upstream = await authenticatedBackendFetch(
      `${BACKEND_URL}/api/vendor-responses/${encodeURIComponent(id)}/submission-export?versionId=${encodeURIComponent(versionId)}&format=${upstreamFormat}`,
      { cache: "no-store", signal: request.signal },
    );
  } catch {
    return new Response("Export unavailable", { status: 502 });
  }
  const disposition = upstream.headers.get("content-disposition")
    ?? `attachment; filename="vendor-response.${upstreamFormat}"`;

  if (format === "pdf") {
    if (!upstream.ok) {
      return new Response(await upstream.arrayBuffer(), {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "text/plain",
          "Cache-Control": "private, no-store",
        },
      });
    }
    try {
      const pdf = await renderHtmlToPdf(await upstream.text());
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": disposition.replace(/\.html(["']?)\s*$/i, ".pdf$1"),
          "Cache-Control": "private, no-store",
        },
      });
    } catch (error) {
      console.error("Vendor response PDF generation failed:", error);
      return new Response("PDF could not be generated", { status: 500 });
    }
  }

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type")
        ?? (format === "json" ? "application/json" : "text/html"),
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
    },
  });
}
