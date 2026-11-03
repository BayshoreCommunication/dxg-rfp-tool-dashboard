"use client";

import { ExternalLink, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  checkSsoConnectionAction,
  deleteSsoConnectionAction,
  getSsoSettingsAction,
  saveSsoConnectionAction,
  setRequireSsoAction,
  setSsoStatusAction,
  type SsoCheckResult,
  type SsoSettings,
} from "@/app/actions/sso";
import { ssoStartPath } from "@/lib/auth/sso";
import { useOrgAccess } from "../members/useOrgAccess";
import { formatCheckTime } from "./domainDisplay";
import { securityErrorMessage } from "./securityMessages";
import {
  emptySsoForm,
  hasSsoFormErrors,
  SSO_STATUS_LABEL,
  ssoSavePayload,
  ssoStatusKey,
  testSignInEmailError,
  toggleDomain,
  validateSsoForm,
  type SsoFormErrors,
  type SsoFormValues,
} from "./ssoSettings";
import {
  ConfirmDialog,
  CopyButton,
  InlineError,
  SectionCard,
  StatusPill,
  dangerButtonClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
} from "./ui";

const TITLE = "Single sign-on";
const DESCRIPTION =
  "Let members sign in with your company's identity provider (Okta, Microsoft Entra ID, Google Workspace or any OpenID Connect provider). Company sign-ins skip RFPilot's own two-factor prompt, because your identity provider handles it.";

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-rose-600">
      {message}
    </p>
  ) : null;

const SetupGuides = ({ redirectUri }: { redirectUri: string }) => (
  <div className="mt-6 space-y-2">
    <p className="text-sm font-semibold text-[#222628]">Setup guides</p>
    {[
      {
        name: "Okta",
        steps: [
          "In the Okta Admin Console, go to Applications → Create App Integration → OIDC - OpenID Connect → Web Application.",
          `Add the sign-in redirect URI: ${redirectUri || "the Redirect URI above"}.`,
          "Assign the people or groups who should use RFPilot.",
          "Copy the Client ID and Client secret. The issuer URL is your Okta domain, like https://yourcompany.okta.com.",
        ],
      },
      {
        name: "Microsoft Entra ID",
        steps: [
          "In the Entra admin center, go to App registrations → New registration. Choose \"Accounts in this organizational directory only\".",
          `Add a Web redirect URI: ${redirectUri || "the Redirect URI above"}.`,
          "Under Certificates & secrets, create a client secret and copy its Value.",
          "Copy the Application (client) ID. The issuer URL is https://login.microsoftonline.com/<your tenant ID>/v2.0.",
          "Under Token configuration, add the optional claim email to the ID token.",
        ],
      },
      {
        name: "Google Workspace",
        steps: [
          "In the Google Cloud console for your Workspace, go to APIs & Services → OAuth consent screen and choose Internal.",
          "Go to Credentials → Create credentials → OAuth client ID → Web application.",
          `Add the authorized redirect URI: ${redirectUri || "the Redirect URI above"}.`,
          "Copy the Client ID and Client secret. The issuer URL is https://accounts.google.com.",
        ],
      },
    ].map((guide) => (
      <details key={guide.name} className="rounded-md border border-[#e4e4e4] px-4 py-2">
        <summary className="cursor-pointer text-sm font-semibold text-[#222628]">{guide.name}</summary>
        <ol className="mt-2 list-decimal space-y-1 pb-2 pl-5 text-sm text-[#4b5563]">
          {guide.steps.map((step) => (
            <li key={step} className="break-words">
              {step}
            </li>
          ))}
        </ol>
      </details>
    ))}
  </div>
);

