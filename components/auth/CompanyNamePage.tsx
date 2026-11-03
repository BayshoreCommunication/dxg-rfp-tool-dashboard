"use client";

import { saveCompanyNameAction, skipCompanyNameAction } from "@/app/actions/organizationProfile";
import { Building2, Loader2 } from "lucide-react";
import { useState } from "react";
import { AuthError, AuthField, AuthHeading, AuthPrimaryButton, AuthShell } from "./AuthShell";

const MAX_LENGTH = 200;

const WelcomeAside = () => (
  <h2 className="text-[32px] font-extrabold leading-tight tracking-tight">
    One last thing before your first RFP.
  </h2>
);

type Navigate = (path: string) => void;
const replaceLocation: Navigate = (path) => window.location.replace(path);

const errorFor = (code?: string, status?: number) => {
  if (code === "VALIDATION_ERROR") return "Enter a company name of up to 200 characters.";
  if (status === 403) return "Only the organization's Owner or an Admin can name it.";
  if (status === 429) return "Too many attempts. Wait a few minutes and try again.";
  return "We couldn't save the company name. Try again.";
};

/* Shown once after a first Google or Microsoft sign-up, whose organization starts
   as "<Name>'s organization". Saving renames it; skipping keeps the placeholder
   for this session only, so the next sign-in asks again. */
const CompanyNamePage = ({
  firstName,
  navigate = replaceLocation,
}: {
  firstName: string;
  navigate?: Navigate;
}) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"save" | "skip" | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter your company name.");
      return;
    }
    setPending("save");
    setError("");
    try {
      const result = await saveCompanyNameAction(trimmed);
      if (result.success) {
        navigate("/dashboard");
        return;
      }
      setError(errorFor(result.code, result.status));
    } catch {
      setError(errorFor());
    }
    setPending(null);
  };

  const skip = async () => {
    setPending("skip");
    try {
      await skipCompanyNameAction();
    } finally {
      navigate("/dashboard");
    }
  };

  return (
    <AuthShell aside={<WelcomeAside />}>
      <AuthHeading
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        subtitle="What's the name of your company? We'll use it for your organization in RFPilot."
      />
      <form onSubmit={save} noValidate>
        <AuthError message={error} />
        <div className="mb-6">
          <AuthField
            id="company-name"
            name="company"
            label="Company name"
            icon={<Building2 className="h-5 w-5" strokeWidth={2} />}
            autoComplete="organization"
            placeholder="Acme Events"
            maxLength={MAX_LENGTH}
            required
            autoFocus
            value={name}
            disabled={pending !== null}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError("");
            }}
          />
        </div>
        <AuthPrimaryButton type="submit" disabled={pending !== null}>
          {pending === "save" ? "Saving..." : "Continue"}
        </AuthPrimaryButton>
      </form>
      <button
        type="button"
        onClick={skip}
        disabled={pending !== null}
        className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 text-[13.5px] font-semibold text-gray-500 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending === "skip" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Skip for now
      </button>
    </AuthShell>
  );
};

export default CompanyNamePage;
