"use client";

import type { PendingTwoFactorView } from "@/lib/auth/twoFactor";
import { ssoErrorMessage, ssoStartPath } from "@/lib/auth/sso";
import { Quote, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import {
  AuthDivider,
  AuthError,
  AuthHeading,
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
          No passwords
        </p>
        <p className="text-[14px] font-medium text-white/90">
          Sign in with Google, Microsoft or your company&apos;s single sign-on.
        </p>
      </div>
    </div>
  </>
);

const SigninPage = ({
  authError,
  pendingTwoFactor,
}: {
  // ?error= from Auth.js, the backend SSO callback or /api/sso/start.
  authError?: string;
  // A Google or Microsoft sign-in that stopped at 2FA lands here with the
  // step pending.
  pendingTwoFactor?: PendingTwoFactorView | null;
}) => {
  const [twoFactor, setTwoFactor] = useState<PendingTwoFactorView | null>(
    pendingTwoFactor ?? null,
  );
  const [error, setError] = useState(() => (authError ? ssoErrorMessage(authError) : ""));

  const goToDashboard = () => window.location.replace("/dashboard");

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
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell aside={<SigninAside />}>
      <AuthHeading
        title="Welcome Back"
        subtitle="Sign in with the account you use at work."
      />

      <AuthError message={error} />

      <GoogleButton
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        spacing="mb-4"
      />
      <MicrosoftButton href={ssoStartPath({ kind: "microsoft" })} />

      <div className="mt-4">
        <AuthDivider />
      </div>

      <CompanySignInForm />

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
