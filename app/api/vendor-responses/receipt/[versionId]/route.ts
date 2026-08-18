import { BACKEND_URL } from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";

const OBJECT_ID = /^[a-fA-F0-9]{24}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const { versionId } = await params;
  const proposalId = req.nextUrl.searchParams.get("proposalId") ?? "";
  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  const accessGrant = req.nextUrl.searchParams.get("accessGrant") ?? "";

  if (!OBJECT_ID.test(versionId) || !OBJECT_ID.test(proposalId) || !EMAIL.test(email)) {
    return NextResponse.json(
      { success: false, message: "A valid proposal, receipt, and vendor email are required." },
      { status: 400 },
    );
  }

  const query = new URLSearchParams({ proposalId, email });
  if (accessGrant) query.set("accessGrant", accessGrant);

  try {
    const upstream = await fetch(
      `${BACKEND_URL}/api/vendor-responses/receipt/${encodeURIComponent(versionId)}?${query.toString()}`,
      { cache: "no-store", signal: req.signal },
    );
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Submission receipt is temporarily unavailable." },
      { status: 502 },
    );
  }
}
