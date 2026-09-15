import { publicWorkspaceProxy } from "@/lib/vendorResponses/publicWorkspaceProxy";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ draftId: string }> };

const safeDraftId = (value: string): string | null =>
  /^[a-f0-9]{24}$/i.test(value) ? value : null;

export async function GET(request: NextRequest, { params }: RouteContext) {
  const draftId = safeDraftId((await params).draftId);
  if (!draftId) {
    return NextResponse.json({ success: false, message: "Invalid response draft." }, { status: 400 });
  }
  return publicWorkspaceProxy(request, `/drafts/${draftId}`, { method: "GET" });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const draftId = safeDraftId((await params).draftId);
  if (!draftId) {
    return NextResponse.json({ success: false, message: "Invalid response draft." }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  return publicWorkspaceProxy(request, `/drafts/${draftId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
