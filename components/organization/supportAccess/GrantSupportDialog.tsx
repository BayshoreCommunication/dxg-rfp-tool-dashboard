"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { createSupportGrantAction, searchGrantableRfpsAction } from "@/app/actions/supportGrants";
import {
  InlineError,
  inputClass,
  OrgDialog,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  Spinner,
} from "../members/ui";
import {
  EXPIRY_PRESETS,
  expiryFromNow,
  formatDateTime,
  GRANT_DEFAULT_DAYS,
  GRANT_MAX_DAYS,
  GRANT_REASON_MAX,
  parseExpiryDays,
  SUPPORT_LABEL,
  supportGrantErrorMessage,
  type GrantableRfp,
  type SupportGrant,
} from "./supportGrantModel";

type Scope = "rfp" | "organization";
type RfpSearch = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; rfps: GrantableRfp[] };

type Props = {
  onClose: () => void;
  onGranted: (grant: SupportGrant) => void;
};

const CUSTOM = "custom";
// The shared field label's grey is too faint on white (2.9:1); this one passes AA.
const labelClass = "mb-2 block text-sm font-semibold text-slate-600";

// ORG-405: grant RFPilot Support read access to one RFP or the whole organization, until an
// expiry the Owner or Admin chooses (7 days unless they change it, 30 at most).
export default function GrantSupportDialog({ onClose, onGranted }: Props) {
  const [scope, setScope] = useState<Scope>("rfp");
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState<RfpSearch>({ state: "loading" });
  const [selected, setSelected] = useState<GrantableRfp | null>(null);
  const [expiry, setExpiry] = useState<string>(String(GRANT_DEFAULT_DAYS));
  const [customDays, setCustomDays] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When the dialog opened; the expiry preview is measured from here.
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    if (scope !== "rfp") return;
    let current = true;
    // Typing waits a moment so each keystroke isn't a request; the first list loads at once.
    const timer = setTimeout(
      () => {
        setSearch({ state: "loading" });
        void searchGrantableRfpsAction(term).then((result) => {
          if (!current) return;
          if (result.success) setSearch({ state: "ready", rfps: result.data ?? [] });
          else setSearch({ state: "error", message: supportGrantErrorMessage(result, "Your RFPs couldn't be loaded. Try again.") });
        });
      },
      term ? 250 : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [scope, term]);

  const days = expiry === CUSTOM ? parseExpiryDays(customDays) : parseExpiryDays(expiry);

  const submit = async () => {
    if (scope === "rfp" && !selected) return setError("Choose the RFP that Support may open.");
    if (days === null) return setError(`Enter a whole number of days from 1 to ${GRANT_MAX_DAYS}.`);
    setBusy(true);
    setError(null);
    const result = await createSupportGrantAction({
      proposalId: scope === "rfp" ? selected?.id : null,
      expiresInDays: days,
      reason,
    });
    setBusy(false);
    if (result.success && result.data) onGranted(result.data);
    else setError(supportGrantErrorMessage(result, "Access couldn't be granted. Try again."));
  };

  const scopeOption = (value: Scope, title: string, body: string) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 text-sm transition-colors ${scope === value ? "border-[#008ad2] bg-sky-50" : "border-[#e4e4e4] bg-white hover:border-slate-300"}`}
    >
      <input
        type="radio"
        name="support-grant-scope"
        value={value}
        checked={scope === value}
        onChange={() => {
          setScope(value);
          setError(null);
        }}
        className="mt-1 h-4 w-4 accent-[#008ad2]"
      />
      <span className="min-w-0">
        <span className="block font-semibold text-slate-800">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-600">{body}</span>
      </span>
    </label>
  );

  return (
    <OrgDialog
      wide
      title={`Grant ${SUPPORT_LABEL} access`}
      description="Support can read what you choose until the access ends. They can't change anything, and you can end it at any time."
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="support-grant-form" className={primaryButtonClass} style={primaryButtonStyle} disabled={busy}>
            {busy && <Spinner />} Grant access
          </button>
        </>
      }
    >
      <form
        id="support-grant-form"
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <fieldset>
          <legend className={labelClass}>What Support can see</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {scopeOption("rfp", "One RFP", "The RFP you pick and its vendor responses.")}
            {scopeOption("organization", "Whole organization", "Every RFP and vendor response in your organization.")}
          </div>
        </fieldset>

        {scope === "rfp" && (
          <div>
            <label htmlFor="support-grant-rfp-search" className={labelClass}>RFP</label>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="support-grant-rfp-search"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                // Enter here is a search, never "grant access to whatever was picked before".
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                placeholder="Search by event name"
                maxLength={120}
                autoComplete="off"
                className={`${inputClass} pl-9`}
              />
            </div>
            <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-[#e4e4e4]" role="radiogroup" aria-label="RFPs">
              {search.state === "loading" && (
                <p className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500" role="status"><Spinner /> Loading RFPs…</p>
              )}
              {search.state === "error" && <p role="alert" className="px-3 py-3 text-sm text-red-700">{search.message}</p>}
              {search.state === "ready" && search.rfps.length === 0 && (
                <p className="px-3 py-3 text-sm text-slate-500">{term.trim() ? "No RFPs match that search." : "Your organization has no RFPs yet."}</p>
              )}
              {search.state === "ready" &&
                search.rfps.map((rfp) => (
                  <label
                    key={rfp.id}
                    className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-sm last:border-b-0 ${selected?.id === rfp.id ? "bg-sky-50" : "hover:bg-slate-50"}`}
                  >
                    <input
                      type="radio"
                      name="support-grant-rfp"
                      checked={selected?.id === rfp.id}
                      onChange={() => {
                        setSelected(rfp);
                        setError(null);
                      }}
                      className="h-4 w-4 shrink-0 accent-[#008ad2]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-800">{rfp.title}</span>
                      {rfp.ownerName && <span className="block truncate text-xs text-slate-600">Owner: {rfp.ownerName}</span>}
                    </span>
                  </label>
                ))}
            </div>
            {selected && (
              <p className="mt-2 break-words text-xs text-slate-500">
                Selected: <span className="font-semibold text-slate-700">{selected.title}</span>
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="support-grant-expiry" className={labelClass}>Access ends after</label>
            <select
              id="support-grant-expiry"
              value={expiry}
              onChange={(event) => {
                setExpiry(event.target.value);
                setError(null);
              }}
              className={inputClass}
            >
              {EXPIRY_PRESETS.map((preset) => (
                <option key={preset} value={String(preset)}>
                  {preset} day{preset === 1 ? "" : "s"}{preset === GRANT_DEFAULT_DAYS ? " (recommended)" : ""}
                </option>
              ))}
              <option value={CUSTOM}>Another number of days</option>
            </select>
          </div>
          {expiry === CUSTOM && (
            <div>
              <label htmlFor="support-grant-days" className={labelClass}>Days (1 to {GRANT_MAX_DAYS})</label>
              <input
                id="support-grant-days"
                type="number"
                inputMode="numeric"
                min={1}
                max={GRANT_MAX_DAYS}
                step={1}
                value={customDays}
                onChange={(event) => {
                  setCustomDays(event.target.value);
                  setError(null);
                }}
                className={inputClass}
              />
            </div>
          )}
        </div>
        <p className="-mt-2 text-xs text-slate-500" aria-live="polite">
          {days === null ? `Access can last at most ${GRANT_MAX_DAYS} days.` : `Access ends ${formatDateTime(expiryFromNow(days, openedAt))}.`}
        </p>

        <div>
          <label htmlFor="support-grant-reason" className={labelClass}>Reason (optional)</label>
          <textarea
            id="support-grant-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={GRANT_REASON_MAX}
            rows={3}
            placeholder="For example, the support ticket this is for"
            className={`${inputClass} h-auto py-2`}
          />
          <p className="mt-1 text-right text-[11px] text-slate-500">{reason.length}/{GRANT_REASON_MAX}</p>
        </div>

        {error && <InlineError>{error}</InlineError>}
      </form>
    </OrgDialog>
  );
}
