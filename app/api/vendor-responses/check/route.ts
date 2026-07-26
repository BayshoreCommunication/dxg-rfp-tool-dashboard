import { BACKEND_URL } from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const proposalId = searchParams.get("proposalId");
  const email = searchParams.get("email");
  const emailTrackingId = searchParams.get("emailTrackingId");
  const accessGrant = searchParams.get("accessGrant");

  // At least one identifier must be present
  if (!emailTrackingId && (!proposalId || !email)) {
    return NextResponse.json(
      { alreadySubmitted: false, existingResponse: null },
      { status: 200 },
    );
  }

  try {
    // Forward all params the frontend sent — backend decides which to use
    const params = new URLSearchParams();
    if (emailTrackingId) params.set("emailTrackingId", emailTrackingId);
    if (proposalId) params.set("proposalId", proposalId);
    if (email) params.set("email", email);
    if (accessGrant) params.set("accessGrant", accessGrant);

    const res = await fetch(
      `${BACKEND_URL}/api/vendor-responses/check?${params.toString()}`,
      { cache: "no-store" },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ alreadySubmitted: false, existingResponse: null }, { status: 200 });
  }
}
