import {
  Eye,
  FileText,
  MessageSquareText,
  MousePointerClick,
  Send,
  TrendingUp,
} from "lucide-react";
import React from "react";

interface StatMetric {
  id: string;
  title: string;
  value: number;
  icon: React.ReactElement<{ className?: string }>;
  gradient: string;
  trendValue: string;
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

const StatCard = ({ title, value, icon, gradient, trendValue }: StatMetric) => {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-6 text-white shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ background: gradient }}
    >
      {/* Large watermark background icon */}
      <div className="absolute right-0 -top-0 opacity-15 pointer-events-none w-36 h-36">
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
        </div>
      </div>

      {/* Top gloss */}
      <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent opacity-50 pointer-events-none" />
    </div>
  );
};

export const TopCardItemSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
    },
    {
      id: "sent",
      title: "Total Email Sent",
      value: totals?.totalEmailSent ?? 0,
      gradient: "linear-gradient(135deg, #34d399, #059669)",
      trendValue: "+5%",
      icon: <Send strokeWidth={2} />,
    },
    {
      id: "clicked",
      title: "Total Email Clicked",
      value: totals?.totalEmailClicked ?? 0,
      gradient: "linear-gradient(135deg, #22d3ee, #0891b2)",
      trendValue: "+24%",
      icon: <MousePointerClick strokeWidth={2} />,
    },
    {
      id: "views",
      title: "Total Proposal Views",
      value: totals?.totalProposalViews ?? 0,
      gradient: "linear-gradient(135deg, #fb923c, #ea580c)",
      trendValue: "+12%",
      icon: <Eye strokeWidth={2} />,
    },
    {
      id: "vendor-responses",
      title: "Vendor Responses",
      value: totals?.totalVendorResponses ?? 0,
      gradient: "linear-gradient(135deg, #a855f7, #7e22ce)",
      trendValue: `${totals?.unreadVendorResponses ?? 0} unread`,
      icon: <MessageSquareText strokeWidth={2} />,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {statsData.map((stat) => (
        <StatCard key={stat.id} {...stat} />
      ))}
    </div>
  );
}
