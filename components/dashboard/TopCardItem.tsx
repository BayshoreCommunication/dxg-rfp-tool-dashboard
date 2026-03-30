import { TrendingDown, TrendingUp } from "lucide-react";
import React from "react";

type DashboardTotals = {
  totalProposals: number;
  totalEmailSent: number;
  totalEmailClicked: number;
  totalProposalViews: number;
};

interface StatMetric {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactElement<{ className?: string }>;
  trend: number;
  progress: number;
  gradient: string;
  glow: string;
  iconBg: string;
  sparkColor: string;
}

const StatCard = ({
  title,
  value,
  icon,
  trend,
  progress,
  gradient,
  glow,
  iconBg,
  sparkColor,
}: StatMetric) => {
  const isUp = trend >= 0;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between min-h-[160px] ${gradient} border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-default`}
      style={{ boxShadow: `0 8px 32px -4px ${glow}` }}
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all duration-500 pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-black/10 blur-2xl pointer-events-none" />

      <div className="absolute bottom-0 right-0 flex items-end gap-[3px] h-16 p-4 opacity-20 group-hover:opacity-35 transition-opacity duration-300 pointer-events-none">
        {[40, 55, 35, 70, 50, 85, 65, 100].map((h, i) => (
          <div
            key={i}
            className={`w-[5px] rounded-t-sm ${sparkColor}`}
            style={{ height: `${h * 0.48}px` }}
          />
        ))}
      </div>

      <div className="relative z-10 flex items-start justify-between">
        <div
          className={`shrink-0 p-2.5 rounded-xl ${iconBg} backdrop-blur-sm group-hover:scale-110 transition-transform duration-300 shadow-sm`}
        >
          {React.cloneElement(icon, {
            className: "w-5 h-5 text-white",
          })}
        </div>

        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${
            isUp ? "bg-white/20 text-white" : "bg-black/15 text-white/80"
          }`}
        >
          {isUp ? (
            <TrendingUp size={9} strokeWidth={3} />
          ) : (
            <TrendingDown size={9} strokeWidth={3} />
          )}
          {isUp ? "+" : ""}
          {trend}%
        </div>
      </div>

      <div className="relative z-10 mt-3">
        <div className="text-[34px] font-black tracking-tight text-white leading-none drop-shadow-sm">
          {value}
        </div>
        <p className="mt-1.5 text-[11px] font-semibold text-white/70 uppercase tracking-widest">
          {title}
        </p>
      </div>

      <div className="relative z-10 mt-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest">
            Progress
          </span>
          <span className="text-[9px] font-bold text-white/70">{progress}%</span>
        </div>
        <div className="h-1 w-full rounded-full bg-black/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/60 group-hover:bg-white/80 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-15deg] group-hover:translate-x-full transition-transform duration-700" />
      </div>
    </div>
  );
};

type TopCardItemProps = {
  totals: DashboardTotals;
};

export default function TopCardItem({ totals }: TopCardItemProps) {
  const statsData: StatMetric[] = [
    {
      id: "proposals",
      title: "Total Proposals",
      value: totals.totalProposals,
      trend: 0,
      progress: 100,
      gradient: "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500",
      glow: "rgba(16,185,129,0.35)",
      iconBg: "bg-white/20",
      sparkColor: "bg-white",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zM12.75 12a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V18a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V12z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      id: "sent",
      title: "Total Email Sent",
      value: totals.totalEmailSent,
      trend: 0,
      progress: 100,
      gradient: "bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-500",
      glow: "rgba(6,182,212,0.35)",
      iconBg: "bg-white/20",
      sparkColor: "bg-white",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
      ),
    },
    {
      id: "clicked",
      title: "Total Email Clicked",
      value: totals.totalEmailClicked,
      trend: 0,
      progress: 100,
      gradient: "bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500",
      glow: "rgba(236,72,153,0.35)",
      iconBg: "bg-white/20",
      sparkColor: "bg-white",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      id: "views",
      title: "Total Proposal Views",
      value: totals.totalProposalViews,
      trend: 0,
      progress: 100,
      gradient: "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500",
      glow: "rgba(249,115,22,0.35)",
      iconBg: "bg-white/20",
      sparkColor: "bg-white",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 5c-5.523 0-10 6-10 7s4.477 7 10 7 10-6 10-7-4.477-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="px-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsData.map((stat) => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </div>
    </div>
  );
}
