"use client";

import { RefreshCw } from "lucide-react";

/**
 * Turns transport-level failure text (driver timeouts, refused connections)
 * into one sentence a planner can act on. Anything else is shown as-is
 * because it already came through the action layer's safe-message map.
 */
export const friendlyLoadDetail = (message?: string) => {
  if (!message) return null;
  // "Could not load X." already says this; the generic action text adds nothing.
  if (/^[A-Za-z ]+operation failed\.?$/.test(message.trim())) return null;
  if (/timeout|terminated|ECONN|could not be reached|unexpected response/i.test(message)) {
    return "RFPilot could not reach its database or API. This is usually temporary.";
  }
  return message;
};

export default function SectionLoadError({
  what,
  message,
  onRetry,
  retrying,
}: {
  what: string;
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const detail = friendlyLoadDetail(message);
  return (
    <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">Could not load {what}.</p>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-red-800 disabled:opacity-50"
        >
          <RefreshCw size={12} className={retrying ? "animate-spin" : ""} aria-hidden="true" /> Try again
        </button>
      </div>
      {detail && <p className="mt-1">{detail}</p>}
    </div>
  );
}
