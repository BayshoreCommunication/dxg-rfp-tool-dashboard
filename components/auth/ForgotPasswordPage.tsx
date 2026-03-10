"use client";

import { resetPasswordAction, sendForgotPasswordOtpAction, verifyForgotPasswordOtpAction } from "@/app/actions/auth";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ForgotPasswordPage = () => {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
      setStep(2);
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
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
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
        className="cursor-pointer group relative mb-8 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-black py-4 text-[15px] font-bold text-white transition-all hover:bg-gray-900 active:scale-[0.98] disabled:opacity-70"
      >
        <span>{loading ? "Sending Code..." : "Send Reset Code"}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        <div className="absolute inset-0 -translate-x-full bg-white/20 blur-md transition-transform duration-500 group-hover:translate-x-full"></div>
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
        className="cursor-pointer group relative mb-8 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-black py-4 text-[15px] font-bold text-white transition-all hover:bg-gray-900 active:scale-[0.98] disabled:opacity-70"
      >
        <span>{loading ? "Verifying..." : "Verify Code"}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        <div className="absolute inset-0 -translate-x-full bg-white/20 blur-md transition-transform duration-500 group-hover:translate-x-full"></div>
      </button>
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
            type="password"
            placeholder="••••••••••"
            className="w-full bg-transparent py-4 pr-4 text-[15px] font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="cursor-pointer group relative mb-8 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-black py-4 text-[15px] font-bold text-white transition-all hover:bg-gray-900 active:scale-[0.98] disabled:opacity-70"
      >
        <span>{loading ? "Resetting..." : "Reset Password"}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        <div className="absolute inset-0 -translate-x-full bg-white/20 blur-md transition-transform duration-500 group-hover:translate-x-full"></div>
      </button>
    </form>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F0F2F5] p-4 text-[#000000]">
      <div className="relative z-10 w-full max-w-[460px] rounded-[2.5rem] bg-white/90 px-10 py-12 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.06),0_0_0_1px_rgba(255,255,255,0.4)] backdrop-blur-xl ring-1 ring-gray-100/30 sm:px-14 sm:py-16">
        
        {/* Logo Section */}
        <div className="mb-6 flex justify-center">
            <h3 className="text-primary text-2xl font-bold">
               Logo.
            </h3>
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
          Remember caching your password?{" "}
          <Link href="/sign-in" className="text-primary hover:text-blue-500 transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
