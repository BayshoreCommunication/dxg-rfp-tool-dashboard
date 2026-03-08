"use server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * Server Action: Send OTP
 */
export async function sendOTPAction(email: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    });

    const data = await res.json();
    
    if (!res.ok) {
      return { success: false, message: data.message || "Failed to send OTP" };
    }

    // If res.ok, we assume the OTP was sent.
    return { success: true, message: data.message || "OTP sent successfully" };
  } catch (error: any) {
    console.error("Send OTP Action Error:", error);
    return { success: false, message: error.message || "Network error" };
  }
}

/**
 * Server Action: Verify OTP and Signup/Login
 */
export async function verifyOTPAction(email: string, otp: string, companyName: string, website: string) {
  try {
    // Generate a fixed password format: CompanyName@123 (remove spaces)
    const fixedPassword = `${companyName.replace(/\s+/g, "")}@123`;

    const res = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        otp,
        companyName,
        website,
        password: fixedPassword,
        companyType: "Technology" // Default value
      }),
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok) {
        return { success: false, message: data.message || "Verification failed" };
    }

    // For verify, we need the token from the backend.
    if (!data.token) {
      return { success: false, message: data.message || "Verification succeeded, but no token was provided." };
    }

    return { success: true, token: data.token, message: data.message };
  } catch (error: any) {
    console.error("Verify OTP Action Error:", error);
    return { success: false, message: error.message || "Network error" };
  }
}
