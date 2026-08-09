"use client";

import { signInAction } from "@/app/actions/auth";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
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
      const res = await signInAction(email, password);
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F0F2F5] p-4 text-[#000000]">
      {/* 
        The main card: 
        Elevated with a very soft, diffuse shadow and a delicate glass-like border. 
      */}
      <div className="relative z-10 w-full max-w-[460px] rounded-[2.5rem] bg-white/90 px-10 py-12 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.06),0_0_0_1px_rgba(255,255,255,0.4)] backdrop-blur-xl ring-1 ring-gray-100/30 sm:px-14 sm:py-16">
        {/* Logo Section */}
        {/* <div className="mb-6 flex justify-center">
          <h3 className="text-primary text-2xl font-bold">Logo.</h3>
        </div> */}

        {/* Header Section */}
        <h2 className="mb-3 text-center text-[32px] font-extrabold tracking-tight text-gray-900 leading-none">
          Welcome Back
        </h2>
        <p className="mb-10 text-center text-[14px] font-medium text-gray-400">
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
  );
};

export default SigninPage;
