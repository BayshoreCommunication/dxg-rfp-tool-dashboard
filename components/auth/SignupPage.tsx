"use client";

import { sendSignupOtpAction, signUpAction, verifySignupOtpAction } from "@/app/actions/auth";
import {
  PASSWORD_MIN_LENGTH,
  PasswordStrengthMeter,
} from "@/components/auth/passwordStrength";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Eye, EyeOff, KeyRound, Mail, Phone, User } from "lucide-react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SignupPage = () => {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
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

    const res = await sendSignupOtpAction(email);
    if (res.success) {
      setSuccessMsg(res.message);
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

    const res = await sendSignupOtpAction(email);
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

    const res = await verifySignupOtpAction(email, otp);
    if (res.success) {
      setSuccessMsg("Email verified! Please complete your profile.");
      setStep(3);
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) {
      setError("Name and password are required.");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
      );
      return;
    }
    setLoading(true);
    setError("");

    const res = await signUpAction({ name, email, phone, company, password });
    if (res.success) {
      // Auto login
      const signInRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (signInRes?.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push("/sign-in?registered=true");
      }
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
        <span>{loading ? "Sending Code..." : "Get Started Free"}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
      </button>

      <div className="mb-6 -mt-2 flex items-center gap-4">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          or
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        disabled={loading}
        className="cursor-pointer mb-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-4 text-[15px] font-bold text-gray-700 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:translate-y-0 disabled:opacity-70"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.14-4.06 1.14-3.13 0-5.78-2.11-6.72-4.95H1.27v3.09A12 12 0 0 0 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.28a7.21 7.21 0 0 1 0-4.56V6.63H1.27a12 12 0 0 0 0 10.74l4.01-3.09Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.63l4.01 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
          />
        </svg>
        <span>Continue with Google</span>
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
        Back
      </button>
      <div className="mb-6 group">
        <label className="mb-2 block text-[13px] font-bold text-gray-700">
          Verification Code
        </label>
        <p className="mb-4 text-xs text-gray-500">
          We sent a code to <span className="font-semibold text-gray-800">{email}</span>.
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

  // Step 3 Form: Account Details
  const renderStep3 = () => (
    <form onSubmit={handleRegister}>
      <div className="space-y-4 mb-6">
        {/* Name */}
        <div className="group">
          <label className="mb-2 block text-[13px] font-bold text-gray-700">Full Name</label>
          <div className="relative flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 hover:border-gray-300">
            <div className="pl-4 pr-3 text-gray-400 group-focus-within:text-primary transition-colors">
              <User className="h-5 w-5" strokeWidth={2} />
            </div>
            <input
              type="text"
              placeholder="John Doe"
              className="w-full bg-transparent py-4 pr-4 text-[15px] font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Company */}
        <div className="group">
          <label className="mb-2 block text-[13px] font-bold text-gray-700">Company (Optional)</label>
          <div className="relative flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 hover:border-gray-300">
            <div className="pl-4 pr-3 text-gray-400 group-focus-within:text-primary transition-colors">
              <Building2 className="h-5 w-5" strokeWidth={2} />
            </div>
            <input
              type="text"
              placeholder="Acme Inc."
              className="w-full bg-transparent py-4 pr-4 text-[15px] font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Phone */}
        <div className="group">
          <label className="mb-2 block text-[13px] font-bold text-gray-700">Phone Number (Optional)</label>
          <div className="relative flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 hover:border-gray-300">
            <div className="pl-4 pr-3 text-gray-400 group-focus-within:text-primary transition-colors">
              <Phone className="h-5 w-5" strokeWidth={2} />
            </div>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              className="w-full bg-transparent py-4 pr-4 text-[15px] font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Password */}
        <div className="group">
          <label className="mb-2 block text-[13px] font-bold text-gray-700">Create Password</label>
          <div className="relative flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50 transition-all duration-300 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 hover:border-gray-300">
            <div className="pl-4 pr-3 text-gray-400 group-focus-within:text-primary transition-colors">
              <KeyRound className="h-5 w-5" strokeWidth={2} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••"
              className="w-full bg-transparent py-4 pr-4 text-[15px] font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <PasswordStrengthMeter password={password} />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="cursor-pointer group relative mb-8 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(34,38,40,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(34,38,40,0.55)] active:translate-y-0 disabled:opacity-70"
        style={{ background: "#222628" }}
      >
        <span>{loading ? "Creating Account..." : "Complete Setup"}</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
      </button>
    </form>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F0F2F5] p-4 sm:p-8">
      {/* Abstract Background Elements */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center justify-center">
        <div className="absolute h-[600px] w-[600px] rounded-full bg-primary/20 blur-[100px] mix-blend-multiply sm:blur-[120px]"></div>
        <div className="absolute ml-40 mt-40 h-[500px] w-[500px] rounded-full bg-blue-300/30 blur-[100px] mix-blend-multiply sm:blur-[120px]"></div>
        <div className="absolute -ml-40 -mt-20 h-[550px] w-[550px] rounded-full bg-cyan-200/20 blur-[100px] mix-blend-multiply sm:blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex w-full max-w-[1000px] overflow-hidden rounded-[2.5rem] bg-white/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] backdrop-blur-2xl ring-1 ring-black/5 sm:min-h-[640px]">
        {/* Left Side: Branding / Showcase */}
        <div className="hidden w-1/2 flex-col justify-between bg-primary p-12 text-white lg:flex relative overflow-hidden">
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          
          {/* Top Logo */}
          <div className="relative z-10">
            <div className="inline-flex rounded-2xl bg-white p-2 shadow-lg shadow-black/10">
              <Image
                src="/assets/logo/rfpilot-primary-logo.png"
                alt="RFPilot"
                width={64}
                height={64}
                className="h-16 w-16 object-contain"
                priority
              />
            </div>
          </div>

          {/* Value Proposition */}
          <div className="relative z-10 max-w-sm">
            <h2 className="mb-6 text-[32px] font-extrabold leading-tight tracking-tight">
              Start creating winning proposals today.
            </h2>
            <div className="space-y-5">
              {[
                "Access beautiful, professional templates",
                "Close deals 40% faster on average",
                "Track when clients open your proposals",
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-[15px] font-medium text-white/90">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Bottom attribution */}
          <div className="relative z-10 text-sm font-medium text-white/50">
            © 2026 RFPilot.
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex w-full flex-col justify-center bg-white px-8 py-16 sm:px-16 lg:w-1/2">
          <div className="mx-auto w-full max-w-sm">
            {/* Mobile Logo Logo */}
            <div className="mb-10 flex justify-center lg:hidden">
              <Image
                src="/assets/logo/rfpilot-primary-logo.png"
                alt="RFPilot"
                width={72}
                height={72}
                className="h-[72px] w-[72px] object-contain"
                priority
              />
            </div>

            {/* Headers */}
            <div className="mb-8 lg:text-left text-center">
              <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">
                {step === 1 ? "Create an account" : step === 2 ? "Verify Email" : "Almost Done!"}
              </h1>
              <p className="text-sm font-medium text-gray-500">
                {step === 1 
                  ? "Join thousands of businesses sending better proposals." 
                  : step === 2 
                  ? "We just sent a verification code to your email." 
                  : "Tell us a bit about yourself to get started."}
              </p>
            </div>

            {/* Messages */}
            {error && (
              <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100/50">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-6 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-600 border border-green-100/50">
                {successMsg}
              </div>
            )}

            {/* Form Steps */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {/* Footer */}
            <p className="text-center text-[13px] font-medium text-gray-500">
              By continuing, you agree to our{" "}
              <Link href="#" className="font-bold underline decoration-gray-300 underline-offset-2 hover:text-black hover:decoration-black transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="#" className="font-bold underline decoration-gray-300 underline-offset-2 hover:text-black hover:decoration-black transition-colors">
                Privacy Policy
              </Link>
              .
            </p>
            
            <p className="mt-8 mb-4 lg:mb-0 text-center text-[14px] font-bold text-gray-900">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary hover:underline transition-colors">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
