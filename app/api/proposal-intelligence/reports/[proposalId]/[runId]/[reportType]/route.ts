import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const reportTypes = new Set(["executive_html", "executive_pdf", "comparison_xlsx", "evaluator_html", "decision_html", "clarification_html", "audit_json"]);

export async function GET(_request: Request, { params }: { params: Promise<{ proposalId: string; runId: string; reportType: string }> }) {
  const { proposalId, runId, reportType } = await params;
  if (!/^[0-9a-f]{24}$/i.test(proposalId) || !/^[0-9a-f-]{36}$/i.test(runId) || !reportTypes.has(reportType)) return Response.json({ message: "Report was not found." }, { status: 404 });
  try {
    const response = await authenticatedBackendFetch(`${BACKEND_URL}/api/v1/proposals/${encodeURIComponent(proposalId)}/intelligence/comparisons/${encodeURIComponent(runId)}/reports/${encodeURIComponent(reportType)}`, { cache: "no-store", headers: { "X-Correlation-ID": crypto.randomUUID() } });
    if (!response.ok) { const body = await response.json().catch(() => ({})) as Record<string, unknown>; return Response.json({ message: String(body.title ?? "Report export failed."), code: String(body.code ?? `HTTP_${response.status}`) }, { status: response.status }); }
    const headers = new Headers({ "Cache-Control": "private, no-store", "Content-Type": response.headers.get("content-type") ?? "application/octet-stream", "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="proposal-intelligence.${reportType.endsWith("pdf") ? "pdf" : reportType.endsWith("xlsx") ? "xlsx" : reportType.endsWith("json") ? "json" : "html"}"`, "X-Content-Type-Options": "nosniff" });
    for (const name of ["etag", "x-rfpilot-run-id", "x-rfpilot-manifest-checksum", "x-rfpilot-freshness", "x-rfpilot-report-schema"]) { const value = response.headers.get(name); if (value) headers.set(name, value); }
    return new Response(await response.arrayBuffer(), { status: 200, headers });
  } catch { return Response.json({ message: "The report service could not be reached." }, { status: 502 }); }
}
