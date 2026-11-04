"use server";

import { CredentialsSignin } from "next-auth";
import { headers } from "next/headers";
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
import { hasSsoErrorMessage, sanitizeHandoff, ssoErrorMessage } from "@/lib/auth/sso";

import { BACKEND_URL } from "@/lib/config";

const getErrorMessage = (error: unknown, fallback = "Network error") =>
  error instanceof Error && error.message ? error.message : fallback;

/* ─────────────────────────────────────────
   SIGNUP — Step 1: Send OTP (spam check)
───────────────────────────────────────── */
export async function sendSignupOtpAction(email: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "OTP sent" : "Failed to send OTP"),
    };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error) };
  }
}

/* ─────────────────────────────────────────
   SIGNUP — Step 2: Verify OTP
───────────────────────────────────────── */
export async function verifySignupOtpAction(email: string, otp: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message:
        data.message || (res.ok ? "Email verified" : "Verification failed"),
    };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error) };
  }
}

/* ─────────────────────────────────────────
   SIGNUP — Step 3: Register account
───────────────────────────────────────── */
export async function signUpAction(payload: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  password: string;
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: authBffHeaders(),
      body: JSON.stringify({ ...payload, createSession: false }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok)
      return { success: false, message: data.message || "Registration failed" };
    return {
      success: true,
      user: data.user,
      message: data.message,
    };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error) };
  }
}

/* ─────────────────────────────────────────
   SIGN IN
───────────────────────────────────────── */
const SIGN_IN_ERROR_MESSAGES: Record<string, string> = {
  USER_NOT_FOUND: "No account found with this email.",
  WRONG_PASSWORD: "Incorrect password. Please try again.",
  USER_BLOCKED: "Your account has been blocked. Please contact support.",
  MEMBERSHIP_INACTIVE: "Your organization membership isn't active. Contact your organization's admin.",
  RATE_LIMITED: "Too many attempts. Wait a few minutes and try again.",
  server_unavailable: "Could not reach the server. Please try again.",
};

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

export async function signInAction(
  email: string,
  password: string,
  rememberMe = false,
): Promise<SignInActionResult> {
  const capture = await captureSignInOutcome(() =>
    signIn("credentials", {
      email,
      password,
      rememberMe: rememberMe ? "true" : "false",
      redirect: false,
    }),
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
  if (code) {
    return {
      success: false,
      code,
      // e.g. SSO_REQUIRED when the organization makes members use company sign-in.
      message:
        SIGN_IN_ERROR_MESSAGES[code] ??
        (hasSsoErrorMessage(code) ? ssoErrorMessage(code) : "Login failed. Please try again."),
    };
  }
  return { success: true, message: "Login successful" };
}

/* ─────────────────────────────────────────
   SIGN IN — email first
───────────────────────────────────────── */
export type SignInMethodResult =
  | { success: true; method: "company" | "password" }
  | { success: false; message: string };

/* The sign-in page asks for the email, then shows company SSO or the password
   form. The backend limits this per visitor, so pass the visitor's IP along
   (it trusts that header only with the BFF key). A backend that can't answer
   means the password form: the person can still pick company sign-in. */
export async function discoverSignInMethodAction(email: string): Promise<SignInMethodResult> {
  const requestHeaders = await headers();
  const clientIp =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip")?.trim() || "";
  try {
    const res = await fetchWithTimeout(`${AUTH_API_ORIGIN}/api/auth/sso/discover`, {
      method: "POST",
      headers: { ...authBffHeaders(), ...(clientIp ? { "x-rfpilot-client-ip": clientIp } : {}) },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.status === 400) return { success: false, message: "Enter a valid email address." };
    if (res.status === 429) return { success: false, message: "Too many attempts. Wait a few minutes and try again." };
    if (res.ok && (data?.method === "company" || data?.method === "password")) {
      return { success: true, method: data.method };
    }
    return { success: true, method: "password" };
  } catch {
    return { success: true, method: "password" };
  }
}

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
   FORGOT PASSWORD — Step 1: Send reset OTP
───────────────────────────────────────── */
export async function sendForgotPasswordOtpAction(email: string) {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/auth/forgot-password/send-otp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        cache: "no-store",
      },
    );
    const data = await res.json();
    return {
      success: res.ok,
      message:
        data.message ||
        (res.ok ? "Reset code sent" : "Failed to send reset code"),
    };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error) };
  }
}

/* ─────────────────────────────────────────
   FORGOT PASSWORD — Step 2: Verify reset OTP
───────────────────────────────────────── */
export async function verifyForgotPasswordOtpAction(
  email: string,
  otp: string,
) {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/auth/forgot-password/verify-otp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
        cache: "no-store",
      },
    );
    const data = await res.json();
    return {
      success: res.ok,
      message: data.message || (res.ok ? "OTP verified" : "Invalid OTP"),
    };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error) };
  }
}

/* ─────────────────────────────────────────
   FORGOT PASSWORD — Step 3: Reset password
───────────────────────────────────────── */
export async function resetPasswordAction(email: string, newPassword: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword }),
      cache: "no-store",
    });
    const data = await res.json();
    return {
      success: res.ok,
      message:
        data.message ||
        (res.ok ? "Password reset" : "Failed to reset password"),
    };
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error) };
  }
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
