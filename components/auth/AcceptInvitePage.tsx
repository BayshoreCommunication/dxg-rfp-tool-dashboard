"use client";

import {
  acceptInvitationAction,
  startGoogleInvitationAction,
  type InvitationLookupResult,
} from "@/app/actions/acceptInvitation";
import { PasswordStrengthMeter } from "@/components/auth/passwordStrength";
import {
  invitationErrorView,
  invitationRoleLabel,
  switchesAcceptMode,
  validateRegisterForm,
  type InvitationDetails,
  type InvitationErrorView,
} from "@/lib/auth/invitation";
import { ssoStartPath } from "@/lib/auth/sso";
import type { PendingTwoFactorView } from "@/lib/auth/twoFactor";
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Link2Off,
  Lock,
  Mail,
  RefreshCw,
  User,
  UserPlus,
} from "lucide-react";
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
    {invitation ? (
      <dl className="space-y-3 rounded-2xl bg-white/10 p-6 text-[14px] backdrop-blur-sm">
        <div className="flex justify-between gap-4">
          <dt className="font-semibold text-white/60">Role</dt>
          <dd className="font-bold">{invitationRoleLabel(invitation.role)}</dd>
        </div>
        {invitation.teamName ? (
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-white/60">Team</dt>
            <dd className="font-bold">{invitation.teamName}</dd>
          </div>
        ) : null}
        {invitation.inviterName ? (
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-white/60">Invited by</dt>
            <dd className="font-bold">{invitation.inviterName}</dd>
          </div>
        ) : null}
      </dl>
    ) : null}
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

const InvitationSummary = ({ invitation }: { invitation: InvitationDetails }) => (
  <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Building2 className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[16px] font-extrabold text-gray-900">
          {invitation.organizationName}
        </p>
        <p className="mt-1 text-[13.5px] font-medium leading-snug text-gray-500">
          {invitation.inviterName ? `${invitation.inviterName} invited you` : "You're invited"} to
          join as{" "}
          <span className="font-bold text-gray-800">{invitationRoleLabel(invitation.role)}</span>
          {invitation.teamName ? (
            <>
              {" "}on the <span className="font-bold text-gray-800">{invitation.teamName}</span> team
            </>
          ) : null}
          .
        </p>
      </div>
    </div>
  </div>
);

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
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (mode === "register") {
      const problem = validateRegisterForm({ name, password, confirmPassword });
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
      if (nextMode && nextMode !== mode) {
        setMode(nextMode);
        setPassword("");
        setConfirmPassword("");
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
      <AuthHeading
        title={registering ? "Create your account" : "Sign in to join"}
        subtitle={
          registering
            ? "Set up your RFPilot account to accept the invitation."
            : "Sign in with your existing RFPilot account to accept the invitation."
        }
      />

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
          <AuthField
            id="invite-email"
            label="Email Address"
            icon={<Mail className="h-5 w-5" strokeWidth={2} />}
            type="email"
            value={invitation.email}
            readOnly
            disabled
            aria-describedby="invite-email-note"
            trailing={
              <span className="px-4 text-gray-400" title="This invitation is for this email">
                <Lock className="h-4 w-4" />
              </span>
            }
          />
          <p id="invite-email-note" className="-mt-2 px-1 text-[12px] font-medium text-gray-400">
            The invitation was sent to this address.
          </p>
          <div>
            <AuthField
              id="invite-password"
              label="Password"
              icon={<KeyRound className="h-5 w-5" strokeWidth={2} />}
              type={showPassword ? "text" : "password"}
              autoComplete={registering ? "new-password" : "current-password"}
              placeholder="••••••••••"
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
          {registering ? (
            <AuthField
              id="invite-confirm-password"
              label="Confirm password"
              icon={<KeyRound className="h-5 w-5" strokeWidth={2} />}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={submitting}
            />
          ) : null}
        </div>

        {!registering ? (
          <div className="-mt-2 mb-6 flex justify-end px-2">
            <Link
              href="/forgot-password"
              className="text-[13.5px] font-bold text-primary transition-colors hover:text-blue-500"
            >
              Forgot Password?
            </Link>
          </div>
        ) : null}

        <AuthPrimaryButton type="submit" disabled={submitting} className="mb-8">
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

      <p className="mb-6 mt-4 text-center text-[13px] font-medium text-gray-400">
        With Google or Microsoft, use the account for {invitation.email}.
      </p>

      <p className="text-center text-[13.5px] font-bold text-gray-400">
        {registering ? "Already have an account? " : "New to RFPilot? "}
        <button
          type="button"
          onClick={() => switchMode(registering ? "existing" : "register")}
          className="inline-flex cursor-pointer items-center gap-1 text-primary transition-colors hover:text-blue-500"
        >
          {registering ? "Sign in instead" : (
            <>
              <UserPlus className="h-3.5 w-3.5" /> Create an account
            </>
          )}
        </button>
      </p>
    </AuthShell>
  );
};

export default AcceptInvitePage;
