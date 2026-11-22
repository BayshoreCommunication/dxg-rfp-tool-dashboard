import { signOut } from "@/auth";
import {
  isOrganizationBlockedBody,
  ORGANIZATION_BLOCKED_SIGN_IN_PATH,
} from "@/lib/auth/organizationBlocked";
import { isPrefetchRequest } from "@/lib/auth/requestKind";
import { AUTH_API_ORIGIN, fetchWithTimeout } from "@/lib/authRefresh";
import { getBackendSession } from "@/lib/server/backendSession";

// The exit for a member whose organization RFPilot paused: the session cookie
// is removed and they land on the sign-in page with the message.
//
// Who is signed out here:
// - a session already marked as ended by the block (the proxy sends page
//   loads and server actions of such a session here);
// - a live session for which the backend itself answers 401
//   ORGANIZATION_BLOCKED right now. A page that saw the refusal while it
//   rendered could not mark the session, and redirects here.
// Nobody else: an ordinary live or expired session is left as it is, so a
// link to this route cannot sign anyone out. Its redirect then takes a live
// session back to the dashboard (proxy) and anyone else to the sign-in page.
//
// A prefetch never signs out: its answer is not shown, so the message would
// be lost. A visit with the cookie already gone gets the same redirect.
const backendSaysBlocked = async (accessToken: string) => {
  try {
    const response = await fetchWithTimeout(
      `${AUTH_API_ORIGIN}/api/notifications/unread-count`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );
    return (
      response.status === 401 &&
      isOrganizationBlockedBody(await response.json().catch(() => null))
    );
  } catch {
    return false;
  }
};

const endBlockedSession = async (request: Request) => {
  if (isPrefetchRequest(request.headers)) return;
  const state = await getBackendSession();
  const blocked =
    state.organizationBlocked === true ||
    (!state.expired &&
      Boolean(state.accessToken) &&
      (await backendSaysBlocked(state.accessToken!)));
  if (blocked) await signOut({ redirect: false });
};

export async function GET(request: Request) {
  await endBlockedSession(request);
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
export async function POST(request: Request) {
  await endBlockedSession(request);
  return new Response(null, {
    headers: {
      "x-action-redirect": `${ORGANIZATION_BLOCKED_SIGN_IN_PATH};replace`,
      "Cache-Control": "no-store",
    },
  });
}
