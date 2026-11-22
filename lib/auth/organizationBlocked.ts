/* RFPilot staff can pause a whole customer organization. The backend then
   answers every sign-in of a member with 403 ORGANIZATION_BLOCKED, every
   authenticated request with 401 ORGANIZATION_BLOCKED, and a refresh with
   401 { reason: "organization_blocked" } (backend docs/API.md).

   One message for all of them. It never says who paused the access or why. */
export const ORGANIZATION_BLOCKED_CODE = "ORGANIZATION_BLOCKED";

export const ORGANIZATION_BLOCKED_REFRESH_REASON = "organization_blocked";

export const ORGANIZATION_BLOCKED_MESSAGE =
  "Your organization's access to RFPilot is paused. Contact RFPilot support for help.";

/* The sign-in page reads ?error= and shows the message, exactly as after a
   refused sign-in. */
export const ORGANIZATION_BLOCKED_SIGN_IN_PATH = `/sign-in?error=${ORGANIZATION_BLOCKED_CODE}`;

/* Where a member goes when the block ended their session: this route removes
   the session cookie, then sends them to the sign-in page above. */
export const ORGANIZATION_BLOCKED_SIGN_OUT_PATH = "/api/auth/organization-blocked";

/* True for a backend error body that carries the code, under either key. */
export const isOrganizationBlockedBody = (body: unknown): boolean => {
  if (!body || typeof body !== "object") return false;
  const data = body as Record<string, unknown>;
  return (
    data.code === ORGANIZATION_BLOCKED_CODE ||
    data.errorCode === ORGANIZATION_BLOCKED_CODE
  );
};
