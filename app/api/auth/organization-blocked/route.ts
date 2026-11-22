import { signOut } from "@/auth";
import { ORGANIZATION_BLOCKED_SIGN_IN_PATH } from "@/lib/auth/organizationBlocked";
import { getBackendSession } from "@/lib/server/backendSession";

// A member whose session was ended because RFPilot paused their organization
// is sent here. The session cookie is removed and they land on the sign-in
// page with the message.
//
// Only a session already marked that way is signed out, so a link to this
// route cannot sign anyone else out: a member with a live session is sent on
// to their dashboard by the proxy. The browser may ask more than once for one
// refused request, so a visit with the cookie already gone gets the same answer.
const endBlockedSession = async () => {
  const state = await getBackendSession();
  if (state.organizationBlocked) await signOut({ redirect: false });
};

export async function GET() {
  await endBlockedSession();
  return new Response(null, {
    status: 303,
    headers: {
      Location: ORGANIZATION_BLOCKED_SIGN_IN_PATH,
      "Cache-Control": "no-store",
    },
  });
}

// Server actions the page had already queued when the first one was refused
// are sent here by the router while it leaves. Answer each the way a
// redirecting action does, so none of them fails on the way out.
export async function POST() {
  await endBlockedSession();
  return new Response(null, {
    headers: {
      "x-action-redirect": `${ORGANIZATION_BLOCKED_SIGN_IN_PATH};replace`,
      "Cache-Control": "no-store",
    },
  });
}
