// Backend error codes from the members, teams and invitations APIs, as messages people can act
// on. Raw codes never reach the screen.

type ErrorLike = { code?: string; message?: string; status?: number; details?: Record<string, unknown> };

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export const formatWait = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "a moment";
  if (seconds < 60) return plural(Math.ceil(seconds), "second");
  if (seconds < 3600) return plural(Math.ceil(seconds / 60), "minute");
  return plural(Math.ceil(seconds / 3600), "hour");
};

const MESSAGES: Record<string, string | ((e: ErrorLike) => string)> = {
  // Members
  STALE_VERSION: "Someone else changed this member a moment ago. We've loaded the latest details, so try again.",
  VERSION_REQUIRED: "Reload the page and try again.",
  OWNER_HAS_RFPS: (e) => {
    const count = Number(e.details?.ownedRfpCount ?? 0);
    return count > 0 ? `This member still owns ${plural(count, "RFP")}. Reassign them first.` : "This member still owns RFPs. Reassign them first.";
  },
  LAST_OWNER: "The Owner can't be demoted or deactivated. Transfer ownership to another member first.",
  OWNER_ONLY: "Only the Owner can do this.",
  OWNERSHIP_TRANSFER_REQUIRED: "Use “Transfer ownership” to make another member the Owner.",
  FORBIDDEN: "Only Owners and Admins can manage members.",
  MEMBER_NOT_FOUND: "That member wasn't found. They may have been removed.",
  MEMBER_REMOVED: "This member has been removed.",
  MEMBER_INACTIVE: "That member isn't active.",
  MEMBER_NOT_DEACTIVATED: "Only a deactivated member can be reactivated.",
  INVALID_ROLE: "Choose one of the listed roles.",
  INVALID_TEAMS: "Choose up to 100 teams.",
  UNKNOWN_TEAMS: "Some of those teams were archived or no longer exist. Reload and choose again.",
  TEAMS_UNAVAILABLE: "Teams aren't available yet. Try again shortly.",
  ALREADY_OWNER: "You're already the Owner.",
  MEMBER_REQUIRED: "Choose the member who becomes the Owner.",
  REASSIGN_TARGET_REQUIRED: "Choose who receives the RFPs.",
  REASSIGN_TARGET_NOT_FOUND: "The member receiving the RFPs wasn't found.",
  REASSIGN_TO_SELF: "Choose a different member to receive the RFPs.",
  REASSIGN_TARGET_INELIGIBLE: "RFPs can only go to an active member who isn't a Viewer.",
  RFPS_NOT_OWNED_BY_MEMBER: "Some RFPs changed owner meanwhile. Nothing was reassigned; try again.",
  INVALID_RFP_SELECTION: "Select the RFPs to reassign.",
  MEMBERS_INTERNAL_ERROR: "The member change couldn't be completed. Try again.",
  // Teams
  TEAM_NAME_TAKEN: "An active team already has this name.",
  INVALID_TEAM_NAME: "Team names must be 1 to 120 characters.",
  TEAM_ARCHIVED: "Archived teams can't be changed.",
  TEAM_NOT_FOUND: "That team doesn't exist any more.",
  TEAM_ADMIN_REQUIRED: "Only Owners and Admins can manage teams.",
  TEAM_MANAGER_ROLE_REQUIRED: "Only members with the Team Manager role can manage a team. Change their role first.",
  TEAM_MEMBER_EXISTS: "This member is already on the team.",
  TEAM_MEMBER_NOT_FOUND: "This member isn't on the team.",
  INVALID_TEAM_MANAGER: "Choose whether this member manages the team.",
  TEAMS_INTERNAL_ERROR: "The team change couldn't be completed. Try again.",
  // Invitations
  INVITE_NOT_ALLOWED: "You don't have permission to invite people.",
  MANAGER_INVITES_DISABLED: "Your organization doesn't allow Team Managers to invite people.",
  ROLE_NOT_ALLOWED: "You can't invite someone with this role.",
  TEAM_REQUIRED: "Choose one of your teams for this invitation.",
  TEAM_NOT_MANAGED: "You can only invite people into teams you manage.",
  INVALID_TEAM: "Choose a valid team.",
  INVALID_EMAIL: "This isn't a valid email address.",
  DUPLICATE_IN_LIST: "This email appears earlier in the list.",
  ALREADY_INVITED: "This email already has an open invitation. Resend it instead.",
  ALREADY_MEMBER: "This person is already a member of the organization.",
  MEMBER_DEACTIVATED: "This person is a deactivated member. Reactivate them instead of inviting.",
  EMAIL_IN_ANOTHER_ORGANIZATION: "This email belongs to a member of another organization and can't be invited.",
  LEGACY_ACCOUNT_PENDING_PLACEMENT: "This account is waiting to be set up by RFPilot support and can't be invited yet.",
  NO_EMAILS: "Enter at least one email address.",
  TOO_MANY_EMAILS: "Invite at most 500 people at a time.",
  ORGANIZATION_UNAVAILABLE: "Your organization isn't available right now. Try again shortly.",
  INVITATION_NOT_FOUND: "That invitation wasn't found.",
  INVITATION_NOT_PENDING: "This invitation is no longer pending.",
  INVITATION_RESEND_COOLDOWN: (e) =>
    `This invitation was emailed a moment ago. You can resend it in ${formatWait(Number(e.details?.retryAfterSeconds ?? 0))}.`,
  INVITATION_DAILY_LIMIT: (e) => {
    const remaining = Number(e.details?.remaining ?? 0);
    const wait = formatWait(Number(e.details?.retryAfterSeconds ?? 0));
    return remaining > 0
      ? `That's more than today's invitation limit allows: ${plural(remaining, "invitation")} left today. Send fewer, or try again in ${wait}.`
      : `Your organization has reached today's invitation limit. Try again in ${wait}.`;
  },
  // Transport
  AUTHENTICATION_REQUIRED: "Your session has ended. Sign in again.",
  NETWORK_ERROR: "We couldn't reach the server. Check your connection and try again.",
};

export const orgErrorMessage = (error: ErrorLike, fallback = "Something went wrong. Try again."): string => {
  const entry = error.code ? MESSAGES[error.code] : undefined;
  if (typeof entry === "function") return entry(error);
  if (typeof entry === "string") return entry;
  if (error.status === 429) {
    const seconds = Number(error.details?.retryAfterSeconds ?? 0);
    return seconds > 0 ? `Too many requests. Try again in ${formatWait(seconds)}.` : "Too many requests. Try again in a few minutes.";
  }
  if (error.status === 403) return "You don't have permission to do this.";
  // Unknown codes: the backend's own message is written for people; never show the code itself.
  const message = error.message?.trim();
  if (message && !/^[A-Z][A-Z0-9_]+$/.test(message)) return message;
  return fallback;
};

export const isVersionConflict = (error: ErrorLike) => error.code === "STALE_VERSION";
export const ownedRfpCount = (error: ErrorLike): number | null =>
  error.code === "OWNER_HAS_RFPS" ? Number(error.details?.ownedRfpCount ?? 0) : null;
