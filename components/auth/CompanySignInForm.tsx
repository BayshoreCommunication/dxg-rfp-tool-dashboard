"use client";

import { Building2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { normalizeSsoEmail, ssoErrorMessage } from "@/lib/auth/sso";
import { AuthError, AuthField, AuthPrimaryButton } from "./AuthShell";

/* "Sign in with your company": a plain GET form to /api/sso/start, which sets
   the bind cookie and sends the browser to the backend. The backend finds the
   company's connection from the email domain, and never says whether an
   organization exists if there is none. */
const CompanySignInForm = ({
  invite,
  fixedEmail,
  disabled,
  submitLabel = "Sign in with your company",
}: {
  // Accept-invite page: the invitation token, sent along to the backend.
  invite?: string;
  // Accept-invite page: the invited address; no field to type in.
  fixedEmail?: string;
  disabled?: boolean;
  submitLabel?: string;
}) => {
  const [email, setEmail] = useState(fixedEmail ?? "");
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);

  // Coming back with the browser's Back button restores this page from the
  // back/forward cache with "Redirecting..." still showing.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setLeaving(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    if (leaving || disabled) {
      event.preventDefault();
      return;
    }
    if (!normalizeSsoEmail(email)) {
      event.preventDefault();
      setError(ssoErrorMessage("SSO_EMAIL_INVALID"));
      return;
    }
    setError("");
    // Let the browser follow the form to /api/sso/start.
    setLeaving(true);
  };

  return (
    <form
      id="company"
      method="get"
      action="/api/sso/start"
      onSubmit={submit}
      noValidate
      aria-label="Sign in with your company"
    >
      <input type="hidden" name="kind" value="company" />
      {invite ? <input type="hidden" name="invite" value={invite} /> : null}
      {fixedEmail ? (
        <input type="hidden" name="email" value={fixedEmail} />
      ) : (
        <div className="mb-4">
          <AuthError message={error} />
          <AuthField
            id="company-sso-email"
            name="email"
            label="Work email"
            icon={<Mail className="h-5 w-5" strokeWidth={2} />}
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            // Not disabled while leaving: disabled fields aren't submitted.
            disabled={disabled}
            readOnly={leaving}
          />
        </div>
      )}
      <AuthPrimaryButton type="submit" disabled={disabled || leaving} className="mb-6">
        <span className="inline-flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {leaving ? "Redirecting..." : submitLabel}
        </span>
      </AuthPrimaryButton>
    </form>
  );
};

export default CompanySignInForm;
