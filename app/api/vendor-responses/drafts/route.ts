import { publicWorkspaceProxy } from "@/lib/vendorResponses/publicWorkspaceProxy";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return publicWorkspaceProxy(request, "/drafts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