const CheckResult = ({ result }: { result: SsoCheckResult }) => (
  <div
    role="status"
    className={`mt-4 rounded-md border px-4 py-3 text-sm ${
      result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
    }`}
  >
    <p className="font-semibold">
      {result.ok ? "Settings look right. We reached your identity provider." : "We found problems with these settings."}
    </p>
    {result.authorizationEndpoint ? (
      <p className="mt-1 break-all text-xs">Sign-in page: {result.authorizationEndpoint}</p>
    ) : null}
    {result.problems.length ? (
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {result.problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    ) : null}
  </div>
);

type Load = { state: "loading" } | { state: "denied" } | { state: "error"; message: string } | { state: "ok"; settings: SsoSettings };

type Confirm = null | "turn-off" | "require-on" | "require-off" | "delete";

export const SingleSignOnCard = () => {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [form, setForm] = useState<SsoFormValues>(emptySsoForm(null));
  const [errors, setErrors] = useState<SsoFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "save" | "check" | "status" | "require" | "delete">(null);
  const [checkResult, setCheckResult] = useState<SsoCheckResult | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testError, setTestError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await getSsoSettingsAction();
    if (res.success && res.data) {
      setLoad({ state: "ok", settings: res.data });
      setForm(emptySsoForm(res.data.connection));
      setErrors({});
    } else if (res.status === 403 || res.status === 401) {
      setLoad({ state: "denied" });
    } else {
      setLoad({ state: "error", message: securityErrorMessage(res.code, "sso", res.status) });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  if (load.state === "loading") {
    return <div className="h-40 animate-pulse rounded-md border border-[#e4e4e4] bg-white" />;
  }
  if (load.state === "denied") return <SingleSignOnReadOnly />;
  if (load.state === "error") {
    return (
      <SectionCard title={TITLE} description={DESCRIPTION}>
        <InlineError message={load.message} />
      </SectionCard>
    );
  }

  const { settings } = load;
  const connection = settings.connection;
  const statusKey = ssoStatusKey(connection);
  const active = connection?.status === "active";
  const update = (patch: Partial<SsoSettings>) => setLoad({ state: "ok", settings: { ...settings, ...patch } });

  const failed = (res: { code?: string; status?: number }, setter: (message: string) => void) => {
    setter(securityErrorMessage(res.code, "sso", res.status));
    if (res.code === "VERSION_CONFLICT") void reload();
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateSsoForm(form, {
      hasClientSecret: Boolean(connection?.hasClientSecret),
      verifiedDomains: settings.verifiedDomains,
    });
    setErrors(found);
    setSaveError(null);
    if (hasSsoFormErrors(found)) return;
    setBusy("save");
    const res = await saveSsoConnectionAction({ ...ssoSavePayload(form), version: connection?.version });
    setBusy(null);
    if (res.success && res.data) {
      update({ connection: res.data });
      setForm(emptySsoForm(res.data));
      setCheckResult(null);
      toast.success(connection ? "Single sign-on settings saved." : "Single sign-on connection saved. Check it, then turn it on.");
      return;
    }
    if (res.success) {
      void reload();
      return;
    }
    failed(res, setSaveError);
  };

  const check = async () => {
    setBusy("check");
    setActionError(null);
    const res = await checkSsoConnectionAction();
    setBusy(null);
    if (res.success && res.data) {
      setCheckResult(res.data);
      void reload();
    } else {
      failed(res, setActionError);
    }
  };

  const setStatus = async (status: "active" | "draft") => {
    setBusy("status");
    setActionError(null);
    const res = await setSsoStatusAction(status);
    setBusy(null);
    setConfirm(null);
    if (res.success) {
      if (res.data) update({ connection: res.data });
      else void reload();
      toast.success(status === "active" ? "Company sign-in is on." : "Company sign-in is off.");
    } else {
      failed(res, setActionError);
    }
  };

  const setRequire = async (requireSso: boolean) => {
    setBusy("require");
    setActionError(null);
    const res = await setRequireSsoAction(requireSso);
    setBusy(null);
    setConfirm(null);
    if (res.success && res.data) {
      update({ requireSso: res.data.requireSso });
      const out = res.data.signedOutMembers;
      toast.success(
        res.data.requireSso
          ? `Company sign-in is now required.${out ? ` ${out} ${out === 1 ? "member was" : "members were"} signed out.` : ""}`
          : "Company sign-in is no longer required.",
      );
    } else {
      failed(res, setActionError);
    }
  };

  const remove = async () => {
    setBusy("delete");
    setActionError(null);
    const res = await deleteSsoConnectionAction();
    setBusy(null);
    setConfirm(null);
    if (res.success) {
      update({ connection: null, requireSso: false });
      setForm(emptySsoForm(null));
      setCheckResult(null);
      toast.success("Single sign-on connection deleted.");
    } else {
      failed(res, setActionError);
    }
  };

  const testSignIn = () => {
    const problem = testSignInEmailError(testEmail, connection?.domains ?? []);
    setTestError(problem);
    if (problem) return;
    window.open(
      ssoStartPath({ kind: "company", email: testEmail.trim().toLowerCase() }),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const noVerifiedDomains = settings.verifiedDomains.length === 0;

  return (
    <SectionCard
      title={TITLE}
      description={DESCRIPTION}
      badge={<StatusPill on={active} onText={SSO_STATUS_LABEL.active} offText={SSO_STATUS_LABEL[statusKey]} />}
    >
      <div className="max-w-2xl">
        <p className={labelClass}>Redirect URI</p>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-[#e4e4e4] bg-[#f9fafb] px-3 py-2">
          <code className="min-w-0 flex-1 break-all text-sm text-[#222628]">{settings.redirectUri || "Not available"}</code>
          {settings.redirectUri ? <CopyButton value={settings.redirectUri} label="Copy" /> : null}
        </div>
        <p className="mt-1 text-xs text-slate-500">Add this to the app you create in your identity provider.</p>
      </div>

      <form onSubmit={save} className="mt-6 max-w-2xl space-y-4" noValidate>
        <div>
          <label htmlFor="sso-issuer" className={labelClass}>
            Issuer URL
          </label>
          <input
            id="sso-issuer"
            className={inputClass}
            value={form.issuer}
            onChange={(e) => setForm({ ...form, issuer: e.target.value })}
            placeholder="https://yourcompany.okta.com"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.issuer)}
            aria-describedby={errors.issuer ? "sso-issuer-error" : undefined}
          />
          <FieldError id="sso-issuer-error" message={errors.issuer} />
        </div>
        <div>
          <label htmlFor="sso-client-id" className={labelClass}>
            Client ID
          </label>
          <input
            id="sso-client-id"
            className={inputClass}
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.clientId)}
            aria-describedby={errors.clientId ? "sso-client-id-error" : undefined}
          />
          <FieldError id="sso-client-id-error" message={errors.clientId} />
        </div>
        <div>
          <label htmlFor="sso-client-secret" className={labelClass}>
            Client secret
          </label>
          <input
            id="sso-client-secret"
            type="password"
            className={inputClass}
            value={form.clientSecret}
            onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
            placeholder={connection?.hasClientSecret ? "Saved. Leave blank to keep it." : ""}
            autoComplete="new-password"
            spellCheck={false}
            aria-invalid={Boolean(errors.clientSecret)}
            aria-describedby="sso-client-secret-note"
          />
          <p id="sso-client-secret-note" className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <KeyRound size={12} /> Stored encrypted. Nobody can read it back, including Admins; you can only replace it.
          </p>
          <FieldError id="sso-client-secret-error" message={errors.clientSecret} />
        </div>
        <fieldset>
          <legend className={labelClass}>Domains that use company sign-in</legend>
          {noVerifiedDomains ? (
            <p className="rounded-md border border-dashed border-[#e4e4e4] px-3 py-3 text-sm text-slate-500">
              Verify your company&apos;s email domain under Verified domains first. Only verified domains can use company sign-in.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {settings.verifiedDomains.map((domain) => (
                <label key={domain} className="inline-flex items-center gap-2 rounded-md border border-[#e4e4e4] px-3 py-2 text-sm text-[#222628]">
                  <input
                    type="checkbox"
                    checked={form.domains.includes(domain)}
                    onChange={() => setForm({ ...form, domains: toggleDomain(form.domains, domain) })}
                  />
                  {domain}
                </label>
              ))}
            </div>
          )}
          <FieldError id="sso-domains-error" message={errors.domains} />
        </fieldset>
        <InlineError message={saveError} />
        <button type="submit" className={primaryButtonClass} style={primaryButtonStyle} disabled={busy !== null || noVerifiedDomains}>
          {busy === "save" ? "Saving..." : "Save settings"}
        </button>
      </form>

      {connection ? (
        <div className="mt-8 max-w-2xl border-t border-[#eef0f2] pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={secondaryButtonClass} onClick={check} disabled={busy !== null}>
              {busy === "check" ? "Checking..." : "Check settings"}
            </button>
            {active ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setConfirm("turn-off")}
                disabled={busy !== null || settings.requireSso}
                title={settings.requireSso ? "Stop requiring company sign-in first." : undefined}
              >
                Turn off
              </button>
            ) : (
              <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={() => setStatus("active")} disabled={busy !== null}>
                {busy === "status" ? "Turning on..." : "Turn on"}
              </button>
            )}
            <button type="button" className={dangerButtonClass} onClick={() => setConfirm("delete")} disabled={busy !== null}>
              <Trash2 size={14} /> Delete connection
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Last checked: {formatCheckTime(connection.lastTestedAt)}
            {connection.lastTestOutcome ? ` · ${connection.lastTestOutcome === "ok" ? "Settings looked right" : "Problems found"}` : ""}
          </p>
          {active && settings.requireSso ? (
            <p className="mt-1 text-xs text-slate-500">Stop requiring company sign-in before turning it off.</p>
          ) : null}
          {checkResult ? <CheckResult result={checkResult} /> : null}
          <InlineError message={actionError} />

          <div className="mt-6">
            <label htmlFor="sso-test-email" className={labelClass}>
              Test sign-in
            </label>
            {active ? (
              <>
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    id="sso-test-email"
                    type="email"
                    className={inputClass + " max-w-sm flex-1"}
                    value={testEmail}
                    onChange={(e) => {
                      setTestEmail(e.target.value);
                      setTestError(null);
                    }}
                    placeholder={connection.domains[0] ? `you@${connection.domains[0]}` : "you@yourcompany.com"}
                    autoComplete="email"
                  />
                  <button type="button" className={secondaryButtonClass} onClick={testSignIn}>
                    <ExternalLink size={14} /> Test sign-in
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Opens your identity provider in a new tab. Use your own work email: finishing the test signs this browser in as that account.
                </p>
                <InlineError message={testError} />
              </>
            ) : (
              <p className="text-sm text-slate-500">Turn company sign-in on to try a real sign-in. Check settings works while it&apos;s off.</p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#e4e4e4] px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#222628]">
                <ShieldCheck size={16} className="text-[#008ad2]" /> Require company sign-in
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Members with an email on {connection.domains.join(", ") || "your connected domains"} can only sign in through your
                identity provider. The Owner can still use Google or Microsoft, in case the identity provider breaks.
              </p>
            </div>
            <StatusPill on={settings.requireSso} onText="Required" offText="Not required" />
            <button
              type="button"
              className={settings.requireSso ? secondaryButtonClass : primaryButtonClass}
              style={settings.requireSso ? undefined : primaryButtonStyle}
              onClick={() => setConfirm(settings.requireSso ? "require-off" : "require-on")}
              disabled={busy !== null || (!settings.requireSso && !active)}
              title={!settings.requireSso && !active ? "Turn company sign-in on first." : undefined}
            >
              {settings.requireSso ? "Stop requiring" : "Require"}
            </button>
          </div>
        </div>
      ) : null}

      <SetupGuides redirectUri={settings.redirectUri} />

      <ConfirmDialog
        open={confirm === "require-on"}
        title="Require company sign-in?"
        confirmLabel="Require company sign-in"
        busy={busy === "require"}
        onConfirm={() => setRequire(true)}
        onCancel={() => setConfirm(null)}
      >
        <p>
          Members with an email on {connection?.domains.join(", ")} will only be able to sign in through your identity provider. Google and
          Microsoft sign-in will stop working for them.
        </p>
        <p>Anyone signed in another way is signed out now. The Owner keeps Google or Microsoft sign-in as a backup.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "require-off"}
        title="Stop requiring company sign-in?"
        confirmLabel="Stop requiring"
        busy={busy === "require"}
        onConfirm={() => setRequire(false)}
        onCancel={() => setConfirm(null)}
      >
        <p>Members will be able to sign in with Google or Microsoft again, as well as through your identity provider.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "turn-off"}
        title="Turn off company sign-in?"
        confirmLabel="Turn off"
        busy={busy === "status"}
        onConfirm={() => setStatus("draft")}
        onCancel={() => setConfirm(null)}
      >
        <p>Members will need to sign in with Google or Microsoft until you turn it back on. Your settings are kept.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "delete"}
        danger
        title="Delete the single sign-on connection?"
        confirmLabel="Delete connection"
        busy={busy === "delete"}
        onConfirm={remove}
        onCancel={() => setConfirm(null)}
      >
        <p>Company sign-in stops working and the stored client secret is removed.</p>
        {settings.requireSso ? <p>Company sign-in will also stop being required.</p> : null}
      </ConfirmDialog>
    </SectionCard>
  );
};

/* Viewers, Planners and Team Managers. */
export const SingleSignOnReadOnly = () => (
  <SectionCard title={TITLE}>
    <p className="text-sm text-slate-500">
      Single sign-on is managed by your organization&apos;s Owner and Admins. Ask them if you need to change how your organization signs in.
    </p>
  </SectionCard>
);

/* The Security page entry: admin controls only for Owners and Admins. */
const SingleSignOnSection = () => {
  const { access, error } = useOrgAccess();
  if (error) {
    return (
      <SectionCard title={TITLE}>
        <InlineError message={error} />
      </SectionCard>
    );
  }
  if (!access) return <div className="h-40 animate-pulse rounded-md border border-[#e4e4e4] bg-white" />;
  if (!access.canManageMembers) return <SingleSignOnReadOnly />;
  return <SingleSignOnCard />;
};

export default SingleSignOnSection;
