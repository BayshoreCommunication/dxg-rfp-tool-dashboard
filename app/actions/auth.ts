"use server";

import { auth, signIn } from "@/auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

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
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
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
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/* ─────────────────────────────────────────
   SIGNUP — Step 3: Register account
───────────────────────────────────────── */
export async function signUpAction(payload: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok)
      return { success: false, message: data.message || "Registration failed" };
    return {
      success: true,
      user: data.user,
      accessToken: data.accessToken,
      message: data.message,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/* ─────────────────────────────────────────
   SIGN IN
───────────────────────────────────────── */
export async function signInAction(email: string, password: string) {
  try {
    // Use NextAuth signIn which handles the authentication flow
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result) {
      // Get the current session to return user data
      const session = await auth();
      return {
        success: true,
        user: session?.user,
        accessToken: (session?.user as any)?.accessToken,
        message: "Login successful",
      };
    } else {
      return { success: false, message: "Login failed" };
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
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
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
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
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
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
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/* ─────────────────────────────────────────
   GET CURRENT USER
───────────────────────────────────────── */
export async function getCurrentUserAction(accessToken: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message };
    return { success: true, user: data.user };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}

/* ─────────────────────────────────────────
   SIGN OUT
───────────────────────────────────────── */
export async function signOutAction() {
  try {
    const session = await auth();
    const accessToken = (session?.user as any)?.accessToken;

    // Call backend logout if accessToken exists
    if (accessToken) {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
    return { success: true, message: "Signed out successfully" };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error" };
  }
}
