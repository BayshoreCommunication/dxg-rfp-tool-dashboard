/* Accept-invite page (ORG-205): the parts with no I/O. */

import { hasSsoErrorMessage, ssoErrorMessage } from "./sso";

export type InvitationRole =
  | "owner"
  | "organization_admin"
  | "team_manager"
  | "planner"
  | "viewer";

export type InvitationDetails = {
  email: string;
  role: string;
  organizationName: string;
  inviterName: string | null;
  teamName: string | null;
  expiresAt: string;
  accountExists: boolean;
  // The invited email's domain has an active company-SSO connection, so the
  // page offers "Sign in with your company".
  companySso: boolean;
};

const ROLE_LABELS: Record<InvitationRole, string> = {
  owner: "Owner",
  organization_admin: "Admin",
  team_manager: "Team Manager",
  planner: "Planner",
  viewer: "Viewer",
};

export const invitationRoleLabel = (role: string) =>
  ROLE_LABELS[role as InvitationRole] ?? "Member";

/* Dead links. The backend's own copy for these deliberately names no
   organization or email; ours doesn't either. */
export const DEAD_LINK_CODES = [
  "INVITATION_INVALID",
  "INVITATION_EXPIRED",
  "INVITATION_REVOKED",
  "INVITATION_ALREADY_USED",
  "INVITATION_SUPERSEDED",
] as const;

export type DeadLinkCode = (typeof DEAD_LINK_CODES)[number];

export const isDeadLinkCode = (code: unknown): code is DeadLinkCode =>
  typeof code === "string" &&
  (DEAD_LINK_CODES as readonly string[]).includes(code);

export const DEAD_LINK_COPY: Record<DeadLinkCode, { title: string; message: string }> = {
  INVITATION_INVALID: {
    title: "This invitation link isn't valid",
    message: "Check that you copied the whole link from the email, or ask your organization's admin to send a new invitation.",
  },
  INVITATION_EXPIRED: {
    title: "This invitation has expired",
    message: "Invitations are valid for a limited time. Ask your organization's admin to send you a new one.",
  },
  INVITATION_REVOKED: {
    title: "This invitation was withdrawn",
    message: "Your organization's admin cancelled this invitation. Ask them for a new one if you still need access.",
  },
  INVITATION_ALREADY_USED: {
    title: "This invitation has already been used",
    message: "If you accepted it, sign in to continue.",
  },
  INVITATION_SUPERSEDED: {
    title: "A newer invitation was sent",
    message: "Use the link in the most recent invitation email.",
  },
};

/* Accept errors that leave the link alive: shown above the form. */
export const ACCEPT_ERROR_MESSAGES: Record<string, string> = {
  USER_BLOCKED: "Your account has been blocked. Please contact support.",
  INVITATION_EMAIL_MISMATCH: "This invitation was sent to a different email address. Use the invited email to accept it.",
  INVALID_GOOGLE_IDENTITY: "We couldn't verify your Google sign-in. Please try again.",
  SSO_REQUIRED:
    "Your organization requires you to sign in with your company account. Use \"Sign in with your company\".",
  ALREADY_MEMBER: "You're already a member of this organization. Sign in to continue.",
  EMAIL_IN_ANOTHER_ORGANIZATION: "This email already belongs to another organization, so it can't join this one. Contact your organization's admin.",
  LEGACY_ACCOUNT_PENDING_PLACEMENT: "Your account is being moved by our support team. Try again later or contact support.",
  MEMBER_DEACTIVATED: "Your membership in this organization was deactivated. Ask your organization's admin to reactivate it.",
  RATE_LIMITED: "Too many attempts. Wait a few minutes and try again.",
  MEMBERSHIP_INACTIVE: "Your organization membership isn't active. Contact your organization's admin.",
  server_unavailable: "Could not reach the server. Please try again.",
};

export type InvitationErrorView =
  | { kind: "dead-link"; code: DeadLinkCode; title: string; message: string }
  | { kind: "form"; code: string; message: string };

/* One place that turns any backend code from lookup or accept into what the
   page shows. Raw codes never reach the screen. */
export const invitationErrorView = (code: unknown): InvitationErrorView => {
  if (isDeadLinkCode(code)) {
    return { kind: "dead-link", code, ...DEAD_LINK_COPY[code] };
  }
  // Microsoft / company SSO and Require SSO refusals come back here too.
  const known =
    typeof code === "string"
      ? ACCEPT_ERROR_MESSAGES[code] ?? (hasSsoErrorMessage(code) ? ssoErrorMessage(code) : undefined)
      : undefined;
  return {
    kind: "form",
    code: typeof code === "string" ? code : "unknown",
    message: known || "Something went wrong with the invitation. Please try again.",
  };
};

/* The token from the path segment. Anything that can't be a token is not sent
   to the backend at all. */
export const sanitizeInvitationToken = (raw: unknown) => {
  if (typeof raw !== "string") return null;
  let token = raw;
  try {
    token = decodeURIComponent(raw);
  } catch {
    return null;
  }
  token = token.trim();
  return /^[A-Za-z0-9_-]{16,256}$/.test(token) ? token : null;
};

/* For anything that records URLs (analytics): /invite/<token> → /invite/[token]. */
export const redactInvitationUrl = (url: string) =>
  url.replace(/\/invite\/[^/?#]+/, "/invite/[token]");
