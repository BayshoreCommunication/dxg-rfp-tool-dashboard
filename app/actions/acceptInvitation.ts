"use server";

import {
  invitationErrorView,
  sanitizeInvitationToken,
  type InvitationDetails,
  type InvitationErrorView,
} from "@/lib/auth/invitation";
import { AUTH_API_ORIGIN, fetchWithTimeout } from "@/lib/authRefresh";
import { storeGoogleInvitation } from "@/lib/server/twoFactorPending";

/* ORG-205 accept-invite page. The invitation token only ever travels in POST
   bodies (and the /invite/<token> path the email already uses); it is never
   logged here. */

export type InvitationLookupResult =
  | { success: true; message: string; data: InvitationDetails }
  | { success: false; message: string; error: InvitationErrorView };

const toDetails = (value: Record<string, unknown>): InvitationDetails => ({
  email: String(value.email ?? ""),
  role: String(value.role ?? ""),
  organizationName: String(value.organizationName ?? ""),
  inviterName: typeof value.inviterName === "string" && value.inviterName ? value.inviterName : null,
  teamName: typeof value.teamName === "string" && value.teamName ? value.teamName : null,
  expiresAt: String(value.expiresAt ?? ""),
  accountExists: value.accountExists === true,
  // Whether the invited email's domain has an active company-SSO connection.
  companySso: value.companySso === true,
});

export async function lookupInvitationAction(rawToken: string): Promise<InvitationLookupResult> {
  const token = sanitizeInvitationToken(rawToken);
  if (!token) {
    const error = invitationErrorView("INVITATION_INVALID");
    return { success: false, message: error.message, error };
  }
  try {
    const response = await fetchWithTimeout(`${AUTH_API_ORIGIN}/api/v1/invitations/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.invitation) {
      const code =
        typeof data?.code === "string"
          ? data.code
          : response.status === 429
            ? "RATE_LIMITED"
            : "server_unavailable";
      if (!data?.code) {
        console.error("[invitations] lookup failed", { status: response.status });
      }
      const error = invitationErrorView(code);
      return { success: false, message: error.message, error };
    }
    return { success: true, message: "Invitation found", data: toDetails(data.invitation) };
  } catch (error: unknown) {
    console.error(
      "[invitations] lookup unreachable:",
      error instanceof Error ? error.message : "unknown",
    );
    const view = invitationErrorView("server_unavailable");
    return { success: false, message: view.message, error: view };
  }
}

/* "Continue with Google": park the invitation in an encrypted httpOnly cookie
   so the Google callback (auth.ts signIn) accepts it with the Google ID token.
   The page then starts the normal Google sign-in. */
export async function startGoogleInvitationAction(input: {
  token: string;
  organizationName: string;
}) {
  const token = sanitizeInvitationToken(input.token);
  if (!token) {
    const error = invitationErrorView("INVITATION_INVALID");
    return { success: false, message: error.message };
  }
  await storeGoogleInvitation({
    token,
    organizationName: input.organizationName.trim().slice(0, 120),
  });
  return { success: true, message: "Continue with Google" };
}

