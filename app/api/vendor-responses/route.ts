import { BACKEND_URL } from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const body = await req.arrayBuffer();

    const res = await fetch(`${BACKEND_URL}/api/vendor-responses`, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: "Network error" }, { status: 502 });
  }
}
