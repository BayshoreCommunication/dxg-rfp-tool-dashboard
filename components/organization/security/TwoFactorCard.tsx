"use client";

import { ShieldCheck, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useReducer, useState } from "react";
import { toast } from "react-toastify";
import {
  confirmTwoFactorEnrolmentAction,
  disableTwoFactorAction,
  regenerateRecoveryCodesAction,
  startTwoFactorEnrolmentAction,
  type TwoFactorStatus,
} from "@/app/actions/security";
import {
  confirmErrorRestarts,
  enrolmentReducer,
  formatSecret,
  initialEnrolmentState,
} from "./enrolmentState";
import RecoveryCodesPanel from "./RecoveryCodesPanel";
import { isSixDigitCode, secondFactorPayload, securityErrorMessage } from "./securityMessages";
import {
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

type Props = {
  status: TwoFactorStatus | null;
  loadError?: string | null;
  account?: string;
  /** Bumped by the organization section to open setup from its refusal message. */
  startSignal?: number;
  onChanged: () => void;
};

const QrImage = ({ uri }: { uri: string }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(uri, { margin: 1, width: 200 })
      .then((url) => live && setSrc(url))
      .catch(() => live && setSrc(null));
    return () => {
      live = false;
    };
  }, [uri]);
  return (
    <div className="flex h-[200px] w-[200px] items-center justify-center rounded-md border border-[#e4e4e4] bg-white">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="QR code for your authenticator app" width={200} height={200} />
      ) : (
        <span className="text-xs text-slate-400">Generating QR code...</span>
      )}
    </div>
  );
};

