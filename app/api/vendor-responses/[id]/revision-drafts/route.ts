import { publicWorkspaceProxy } from "@/lib/vendorResponses/publicWorkspaceProxy";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid vendor submission." },
      { status: 400 },
    );
  }
  const body = await request.json().catch(() => ({}));
  return publicWorkspaceProxy(request, `/${id}/revision-drafts`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
