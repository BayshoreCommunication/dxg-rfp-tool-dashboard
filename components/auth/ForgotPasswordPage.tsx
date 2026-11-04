"use client";

import { resetPasswordAction, sendForgotPasswordOtpAction, verifyForgotPasswordOtpAction } from "@/app/actions/auth";
import {
  PASSWORD_MIN_LENGTH,
  PasswordStrengthMeter,
} from "@/components/auth/passwordStrength";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ForgotPasswordPage = () => {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const res = await sendForgotPasswordOtpAction(email);
    if (res.success) {
      setSuccessMsg(res.message);
      setResendCooldown(60);
      setStep(2);
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const res = await sendForgotPasswordOtpAction(email);
    if (res.success) {
      setSuccessMsg("A new code has been sent to your email.");
      setOtp("");
      setResendCooldown(60);
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError("Please enter the verification code.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const res = await verifyForgotPasswordOtpAction(email, otp);
    if (res.success) {
      setSuccessMsg("Email verified! You can now reset your password.");
      setStep(3);
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < PASSWORD_MIN_LENGTH) {
      setError(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
      );
      return;
    }
    setLoading(true);
    setError("");

    const res = await resetPasswordAction(email, newPassword);
    if (res.success) {
      setSuccessMsg("Password reset successfully! Redirecting to sign in...");
      setTimeout(() => {
        router.push("/sign-in");
      }, 2000);
    } else {
      setError(res.message);
      setLoading(false);
    }
  };

  // Step 1 Form: Email
  const renderStep1 = () => (
    <form onSubmit={handleSendOtp}>
      <div className="mb-6 group">
        <label className="mb-2 block text-[13px] font-bold text-gray-700">
          Email Address
        </label>
        <p className="mb-4 text-xs text-gray-500">
          Enter the email associated with your account and we&apos;ll send you a verification code.
        </p>
        <div className="relative flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 hover:border-gray-300">
          <div className="pl-4 pr-3 text-gray-400 group-focus-within:text-primary transition-colors">
            <Mail className="h-5 w-5" strokeWidth={2} />
          </div>
          <input
            type="email"
            placeholder="name@company.com"
            className="w-full bg-transparent py-4 pr-4 text-[15px] font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="cursor-pointer group relative mb-8 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(34,38,40,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(34,38,40,0.55)] active:translate-y-0 disabled:opacity-70"
        style={{ background: "#222628" }}
      >
        <span>{loading ? "Sending Code..." : "Send Reset Code"}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
      </button>
    </form>
  );

  // Step 2 Form: Verification Code
  const renderStep2 = () => (
    <form onSubmit={handleVerifyOtp}>
      <button 
        type="button" 
        onClick={() => { setStep(1); setError(""); setSuccessMsg(""); }}
        className="flex items-center text-sm font-medium text-gray-500 hover:text-black mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Email
      </button>
      <div className="mb-6 group">
        <label className="mb-2 block text-[13px] font-bold text-gray-700">
          Verification Code
        </label>
        <p className="mb-4 text-xs text-gray-500">
          We sent a reset code to <span className="font-semibold text-gray-800">{email}</span>.
        </p>
        <div className="relative flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 hover:border-gray-300">
          <div className="pl-4 pr-3 text-gray-400 group-focus-within:text-primary transition-colors">
            <KeyRound className="h-5 w-5" strokeWidth={2} />
          </div>
          <input
            type="text"
            placeholder="123456"
            className="w-full bg-transparent py-4 pr-4 text-[15px] font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400 tracking-widest"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="cursor-pointer group relative mb-8 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(34,38,40,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(34,38,40,0.55)] active:translate-y-0 disabled:opacity-70"
        style={{ background: "#222628" }}
      >
        <span>{loading ? "Verifying..." : "Verify Code"}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
      </button>
      <p className="mb-8 -mt-4 text-center text-sm text-gray-500">
        Didn&apos;t receive the code?{" "}
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={loading || resendCooldown > 0}
          className="cursor-pointer font-semibold text-gray-800 hover:underline disabled:cursor-default disabled:text-gray-400 disabled:no-underline"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </button>
      </p>
    </form>
  );

  // Step 3 Form: New Password
  const renderStep3 = () => (
    <form onSubmit={handleResetPassword}>
      <div className="mb-6 group">
        <label className="mb-2 block text-[13px] font-bold text-gray-700">
          New Password
        </label>
        <p className="mb-4 text-xs text-gray-500">
          Enter a new, strong password for your account.
        </p>
        <div className="relative flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 hover:border-gray-300">
          <div className="pl-4 pr-3 text-gray-400 group-focus-within:text-primary transition-colors">
            <KeyRound className="h-5 w-5" strokeWidth={2} />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••••"
            className="w-full bg-transparent py-4 pr-4 text-[15px] font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="px-4 flex items-center justify-center text-gray-400 hover:text-primary transition-colors focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" strokeWidth={2} />
            ) : (
              <Eye className="h-5 w-5" strokeWidth={2} />
            )}
          </button>
        </div>
        <PasswordStrengthMeter password={newPassword} />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="cursor-pointer group relative mb-8 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(34,38,40,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(34,38,40,0.55)] active:translate-y-0 disabled:opacity-70"
        style={{ background: "#222628" }}
      >
        <span>{loading ? "Resetting..." : "Reset Password"}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
      </button>
    </form>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F0F2F5] p-4 text-[#000000]">
      <div className="relative z-10 w-full max-w-[460px] rounded-[2.5rem] bg-white/90 px-10 py-12 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.06),0_0_0_1px_rgba(255,255,255,0.4)] backdrop-blur-xl ring-1 ring-gray-100/30 sm:px-14 sm:py-16">
        
        {/* Logo Section */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/assets/logo/rfpilot-primary-logo.png"
            alt="RFPilot"
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
            priority
          />
        </div>

        {/* Header Section */}
        <h2 className="mb-3 text-center text-[32px] font-extrabold tracking-tight text-gray-900 leading-none">
          {step === 1 ? "Forgot Password" : step === 2 ? "Verify Email" : "Reset Password"}
        </h2>
        <p className="mb-10 text-center text-[14px] font-medium text-gray-400">
          {step === 1 
            ? "Recover access to your account" 
            : step === 2 
            ? "Enter the code sent to your email" 
            : "Create a new secure password"}
        </p>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100/50">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-600 border border-green-100/50 flex flex-col justify-center items-center text-center">
            {step === 3 && successMsg.includes("successfully") && (
              <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
            )}
            {successMsg}
          </div>
        )}

        {/* Forms */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && successMsg.includes("successfully") ? null : step === 3 && renderStep3()}

        {/* Footer */}
        <p className="text-center text-[13.5px] font-bold text-gray-400">
          Remember your password?{" "}
          <Link href="/sign-in" className="text-primary hover:text-blue-500 transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
