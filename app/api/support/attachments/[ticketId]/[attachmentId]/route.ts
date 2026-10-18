import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

const objectId = /^[0-9a-f]{24}$/i;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Resolves a short-lived download URL for an attachment and redirects to it. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string; attachmentId: string }> },
) {
  const { ticketId, attachmentId } = await params;
  if (!objectId.test(ticketId) || !uuid.test(attachmentId)) {
    return NextResponse.json({ success: false, message: "Attachment not found." }, { status: 404 });
  }
  const response = await authenticatedBackendFetch(
    `${BACKEND_URL}/api/v1/support/tickets/${ticketId}/attachments/${attachmentId}`,
    { method: "GET", cache: "no-store" },
  );
  const payload = (await response.json().catch(() => null)) as { data?: { url?: string }; message?: string } | null;
  const url = payload?.data?.url;
  if (!response.ok || typeof url !== "string" || !/^https?:\/\//.test(url)) {
    return NextResponse.json(
      { success: false, message: payload?.message || "Attachment not found." },
      { status: response.ok ? 502 : response.status },
    );
  }
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
}
