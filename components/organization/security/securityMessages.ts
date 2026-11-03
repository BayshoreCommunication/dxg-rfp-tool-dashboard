/* Human messages for the backend's two-factor, organization security and
   domain error codes (ORG-303/304/305). Raw codes never reach the screen. */

export type SecurityErrorContext =
  | "enrol"
  | "disable"
  | "recovery"
  | "orgSecurity"
  | "reset"
  | "domain";

const COMMON: Record<string, string> = {
  TWO_FACTOR_NOT_CONFIGURED:
    "Two-factor authentication isn't available right now. Please try again later.",
  TWO_FACTOR_LOCKED:
    "Too many incorrect codes. Two-factor is locked for a while; wait 15 minutes and try again.",
  TWO_FACTOR_INVALID_CODE:
    "That code isn't valid. Check your authenticator app and enter the current 6-digit code.",
  TWO_FACTOR_NOT_ENABLED: "Two-factor authentication isn't turned on for your account.",
  TWO_FACTOR_ALREADY_ENABLED: "Two-factor authentication is already on for your account.",
  TWO_FACTOR_ENROLMENT_NOT_STARTED:
    "Your setup session expired. Start again to get a new QR code.",
  TWO_FACTOR_REQUIRED_BY_ORGANIZATION:
    "Your organization requires two-factor authentication, so it can't be turned off.",
  REAUTHENTICATION_FAILED:
    "That password isn't right. Enter your account password (accounts that only sign in with Google can leave it blank).",
  TWO_FACTOR_REQUIRED_FOR_ACTOR:
    "Turn on two-factor authentication for your own account before requiring it for everyone.",
  TWO_FACTOR_RESET_SELF:
    "You can't reset your own two-factor here. Use \"My two-factor authentication\" above instead.",
  TWO_FACTOR_RESET_SHARED_ACCOUNT:
    "This person also belongs to another organization, so their two-factor belongs to them, not just to you. Contact DXG support to reset it.",
  MEMBER_NOT_FOUND: "That member wasn't found. They may have left the organization.",
  FORBIDDEN: "Only the Owner can reset the Owner's two-factor authentication.",
  DOMAIN_INVALID: "Enter a domain like example.com, without http:// or an email address.",
  DOMAIN_NOT_VERIFIABLE:
    "Public email domains (like gmail.com or outlook.com) can't be verified. Use a domain your organization owns.",
  DOMAIN_LIMIT_REACHED:
    "Your organization has reached the maximum of 20 domains. Remove one before adding another.",
  DOMAIN_ALREADY_ADDED: "That domain is already on your organization's list.",
  DOMAIN_NOT_FOUND: "That domain was already removed. Refresh to see the current list.",
  VALIDATION_ERROR: "Something in the request wasn't valid. Please try again.",
  RATE_LIMITED: "Too many attempts. Wait a few minutes and try again.",
};

const FALLBACK: Record<SecurityErrorContext, string> = {
  enrol: "Couldn't set up two-factor authentication. Please try again.",
  disable: "Couldn't turn off two-factor authentication. Please try again.",
  recovery: "Couldn't create new recovery codes. Please try again.",
  orgSecurity: "Couldn't update organization security. Please try again.",
  reset: "Couldn't reset this member's two-factor authentication. Please try again.",
  domain: "Couldn't update domains. Please try again.",
};

export const securityErrorMessage = (
  code: string | undefined,
  context: SecurityErrorContext,
  status?: number,
): string => {
  if (code && COMMON[code]) {
    // A plain 403 on a domain or org setting means the role can't do it.
    if (code === "FORBIDDEN" && context !== "reset") {
      return "Only Owners and Admins can change this.";
    }
    return COMMON[code];
  }
  if (status === 429) return COMMON.RATE_LIMITED;
  if (status === 403) {
    return context === "reset"
      ? COMMON.FORBIDDEN
      : "Only Owners and Admins can change this.";
  }
  return FALLBACK[context];
};

/* Code entry: 6 digits is an authenticator code, anything else a recovery code. */
export const secondFactorPayload = (
  input: string,
): { code: string } | { recoveryCode: string } | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\s/g, "");
  if (/^\d{6}$/.test(digits)) return { code: digits };
  if (/^\d+$/.test(digits)) return null;
  return { recoveryCode: trimmed };
};

export const isSixDigitCode = (input: string) => /^\d{6}$/.test(input.replace(/\s/g, ""));
