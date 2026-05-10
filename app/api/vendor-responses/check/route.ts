import { BACKEND_URL } from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const proposalId = searchParams.get("proposalId");
  const email = searchParams.get("email");

  if (!proposalId || !email) {
    return NextResponse.json(
      { success: false, message: "Missing parameters" },
      { status: 400 },
    );
  }

  try {
    const params = new URLSearchParams({ proposalId, email });
    const res = await fetch(
      `${BACKEND_URL}/api/vendor-responses/check?${params.toString()}`,
      { cache: "no-store" },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: "Network error" }, { status: 502 });
  }
}
