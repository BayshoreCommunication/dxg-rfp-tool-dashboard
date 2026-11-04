"use client";

import {
  acceptInvitationAction,
  startGoogleInvitationAction,
  type InvitationLookupResult,
} from "@/app/actions/acceptInvitation";
import { PasswordStrengthMeter } from "@/components/auth/passwordStrength";
import {
  formatInvitationExpiry,
  invitationErrorView,
  invitationRoleLabel,
  switchesAcceptMode,
  validateRegisterForm,
  type InvitationDetails,
  type InvitationErrorView,
} from "@/lib/auth/invitation";
import { ssoStartPath } from "@/lib/auth/sso";
import type { PendingTwoFactorView } from "@/lib/auth/twoFactor";
import { Building2, Eye, EyeOff, KeyRound, Link2Off, Mail, RefreshCw, User } from "lucide-react";
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
import CompanySignInForm from "./CompanySignInForm";
import TwoFactorStep from "./TwoFactorStep";

type Mode = "existing" | "register";

const InviteAside = ({ invitation }: { invitation?: InvitationDetails }) => (
  <>
    <h2 className="text-[32px] font-extrabold leading-tight tracking-tight">
      {invitation
        ? `Join ${invitation.organizationName} on RFPilot.`
        : "Your team works on RFPilot."}
    </h2>
    <p className="text-[15px] font-medium leading-relaxed text-white/85">
      Plan RFPs together, compare vendor responses side by side, and keep every
      decision in one place.
    </p>
  </>
);

const DeadLink = ({ error }: { error: Extract<InvitationErrorView, { kind: "dead-link" }> }) => (
  <AuthShell aside={<InviteAside />}>
    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
      <Link2Off className="h-6 w-6" />
    </div>
    <AuthHeading title={error.title} subtitle={error.message} />
    <Link
      href="/sign-in"
      className="flex w-full items-center justify-center rounded-2xl py-4 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(34,38,40,0.4)] transition-all hover:-translate-y-0.5"
      style={{ background: "#222628" }}
    >
      Go to sign in
    </Link>
  </AuthShell>
);

/* Who invited whom, to what, and until when: the one place the page says it. */
const InvitationSummary = ({ invitation }: { invitation: InvitationDetails }) => {
  const expires = formatInvitationExpiry(invitation.expiresAt);
  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-medium leading-snug text-gray-600">
            {invitation.inviterName ? (
              <span className="font-bold text-gray-900">{invitation.inviterName}</span>
            ) : (
              "You were"
            )}{" "}
            {invitation.inviterName ? "invited you to join" : "invited to join"}{" "}
            <span className="font-bold text-gray-900">{invitation.organizationName}</span> as{" "}
            <span className="font-bold text-gray-900">{invitationRoleLabel(invitation.role)}</span>
            {invitation.teamName ? (
              <>
                {" "}on the <span className="font-bold text-gray-900">{invitation.teamName}</span> team
              </>
            ) : null}
            .
          </p>
          <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] font-medium leading-snug text-gray-400">
            <Mail className="mt-px h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              For <span className="font-semibold text-gray-600">{invitation.email}</span>
              {expires ? ` · expires ${expires}` : null}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

