"use client";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

type TabType =
  | "ALL"
  | "DRAFT"
  | "LIVE"
  | "ACCEPTED"
  | "CALLBACK"
  | "FAVOURITES";

const TABS: { label: TabType; count: number }[] = [
  { label: "ALL", count: 1 },
  { label: "DRAFT", count: 1 },
  { label: "LIVE", count: 0 },
  { label: "ACCEPTED", count: 0 },
  { label: "CALLBACK", count: 0 },
  { label: "FAVOURITES", count: 0 },
];

export default function ProposalFilters() {
  const [activeTab, setActiveTab] = useState<TabType>("ALL");

  return (
    <div className="w-full space-y-5 py-4 px-6">
      {/* ── Search & Filter Row ── */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search
              size={18}
              className="text-slate-400 group-focus-within:text-cyan-500 transition-colors duration-200"
            />
          </div>
          <input
            type="text"
            placeholder="Search proposals by name, client, or ID..."
            className="w-full h-12 pl-11 pr-5 bg-white border border-slate-200 rounded-xl shadow-sm text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-400 transition-all"
          />
        </div>

        {/* Filter Button */}
        <button className="flex items-center justify-center gap-2 h-12 px-5 bg-white border border-slate-200 rounded-xl text-slate-600 text-[13px] font-bold shadow-sm hover:bg-slate-50 hover:text-cyan-600 hover:border-cyan-200 transition-all duration-200 shrink-0">
          <SlidersHorizontal size={16} />
          Filters
        </button>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 no-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.label;
          return (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`flex flex-shrink-0 items-center justify-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black tracking-widest uppercase transition-all duration-200 ${
                isActive
                  ? "bg-slate-800 text-white shadow-md border border-transparent"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {tab.label}
              <span
                className={`flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
