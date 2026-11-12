import { Lock, Plus } from "lucide-react";
import Link from "next/link";
import {
  UPGRADE_CONTACT_HREF,
  rfpLimitMessage,
  rfpUsageLabel,
  type RfpUsage,
} from "@/lib/entitlements/entitlements";

// The "New Proposal" button with the plan's proposal counter beside it (ORG-602). At the limit the button
// is switched off and says why, with a way to ask for an upgrade; the backend refuses the create
// either way (ORG-601). `usage` is null on a plan with no limit: the plain button.
export default function NewRfpAction({ usage, label = "New Proposal" }: { usage: RfpUsage | null; label?: string }) {
  const buttonShape =
    "relative flex min-h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-[12px] font-bold uppercase tracking-widest sm:w-auto sm:text-[13px]";

  if (usage?.atLimit) {
    return (
      <div data-testid="rfp-limit" className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
        <button
          type="button"
          disabled
          aria-describedby="rfp-limit-message"
          className={`${buttonShape} cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500`}
        >
          <Lock size={14} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
          {label}
        </button>
        <p id="rfp-limit-message" className="max-w-sm text-xs leading-5 text-slate-600 sm:text-right">
          <span data-testid="rfp-usage" className="font-bold text-slate-900">{rfpUsageLabel(usage)}.</span>{" "}
          {rfpLimitMessage(usage)}{" "}
          <Link href={UPGRADE_CONTACT_HREF} className="font-bold text-[#0069a0] underline underline-offset-2 hover:text-[#00517c]">
            Contact us
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
      <Link
        href="/proposals/add-new-proposal"
        className={`group ${buttonShape} text-white shadow-[0_4px_20px_rgba(14,165,233,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(14,165,233,0.5)] active:translate-y-0`}
        style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}
      >
        {/* Shine sweep */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/20 transition-transform duration-700 group-hover:translate-x-full" />
        <Plus size={15} strokeWidth={3} className="shrink-0" aria-hidden="true" />
        {label}
      </Link>
      {usage && (
        <p data-testid="rfp-usage" className="text-center text-xs font-semibold text-slate-600 sm:text-right">
          {rfpUsageLabel(usage)} {usage.onPlan}
        </p>
      )}
    </div>
  );
}
