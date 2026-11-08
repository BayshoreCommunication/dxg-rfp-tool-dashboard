"use client";

import {
  forgetGoogleDomainMatchAction,
  requestOrganizationAccessAction,
  sendSignupOtpAction,
  signInAction,
  signUpAction,
  startGoogleSeparateOrganizationAction,
  verifySignupOtpAction,
} from "@/app/actions/auth";
import { PASSWORD_MIN_LENGTH, PasswordStrengthMeter } from "@/components/auth/passwordStrength";
import { ssoStartPath } from "@/lib/auth/sso";
import { ArrowLeft, Building2, CheckCircle2, Eye, EyeOff, KeyRound, Mail, MailCheck, User, Users } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
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

/* Sign-up (Path A): work email → 6-digit code by email → name and password.
   Google and Microsoft sign-up skip the code: the provider has verified the
   email. Either way the new person is the Owner of a new organization and
   goes through onboarding (/welcome) before the dashboard. People whose
   company already set up RFPilot SSO sign in with their company instead.

   ORG-306: when an organization has verified the email's domain, the person
   is asked first: request access (its Owners and Admins approve, and an
   invitation follows) or create a separate organization anyway. */

type Step = "email" | "code" | "match" | "account" | "requested";

export type GoogleDomainMatch = { email: string; organizationName: string };
type Match = { organizationName: string; via: "email" | "google" };

const SignupAside = () => (
  <>
    <h2 className="text-[32px] font-extrabold leading-tight tracking-tight">
      Start running better RFPs today.
    </h2>
    <div className="space-y-5">
      {[
        "Plan RFPs together with your team",
        "Compare vendor responses side by side",
        "Keep every decision in one place",
      ].map((benefit) => (
        <div key={benefit} className="flex items-center gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-medium text-white/90">{benefit}</span>
        </div>
      ))}
    </div>
  </>
);

const HEADINGS: Record<Step, { title: string; subtitle: string }> = {
  email: {
    title: "Create an account",
    subtitle: "You'll be the Owner of your organization's RFPilot workspace.",
  },
  code: { title: "Verify your email", subtitle: "Enter the 6-digit code we sent you." },
  match: {
    title: "Your organization may already use RFPilot",
    subtitle: "Ask to join your team's workspace, or set up your own.",
  },
  account: { title: "Almost done", subtitle: "Tell us your name and choose a password." },
  requested: { title: "Request sent", subtitle: "We'll be in touch by email." },
};

const domainOf = (address: string) => address.slice(address.lastIndexOf("@") + 1);

type Navigate = (path: string) => void;
const replaceLocation: Navigate = (path) => window.location.replace(path);

