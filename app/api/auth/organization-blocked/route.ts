import { signOut } from "@/auth";
import { ORGANIZATION_BLOCKED_SIGN_IN_PATH } from "@/lib/auth/organizationBlocked";
import { getBackendSession } from "@/lib/server/backendSession";

// A member whose session was ended because RFPilot paused their organization
// is sent here. The session cookie is removed and they land on the sign-in
// page with the message.
//
// It acts only on a session already marked that way, so a link to this route
// cannot sign anyone else out or show them the message.
export async function GET() {
  const state = await getBackendSession();
  if (!state.organizationBlocked) {
    return new Response(null, {
      status: 303,
      headers: { Location: "/sign-in", "Cache-Control": "no-store" },
    });
  }
  await signOut({ redirect: false });
  return new Response(null, {
    status: 303,
    headers: {
      Location: ORGANIZATION_BLOCKED_SIGN_IN_PATH,
      "Cache-Control": "no-store",
    },
  });
}
