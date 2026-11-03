/* Federated sign-in (Microsoft and company SSO): the parts with no I/O,
   shared by /api/sso/start, the "sso" provider in auth.ts, /sso/complete and
   the sign-in, sign-up and invite pages.

   Flow (tasks/2026-11-04-sso/IMPLEMENTATION_PLAN.md):
   browser → /api/sso/start sets the httpOnly bind cookie and redirects to the
   backend /api/auth/sso/start with bind=sha256(cookie) → identity provider →
   backend callback → /sso/complete?handoff=… → signIn("sso") posts
   { handoff, bind: <cookie> } to /api/auth/sso/exchange. */

export const SSO_BIND_COOKIE = "rfp_sso_bind";
export const SSO_BIND_MAX_AGE_SECONDS = 10 * 60;

export type SsoKind = "microsoft" | "company";

export type SsoStartRequest = {
  kind: SsoKind;
  email?: string;
  invite?: string;
};

// Loose on purpose: the backend decides what a usable address is. This only
// keeps junk (and anything with spaces or control characters) out of the URL.
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_MAX_LENGTH = 254;

export const normalizeSsoEmail = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX_LENGTH) return null;
  return EMAIL_PATTERN.test(email) ? email : null;
};

// Same shape as invitation tokens (lib/auth/invitation.ts).
const INVITE_PATTERN = /^[A-Za-z0-9_-]{16,256}$/;
// The backend's handoff id. Opaque to us; we only refuse what can't be one.
const HANDOFF_PATTERN = /^[A-Za-z0-9_-]{16,256}$/;

export const sanitizeHandoff = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const handoff = raw.trim();
  return HANDOFF_PATTERN.test(handoff) ? handoff : null;
};

/* Validates the query of /api/sso/start. Returns an error code (one that
   ssoErrorMessage knows) when the request can't go to the backend. */
export const parseSsoStartRequest = (
  params: URLSearchParams,
): { ok: true; request: SsoStartRequest } | { ok: false; code: string } => {
  const kind = params.get("kind");
  if (kind !== "microsoft" && kind !== "company") {
    return { ok: false, code: "SSO_INVALID_REQUEST" };
  }
  const rawInvite = params.get("invite");
  let invite: string | undefined;
  if (rawInvite) {
    if (!INVITE_PATTERN.test(rawInvite)) return { ok: false, code: "INVITATION_INVALID" };
    invite = rawInvite;
  }
  if (kind === "microsoft") return { ok: true, request: { kind, invite } };
  const email = normalizeSsoEmail(params.get("email"));
  if (!email) return { ok: false, code: "SSO_EMAIL_INVALID" };
  return { ok: true, request: { kind, email, invite } };
};

/* The backend /api/auth/sso/start URL the browser is sent to. */
export const backendSsoStartUrl = (
  apiOrigin: string,
  request: SsoStartRequest,
  bindHash: string,
) => {
  const url = new URL("/api/auth/sso/start", apiOrigin);
  url.searchParams.set("kind", request.kind);
  if (request.email) url.searchParams.set("email", request.email);
  if (request.invite) url.searchParams.set("invite", request.invite);
  url.searchParams.set("bind", bindHash);
  return url.toString();
};

/* The dashboard's own /api/sso/start link, used by the buttons. */
export const ssoStartPath = (request: SsoStartRequest) => {
  const params = new URLSearchParams({ kind: request.kind });
  if (request.email) params.set("email", request.email);
  if (request.invite) params.set("invite", request.invite);
  return `/api/sso/start?${params.toString()}`;
};

const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/* 32 random bytes, base64url: the bind cookie value. */
export const createSsoBindValue = () => {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
};

/* bind sent to the backend /start: lowercase hex SHA-256 of the cookie value
   (UTF-8). The backend compares sha256(bind from /exchange) with it. */
export const hashSsoBind = async (value: string) =>
  toHex(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));

/* ───────── Messages ───────── */

/* Every code that can come back from the federated flow, through
   /sign-in?error=, /sso/complete or the Google callback. Raw codes never
   reach the screen. */
