import {
  ArrowUpRight,
  Eye,
  FileText,
  MessageSquareText,
  MousePointerClick,
  Send,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import React from "react";

interface StatMetric {
  id: string;
  title: string;
  value: number;
  icon: React.ReactElement<{ className?: string }>;
  gradient: string;
  trendValue: string;
  href: string;
  actionLabel: string;
}

interface TopCardItemProps {
  isLoading?: boolean;
  totals?: {
    totalProposals: number;
    totalEmailSent: number;
    totalEmailClicked: number;
    totalProposalViews: number;
    totalVendorResponses: number;
    unreadVendorResponses: number;
  };
}

const StatCard = ({
  title,
  value,
  icon,
  gradient,
  trendValue,
  href,
  actionLabel,
}: StatMetric) => {
  return (
    <Link
      href={href}
      aria-label={`${title}: ${value}. ${actionLabel}`}
      className="group relative min-h-40 overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-[transform,box-shadow,filter] duration-300 hover:-translate-y-1 hover:brightness-[1.03] hover:shadow-xl active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-200 sm:p-6"
      style={{ background: gradient }}
    >
      {/* Large watermark background icon */}
      <div className="pointer-events-none absolute -top-1 right-0 h-32 w-32 opacity-15 sm:h-36 sm:w-36">
        {React.cloneElement(icon, { className: "w-full h-full text-white" })}
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner">
            {React.cloneElement(icon, { className: "w-6 h-6 text-white" })}
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold text-white">
            <TrendingUp className="w-3 h-3" />
            <span>{trendValue}</span>
          </div>
        </div>

        <div>
          <h3 className="text-white/80 text-sm font-semibold mb-1">{title}</h3>
          <div className="text-4xl font-extrabold tracking-tight">{value}</div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white/90">
            {actionLabel}
            <ArrowUpRight
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>

      {/* Top gloss */}
      <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent opacity-50 pointer-events-none" />
    </Link>
  );
};

export const TopCardItemSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-4 px-1 sm:grid-cols-2 sm:gap-5 sm:px-2 lg:px-5 xl:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl p-6 bg-slate-100 shadow border border-slate-200"
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-200 animate-pulse" />
              <div className="w-12 h-6 rounded-full bg-slate-200 animate-pulse" />
            </div>
            <div>
              <div className="w-24 h-4 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="w-16 h-8 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function TopCardItem({ totals, isLoading }: TopCardItemProps) {
  if (isLoading) return <TopCardItemSkeleton />;

  const statsData: StatMetric[] = [
    {
      id: "proposals",
      title: "Total Proposals",
      value: totals?.totalProposals ?? 0,
      gradient: "linear-gradient(135deg, #6366f1, #4338ca)",
      trendValue: "+18%",
      icon: <FileText strokeWidth={2} />,
      href: "/proposals",
      actionLabel: "Open proposals",
    },
    {
      id: "sent",
      title: "Total Email Sent",
      value: totals?.totalEmailSent ?? 0,
      gradient: "linear-gradient(135deg, #34d399, #059669)",
      trendValue: "+5%",
      icon: <Send strokeWidth={2} />,
      href: "/email",
      actionLabel: "Open email activity",
    },
    {
      id: "clicked",
      title: "Total Email Clicked",
      value: totals?.totalEmailClicked ?? 0,
      gradient: "linear-gradient(135deg, #22d3ee, #0891b2)",
      trendValue: "+24%",
      icon: <MousePointerClick strokeWidth={2} />,
      href: "/email",
      actionLabel: "Open email activity",
    },
    {
      id: "views",
      title: "Total Proposal Views",
      value: totals?.totalProposalViews ?? 0,
      gradient: "linear-gradient(135deg, #fb923c, #ea580c)",
      trendValue: "+12%",
      icon: <Eye strokeWidth={2} />,
      href: "/proposals",
      actionLabel: "Review proposals",
    },
    {
      id: "vendor-responses",
      title: "Vendor Responses",
      value: totals?.totalVendorResponses ?? 0,
      gradient: "linear-gradient(135deg, #a855f7, #7e22ce)",
      trendValue: `${totals?.unreadVendorResponses ?? 0} unread`,
      icon: <MessageSquareText strokeWidth={2} />,
      href: "/vendor-responses",
      actionLabel: "Open responses",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 px-1 sm:grid-cols-2 sm:gap-5 sm:px-2 lg:px-5 xl:grid-cols-5">
      {statsData.map((stat) => (
        <StatCard key={stat.id} {...stat} />
      ))}
    </div>
  );
}
