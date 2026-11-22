import { signOut } from "@/auth";
import { ORGANIZATION_BLOCKED_SIGN_IN_PATH } from "@/lib/auth/organizationBlocked";
import { getBackendSession } from "@/lib/server/backendSession";

// A member whose session was ended because RFPilot paused their organization
// is sent here. The session cookie is removed and they land on the sign-in
// page with the message.
//
// Only a session already marked that way is signed out, so a link to this
// route cannot sign anyone else out: a member with a live session is sent on
// to their dashboard by the proxy. The browser may ask twice for one refused
// request (a router fetch, then the page load), so the second visit, with the
// cookie gone, gets the same answer.
export async function GET() {
  const state = await getBackendSession();
  if (state.organizationBlocked) await signOut({ redirect: false });
  return new Response(null, {
    status: 303,
    headers: {
      Location: ORGANIZATION_BLOCKED_SIGN_IN_PATH,
      "Cache-Control": "no-store",
    },
  });
}
