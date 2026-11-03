/* Two-factor sign-in (ORG-303/304): the parts with no I/O, shared by auth.ts,
   the sign-in server actions and the code / setup step on the page. */

export type TwoFactorNextStep = "two_factor_challenge" | "two_factor_enrolment";

/* What the page is allowed to know about a pending second factor. The
   challenge token itself never leaves the server: it lives in an encrypted
   httpOnly cookie (lib/server/twoFactorPending.ts). */
export type PendingTwoFactorView = {
  nextStep: TwoFactorNextStep;
  expiresAt: number;
};

export type SecondFactorStep = PendingTwoFactorView & { challengeToken: string };

/* /api/auth/login, /api/auth/google and the invitation accept endpoints answer
   200 with this instead of tokens when a second factor is needed. */
export const readSecondFactorStep = (data: unknown): SecondFactorStep | null => {
  if (!data || typeof data !== "object") return null;
  const body = data as Record<string, unknown>;
  if (body.twoFactorRequired !== true) return null;
  if (
    body.nextStep !== "two_factor_challenge" &&
    body.nextStep !== "two_factor_enrolment"
  ) {
    return null;
  }
  if (typeof body.challengeToken !== "string" || !body.challengeToken) {
    return null;
  }
  const expiresAt = Number(body.challengeExpiresAt);
  return {
    nextStep: body.nextStep,
    challengeToken: body.challengeToken,
    // The backend's challenge lives ten minutes; fall back to that.
    expiresAt: Number.isFinite(expiresAt) && expiresAt > 0
      ? expiresAt
      : Date.now() + 10 * 60_000,
  };
};

/* Thrown as the CredentialsSignin code when a password / invitation sign-in
   stopped at the second factor. */
export const TWO_FACTOR_REQUIRED_CODE = "two_factor_required";

/* Codes the backend 2FA endpoints answer with, plus our own. */
export const TWO_FACTOR_ERROR_MESSAGES: Record<string, string> = {
  TWO_FACTOR_INVALID_CODE: "That code isn't valid. Check your authenticator app and try again.",
  TWO_FACTOR_LOCKED: "Too many incorrect codes. Wait a few minutes, then try again.",
  TWO_FACTOR_CHALLENGE_INVALID: "This sign-in attempt has expired. Please sign in again.",
  TWO_FACTOR_ENROLMENT_NOT_STARTED: "Two-factor setup didn't start. Please sign in again.",
  TWO_FACTOR_ALREADY_ENABLED: "Two-factor authentication is already set up for this account. Please sign in again.",
  TWO_FACTOR_NOT_ENABLED: "Two-factor authentication isn't set up for this account. Please sign in again.",
  TWO_FACTOR_REQUIRED_BY_ORGANIZATION: "Your organization requires two-factor authentication.",
  TWO_FACTOR_NOT_CONFIGURED: "Two-factor sign-in isn't available right now. Please try again later.",
  TWO_FACTOR_ERROR: "Something went wrong checking your code. Please try again.",
  MEMBERSHIP_INACTIVE: "Your organization membership isn't active. Contact your organization's admin.",
  server_unavailable: "Could not reach the server. Please try again.",
};

/* Codes after which the challenge can't be used again: the user must sign in
   from the start. */
const RESTART_CODES = new Set([
  "TWO_FACTOR_CHALLENGE_INVALID",
  "TWO_FACTOR_ENROLMENT_NOT_STARTED",
  "TWO_FACTOR_ALREADY_ENABLED",
  "TWO_FACTOR_NOT_ENABLED",
  "MEMBERSHIP_INACTIVE",
]);

export const twoFactorErrorMessage = (code: string | undefined) =>
  (code && TWO_FACTOR_ERROR_MESSAGES[code]) ||
  "We couldn't verify that code. Please try again.";

export const twoFactorErrorRequiresRestart = (code: string | undefined) =>
  Boolean(code && RESTART_CODES.has(code));

/* Authenticator codes are six digits; people paste them with spaces. */
export const normalizeTotpCode = (input: string) =>
  input.replace(/\D/g, "").slice(0, 6);

