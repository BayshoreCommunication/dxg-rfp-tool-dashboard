"use client";

import {
  cancelTwoFactorAction,
  completeTwoFactorAction,
  startTwoFactorEnrolmentAction,
} from "@/app/actions/auth";
import {
  formatManualKey,
  initialTwoFactorState,
  isCompleteTotpCode,
  isPlausibleRecoveryCode,
  normalizeRecoveryCode,
  normalizeTotpCode,
  recoveryCodesFileText,
  twoFactorReducer,
  type PendingTwoFactorView,
} from "@/lib/auth/twoFactor";
import {
  ArrowLeft,
  Copy,
  Download,
  KeyRound,
  Loader2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "react-toastify";
import { AuthError, AuthField, AuthHeading, AuthPrimaryButton } from "./AuthShell";

const copyText = async (text: string, done: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error("Couldn't copy. Select the text and copy it instead.");
  }
};

const downloadText = (text: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const TextLink = ({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="cursor-pointer text-[13.5px] font-bold text-primary transition-colors hover:text-blue-500 disabled:opacity-60"
  >
    {children}
  </button>
);

/* Second step of sign-in when the account has 2FA (enter a code) or the
   organization requires it (set it up now). The challenge token is never in
   this component: the server actions read it from an httpOnly cookie. */
const TwoFactorStep = ({
  pending,
  onCancel,
  onSignedIn,
  accountLabel,
}: {
  pending: PendingTwoFactorView;
  onCancel: () => void;
  onSignedIn: () => void;
  accountLabel?: string;
}) => {
  const [state, dispatch] = useReducer(
    twoFactorReducer,
    pending.nextStep,
    initialTwoFactorState,
  );
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [savedCodes, setSavedCodes] = useState(false);
  const [expired, setExpired] = useState(() => Date.now() >= pending.expiresAt);
  const enrolmentRequested = useRef(false);

  // The challenge lives ten minutes; once it's gone no code can finish it.
  useEffect(() => {
    if (expired) return;
    const id = window.setInterval(() => {
      if (Date.now() >= pending.expiresAt) setExpired(true);
    }, 5_000);
    return () => window.clearInterval(id);
  }, [expired, pending.expiresAt]);

  useEffect(() => {
    if (state.phase !== "enrol-loading" || enrolmentRequested.current) return;
    enrolmentRequested.current = true;
    startTwoFactorEnrolmentAction()
      .then((result) => {
        if (result.success) {
          dispatch({ type: "enrolment-loaded", enrolment: result.data });
        } else {
          dispatch({ type: "enrolment-failed", code: result.code, message: result.message });
        }
      })
      .catch(() => dispatch({ type: "enrolment-failed", code: "server_unavailable" }))
      .finally(() => {
        enrolmentRequested.current = false;
      });
  }, [state.phase]);

  const backToSignIn = async () => {
    try {
      await cancelTwoFactorAction();
    } catch {
      // Leaving anyway; the cookie expires on its own.
    }
    onCancel();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (state.submitting) return;
    const enrolling = state.phase === "enrol-scan";
    const usingRecovery = state.phase === "recovery";
    if (usingRecovery && !isPlausibleRecoveryCode(recoveryCode)) {
      dispatch({ type: "failed", message: "Enter one of your recovery codes." });
      return;
    }
    if (!usingRecovery && !isCompleteTotpCode(code)) {
      dispatch({ type: "failed", message: "Enter the 6-digit code from your authenticator app." });
      return;
    }
    dispatch({ type: "submit" });
    try {
      const result = await completeTwoFactorAction(
        enrolling
          ? { mode: "enrol", code }
          : usingRecovery
            ? { mode: "challenge", recoveryCode }
            : { mode: "challenge", code },
      );
      if (!result.success) {
        dispatch({ type: "failed", code: result.code, message: result.message });
        setCode("");
        return;
      }
      if (result.recoveryCodes?.length) {
        dispatch({ type: "enrolled", recoveryCodes: result.recoveryCodes });
        return;
      }
      onSignedIn();
    } catch {
      dispatch({ type: "failed", code: "server_unavailable" });
    }
  };

  if (state.phase === "recovery-codes") {
    const fileText = recoveryCodesFileText(state.recoveryCodes, accountLabel);
    return (
      <div>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <AuthHeading
          title="Save your recovery codes"
          subtitle="Two-factor authentication is on. If you lose your phone, each of these codes signs you in once. We won't show them again."
        />
        <ul
          aria-label="Recovery codes"
          className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 font-mono text-[14px] font-semibold tracking-wider text-gray-800"
        >
          {state.recoveryCodes.map((value) => (
            <li key={value} className="rounded-lg bg-white px-3 py-2 text-center ring-1 ring-black/5">
              {value}
            </li>
          ))}
        </ul>
        <div className="mb-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => copyText(state.recoveryCodes.join("\n"), "Recovery codes copied")}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 text-[14px] font-bold text-gray-700 transition-all hover:border-gray-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
          <button
            type="button"
            onClick={() => downloadText(fileText, "rfpilot-recovery-codes.txt")}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 text-[14px] font-bold text-gray-700 transition-all hover:border-gray-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
          >
            <Download className="h-4 w-4" /> Download
          </button>
        </div>
        <label className="mb-6 flex cursor-pointer items-start gap-3 px-1">
          <input
            type="checkbox"
            checked={savedCodes}
            onChange={(event) => setSavedCodes(event.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer accent-[#222628]"
          />
          <span className="text-[13.5px] font-semibold text-gray-600">
            I&apos;ve saved these codes somewhere safe
          </span>
        </label>
        <AuthPrimaryButton type="button" disabled={!savedCodes} onClick={onSignedIn}>
          Continue to Dashboard
        </AuthPrimaryButton>
      </div>
    );
  }

  if (state.phase === "restart" || expired) {
    return (
      <div>
        <AuthHeading
          title="Sign in again"
          subtitle="For your security, this verification step can't continue."
        />
        <AuthError
          message={state.error || "This sign-in attempt has expired. Please sign in again."}
        />
        <AuthPrimaryButton type="button" onClick={backToSignIn}>
          Back to sign in
        </AuthPrimaryButton>
      </div>
    );
  }

  if (state.phase === "enrol-loading" || state.phase === "enrol-failed") {
    return (
      <div>
        <AuthHeading
          title="Set up two-factor"
          subtitle="Your organization requires two-factor authentication. It takes about a minute."
        />
        {state.phase === "enrol-loading" ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 py-12 text-[14px] font-semibold text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Preparing your setup code…
          </div>
        ) : (
          <>
            <AuthError message={state.error} />
            <AuthPrimaryButton type="button" onClick={() => dispatch({ type: "retry-enrolment" })}>
              Try again
            </AuthPrimaryButton>
          </>
        )}
        <div className="mt-8 flex justify-center">
          <TextLink onClick={backToSignIn}>
            <span className="inline-flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </span>
          </TextLink>
        </div>
      </div>
    );
  }

  const enrolling = state.phase === "enrol-scan";
  const usingRecovery = state.phase === "recovery";

  return (
    <div>
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {enrolling ? <Smartphone className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
      </div>
      <AuthHeading
        title={enrolling ? "Set up two-factor" : "Two-factor verification"}
        subtitle={
          enrolling
            ? "Your organization requires two-factor authentication. Scan this QR code with an authenticator app such as Google Authenticator, 1Password or Authy."
            : usingRecovery
              ? "Enter one of the recovery codes you saved when you set up two-factor."
              : "Enter the 6-digit code from your authenticator app."
        }
      />

      {enrolling && state.enrolment ? (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
          <div className="flex justify-center">
            {state.enrolment.qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data: URL drawn on the server
              <img
                src={state.enrolment.qrDataUrl}
                alt="QR code for your authenticator app"
                width={180}
                height={180}
                className="h-[180px] w-[180px] rounded-xl bg-white p-2 ring-1 ring-black/5"
              />
            ) : (
              <p className="py-6 text-center text-[13px] font-semibold text-gray-500">
                Enter the key below in your authenticator app.
              </p>
            )}
          </div>
          <p className="mt-4 text-center text-[12px] font-bold uppercase tracking-wide text-gray-400">
            Can&apos;t scan? Enter this key
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
            <code className="break-all font-mono text-[13px] font-semibold tracking-wider text-gray-800">
              {formatManualKey(state.enrolment.secret)}
            </code>
            <button
              type="button"
              aria-label="Copy setup key"
              onClick={() => copyText(state.enrolment!.secret, "Setup key copied")}
              className="shrink-0 cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <AuthError message={state.error} />

      <form onSubmit={submit}>
        <div className="mb-6">
          {usingRecovery ? (
            <AuthField
              id="two-factor-recovery-code"
              label="Recovery code"
              icon={<KeyRound className="h-5 w-5" strokeWidth={2} />}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              placeholder="XXXX-XXXX-XXXX"
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(normalizeRecoveryCode(event.target.value))}
              disabled={state.submitting}
            />
          ) : (
            <AuthField
              id="two-factor-code"
              label={enrolling ? "Code from your app" : "Verification code"}
              icon={<ShieldCheck className="h-5 w-5" strokeWidth={2} />}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={7}
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(normalizeTotpCode(event.target.value))}
              disabled={state.submitting}
              style={{ letterSpacing: "0.3em" }}
            />
          )}
        </div>

        <AuthPrimaryButton type="submit" disabled={state.submitting} className="mb-6">
          {state.submitting
            ? "Verifying..."
            : enrolling
              ? "Turn on and sign in"
              : "Verify and sign in"}
        </AuthPrimaryButton>
      </form>

      <div className="flex flex-col items-center gap-3">
        {!enrolling ? (
          <TextLink
            disabled={state.submitting}
            onClick={() =>
              dispatch({ type: usingRecovery ? "use-authenticator" : "use-recovery-code" })
            }
          >
            {usingRecovery ? "Use your authenticator app instead" : "Use a recovery code instead"}
          </TextLink>
        ) : null}
        <TextLink onClick={backToSignIn} disabled={state.submitting}>
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </span>
        </TextLink>
      </div>
    </div>
  );
};

export default TwoFactorStep;
