/* State for turning on your own two-factor authentication:
   idle → starting → scan (QR + key) → confirming → codes (shown once) → idle. */

export type EnrolmentState =
  | { step: "idle"; error?: string }
  | { step: "starting" }
  | { step: "scan"; otpauthUri: string; secret: string; error?: string }
  | { step: "confirming"; otpauthUri: string; secret: string }
  | { step: "codes"; recoveryCodes: string[] };

export type EnrolmentEvent =
  | { type: "start" }
  | { type: "started"; otpauthUri: string; secret: string }
  | { type: "startFailed"; error: string }
  | { type: "confirm" }
  | { type: "confirmed"; recoveryCodes: string[] }
  | { type: "confirmFailed"; error: string; restart?: boolean }
  | { type: "cancel" }
  | { type: "finish" };

export const initialEnrolmentState: EnrolmentState = { step: "idle" };

export const enrolmentReducer = (
  state: EnrolmentState,
  event: EnrolmentEvent,
): EnrolmentState => {
  switch (event.type) {
    case "start":
      return state.step === "idle" ? { step: "starting" } : state;
    case "started":
      return state.step === "starting"
        ? { step: "scan", otpauthUri: event.otpauthUri, secret: event.secret }
        : state;
    case "startFailed":
      return state.step === "starting" ? { step: "idle", error: event.error } : state;
    case "confirm":
      return state.step === "scan"
        ? { step: "confirming", otpauthUri: state.otpauthUri, secret: state.secret }
        : state;
    case "confirmed":
      return state.step === "confirming"
        ? { step: "codes", recoveryCodes: event.recoveryCodes }
        : state;
    case "confirmFailed":
      if (state.step !== "confirming") return state;
      // An expired or missing setup can't be confirmed: go back to the start.
      if (event.restart) return { step: "idle", error: event.error };
      return { step: "scan", otpauthUri: state.otpauthUri, secret: state.secret, error: event.error };
    case "cancel":
      return state.step === "scan" || state.step === "starting" ? { step: "idle" } : state;
    case "finish":
      return state.step === "codes" ? { step: "idle" } : state;
    default:
      return state;
  }
};

/* Codes whose answer means the setup itself is gone, not just a wrong code. */
export const confirmErrorRestarts = (code?: string) =>
  code === "TWO_FACTOR_ENROLMENT_NOT_STARTED" || code === "TWO_FACTOR_ALREADY_ENABLED";

/* "ABCD EFGH IJKL" groups for typing the manual key into an app. */
export const formatSecret = (secret: string) =>
  secret.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();

export const recoveryCodesFileText = (codes: string[], account?: string) =>
  [
    "RFPilot two-factor recovery codes",
    account ? `Account: ${account}` : null,
    `Created: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "Each code works once. Keep them somewhere safe.",
    "",
    ...codes,
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
