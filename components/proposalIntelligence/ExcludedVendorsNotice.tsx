import type { ExcludedVendor, ExclusionReason } from "@/lib/proposalIntelligence/excludedVendors";
import { AlertTriangle } from "lucide-react";

/** One short reason per exclusion, for a reader who only needs the gist. */
const shortReason: Record<ExclusionReason, string> = {
  sources_unreadable: "part of their file could not be read",
  analysis_failed: "their response could not be read",
  analysis_incomplete: "their response was still being read",
  not_in_this_comparison: "not selected for this comparison",
};

/**
 * A one-line note per vendor that is not in the comparison shown below, so
 * the recommendation is never read as covering every response received.
 */
export default function ExcludedVendorsNotice({
  excluded,
  comparedCount,
}: {
  excluded: ExcludedVendor[];
  comparedCount: number;
}) {
  if (!excluded.length) return null;
  const count = excluded.length;
  return (
    <section
      role="alert"
      aria-labelledby="excluded-vendors-title"
      className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
    >
      <AlertTriangle size={16} className="mt-1 shrink-0 text-amber-700" aria-hidden="true" />
      <div className="min-w-0 text-sm leading-6 text-amber-950">
        <h2 id="excluded-vendors-title" className="font-extrabold">
          {count === 1 ? "1 vendor is" : `${count} vendors are`} not in this comparison
          <span className="font-normal text-amber-900"> · it covers {comparedCount} {comparedCount === 1 ? "vendor" : "vendors"} only</span>
        </h2>
        <ul className="mt-0.5 space-y-0.5">
          {excluded.map((vendor) => (
            <li key={vendor.responseId}>
              <span className="font-bold text-slate-900">{vendor.vendorLabel}</span>
              <span className="text-amber-900"> · {shortReason[vendor.reason]}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
