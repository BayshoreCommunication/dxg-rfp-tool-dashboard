"use client";

import { ssoStartPath } from "@/lib/auth/sso";
import { Building2, CheckCircle2 } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { AuthHeading, AuthShell, GoogleButton, MicrosoftButton } from "./AuthShell";

/* Sign-up is a first sign-in: the first person from a company to sign in
   with Google or Microsoft creates the organization and becomes its Owner.
   People whose company already set up RFPilot SSO sign in with their company
   instead (and join that organization as a Planner, or the invited role). */

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

const SignupPage = () => (
  <AuthShell aside={<SignupAside />}>
    <AuthHeading
      title="Create an account"
      subtitle="Use your work Google or Microsoft account. You'll be the Owner of your organization's RFPilot workspace."
    />

    <GoogleButton
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      label="Sign up with Google"
      spacing="mb-4"
    />
    <MicrosoftButton href={ssoStartPath({ kind: "microsoft" })} label="Sign up with Microsoft" />

    <div className="mb-8 mt-4 flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
      <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <p className="text-[13.5px] font-medium leading-snug text-gray-600">
        Company already uses RFPilot SSO?{" "}
        <Link href="/sign-in#company" className="font-bold text-primary hover:text-blue-500">
          Sign in with your company
        </Link>
      </p>
    </div>

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

export default SignupPage;
