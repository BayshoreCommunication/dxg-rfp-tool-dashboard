"use client";

import {
  chooseOnboardingPlanAction,
  completeOnboardingAction,
  saveOrganizationDetailsAction,
  type OrganizationDetailsInput,
  type OrganizationProfile,
} from "@/app/actions/organizationProfile";
import { createBulkInvitationsAction, createInvitationAction } from "@/app/actions/invitations";
import type { OrgActionResult } from "@/app/actions/organizationApi";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/components/organization/members/orgAccess";
import type { InvitableRole } from "@/components/organization/members/types";
import {
  bulkInviteOutcome,
  singleInviteOutcome,
  type InviteOutcome,
} from "@/components/organization/invitations/inviteResults";
import { MAX_BULK_INVITATIONS, summarizeEmailList } from "@/components/organization/invitations/parseEmails";
import type { OnboardingStep } from "@/lib/auth/onboarding";
import { ArrowLeft, Building2, CalendarDays, Check, CheckCircle2, Factory, Sparkles, XCircle } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { AuthError, AuthField, AuthHeading, AuthPrimaryButton, AuthShell } from "./AuthShell";
import {
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY,
  initialTimeZone,
  isPlaceholderName,
  ORGANIZATION_TYPE_OPTIONS,
  US_TIME_ZONE_OPTIONS,
} from "./onboardingOptions";

/* Onboarding for a new organization (ORG-301): company details → plan → invite
   the team (optional) → dashboard. The backend keeps the step, so leaving and
   coming back resumes where the Owner stopped. */

type Navigate = (path: string) => void;
const replaceLocation: Navigate = (path) => window.location.replace(path);

type WizardStep = Exclude<OnboardingStep, "done">;
const STEPS: { step: WizardStep; label: string }[] = [
  { step: "details", label: "Company" },
  { step: "plan", label: "Plan" },
  { step: "team", label: "Team" },
];

const INVITE_ROLES: InvitableRole[] = ["planner", "organization_admin", "viewer"];

const FIELD_ERRORS: Record<string, string> = {
  name: "Enter a company name of up to 200 characters.",
  type: "Choose an organization type from the list.",
  industry: "Keep the industry to 120 characters.",
  country: "Choose a country from the list.",
  timeZone: "Choose a time zone from the list.",
  eventsPerYear: "Enter a whole number of events between 0 and 100,000.",
};

const errorFor = (result: OrgActionResult<unknown>, fallback: string) => {
  const field = result.details?.field;
  if (result.code === "VALIDATION_ERROR" && typeof field === "string" && FIELD_ERRORS[field]) return FIELD_ERRORS[field];
  if (result.status === 403) return "Only the organization's Owner or an Admin can set it up.";
  if (result.status === 429) return "Too many attempts. Wait a few minutes and try again.";
  return fallback;
};

const selectClass =
  "w-full appearance-none rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-4 text-[15px] font-semibold text-gray-900 outline-none transition-all duration-300 hover:border-gray-300 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:opacity-80";