export const SSO_ERROR_MESSAGES: Record<string, string> = {
  // Account rules (backend)
  SSO_REQUIRED:
    "Your organization requires you to sign in with your company account. Use \"Sign in with your company\".",
  SSO_NOT_CONFIGURED:
    "We couldn't find company sign-in for that email. Check the address, or sign in with Google or Microsoft.",
  SSO_DOMAIN_NOT_ALLOWED:
    "Your company's sign-in isn't set up for this email domain. Contact your organization's admin.",
  SSO_IDENTITY_MISMATCH:
    "This RFPilot account is already linked to a different company sign-in. Contact your organization's admin.",
  COMPANY_EMAIL_UNVERIFIED:
    "Your company sign-in didn't confirm your email address. Contact your organization's admin.",
  MICROSOFT_EMAIL_UNVERIFIED:
    "Microsoft didn't confirm the email address on this account, so we can't sign you in with it. Ask your IT team to verify the email in Microsoft, or use another sign-in option.",
  EMAIL_IN_ANOTHER_ORGANIZATION:
    "This email already belongs to another RFPilot organization, so it can't sign in through this company's sign-in. Contact your organization's admin.",
  PASSWORD_SIGN_IN_DISABLED:
    "Password sign-in is no longer available. Sign in with Google, Microsoft or your company account.",
  // The round trip itself (state, handoff and bind checks)
  SSO_STATE_INVALID: "This sign-in attempt expired or was already used. Please sign in again.",
  SSO_HANDOFF_INVALID: "This sign-in attempt expired or was already used. Please sign in again.",
  SSO_BIND_MISMATCH:
    "This sign-in was started in a different browser or tab. Please sign in again from this page.",
  SSO_BIND_MISSING:
    "This sign-in was started in a different browser, or it took too long. Please sign in again.",
  SSO_PROVIDER_ERROR:
    "Your identity provider didn't complete the sign-in. Please try again.",
  SSO_ACCESS_DENIED: "Sign-in was cancelled at your identity provider.",
  SSO_CANCELLED: "Sign-in was cancelled at your identity provider.",
  SSO_PROVIDER_UNAVAILABLE:
    "We couldn't reach your identity provider. Please try again in a moment.",
  MICROSOFT_NOT_CONFIGURED:
    "Microsoft sign-in isn't available right now. Use Google or your company account.",
  EMAIL_MISSING:
    "Your identity provider didn't share an email address, so we can't sign you in. Contact your organization's admin.",
  SSO_IDENTITY_INVALID:
    "We couldn't verify the sign-in from your identity provider. Please try again, or contact your organization's admin.",
  SSO_INVITE_ORG_MISMATCH:
    "This invitation is for a different organization than your company sign-in. Use Google or Microsoft to accept it.",
  INVITATION_EMAIL_MISMATCH:
    "This invitation was sent to a different email address. Sign in with the account the invitation was sent to.",
  SSO_ERROR: "Sign-in failed. Please try again.",
  SSO_TOKEN_INVALID:
    "We couldn't verify the sign-in from your identity provider. Please try again, or contact your organization's admin.",
  // Our own checks before leaving for the backend
  SSO_EMAIL_INVALID: "Enter your work email address, like name@company.com.",
  SSO_INVALID_REQUEST: "That sign-in link isn't valid. Please start again.",
  // Shared with the other sign-in paths
  USER_BLOCKED: "Your account has been blocked. Please contact support.",
  MEMBERSHIP_INACTIVE:
    "Your organization membership isn't active. Contact your organization's admin.",
  MEMBER_DEACTIVATED:
    "Your membership in this organization was deactivated. Ask your organization's admin to reactivate it.",
  RATE_LIMITED: "Too many attempts. Wait a few minutes and try again.",
  server_unavailable: "Could not reach the server. Please try again.",
  // Auth.js / sign-in page codes
  AccessDenied:
    "Sign-in was denied. We couldn't verify your account with our server. Please try again or use another sign-in option.",
  TwoFactorExpired: "This sign-in attempt has expired. Please sign in again.",
};

export const SSO_FALLBACK_MESSAGE = "Sign-in failed. Please try again.";

export const hasSsoErrorMessage = (code: unknown) =>
  typeof code === "string" && Object.prototype.hasOwnProperty.call(SSO_ERROR_MESSAGES, code);

export const ssoErrorMessage = (code: unknown): string =>
  hasSsoErrorMessage(code) ? SSO_ERROR_MESSAGES[code as string] : SSO_FALLBACK_MESSAGE;
