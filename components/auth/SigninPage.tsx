"use client";

import { discoverSignInMethodAction, signInAction } from "@/app/actions/auth";
import type { PendingTwoFactorView } from "@/lib/auth/twoFactor";
import { normalizeSsoEmail, ssoErrorMessage, ssoStartPath } from "@/lib/auth/sso";
import { Building2, Check, Eye, EyeOff, KeyRound, Mail, Quote, ShieldCheck } from "lucide-react";
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
  MicrosoftButton,
} from "./AuthShell";
import CompanySignInForm from "./CompanySignInForm";
import TwoFactorStep from "./TwoFactorStep";

const SigninAside = () => (
  <>
    <h2 className="text-[32px] font-extrabold leading-tight tracking-tight">
      Pick up right where you left off.
    </h2>

    {/* TODO: replace with a real customer quote and attribution */}
    <figure className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
      <Quote className="mb-3 h-5 w-5 text-white/60" />
      <blockquote className="text-[15px] font-medium leading-relaxed text-white/90">
        RFPilot cut our RFP turnaround from days to hours — and clients
        notice the difference.
      </blockquote>
      <figcaption className="mt-3 text-[13px] font-semibold text-white/60">
        Event Operations Lead
      </figcaption>
    </figure>

    <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
        <ShieldCheck className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[13px] font-bold uppercase tracking-wide text-white/70">
          Your way in
        </p>
        <p className="text-[14px] font-medium text-white/90">
          Email and password, Google, Microsoft or your company&apos;s single sign-on.
        </p>
      </div>
    </div>
  </>
);

type Navigate = (path: string) => void;
const replaceLocation: Navigate = (path) => window.location.replace(path);

/* Email first: "Continue" asks the backend whether the email's domain uses
   company SSO, then shows company sign-in or the password form. One email
   field for both. */
type Stage = "email" | "password" | "company";

const SigninPage = ({
  authError,
  pendingTwoFactor,
  navigate = replaceLocation,
}: {
  // ?error= from Auth.js, the backend SSO callback or /api/sso/start.
  authError?: string;
  // A Google or Microsoft sign-in that stopped at 2FA lands here with the
  // step pending.
  pendingTwoFactor?: PendingTwoFactorView | null;
  navigate?: Navigate;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("email");
  const [twoFactor, setTwoFactor] = useState<PendingTwoFactorView | null>(
    pendingTwoFactor ?? null,
  );
  const [error, setError] = useState(() => (authError ? ssoErrorMessage(authError) : ""));

  const goToDashboard = () => navigate("/dashboard");

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

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = normalizeSsoEmail(email);
    if (!address) {
      setError("Enter your email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await discoverSignInMethodAction(address);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setEmail(address);
      setStage(res.method);
    } catch {
      // Can't tell: the password form still works, and company sign-in is a click away.
      setEmail(address);
      setStage("password");
    } finally {
      setLoading(false);
    }
  };

  const changeEmail = () => {
    setStage("email");
    setPassword("");
    setError("");
  };

  const leaveTwoFactor = () => {
    setTwoFactor(null);
    setError("");
    // Drop ?step=two-factor left by the Google or Microsoft round trip.
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

      <GoogleButton
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        disabled={loading}
        spacing="mb-4"
      />
      <MicrosoftButton href={ssoStartPath({ kind: "microsoft" })} />

      <div className="mt-4">
        <AuthDivider />
      </div>

      {stage === "email" ? (
        <form onSubmit={handleContinue} noValidate>
          <div className="mb-6">
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
          </div>
          <AuthPrimaryButton type="submit" disabled={loading} className="mb-6">
            {loading ? "Checking..." : "Continue"}
          </AuthPrimaryButton>
        </form>
      ) : null}

      {stage === "password" ? (
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
              readOnly
              trailing={
                <button
                  type="button"
                  onClick={changeEmail}
                  className="px-4 text-[13px] font-bold text-primary hover:text-blue-500"
                >
                  Change
                </button>
              }
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
              autoFocus
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

          <AuthPrimaryButton type="submit" disabled={loading} className="mb-6">
            {loading ? "Signing in..." : "Sign In to Dashboard"}
          </AuthPrimaryButton>
        </form>
      ) : null}

      {stage === "company" ? (
        <>
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 text-[13.5px] font-medium leading-snug text-gray-600">
              <p>
                Your company signs in to RFPilot with single sign-on. Continue as{" "}
                <span className="break-all font-bold text-gray-900">{email}</span>.
              </p>
              <button
                type="button"
                onClick={changeEmail}
                className="mt-1 font-bold text-primary hover:text-blue-500"
              >
                Use a different email
              </button>
            </div>
          </div>
          <CompanySignInForm fixedEmail={email} submitLabel="Continue with company sign-in" />
          <p className="-mt-2 mb-6 text-center text-[13px] font-medium text-gray-400">
            Have an RFPilot password?{" "}
            <button
              type="button"
              onClick={() => setStage("password")}
              className="font-bold text-primary hover:text-blue-500"
            >
              Use a password instead
            </button>
          </p>
        </>
      ) : null}

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