const SelectField = ({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) => (
  <div>
    <label htmlFor={id} className="mb-2 block text-[13px] font-bold text-gray-700">
      {label}
    </label>
    <select id={id} className={selectClass} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  </div>
);

const Progress = ({ current }: { current: WizardStep }) => {
  const index = STEPS.findIndex((entry) => entry.step === current);
  return (
    <ol className="mb-8 flex items-center gap-2" aria-label="Setup progress">
      {STEPS.map((entry, i) => (
        <li key={entry.step} className="flex flex-1 items-center gap-2" aria-current={i === index ? "step" : undefined}>
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
              i < index ? "bg-primary text-white" : i === index ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"
            }`}
          >
            {i < index ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <span className={`text-[12.5px] font-bold ${i === index ? "text-gray-900" : "text-gray-400"}`}>{entry.label}</span>
          {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-gray-200" /> : null}
        </li>
      ))}
    </ol>
  );
};

const WelcomeAside = () => (
  <>
    <h2 className="text-[32px] font-extrabold leading-tight tracking-tight">Let&apos;s set up your workspace.</h2>
    <div className="space-y-5">
      {["Tell us about your organization", "Start your free trial", "Bring in your team"].map((line) => (
        <div key={line} className="flex items-center gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-medium text-white/90">{line}</span>
        </div>
      ))}
    </div>
  </>
);

const BackButton = ({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="mb-6 flex items-center text-sm font-medium text-gray-500 hover:text-black disabled:opacity-60"
  >
    <ArrowLeft className="mr-1 h-4 w-4" />
    Back
  </button>
);

const OnboardingWizard = ({
  firstName,
  profile,
  navigate = replaceLocation,
}: {
  firstName: string;
  profile: OrganizationProfile;
  navigate?: Navigate;
}) => {
  const [step, setStep] = useState<WizardStep>(profile.onboardingStep === "done" ? "team" : profile.onboardingStep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [details, setDetails] = useState<OrganizationDetailsInput>(() => ({
    name: isPlaceholderName(profile.name) ? "" : profile.name,
    type: profile.type ?? "",
    industry: profile.industry ?? "",
    country: DEFAULT_COUNTRY,
    timeZone: initialTimeZone(profile.timeZone),
    eventsPerYear: profile.eventsPerYear === null ? "" : String(profile.eventsPerYear),
  }));

  const [inviteText, setInviteText] = useState("");
  const [inviteRole, setInviteRole] = useState<InvitableRole>("planner");
  const [invited, setInvited] = useState<Extract<InviteOutcome, { kind: "rows" }> | null>(null);
  const inviteSummary = useMemo(() => summarizeEmailList(inviteText), [inviteText]);

  const goTo = (next: WizardStep) => {
    setError("");
    setStep(next);
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const setDetail = <K extends keyof OrganizationDetailsInput>(key: K, value: OrganizationDetailsInput[K]) => {
    setDetails((current) => ({ ...current, [key]: value }));
    if (error) setError("");
  };

  const saveDetails = (event: React.FormEvent) => {
    event.preventDefault();
    if (!details.name.trim()) {
      setError("Enter your company name.");
      return;
    }
    const events = details.eventsPerYear.trim();
    if (events && !/^\d+$/.test(events)) {
      setError(FIELD_ERRORS.eventsPerYear);
      return;
    }
    void run(async () => {
      const result = await saveOrganizationDetailsAction({ ...details, name: details.name.trim() });
      if (!result.success) {
        setError(errorFor(result, "We couldn't save your company details. Try again."));
        return;
      }
      goTo("plan");
    });
  };

  const startTrial = () =>
    run(async () => {
      const result = await chooseOnboardingPlanAction("free_trial");
      if (!result.success) {
        setError(errorFor(result, "We couldn't start your trial. Try again."));
        return;
      }
      goTo("team");
    });

  const finish = () =>
    run(async () => {
      const result = await completeOnboardingAction();
      if (!result.success) {
        setError(errorFor(result, "We couldn't finish setting up. Try again."));
        return;
      }
      navigate("/dashboard");
    });

  const sendInvites = (event: React.FormEvent) => {
    event.preventDefault();
    if (inviteSummary.emails.length === 0) {
      setError("Enter at least one email address, or skip this step.");
      return;
    }
    if (inviteSummary.tooMany) {
      setError(`Invite at most ${MAX_BULK_INVITATIONS} people at a time.`);
      return;
    }
    void run(async () => {
      const [email] = inviteSummary.emails;
      const outcome =
        inviteSummary.emails.length === 1
          ? singleInviteOutcome(email, await createInvitationAction({ email, role: inviteRole, teamId: null }))
          : bulkInviteOutcome(
              await createBulkInvitationsAction({ emails: inviteSummary.emails, role: inviteRole, teamId: null }),
            );
      if (outcome.kind === "error") {
        setError(outcome.message);
        return;
      }
      setInvited(outcome);
      setInviteText("");
    });
  };

  return (
    <AuthShell aside={<WelcomeAside />}>
      <Progress current={step} />

      {step === "details" ? (
        <>
          <AuthHeading
            title={firstName ? `Welcome, ${firstName}` : "Welcome"}
            subtitle="Tell us about your organization. Only the company name is required."
          />
          <AuthError message={error} />
          <form onSubmit={saveDetails} noValidate>
            <div className="mb-6 space-y-4">
              <AuthField
                id="onboarding-name"
                label="Company name"
                icon={<Building2 className="h-5 w-5" strokeWidth={2} />}
                autoComplete="organization"
                placeholder="Acme Events"
                maxLength={200}
                autoFocus
                value={details.name}
                disabled={busy}
                onChange={(e) => setDetail("name", e.target.value)}
              />
              <SelectField
                id="onboarding-type"
                label="Organization type"
                value={details.type}
                disabled={busy}
                onChange={(value) => setDetail("type", value as OrganizationDetailsInput["type"])}
              >
                <option value="">Choose one (optional)</option>
                {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <AuthField
                id="onboarding-industry"
                label="Industry (optional)"
                icon={<Factory className="h-5 w-5" strokeWidth={2} />}
                placeholder="Pharmaceuticals, technology, finance…"
                maxLength={120}
                value={details.industry}
                disabled={busy}
                onChange={(e) => setDetail("industry", e.target.value)}
              />
              <SelectField
                id="onboarding-country"
                label="Country"
                value={details.country}
                disabled={busy}
                onChange={(value) => setDetail("country", value)}
              >
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id="onboarding-time-zone"
                label="Time zone"
                value={details.timeZone}
                disabled={busy}
                onChange={(value) => setDetail("timeZone", value)}
              >
                {US_TIME_ZONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <AuthField
                id="onboarding-events"
                label="Events per year (optional)"
                icon={<CalendarDays className="h-5 w-5" strokeWidth={2} />}
                inputMode="numeric"
                placeholder="12"
                value={details.eventsPerYear}
                disabled={busy}
                onChange={(e) => setDetail("eventsPerYear", e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <AuthPrimaryButton type="submit" disabled={busy}>
              {busy ? "Saving..." : "Continue"}
            </AuthPrimaryButton>
          </form>
        </>
      ) : null}

      {step === "plan" ? (
        <>
          <BackButton onClick={() => goTo("details")} disabled={busy} />
          <AuthHeading title="Choose your plan" subtitle="Start free. You can upgrade when paid plans open." />
          <AuthError message={error} />
          <div className="mb-6 rounded-2xl border-2 border-primary bg-primary/5 p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="text-[16px] font-extrabold text-gray-900">Free trial</p>
            </div>
            <ul className="space-y-1.5 text-[13.5px] font-medium text-gray-600">
              <li>Create up to 2 RFPs with your team.</li>
              <li>Vendor responses and proposal intelligence unlock on a paid plan.</li>
            </ul>
          </div>
          <AuthPrimaryButton type="button" onClick={startTrial} disabled={busy} className="mb-4">
            {busy ? "Starting..." : "Start free trial"}
          </AuthPrimaryButton>
          <p className="text-center text-[13px] font-medium text-gray-400">
            Need more now? Talk to us about a paid plan.
          </p>
        </>
      ) : null}

      {step === "team" ? (
        <>
          <BackButton onClick={() => goTo("plan")} disabled={busy} />
          <AuthHeading title="Invite your team" subtitle="Add the people you plan events with. You can do this later too." />
          <AuthError message={error} />
          {invited ? (
            <div role="status" className="mb-6 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
              <p className="mb-2 text-[14px] font-bold text-gray-900">
                {invited.invited === 1 ? "1 invitation sent" : `${invited.invited} invitations sent`}
              </p>
              <ul className="space-y-1 text-[13px]">
                {invited.rows.map((row) => (
                  <li key={row.row} className="flex items-start gap-2">
                    {row.invited ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    )}
                    <span className="break-all text-gray-700">
                      {row.email}
                      {row.reason ? <span className="text-gray-500"> — {row.reason}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <form onSubmit={sendInvites} noValidate>
            <div className="mb-4">
              <label htmlFor="onboarding-invite-emails" className="mb-2 block text-[13px] font-bold text-gray-700">
                Email addresses
              </label>
              <textarea
                id="onboarding-invite-emails"
                rows={3}
                placeholder="sam@company.com, alex@company.com"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-[15px] font-semibold text-gray-900 outline-none transition-all duration-300 placeholder:font-medium placeholder:text-gray-400 hover:border-gray-300 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                value={inviteText}
                disabled={busy}
                onChange={(e) => {
                  setInviteText(e.target.value);
                  if (error) setError("");
                }}
              />
              {inviteSummary.invalid.length > 0 ? (
                <p className="mt-1 text-[12px] font-medium text-amber-600">
                  Check {inviteSummary.invalid.length === 1 ? "this address" : "these addresses"}:{" "}
                  {inviteSummary.invalid.join(", ")}
                </p>
              ) : null}
            </div>
            <div className="mb-6">
              <SelectField
                id="onboarding-invite-role"
                label="Role"
                value={inviteRole}
                disabled={busy}
                onChange={(value) => setInviteRole(value as InvitableRole)}
              >
                {INVITE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]} — {ROLE_DESCRIPTIONS[role]}
                  </option>
                ))}
              </SelectField>
            </div>
            <AuthPrimaryButton type="submit" disabled={busy} className="mb-4">
              {busy ? "Sending..." : "Send invitations"}
            </AuthPrimaryButton>
          </form>
          <button
            type="button"
            onClick={finish}
            disabled={busy}
            className="flex w-full cursor-pointer items-center justify-center rounded-2xl border border-gray-200 bg-white py-4 text-[15px] font-bold text-gray-700 transition-all hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {invited && invited.invited > 0 ? "Go to dashboard" : "Skip for now"}
          </button>
        </>
      ) : null}
    </AuthShell>
  );
};

export default OnboardingWizard;
