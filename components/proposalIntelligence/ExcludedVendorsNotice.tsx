import type { ExcludedVendor } from "@/lib/proposalIntelligence/excludedVendors";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

/**
 * Names the vendors that are not in the comparison shown below it, so a
 * recommendation is never read as covering every response received.
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
      className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-700" />
        <div>
          <h2
            id="excluded-vendors-title"
            className="text-sm font-extrabold text-amber-950"
          >
            {count} {count === 1 ? "vendor is" : "vendors are"} not in this
            comparison
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            The comparison and recommendation below cover {comparedCount}{" "}
            {comparedCount === 1 ? "vendor" : "vendors"} only. Read them with
            that in mind.
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {excluded.map((vendor) => (
          <li
            key={vendor.responseId}
            className="rounded-xl border border-amber-200 bg-white p-4"
          >
            <p className="text-sm font-extrabold text-slate-900">
              {vendor.vendorLabel}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {vendor.explanation}
            </p>
            {vendor.details.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">
                {vendor.details.map((detail, index) => (
                  <li key={`${vendor.responseId}-detail-${index}`}>{detail}</li>
                ))}
              </ul>
            )}
            <Link
              href={`/vendor-responses/${vendor.responseId}`}
              className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-amber-300 bg-white px-3 text-xs font-extrabold text-amber-900 hover:border-amber-500"
            >
              Open {vendor.vendorLabel}&rsquo;s response
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
