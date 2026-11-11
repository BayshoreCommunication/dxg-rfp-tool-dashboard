import { ChevronRight, ScrollText } from "lucide-react";
import Link from "next/link";

// ORG-407: the way in to /settings/audit. Rendered only where the member is already known to be
// an Owner or Admin (the organization block of the Security page).
export default function AuditLogLink() {
  return (
    <section className="rounded-md border border-[#e4e4e4] bg-white px-5 py-6 md:px-8" aria-labelledby="audit-log-link-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 id="audit-log-link-title" className="flex items-center gap-2 text-xl font-semibold leading-tight text-[#222628] md:text-[26px]">
            <ScrollText size={22} className="shrink-0 text-[#008ad2]" aria-hidden="true" />
            Audit log
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[#6b7280]">
            See who signed in, what changed in your organization and when RFPilot Support used its access. Filter it and export it as CSV.
          </p>
        </div>
        <Link
          href="/settings/audit"
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#e4e4e4] bg-white px-4 py-2 text-[13px] font-semibold text-[#222628] transition hover:bg-[#f5f6f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          Open audit log <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