const SignupPage = ({
  navigate = replaceLocation,
  googleMatch = null,
}: {
  navigate?: Navigate;
  // Google sign-up stopped on a verified organization domain (from the server).
  googleMatch?: GoogleDomainMatch | null;
}) => {
  const [step, setStep] = useState<Step>(googleMatch ? "match" : "email");
  const [email, setEmail] = useState(googleMatch?.email ?? "");
  const [match, setMatch] = useState<Match | null>(
    googleMatch ? { organizationName: googleMatch.organizationName, via: "google" } : null,
  );
  const [separateOrganization, setSeparateOrganization] = useState(false);
  const [requestOutcome, setRequestOutcome] = useState<"pending" | "invited">("pending");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const run = async (work: () => Promise<void>) => {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Enter your work email address.");
      return;
    }
    void run(async () => {
      const res = await sendSignupOtpAction(address);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setEmail(address);
      setCode("");
      setMatch(null);
      setSeparateOrganization(false);
      setResendCooldown(60);
      setStep("code");
    });
  };

  const resendCode = () =>
    run(async () => {
      const res = await sendSignupOtpAction(email);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setCode("");
      setResendCooldown(60);
      setNotice("A new code is on its way.");
    });

  const verifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    void run(async () => {
      const res = await verifySignupOtpAction(email, code.trim());
      if (!res.success) {
        setError(res.message);
        return;
      }
      if (res.organizationMatch) {
        setMatch({ organizationName: res.organizationMatch.name, via: "email" });
        setStep("match");
        return;
      }
      setStep("account");
    });
  };

  const requestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    void run(async () => {
      const res = await requestOrganizationAccessAction(email, name.trim());
      if (!res.success) {
        setError(res.message);
        return;
      }
      setRequestOutcome(res.status);
      if (res.organizationName) setMatch((current) => current && { ...current, organizationName: res.organizationName });
      setStep("requested");
    });
  };

  // After Google, the request still needs the emailed code to prove the address.
  const verifyThenRequest = () =>
    run(async () => {
      await forgetGoogleDomainMatchAction();
      const res = await sendSignupOtpAction(email);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setCode("");
      setResendCooldown(60);
      setStep("code");
    });

  const createSeparateOrganization = () => {
    if (match?.via === "google") {
      void run(async () => {
        await startGoogleSeparateOrganizationAction();
        await signIn("google", { callbackUrl: "/dashboard" });
      });
      return;
    }
    setSeparateOrganization(true);
    setError("");
    setStep("account");
  };

  const createAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    void run(async () => {
      const res = await signUpAction({
        name: name.trim(),
        email,
        password,
        ...(separateOrganization ? { separateOrganization: true } : {}),
      });
      if (!res.success) {
        if ("code" in res && res.code === "ORGANIZATION_DOMAIN_MATCH") {
          setMatch({ organizationName: res.organizationName, via: "email" });
          setStep("match");
          return;
        }
        setError(res.message);
        return;
      }
      const signedIn = await signInAction(email, password, false);
      // The dashboard sends a new Owner on to onboarding.
      navigate(signedIn.success ? "/dashboard" : "/sign-in");
    });
  };

  const back = () => {
    setStep("email");
    setMatch(null);
    setSeparateOrganization(false);
    setError("");
    setNotice("");
  };

  return (
    <AuthShell aside={<SignupAside />}>
      <AuthHeading title={HEADINGS[step].title} subtitle={HEADINGS[step].subtitle} />

      <AuthError message={error} />
      {notice ? (
        <div
          role="status"
          className="mb-6 rounded-xl border border-green-100/50 bg-green-50 p-4 text-center text-sm font-medium text-green-700"
        >
          {notice}
        </div>
      ) : null}

      {step === "email" ? (
        <>
          <form onSubmit={sendCode} noValidate>
            <div className="mb-6">
              <AuthField
                id="sign-up-email"
                label="Work email"
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
              {loading ? "Sending code..." : "Continue with email"}
            </AuthPrimaryButton>
          </form>

          <AuthDivider />

          <GoogleButton
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            disabled={loading}
            label="Sign up with Google"
            spacing="mb-4"
          />
          <MicrosoftButton
            href={ssoStartPath({ kind: "microsoft" })}
            disabled={loading}
            label="Sign up with Microsoft"
          />

          <div className="mb-8 mt-4 flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-[13.5px] font-medium leading-snug text-gray-600">
              Joining a company that already uses RFPilot with its own sign-in?{" "}
              <Link href="/sign-in" className="font-bold text-primary hover:text-blue-500">
                Sign in with your work email
              </Link>
            </p>
          </div>
        </>
      ) : null}

      {step === "code" ? (
        <form onSubmit={verifyCode} noValidate>
          <button
            type="button"
            onClick={back}
            className="mb-6 flex items-center text-sm font-medium text-gray-500 hover:text-black"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Use a different email
          </button>
          <p className="mb-4 text-[13px] text-gray-500">
            We sent a code to <span className="font-semibold text-gray-800">{email}</span>.
          </p>
          <div className="mb-6">
            <AuthField
              id="sign-up-code"
              label="Verification code"
              icon={<KeyRound className="h-5 w-5" strokeWidth={2} />}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={loading}
            />
          </div>
          <AuthPrimaryButton type="submit" disabled={loading} className="mb-6">
            {loading ? "Verifying..." : "Verify code"}
          </AuthPrimaryButton>
          <p className="mb-8 text-center text-sm text-gray-500">
            Didn&apos;t get it?{" "}
            <button
              type="button"
              onClick={resendCode}
              disabled={loading || resendCooldown > 0}
              className="font-semibold text-gray-800 hover:underline disabled:cursor-default disabled:text-gray-400 disabled:no-underline"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </p>
        </form>
      ) : null}

      {step === "match" && match ? (
        <div>
          <button
            type="button"
            onClick={back}
            className="mb-6 flex items-center text-sm font-medium text-gray-500 hover:text-black"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Use a different email
          </button>
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-[14px] leading-snug text-gray-700">
              <span className="font-bold text-gray-900">{match.organizationName}</span> uses RFPilot with{" "}
              <span className="font-semibold">@{domainOf(email)}</span> email addresses. Request access and
              their admins will review it.
            </p>
          </div>

          {match.via === "email" ? (
            <form onSubmit={requestAccess} noValidate>
              <div className="mb-6">
                <AuthField
                  id="sign-up-request-name"
                  label="Full name"
                  icon={<User className="h-5 w-5" strokeWidth={2} />}
                  autoComplete="name"
                  placeholder="Pat Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <AuthPrimaryButton type="submit" disabled={loading} className="mb-4">
                {loading ? "Sending request..." : "Request access"}
              </AuthPrimaryButton>
            </form>
          ) : (
            <>
              <AuthPrimaryButton type="button" onClick={verifyThenRequest} disabled={loading} className="mb-2">
                {loading ? "Sending code..." : "Request access"}
              </AuthPrimaryButton>
              <p className="mb-4 text-center text-[13px] text-gray-500">
                We&apos;ll email a code to <span className="font-semibold text-gray-800">{email}</span> to confirm it&apos;s you.
              </p>
            </>
          )}

          <button
            type="button"
            onClick={createSeparateOrganization}
            disabled={loading}
            className="mb-8 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60"
          >
            Create a separate organization instead
          </button>
        </div>
      ) : null}

      {step === "requested" && match ? (
        <div role="status" className="mb-8 rounded-2xl border border-green-100 bg-green-50 p-5">
          <MailCheck className="mb-3 h-6 w-6 text-green-700" />
          {requestOutcome === "invited" ? (
            <p className="text-[14px] leading-relaxed text-green-800">
              <span className="font-bold">{match.organizationName}</span> lets people from your email domain join
              directly. We&apos;ve emailed an invitation to <span className="font-semibold">{email}</span>. Open it to
              finish setting up your account.
            </p>
          ) : (
            <p className="text-[14px] leading-relaxed text-green-800">
              We&apos;ve asked the admins at <span className="font-bold">{match.organizationName}</span> to let you in.
              When they approve, you&apos;ll get an invitation at <span className="font-semibold">{email}</span>.
            </p>
          )}
        </div>
      ) : null}

      {step === "account" ? (
        <form onSubmit={createAccount} noValidate>
          <div className="mb-6 space-y-4">
            <AuthField
              id="sign-up-name"
              label="Full name"
              icon={<User className="h-5 w-5" strokeWidth={2} />}
              autoComplete="name"
              placeholder="Pat Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            <div>
              <AuthField
                id="sign-up-password"
                label="Password"
                icon={<KeyRound className="h-5 w-5" strokeWidth={2} />}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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
              <PasswordStrengthMeter password={password} />
            </div>
          </div>
          <AuthPrimaryButton type="submit" disabled={loading} className="mb-8">
            {loading ? "Creating account..." : "Create account"}
          </AuthPrimaryButton>
        </form>
      ) : null}

      <p className="text-center text-[13px] font-medium text-gray-500">
        By continuing, you agree to our{" "}
        <Link
          href="#"
          className="font-bold underline decoration-gray-300 underline-offset-2 transition-colors hover:text-black hover:decoration-black"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="#"
          className="font-bold underline decoration-gray-300 underline-offset-2 transition-colors hover:text-black hover:decoration-black"
        >
          Privacy Policy
        </Link>
        .
      </p>

      <p className="mb-4 mt-8 text-center text-[14px] font-bold text-gray-900 lg:mb-0">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-primary transition-colors hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
};

export default SignupPage;
