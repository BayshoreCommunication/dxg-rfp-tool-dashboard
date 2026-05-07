import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config";

// Public GET — no user session needed.
// Uses BACKEND_API_KEY (server-side env var) so the backend accepts the request.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
    return NextResponse.json({ success: false, message: "Invalid proposal id" }, { status: 400 });
  }

  const apiKey = process.env.BACKEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, message: "Public access not configured." },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/proposals/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      { success: res.ok, message: data.message, data: data.data ?? null },
      { status: res.ok ? 200 : res.status },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Network error" },
      { status: 502 },
    );
  }
}
