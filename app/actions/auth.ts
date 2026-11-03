"use server";

import { CredentialsSignin } from "next-auth";
import QRCode from "qrcode";

import { signIn, signOut } from "@/auth";
import {
  isCompleteTotpCode,
  normalizeRecoveryCode,
  normalizeTotpCode,
  TWO_FACTOR_REQUIRED_CODE,
  twoFactorErrorMessage,
  twoFactorErrorRequiresRestart,
  type EnrolmentSecret,
  type PendingTwoFactorView,
} from "@/lib/auth/twoFactor";
import { AUTH_API_ORIGIN, authBffHeaders, fetchWithTimeout } from "@/lib/authRefresh";
import {
  captureSignInOutcome,
  clearPendingTwoFactor,
  readPendingTwoFactor,
  setPostSignInNotice,
} from "@/lib/server/twoFactorPending";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { revokeCurrentBackendSession } from "@/lib/server/backendLogout";
import { sanitizeHandoff, ssoErrorMessage } from "@/lib/auth/sso";

import { BACKEND_URL } from "@/lib/config";

const getErrorMessage = (error: unknown, fallback = "Network error") =>
  error instanceof Error && error.message ? error.message : fallback;

/* ─────────────────────────────────────────
   SIGN IN
───────────────────────────────────────── */
export type SignInActionResult = {
  success: boolean;
  message: string;
  code?: string;
  // Set when the identity was proven and a second factor is needed. Holds no
  // secret: the challenge token stays in an httpOnly cookie on the server.
  twoFactor?: PendingTwoFactorView;
};

// Next-auth's server signIn() either returns a URL (with ?error= on some
// versions) or throws CredentialsSignin carrying the code set by authorize().
const signInFailureCode = (
  capture: Awaited<ReturnType<typeof captureSignInOutcome<unknown>>>,
): string | null => {
  if (capture.error !== undefined) {
    if (capture.error instanceof CredentialsSignin) return capture.error.code;
    console.error("[auth][signIn] unexpected sign-in failure:", capture.error);
    return "unexpected";
  }
  const result = new URL(String(capture.result), "http://auth.local");
  if (result.searchParams.has("error")) {
    return result.searchParams.get("code") || "credentials";
  }
  return null;
};

/* ─────────────────────────────────────────
   SIGN IN — Microsoft / company SSO (D3)
───────────────────────────────────────── */
/* /sso/complete calls this with the backend's one-time handoff. The "sso"
   provider in auth.ts pairs it with the bind cookie and asks the backend for
   the session. A Microsoft sign-in may still stop at our second factor;
   company sign-ins never do. */
export async function completeSsoSignInAction(handoff: string): Promise<SignInActionResult> {
  if (!sanitizeHandoff(handoff)) {
    return { success: false, code: "SSO_HANDOFF_INVALID", message: ssoErrorMessage("SSO_HANDOFF_INVALID") };
  }
  const capture = await captureSignInOutcome(() =>
    signIn("sso", { handoff, redirect: false }),
  );
  const code = signInFailureCode(capture);
  if (code === TWO_FACTOR_REQUIRED_CODE && capture.outcome.twoFactor) {
    return {
      success: false,
      code,
      message: "Enter your verification code to finish signing in.",
      twoFactor: capture.outcome.twoFactor,
    };
  }
  if (code) return { success: false, code, message: ssoErrorMessage(code) };
  return { success: true, message: "Signed in" };
}

/* ─────────────────────────────────────────
   SIGN IN — two-factor step (ORG-303/304)
───────────────────────────────────────── */
export type TwoFactorEnrolmentResult =
  | { success: true; message: string; data: EnrolmentSecret }
  | { success: false; message: string; code: string };

/* Org-mandated setup during sign-in: a fresh TOTP secret for the pending
   challenge, with the QR code drawn on the server. */
