import { ChevronRight, LifeBuoy } from "lucide-react";
import Link from "next/link";

// ORG-405: the way in to /settings/support-access. Rendered only where the member is already
// known to be an Owner or Admin (the organization block of the Security page).
export default function SupportAccessLink() {
  return (
    <section className="rounded-md border border-[#e4e4e4] bg-white px-5 py-6 md:px-8" aria-labelledby="support-access-link-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 id="support-access-link-title" className="flex items-center gap-2 text-xl font-semibold leading-tight text-[#222628] md:text-[26px]">
            <LifeBuoy size={22} className="shrink-0 text-[#008ad2]" aria-hidden="true" />
            Support access
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[#6b7280]">
            RFPilot Support reads your proposals only when you allow it. Grant time-limited access, revoke it, and see what Support did.
          </p>
        </div>
        <Link
          href="/settings/support-access"
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#e4e4e4] bg-white px-4 py-2 text-[13px] font-semibold text-[#222628] transition hover:bg-[#f5f6f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          Manage support access <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
