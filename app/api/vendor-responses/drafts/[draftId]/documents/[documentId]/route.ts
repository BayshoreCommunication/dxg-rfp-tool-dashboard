import { publicWorkspaceProxy } from "@/lib/vendorResponses/publicWorkspaceProxy";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ draftId: string; documentId: string }>;
};

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { draftId, documentId } = await params;
  if (
    !/^[a-f0-9]{24}$/i.test(draftId) ||
    !/^[a-z0-9][a-z0-9-]{7,127}$/i.test(documentId)
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid draft document." },
      { status: 400 },
    );
  }
  const body = await request.json().catch(() => ({}));
  return publicWorkspaceProxy(
    request,
    `/drafts/${draftId}/documents/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
      body: JSON.stringify(body),
    },
  );
}
