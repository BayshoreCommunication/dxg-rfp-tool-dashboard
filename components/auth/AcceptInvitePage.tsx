"use client";

import {
  startGoogleInvitationAction,
  type InvitationLookupResult,
} from "@/app/actions/acceptInvitation";
import {
  invitationErrorView,
  invitationRoleLabel,
  type InvitationDetails,
  type InvitationErrorView,
} from "@/lib/auth/invitation";
import { ssoStartPath } from "@/lib/auth/sso";
import { Building2, Link2Off, Mail, RefreshCw } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AuthDivider,
  AuthError,
  AuthHeading,
  AuthPrimaryButton,
  AuthShell,
  GoogleButton,
  MicrosoftButton,
} from "./AuthShell";
import CompanySignInForm from "./CompanySignInForm";

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
  const [submitting, setSubmitting] = useState(false);
  const [deadLink] = useState<InvitationErrorView | null>(() => {
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

  return (
    <AuthShell aside={<InviteAside invitation={invitation} />}>
      <AuthHeading
        title="Accept your invitation"
        subtitle="Sign in with the account for the invited email to join."
      />

      <InvitationSummary invitation={invitation} />

      <div className="-mt-4 mb-8 flex items-center gap-2 px-1 text-[13px] font-medium text-gray-500">
        <Mail className="h-4 w-4 shrink-0 text-gray-400" />
        <span>
          Invited email: <span className="font-bold text-gray-800">{invitation.email}</span>
        </span>
      </div>

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

      <GoogleButton onClick={continueWithGoogle} disabled={submitting} spacing="mb-4" />
      <MicrosoftButton
        href={ssoStartPath({ kind: "microsoft", invite: token })}
        disabled={submitting}
      />

      <p className="mt-4 text-center text-[13px] font-medium text-gray-400">
        Use the Google or Microsoft account for {invitation.email}. If you don&apos;t
        have one, ask your organization&apos;s admin.
      </p>
    </AuthShell>
  );
};

export default AcceptInvitePage;
