import { ArrowUpRight, Eye, FileText, MessageSquareText, MousePointerClick, Send } from "lucide-react";
import Link from "next/link";
import React from "react";
import { formatCount, type DashboardStats } from "./dashboardStats";

// The five stat cards at the top of /dashboard. They count the signed-in member's OWN proposals
// (GET /api/dashboard/overview and the vendor-responses total), whatever the list below them is
// showing, so the row says so in a caption and in each card's accessible name.

interface StatMetric {
  id: string;
  title: string;
  // null: the figure could not be loaded.
  value: number | null;
  icon: React.ReactElement<{ className?: string }>;
  gradient: string;
  href: string;
  actionLabel: string;
  /** A real figure worth a pill (unread count). Never a made-up trend. */
  badge?: string;
  /** Said in place of the number when there is none, in the card's accessible name. */
  missing?: string;
}

// The keyboard focus ring the rest of the dashboard uses (RoleDashboardView, DashboardFilters): a sky
// ring behind a gap in the default offset colour (white), which shows on the light page and on the
// dark one. A white ring on these cards was all but invisible on the light page.
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

const StatCard = ({ id, title, value, icon, gradient, href, actionLabel, badge, missing = "unavailable" }: StatMetric) => (
  <Link
    href={href}
    aria-label={`Your ${title}: ${value === null ? missing : formatCount(value)}${badge ? `, ${badge}` : ""}. ${actionLabel}`}
    data-dashboard-stat-card
    data-testid={`stat-card-${id}`}
    className={`group relative block h-full min-h-40 overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-[transform,box-shadow,filter] duration-300 hover:-translate-y-1 hover:brightness-[1.03] hover:shadow-xl active:translate-y-0 active:scale-[0.99] sm:p-6 ${focusRing}`}
    style={{ background: gradient }}
  >
    {/* Large watermark background icon */}
    <div className="pointer-events-none absolute -top-1 right-0 h-32 w-32 opacity-15 sm:h-36 sm:w-36" aria-hidden="true">
      {React.cloneElement(icon, { className: "w-full h-full text-white" })}
    </div>

    <div className="relative z-10 flex h-full flex-col justify-between">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="rounded-xl bg-white/20 p-3 shadow-inner backdrop-blur-sm" aria-hidden="true">
          {React.cloneElement(icon, { className: "w-6 h-6 text-white" })}
        </div>
        {badge && (
          <div data-testid={`stat-card-${id}-badge`} className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {badge}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="mb-1 text-sm font-semibold text-white/80">{title}</h3>
        <div data-testid={`stat-card-${id}-value`} className="text-4xl font-extrabold tracking-tight [overflow-wrap:anywhere] xl:text-3xl 2xl:text-4xl">
          {value === null ? "—" : formatCount(value)}
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white/90">
          {actionLabel}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </span>
      </div>
    </div>

    {/* Top gloss */}
    <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/10 to-transparent opacity-50" />
  </Link>
);

export default function TopCardItem({ stats }: { stats: DashboardStats }) {
  const statsData: StatMetric[] = [
    {
      id: "proposals",
      title: "Total Proposals",
      value: stats.totalProposals,
      gradient: "linear-gradient(135deg, #6366f1, #4338ca)",
      icon: <FileText strokeWidth={2} />,
      href: "/proposals",
      actionLabel: "Open proposals",
    },
    {
      id: "sent",
      title: "Total Email Sent",
      value: stats.totalEmailSent,
      gradient: "linear-gradient(135deg, #34d399, #059669)",
      icon: <Send strokeWidth={2} />,
      href: "/email",
      actionLabel: "Open email activity",
    },
    {
      id: "clicked",
      title: "Total Email Clicked",
      value: stats.totalEmailClicked,
      gradient: "linear-gradient(135deg, #22d3ee, #0891b2)",
      icon: <MousePointerClick strokeWidth={2} />,
      href: "/email",
      actionLabel: "Open email activity",
    },
    {
      id: "views",
      title: "Total Proposal Views",
      value: stats.totalProposalViews,
      gradient: "linear-gradient(135deg, #fb923c, #ea580c)",
      icon: <Eye strokeWidth={2} />,
      href: "/proposals",
      actionLabel: "Review proposals",
    },
    {
      id: "vendor-responses",
      title: "Vendor Responses",
      value: stats.totalVendorResponses,
      gradient: "linear-gradient(135deg, #a855f7, #7e22ce)",
      badge: stats.vendorResponsesLocked
        ? "Not in your plan"
        : stats.unreadVendorResponses === null ? undefined : `${formatCount(stats.unreadVendorResponses)} unread`,
      missing: stats.vendorResponsesLocked ? "not counted" : undefined,
      icon: <MessageSquareText strokeWidth={2} />,
      href: "/vendor-responses",
      actionLabel: "Open responses",
    },
  ];
  // A figure the plan doesn't include isn't a failed load, so it doesn't ask for a reload.
  const failed = statsData.filter((stat) => stat.value === null && !(stat.id === "vendor-responses" && stats.vendorResponsesLocked)).length;

  return (
    <section aria-labelledby="dashboard-stat-cards-title" data-testid="dashboard-stat-cards" className="space-y-3">
      <div data-testid="dashboard-stat-cards-caption">
        <h2 id="dashboard-stat-cards-title" className="text-base font-bold text-slate-900">Your totals</h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Counts for the proposals you own. The view and filters below don&apos;t change them.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-5">
        {statsData.map((stat) => (
          <li key={stat.id} className="min-w-0">
            <StatCard {...stat} />
          </li>
        ))}
      </ul>
      {failed > 0 && (
        <p data-testid="dashboard-stat-cards-unavailable" className="text-xs text-slate-600">
          {failed === statsData.length ? "We couldn't load your totals." : "We couldn't load some of your totals."} Reload the page to try again.
        </p>
      )}
    </section>
  );
}
