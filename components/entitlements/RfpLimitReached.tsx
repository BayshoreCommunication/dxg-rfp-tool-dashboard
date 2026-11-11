import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import {
  UPGRADE_CONTACT_HREF,
  rfpLimitMessage,
  rfpUsageLabel,
  type RfpUsage,
} from "@/lib/entitlements/entitlements";

// Shown in place of the "create an RFP" screen when the organization has used every RFP its plan
// includes (ORG-602), so nobody fills in an RFP the backend would then refuse to save.
export default function RfpLimitReached({ usage }: { usage: RfpUsage }) {
  return (
    <div className="px-1 py-6 sm:py-10">
      <section
        aria-labelledby="rfp-limit-title"
        data-testid="rfp-limit-reached"
        className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700" aria-hidden="true">
          <Lock size={22} />
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-600">{usage.planName}</p>
        <h1 id="rfp-limit-title" className="mt-2 text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          You&rsquo;ve reached your plan&rsquo;s RFP limit
        </h1>
        <p data-testid="rfp-usage" className="mx-auto mt-5 max-w-md rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
          {rfpUsageLabel(usage)}
        </p>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
          {rfpLimitMessage(usage)} Your existing RFPs stay as they are: you can still edit, send and share them.
        </p>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href={UPGRADE_CONTACT_HREF}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-5 text-sm font-bold text-white hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            Contact us
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back to the dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
