import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import {
  LOCKED_FEATURE_COPY,
  UPGRADE_CONTACT_HREF,
  responseCountLabel,
  type PlanFeature,
} from "@/lib/entitlements/entitlements";

export type PlanLockedStateProps = {
  feature: PlanFeature;
  planName: string;
  // Vendor responses received, and what was counted. null when the count isn't known: the line
  // is left out. Only a number is ever shown here: no vendor names, contacts, totals or files.
  responseCount: number | null;
  countScope: "rfp" | "all";
  // The RFP this screen belongs to, when it belongs to one the member may read.
  rfpTitle?: string | null;
  backHref: string;
  backLabel: string;
};

// What a screen shows in place of a feature the organization's plan doesn't include (ORG-602,
// DXG decision Q2): what the feature is, how many responses are waiting, and how to upgrade.
// A designed state, not an error.
export default function PlanLockedState({ feature, planName, responseCount, countScope, rfpTitle, backHref, backLabel }: PlanLockedStateProps) {
  const copy = LOCKED_FEATURE_COPY[feature];
  return (
    <div className="px-1 py-6 sm:py-10">
      <section
        aria-labelledby="plan-locked-title"
        data-testid="plan-locked"
        data-feature={feature}
        className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700" aria-hidden="true">
          <Lock size={22} />
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          {copy.name} · {planName}
        </p>
        <h1 id="plan-locked-title" className="mt-2 text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {copy.title}
        </h1>
        {rfpTitle && <p className="mt-2 break-words text-sm font-semibold text-slate-700">{rfpTitle}</p>}
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">{copy.body}</p>
        {responseCount !== null && (
          <p
            data-testid="plan-locked-count"
            className="mx-auto mt-5 max-w-md rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900"
          >
            {responseCountLabel(responseCount, countScope)}
          </p>
        )}
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href={UPGRADE_CONTACT_HREF}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-5 text-sm font-bold text-white hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            Contact us
          </Link>
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            {backLabel}
          </Link>
        </div>
        <p className="mt-5 text-xs text-slate-500">
          Tell us you&rsquo;d like to upgrade and we&rsquo;ll set it up for your organization.
        </p>
      </section>
    </div>
  );
}