const PasswordToggle = ({ shown, onToggle }: { shown: boolean; onToggle: () => void }) => (
  <button
    type="button"
    aria-label={shown ? "Hide password" : "Show password"}
    onClick={onToggle}
    className="flex items-center justify-center px-4 text-gray-400 transition-colors hover:text-primary focus:outline-none"
  >
    {shown ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
  </button>
);

const AcceptInvitePage = ({
  token,
  lookup,
  initialErrorCode,
}: {
  token: string;
  lookup: InvitationLookupResult;
  // Set when a Google, Microsoft or company sign-in came back with a refusal.
  initialErrorCode?: string;
}) => {
  const invitation = lookup.success ? lookup.data : undefined;
  const [mode, setMode] = useState<Mode>(invitation?.accountExists ? "existing" : "register");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [twoFactor, setTwoFactor] = useState<PendingTwoFactorView | null>(null);
  const [deadLink, setDeadLink] = useState<InvitationErrorView | null>(() => {
    if (!lookup.success) return lookup.error;
    const fromRoundTrip = initialErrorCode ? invitationErrorView(initialErrorCode) : null;
    return fromRoundTrip?.kind === "dead-link" ? fromRoundTrip : null;
  });
  const [error, setError] = useState(() => {
    if (!lookup.success || !initialErrorCode) return "";
    const view = invitationErrorView(initialErrorCode);
    return view.kind === "form" ? view.message : "";
  });

  // Drop ?error= from the round trip; keep the path the email linked to.
  useEffect(() => {
    if (initialErrorCode && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [initialErrorCode]);

  if (deadLink?.kind === "dead-link") return <DeadLink error={deadLink} />;

  if (!invitation) {
    // Lookup failed for a reason other than a dead link (server, rate limit).
    return (
      <AuthShell aside={<InviteAside />}>
        <AuthHeading title="We couldn't load this invitation" />
        <AuthError message={deadLink?.message || "Something went wrong. Please try again."} />
        <AuthPrimaryButton type="button" onClick={() => window.location.reload()}>
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Try again
          </span>
        </AuthPrimaryButton>
      </AuthShell>
    );
  }

  const goToDashboard = () => window.location.replace("/dashboard");

  if (twoFactor) {
    return (
      <AuthShell aside={<InviteAside invitation={invitation} />}>
        <TwoFactorStep
          pending={twoFactor}
          // The invitation is already accepted; leaving now means a normal sign-in later.
          onCancel={() => window.location.replace("/sign-in")}
          onSignedIn={goToDashboard}
          accountLabel={invitation.email}
        />
      </AuthShell>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (mode === "register") {
      const problem = validateRegisterForm({ name, password });
      if (problem) {
        setError(problem);
        return;
      }
    } else if (!password) {
      setError("Please enter your password.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await acceptInvitationAction({
        token,
        mode,
        email: invitation.email,
        name: mode === "register" ? name.trim() : undefined,
        password,
        organizationName: invitation.organizationName,
      });
      if (result.success) {
        goToDashboard();
        return;
      }
      if ("twoFactor" in result) {
        setPassword("");
        setTwoFactor(result.twoFactor);
        return;
      }
      if (result.error.kind === "dead-link") {
        setDeadLink(result.error);
        return;
      }
      const nextMode = switchesAcceptMode(result.error.code);
      // The lookup said whether an account exists; if that changed since, follow the backend.
      if (nextMode && nextMode !== mode) {
        setMode(nextMode);
        setPassword("");
      }
      setError(result.error.message);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const continueWithGoogle = async () => {
    setSubmitting(true);
    setError("");
    try {
      const started = await startGoogleInvitationAction({
        token,
        organizationName: invitation.organizationName,
      });
      if (!started.success) {
        setError(started.message);
        setSubmitting(false);
        return;
      }
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setError("Couldn't start Google sign-in. Please try again.");
      setSubmitting(false);
    }
  };

  const registering = mode === "register";

  return (
    <AuthShell aside={<InviteAside invitation={invitation} />}>
      <div className="mb-6">
        <AuthHeading title={registering ? "Create your account" : "Sign in to join"} />
      </div>

      <InvitationSummary invitation={invitation} />

      <AuthError message={error} />

      {invitation.companySso ? (
        <>
          <CompanySignInForm
            invite={token}
            fixedEmail={invitation.email}
            disabled={submitting}
          />
          <AuthDivider />
        </>
      ) : null}

      <form onSubmit={submit}>
        {/* The invited email is fixed, so it isn't a field; this hidden one lets
            password managers save the new password against it. */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={invitation.email}
          readOnly
          hidden
        />
        <div className="mb-6 space-y-4">
          {registering ? (
            <AuthField
              id="invite-name"
              label="Full name"
              icon={<User className="h-5 w-5" strokeWidth={2} />}
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              autoFocus
            />
          ) : null}
          <div>
            <AuthField
              id="invite-password"
              label="Password"
              icon={<KeyRound className="h-5 w-5" strokeWidth={2} />}
              type={showPassword ? "text" : "password"}
              autoComplete={registering ? "new-password" : "current-password"}
              placeholder={registering ? "At least 8 characters" : "Your RFPilot password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
              autoFocus={!registering}
              trailing={
                <PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
              }
            />
            {registering && password ? (
              <div className="mt-2 px-1">
                <PasswordStrengthMeter password={password} />
              </div>
            ) : null}
          </div>
        </div>

        {!registering ? (
          <div className="-mt-2 mb-6 flex justify-end px-2">
            <Link
              href="/forgot-password"
              className="text-[13.5px] font-bold text-primary transition-colors hover:text-blue-500"
            >
              Forgot password?
            </Link>
          </div>
        ) : null}

        <AuthPrimaryButton type="submit" disabled={submitting} className="mb-6">
          {submitting
            ? registering
              ? "Creating account..."
              : "Signing in..."
            : registering
              ? "Create account and join"
              : "Sign in and join"}
        </AuthPrimaryButton>
      </form>

      <AuthDivider />
      <GoogleButton onClick={continueWithGoogle} disabled={submitting} spacing="mb-4" />
      <MicrosoftButton
        href={ssoStartPath({ kind: "microsoft", invite: token })}
        disabled={submitting}
      />

      <p className="mt-4 text-center text-[13px] font-medium text-gray-400">
        Use the Google or Microsoft account for {invitation.email}.
      </p>
    </AuthShell>
  );
};

export default AcceptInvitePage;
