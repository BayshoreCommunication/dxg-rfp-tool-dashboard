import { publicWorkspaceProxy } from "@/lib/vendorResponses/publicWorkspaceProxy";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ draftId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { draftId } = await params;
  if (!/^[a-f0-9]{24}$/i.test(draftId)) {
    return NextResponse.json(
      { success: false, message: "Invalid response draft." },
      { status: 400 },
    );
  }
  const body = await request.formData().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { success: false, message: "Select a valid document to upload." },
      { status: 400 },
    );
  }
  return publicWorkspaceProxy(request, `/drafts/${draftId}/documents`, {
    method: "POST",
    body,
  });
}
