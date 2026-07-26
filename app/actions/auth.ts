"use server";

import { signIn, signOut } from "@/auth";
import { authBffHeaders } from "@/lib/authRefresh";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { revokeCurrentBackendSession } from "@/lib/server/backendLogout";

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
export async function signInAction(email: string, password: string) {
  try {
    const resultUrl = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    const result = new URL(String(resultUrl), "http://auth.local");
    if (result.searchParams.has("error")) {
      const code = result.searchParams.get("code");
      const messages: Record<string, string> = {
        USER_NOT_FOUND: "No account found with this email.",
        WRONG_PASSWORD: "Incorrect password. Please try again.",
        USER_BLOCKED: "Your account has been blocked. Please contact support.",
        server_unavailable: "Could not reach the server. Please try again.",
      };
      return {
        success: false,
        message:
          (code ? messages[code] : undefined) ||
          "Login failed. Please try again.",
      };
    }
    return {
      success: true,
      message: "Login successful",
    };
  } catch {
    return { success: false, message: "Login failed. Please try again." };
  }
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