const TwoFactorCard = ({ status, loadError, account, startSignal = 0, onChanged }: Props) => {
  const [enrolment, dispatch] = useReducer(enrolmentReducer, initialEnrolmentState);
  const [code, setCode] = useState("");
  const [panel, setPanel] = useState<"none" | "disable" | "regenerate">("none");
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  const start = async () => {
    dispatch({ type: "start" });
    setPanel("none");
    const res = await startTwoFactorEnrolmentAction();
    if (res.success && res.data?.otpauthUri) {
      setCode("");
      dispatch({ type: "started", otpauthUri: res.data.otpauthUri, secret: res.data.secret });
    } else {
      dispatch({ type: "startFailed", error: securityErrorMessage(res.code, "enrol", res.status) });
      if (res.code === "TWO_FACTOR_ALREADY_ENABLED") onChanged();
    }
  };

  // Opening setup when asked from the organization section.
  useEffect(() => {
    if (startSignal > 0 && status && !status.enabled && enrolment.step === "idle") {
      document.getElementById("my-two-factor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      void start();
    }
    // Only react to a new signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSignal]);

  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSixDigitCode(code)) return;
    dispatch({ type: "confirm" });
    const res = await confirmTwoFactorEnrolmentAction(code.replace(/\s/g, ""));
    if (res.success && res.data) {
      dispatch({ type: "confirmed", recoveryCodes: res.data.recoveryCodes });
      toast.success("Two-factor authentication is on.");
    } else {
      dispatch({
        type: "confirmFailed",
        error: securityErrorMessage(res.code, "enrol", res.status),
        restart: confirmErrorRestarts(res.code),
      });
    }
  };

  const finish = () => {
    dispatch({ type: "finish" });
    setNewCodes(null);
    onChanged();
  };

  const enabled = Boolean(status?.enabled);
  const remaining = status?.recoveryCodesRemaining ?? 0;

  return (
    <div id="my-two-factor" className="scroll-mt-6">
      <SectionCard
        title="My two-factor authentication"
        description="Protect your account with a code from an authenticator app (Google Authenticator, 1Password, Authy, Microsoft Authenticator) each time you sign in."
        badge={status ? <StatusPill on={enabled} /> : null}
      >
        {loadError ? <InlineError message={loadError} /> : null}

        {status && enrolment.step === "idle" && !newCodes ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#4b5563]">
              {enabled ? (
                <span className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  Two-factor is on.
                  <span className={remaining <= 2 ? "font-semibold text-amber-700" : ""}>
                    {remaining} recovery {remaining === 1 ? "code" : "codes"} left.
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Smartphone size={16} className="text-slate-400" />
                  Two-factor is off. Turning it on takes about a minute.
                </span>
              )}
              {status.requiredByOrganization ? (
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-[#008ad2]">
                  Required by your organization
                </span>
              ) : null}
            </div>
            {"error" in enrolment ? <InlineError message={enrolment.error} /> : null}

            {enabled ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={secondaryButtonClass} onClick={() => setPanel(panel === "regenerate" ? "none" : "regenerate")}>
                  New recovery codes
                </button>
                <button
                  type="button"
                  className={dangerButtonClass}
                  disabled={status.requiredByOrganization}
                  title={status.requiredByOrganization ? "Your organization requires two-factor authentication" : undefined}
                  onClick={() => setPanel(panel === "disable" ? "none" : "disable")}
                >
                  Turn off
                </button>
              </div>
            ) : (
              <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={start}>
                Turn on two-factor
              </button>
            )}

            {enabled && status.requiredByOrganization ? (
              <p className="text-xs text-slate-500">Your organization requires two-factor, so it can&apos;t be turned off.</p>
            ) : null}

            {panel === "regenerate" ? (
              <RegenerateForm
                onCancel={() => setPanel("none")}
                onDone={(codes) => {
                  setPanel("none");
                  setNewCodes(codes);
                }}
              />
            ) : null}
            {panel === "disable" ? (
              <DisableForm
                onCancel={() => setPanel("none")}
                onDone={() => {
                  setPanel("none");
                  toast.success("Two-factor authentication is off.");
                  onChanged();
                }}
              />
            ) : null}
          </div>
        ) : null}

        {enrolment.step === "starting" ? <p className="text-sm text-slate-500">Preparing your QR code...</p> : null}

        {enrolment.step === "scan" || enrolment.step === "confirming" ? (
          <form onSubmit={confirm} className="grid gap-6 md:grid-cols-[auto,1fr]">
            <QrImage uri={enrolment.otpauthUri} />
            <div className="space-y-4">
              <ol className="list-decimal space-y-1 pl-5 text-sm text-[#4b5563]">
                <li>Open your authenticator app and add an account.</li>
                <li>Scan the QR code, or type the key below if you can&apos;t scan.</li>
                <li>Enter the 6-digit code the app shows.</li>
              </ol>
              <div>
                <span className={labelClass}>Setup key</span>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-md border border-[#e4e4e4] bg-[#f5f6f8] px-3 py-2 font-mono text-sm tracking-wider text-[#222628]">
                    {formatSecret(enrolment.secret)}
                  </code>
                  <CopyButton value={enrolment.secret} label="Copy key" />
                </div>
              </div>
              <div className="max-w-xs">
                <label htmlFor="enrol-code" className={labelClass}>
                  6-digit code
                </label>
                <input
                  id="enrol-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, ""))}
                  className={inputClass + " font-mono tracking-[0.3em]"}
                  placeholder="123456"
                  autoFocus
                />
              </div>
              {enrolment.step === "scan" ? <InlineError message={enrolment.error} /> : null}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className={primaryButtonClass}
                  style={primaryButtonStyle}
                  disabled={!isSixDigitCode(code) || enrolment.step === "confirming"}
                >
                  {enrolment.step === "confirming" ? "Checking..." : "Turn on"}
                </button>
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={enrolment.step === "confirming"}
                  onClick={() => dispatch({ type: "cancel" })}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : null}

        {enrolment.step === "codes" ? (
          <RecoveryCodesPanel codes={enrolment.recoveryCodes} account={account} onDone={finish} />
        ) : null}
        {newCodes && enrolment.step === "idle" ? (
          <RecoveryCodesPanel codes={newCodes} account={account} onDone={finish} />
        ) : null}
      </SectionCard>
    </div>
  );
};

const CodeField = ({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label htmlFor={id} className={labelClass}>
      Authenticator code or recovery code
    </label>
    <input
      id={id}
      autoComplete="one-time-code"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass + " font-mono"}
      placeholder="123456"
    />
  </div>
);

const RegenerateForm = ({ onCancel, onDone }: { onCancel: () => void; onDone: (codes: string[]) => void }) => {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const factor = secondFactorPayload(value);
    if (!factor) {
      setError("Enter the 6-digit code from your app, or one of your recovery codes.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await regenerateRecoveryCodesAction(factor);
    setBusy(false);
    if (res.success && res.data) onDone(res.data.recoveryCodes);
    else setError(securityErrorMessage(res.code, "recovery", res.status));
  };
  return (
    <form onSubmit={submit} className="max-w-md space-y-3 rounded-md border border-[#e4e4e4] bg-[#f9fafb] p-4">
      <p className="text-sm text-[#4b5563]">You&apos;ll get ten new codes. Your old codes stop working straight away.</p>
      <CodeField id="regen-code" value={value} onChange={setValue} />
      <InlineError message={error} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !value.trim()} className={primaryButtonClass} style={primaryButtonStyle}>
          {busy ? "Creating..." : "Create new codes"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
};

const DisableForm = ({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) => {
  const [password, setPassword] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const factor = secondFactorPayload(value);
    if (!factor) {
      setError("Enter the 6-digit code from your app, or one of your recovery codes.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await disableTwoFactorAction({ password: password || undefined, ...factor });
    setBusy(false);
    if (res.success) onDone();
    else setError(securityErrorMessage(res.code, "disable", res.status));
  };
  return (
    <form onSubmit={submit} className="max-w-md space-y-3 rounded-md border border-rose-100 bg-rose-50/40 p-4">
      <p className="text-sm text-[#4b5563]">
        Turning two-factor off makes your account easier to break into. Confirm it&apos;s you to continue.
      </p>
      <div>
        <label htmlFor="disable-password" className={labelClass}>
          Password
        </label>
        <input
          id="disable-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-500">If you only sign in with Google, leave this blank.</p>
      </div>
      <CodeField id="disable-code" value={value} onChange={setValue} />
      <InlineError message={error} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="inline-flex items-center justify-center rounded-md bg-rose-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {busy ? "Turning off..." : "Turn off two-factor"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default TwoFactorCard;
