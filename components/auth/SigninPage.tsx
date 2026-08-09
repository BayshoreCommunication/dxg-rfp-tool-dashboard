"use client";

import { signInAction } from "@/app/actions/auth";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Mail, Quote, Sparkles } from "lucide-react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "Sign-in was denied. We couldn't verify your account with our server. Please try again or sign in with email and password.",
};

const SigninPage = ({ authError }: { authError?: string }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() =>
    authError
      ? AUTH_ERROR_MESSAGES[authError] || "Sign-in failed. Please try again."
      : "",
  );

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await signInAction(email, password, rememberMe);
      if (!res.success) {
        setError(res.message || "Login failed. Please try again.");
      } else {
        window.location.replace("/dashboard");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F0F2F5] p-4 text-[#000000] sm:p-8">
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

          {/* Testimonial + What's New */}
          <div className="relative z-10 max-w-sm space-y-8">
            <h2 className="text-[32px] font-extrabold leading-tight tracking-tight">
              Pick up right where you left off.
            </h2>

            {/* TODO: replace with a real customer quote and attribution */}
            <figure className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
              <Quote className="mb-3 h-5 w-5 text-white/60" />
              <blockquote className="text-[15px] font-medium leading-relaxed text-white/90">
                RFPilot cut our proposal turnaround from days to hours — and
                clients notice the difference.
              </blockquote>
              <figcaption className="mt-3 text-[13px] font-semibold text-white/60">
                Event Operations Lead
              </figcaption>
            </figure>

            <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wide text-white/70">
                  New
                </p>
                <p className="text-[14px] font-medium text-white/90">
                  Sign in with Google — one click, no password.
                </p>
              </div>
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
            {/* Mobile Logo */}
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

            {/* Header Section */}
            <h2 className="mb-3 text-center text-[32px] font-extrabold tracking-tight text-gray-900 leading-none lg:text-left">
              Welcome Back
            </h2>
            <p className="mb-10 text-center text-[14px] font-medium text-gray-400 lg:text-left">
              Enter your details to access your account
            </p>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-100/50 text-center">
            {error}
          </div>
        )}

        {/* Input Fields Container */}
        <form onSubmit={handleSignIn}>
          <div className="space-y-4 mb-6">
            {/* Email Input */}
            <div className="mb-0 group">
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

            {/* Password Input */}
            <div className="group">
              <label className="mb-2 block text-[13px] font-bold text-gray-700">
                Password
              </label>
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
            </div>
          </div>

          {/* Options Row */}
          <div className="mb-8 flex items-center justify-between px-2">
            <label className="flex cursor-pointer items-center gap-2.5 group">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-[6px] border-[1.5px] transition-all duration-300 ${
                  rememberMe
                    ? "border-primary bg-primary shadow-[0_2px_8px_rgba(47,198,245,0.3)]"
                    : "border-gray-200 bg-white group-hover:border-gray-300"
                }`}
                onClick={() => setRememberMe(!rememberMe)}
              >
                <Check
                  className={`h-3 w-3 text-white transition-transform duration-300 ${
                    rememberMe ? "scale-100 opacity-100" : "scale-50 opacity-0"
                  }`}
                  strokeWidth={4}
                />
              </div>
              <span className="text-[13.5px] font-bold text-gray-500 select-none group-hover:text-gray-700 transition-colors">
                Remember me
              </span>
            </label>

            <Link
              href="/forgot-password"
              className="text-[13.5px] font-bold text-primary hover:text-blue-500 transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer group relative mb-8 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(34,38,40,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(34,38,40,0.55)] active:translate-y-0 disabled:opacity-70"
            style={{ background: "#222628" }}
          >
            <span>{loading ? "Signing in..." : "Sign In to Dashboard"}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
          </button>
        </form>

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

            {/* Footer */}
            <p className="text-center text-[13.5px] font-bold text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="text-primary hover:text-blue-500 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SigninPage;
