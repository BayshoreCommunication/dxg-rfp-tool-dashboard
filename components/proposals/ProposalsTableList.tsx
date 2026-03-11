import {
  BarChart3,
  Clock,
  Copy,
  Edit3,
  Eye,
  MoreHorizontal,
  Plus,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";
import React from "react";

export default function IntegratedDashboard() {
  return (
    <div className="min-h-screen py-6 font-sans text-slate-800 -mt-6 px-6">
      <div className=" space-y-6">
        {/* --- 1. PROPOSAL HEADER CARD --- */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
          {/* Background subtle orbs (light version) */}
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cyan-50 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-blue-50 blur-3xl pointer-events-none" />

          {/* Top row */}
          <div className="relative z-10 flex items-start justify-between mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Published
              </span>
              <span className="bg-slate-50 text-slate-500 border border-slate-200 px-3 py-1 rounded-full text-[11px] font-semibold">
                Callback
              </span>
              <span className="bg-slate-50 text-slate-500 border border-slate-200 px-3 py-1 rounded-full text-[11px] font-semibold">
                Accept
              </span>
              <span className="text-slate-400 text-[11px] ml-1 font-medium flex items-center gap-1">
                <Clock size={10} />
                Created: <b className="text-slate-700 ml-1">March 11, 2026</b>
              </span>
            </div>
            <button className="text-slate-400 hover:text-slate-600 transition-colors duration-150 p-1 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200">
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight truncate">
                AR's New Proposal
              </h1>
              <div className="mt-3 space-y-1.5">
                <p className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
                  <Users size={11} className="text-slate-400" />
                  Owner: <span className="text-slate-800 font-semibold">AR Sahak</span>
                </p>
                <div className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
                  <Share2 size={11} className="text-slate-400" />
                  Shared with:{" "}
                  <span className="text-slate-800 font-semibold">Entire Team</span>
                  <button className="text-cyan-600 flex items-center gap-1 hover:text-cyan-500 transition-colors ml-2 text-[11px] font-bold bg-cyan-50 px-2 py-0.5 rounded-md">
                    <Plus size={12} /> Add label
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 shrink-0">
              {/* View count */}
              <div className="text-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <div className="text-3xl font-black text-slate-800 leading-none">24</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center justify-center gap-1">
                  <TrendingUp size={8} className="text-emerald-500" />
                  views
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <IconButton icon={<Copy size={16} />} tooltip="Copy" />
                <IconButton icon={<BarChart3 size={16} />} tooltip="Analytics" />
                <IconButton icon={<Eye size={16} />} tooltip="Preview" />
                <button className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-md hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5 transition-all duration-200">
                  <Share2 size={15} /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function IconButton({ icon, tooltip }: { icon: React.ReactNode; tooltip?: string }) {
  return (
    <button
      title={tooltip}
      className="w-11 h-11 flex items-center justify-center bg-white text-slate-500 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 transition-all duration-150 active:scale-95"
    >
      {icon}
    </button>
  );
}

function ProposalListItem({
  name,
  id,
  status,
}: {
  name: string;
  id: string;
  status: "PUBLISHED" | "DRAFT";
}) {
  const isPublished = status === "PUBLISHED";
  return (
    <div
      className={`group flex items-center justify-between bg-white p-6 rounded-sm shadow-sm border-l-4 transition-all hover:shadow-md ${isPublished ? "border-cyan-400" : "border-slate-400"}`}
    >
      <div className="flex-1">
        <h4 className="text-[13px] font-semibold text-slate-700">{name}</h4>
        <p className="text-[10px] text-slate-400">{id}</p>
      </div>

      <div className="flex-1 text-center text-sm text-slate-600">Demo</div>
      <div className="flex-1 text-center text-sm font-semibold text-slate-800">
        $ 5,900
      </div>

      <div className="flex-1 flex justify-center">
        <span
          className={`px-5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
            isPublished
              ? "bg-[#E0F7FA] text-[#26C6DA]"
              : "bg-slate-200 text-slate-500"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="flex-none opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="flex items-center gap-1 bg-slate-50 text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-100 transition-colors">
          <Edit3 size={12} /> EDIT
        </button>
      </div>
    </div>
  );
}
