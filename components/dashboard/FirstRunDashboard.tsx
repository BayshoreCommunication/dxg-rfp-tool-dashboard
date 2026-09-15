import StarterLinks from "@/components/proposals/StarterLinks";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

// Shown in place of the stat cards and recent-proposals table while the
// account has no proposals at all. Five zeros about emails nobody has sent
// told a new planner nothing; this says what the product is and offers the
// three ways to start. Server component: plain links only.
export default function FirstRunDashboard() {
  return (
    <section
      aria-labelledby="first-run-title"
      data-testid="first-run-dashboard"
      className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Nothing here yet
      </p>
      <h2
        id="first-run-title"
        className="mt-2 text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
      >
        Create your first RFP
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
        RFPilot turns your event details into an AV production RFP, the request
        you send to vendors so they can quote. Nothing goes out until you pick
        vendors.
      </p>
      <StarterLinks className="mt-6" />
      <p className="mt-6 text-xs text-slate-500">
        New to this?{" "}
        <Link
          href="/help"
          className="inline-flex items-center gap-1 font-semibold text-[#0b6e6a] hover:underline"
        >
          Read how RFPilot works in two minutes
          <ArrowRight size={12} aria-hidden />
        </Link>
      </p>
    </section>
  );
}
