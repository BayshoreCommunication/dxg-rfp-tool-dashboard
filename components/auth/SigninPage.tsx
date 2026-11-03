"use client";

import { signInAction } from "@/app/actions/auth";
import type { PendingTwoFactorView } from "@/lib/auth/twoFactor";
import { Check, Eye, EyeOff, KeyRound, Mail, Quote, Sparkles } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import {
  AuthDivider,
  AuthError,
  AuthField,
  AuthHeading,
  AuthPrimaryButton,
  AuthShell,
  GoogleButton,
} from "./AuthShell";
import TwoFactorStep from "./TwoFactorStep";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "Sign-in was denied. We couldn't verify your account with our server. Please try again or sign in with email and password.",
  TwoFactorExpired:
    "This sign-in attempt has expired. Please sign in again.",
};

const SigninAside = () => (
  <>
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
  </>
);

const SigninPage = ({
  authError,
  pendingTwoFactor,
}: {
  authError?: string;
  // A Google sign-in that stopped at 2FA lands here with the step pending.
  pendingTwoFactor?: PendingTwoFactorView | null;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [twoFactor, setTwoFactor] = useState<PendingTwoFactorView | null>(
    pendingTwoFactor ?? null,
  );
  const [error, setError] = useState(() =>
    authError
      ? AUTH_ERROR_MESSAGES[authError] || "Sign-in failed. Please try again."
      : "",
  );

  const goToDashboard = () => window.location.replace("/dashboard");

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
      if (res.twoFactor) {
        setPassword("");
        setTwoFactor(res.twoFactor);
      } else if (!res.success) {
        setError(res.message || "Login failed. Please try again.");
      } else {
        goToDashboard();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const leaveTwoFactor = () => {
    setTwoFactor(null);
    setError("");
    // Drop ?step=two-factor left by the Google callback.
    if (window.location.search) window.history.replaceState(null, "", "/sign-in");
  };

  if (twoFactor) {
    return (
      <AuthShell aside={<SigninAside />}>
        <TwoFactorStep
          pending={twoFactor}
          onCancel={leaveTwoFactor}
          onSignedIn={goToDashboard}
          accountLabel={email || undefined}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell aside={<SigninAside />}>
      <AuthHeading
        title="Welcome Back"
        subtitle="Enter your details to access your account"
      />

      <AuthError message={error} />

      <form onSubmit={handleSignIn}>
        <div className="mb-6 space-y-4">
          <AuthField
            id="sign-in-email"
            label="Email Address"
            icon={<Mail className="h-5 w-5" strokeWidth={2} />}
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <AuthField
            id="sign-in-password"
            label="Password"
            icon={<KeyRound className="h-5 w-5" strokeWidth={2} />}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            trailing={
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                className="flex items-center justify-center px-4 text-gray-400 transition-colors hover:text-primary focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" strokeWidth={2} />
                ) : (
                  <Eye className="h-5 w-5" strokeWidth={2} />
                )}
              </button>
            }
          />
        </div>

        {/* Options Row */}
        <div className="mb-8 flex items-center justify-between px-2">
          <label className="group flex cursor-pointer items-center gap-2.5">
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
            <span className="select-none text-[13.5px] font-bold text-gray-500 transition-colors group-hover:text-gray-700">
              Remember me
            </span>
          </label>

          <Link
            href="/forgot-password"
            className="text-[13.5px] font-bold text-primary transition-colors hover:text-blue-500"
          >
            Forgot Password?
          </Link>
        </div>

        <AuthPrimaryButton type="submit" disabled={loading} className="mb-8">
          {loading ? "Signing in..." : "Sign In to Dashboard"}
        </AuthPrimaryButton>
      </form>

      <div className="-mt-2">
        <AuthDivider />
      </div>

      <GoogleButton
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        disabled={loading}
      />

      <p className="text-center text-[13.5px] font-bold text-gray-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="text-primary transition-colors hover:text-blue-500"
        >
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
};

export default SigninPage;