export async function startTwoFactorEnrolmentAction(): Promise<TwoFactorEnrolmentResult> {
  const pending = await readPendingTwoFactor();
  if (!pending || pending.nextStep !== "two_factor_enrolment") {
    return {
      success: false,
      code: "TWO_FACTOR_CHALLENGE_INVALID",
      message: twoFactorErrorMessage("TWO_FACTOR_CHALLENGE_INVALID"),
    };
  }
  try {
    const response = await fetchWithTimeout(
      `${AUTH_API_ORIGIN}/api/auth/2fa/enrolment/start`,
      {
        method: "POST",
        headers: authBffHeaders(),
        body: JSON.stringify({ challengeToken: pending.challengeToken }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data?.secret !== "string" || typeof data?.otpauthUri !== "string") {
      const code =
        typeof data?.code === "string"
          ? data.code
          : response.status === 429
            ? "TWO_FACTOR_LOCKED"
            : "TWO_FACTOR_ERROR";
      console.error("[auth][two-factor] enrolment start failed", { status: response.status, code });
      if (twoFactorErrorRequiresRestart(code)) await clearPendingTwoFactor();
      return { success: false, code, message: twoFactorErrorMessage(code) };
    }
    let qrDataUrl: string | null = null;
    try {
      qrDataUrl = await QRCode.toDataURL(data.otpauthUri, {
        margin: 1,
        width: 220,
        errorCorrectionLevel: "M",
      });
    } catch {
      // The manual key still works without the picture.
      qrDataUrl = null;
    }
    return {
      success: true,
      message: "Scan the code with your authenticator app",
      data: { secret: data.secret, otpauthUri: data.otpauthUri, qrDataUrl },
    };
  } catch (error: unknown) {
    console.error("[auth][two-factor] enrolment start unreachable:", getErrorMessage(error));
    return {
      success: false,
      code: "server_unavailable",
      message: twoFactorErrorMessage("server_unavailable"),
    };
  }
}

export type TwoFactorCompleteResult =
  | {
      success: true;
      message: string;
      recoveryCodes?: string[];
    }
  | { success: false; message: string; code: string; restart: boolean };

/* Exchanges the pending challenge plus a code for the NextAuth session.
   mode "challenge": TOTP or recovery code; mode "enrol": the first TOTP code
   after scanning, which also returns the recovery codes to show once. */
export async function completeTwoFactorAction(input: {
  mode: "challenge" | "enrol";
  code?: string;
  recoveryCode?: string;
}): Promise<TwoFactorCompleteResult> {
  const code = normalizeTotpCode(input.code ?? "");
  const recoveryCode = normalizeRecoveryCode(input.recoveryCode ?? "");
  const usingRecovery = input.mode === "challenge" && Boolean(recoveryCode);
  if (!usingRecovery && !isCompleteTotpCode(code)) {
    return {
      success: false,
      code: "TWO_FACTOR_INVALID_CODE",
      restart: false,
      message: "Enter the 6-digit code from your authenticator app.",
    };
  }

  const capture = await captureSignInOutcome(() =>
    signIn("two-factor", {
      mode: input.mode,
      ...(usingRecovery ? { recoveryCode } : { code }),
      redirect: false,
    }),
  );
  const failure = signInFailureCode(capture);
  if (failure) {
    return {
      success: false,
      code: failure,
      restart: twoFactorErrorRequiresRestart(failure),
      message: twoFactorErrorMessage(failure),
    };
  }

  const { welcomeOrganization, recoveryCodesRemaining, recoveryCodes } = capture.outcome;
  if (welcomeOrganization) {
    await setPostSignInNotice({ type: "welcome", organizationName: welcomeOrganization });
  } else if (typeof recoveryCodesRemaining === "number" && recoveryCodesRemaining <= 3) {
    await setPostSignInNotice({ type: "recovery-codes-low", remaining: recoveryCodesRemaining });
  }
  return {
    success: true,
    message: "Signed in",
    recoveryCodes: recoveryCodes?.length ? recoveryCodes : undefined,
  };
}

/* "Back to sign in" from the code step: forget the pending challenge. */
export async function cancelTwoFactorAction() {
  await clearPendingTwoFactor();
  return { success: true, message: "Cancelled" };
}

/* ─────────────────────────────────────────
   GET CURRENT USER
───────────────────────────────────────── */
export async function getCurrentUserAction() {
  try {
    const res = await authenticatedBackendFetch(`${BACKEND_URL}/api/auth/me`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message };
    return { success: true, user: data.user };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error) };
  }
}

/* ─────────────────────────────────────────
   SIGN OUT
───────────────────────────────────────── */
export async function signOutAction() {
  let backendWarning: string | undefined;
  try {
    const revoked = await revokeCurrentBackendSession();
    if (!revoked) backendWarning = "Backend session revocation was not confirmed.";
  } catch (error: unknown) {
    backendWarning = getErrorMessage(error);
  }

  // Auth.js clears its encrypted session cookie and performs the redirect.
  // Keep this outside the catch: the framework uses a redirect exception to
  // complete navigation from a server action.
  await signOut({ redirectTo: "/sign-in" });
  return { success: true, message: backendWarning || "Signed out successfully" };
}