export const isCompleteTotpCode = (code: string) => /^\d{6}$/.test(code);

/* Recovery codes are 12 characters; the backend normalizes case and dashes.
   Here we only drop whitespace so a pasted code works. */
export const normalizeRecoveryCode = (input: string) =>
  input.replace(/\s+/g, "").slice(0, 32);

export const isPlausibleRecoveryCode = (code: string) =>
  code.replace(/[^A-Za-z0-9]/g, "").length >= 8;

/* Manual-entry key, grouped in fours so it can be typed. */
export const formatManualKey = (secret: string) =>
  secret.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

export const recoveryCodesFileText = (codes: string[], account?: string) =>
  [
    "RFPilot recovery codes",
    account ? `Account: ${account}` : null,
    `Saved: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "Each code works once. Keep them somewhere safe.",
    "",
    ...codes,
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");

/* ───────── Step state for the page ───────── */

export type TwoFactorPhase =
  | "challenge" // enter the 6-digit code
  | "recovery" // enter a recovery code instead
  | "enrol-loading" // fetching the secret / QR
  | "enrol-scan" // scan QR, enter the first code
  | "enrol-failed" // couldn't start setup
  | "recovery-codes" // signed in, showing the new recovery codes once
  | "restart"; // the challenge is dead; back to sign-in

export type EnrolmentSecret = {
  secret: string;
  otpauthUri: string;
  qrDataUrl: string | null;
};

export type TwoFactorState = {
  phase: TwoFactorPhase;
  submitting: boolean;
  error: string;
  enrolment: EnrolmentSecret | null;
  recoveryCodes: string[];
};

export type TwoFactorAction =
  | { type: "use-recovery-code" }
  | { type: "use-authenticator" }
  | { type: "enrolment-loaded"; enrolment: EnrolmentSecret }
  | { type: "enrolment-failed"; code?: string; message?: string }
  | { type: "submit" }
  | { type: "failed"; code?: string; message?: string }
  | { type: "enrolled"; recoveryCodes: string[] }
  | { type: "retry-enrolment" };

export const initialTwoFactorState = (
  nextStep: TwoFactorNextStep,
): TwoFactorState => ({
  phase: nextStep === "two_factor_enrolment" ? "enrol-loading" : "challenge",
  submitting: false,
  error: "",
  enrolment: null,
  recoveryCodes: [],
});

const failureMessage = (code?: string, message?: string) =>
  code ? twoFactorErrorMessage(code) : message || twoFactorErrorMessage(undefined);

export const twoFactorReducer = (
  state: TwoFactorState,
  action: TwoFactorAction,
): TwoFactorState => {
  switch (action.type) {
    case "use-recovery-code":
      return state.phase === "challenge"
        ? { ...state, phase: "recovery", error: "" }
        : state;
    case "use-authenticator":
      return state.phase === "recovery"
        ? { ...state, phase: "challenge", error: "" }
        : state;
    case "enrolment-loaded":
      return {
        ...state,
        phase: "enrol-scan",
        enrolment: action.enrolment,
        error: "",
      };
    case "enrolment-failed":
      return {
        ...state,
        phase: twoFactorErrorRequiresRestart(action.code) ? "restart" : "enrol-failed",
        error: failureMessage(action.code, action.message),
      };
    case "retry-enrolment":
      return { ...state, phase: "enrol-loading", error: "" };
    case "submit":
      return { ...state, submitting: true, error: "" };
    case "failed":
      return {
        ...state,
        submitting: false,
        phase: twoFactorErrorRequiresRestart(action.code) ? "restart" : state.phase,
        error: failureMessage(action.code, action.message),
      };
    case "enrolled":
      // Recovery codes come back only from enrolment; with none to show the
      // page navigates straight away and this phase is never rendered.
      return {
        ...state,
        submitting: false,
        phase: "recovery-codes",
        recoveryCodes: action.recoveryCodes,
        error: "",
      };
    default:
      return state;
  }
};
