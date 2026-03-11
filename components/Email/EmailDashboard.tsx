"use client";

import {
  ChevronDown,
  Edit3,
  Mail,
  MoreHorizontal,
  Settings2,
  Users,
} from "lucide-react";
import React from "react";

export default function EmailDashboard() {
  return (
    <div className="space-y-6">
      {/* ── Sender Settings Container ── */}
      <div className="relative overflow-hidden w-full">
        {/* Header Row (No wrapper styling, just layout) */}
        <div className="relative z-10 flex items-center justify-between mb-6 px-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-slate-500 shadow-sm border border-slate-200">
              <Users size={22} className="text-slate-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-black text-slate-900 tracking-tight flex items-center gap-2">
                Sender Settings
                <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Active
                </span>
              </h3>
              <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                Manage who your emails are sent from
              </p>
            </div>
          </div>

          <button className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0">
            <Settings2 size={16} className="text-slate-400" />
            Customize Sender
          </button>
        </div>

        {/* Section divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent my-6" />

        {/* Title */}
        <div className="relative z-10 flex items-center justify-between mb-4 px-4">
          <div className="flex items-center gap-2 text-cyan-600 text-[13px] font-black uppercase tracking-widest bg-cyan-50/50 px-3 py-1.5 rounded-lg border border-cyan-100">
            <Mail size={16} />
            Proposal Emails
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50">
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Templates List (Individual Cards) */}
        <div className="relative z-10 space-y-4 px-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="group relative flex flex-col lg:flex-row lg:items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-cyan-300 transition-all duration-300 gap-4 overflow-hidden"
            >
              {/* Subtle hover gradient behind card */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-50/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

              <div className="relative z-10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex flex-col items-center justify-center shrink-0 text-cyan-600 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest">Tpl</span>
                  <span className="text-[14px] font-black leading-none">{i}</span>
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 group-hover:text-cyan-600 transition-colors">
                    Official email request to the prospect to sign the proposal
                  </h4>
                  <p className="text-[12px] text-slate-500 font-medium mt-1">
                    This email will be sent if you choose to notify the prospect
                    when publishing a proposal.
                  </p>
                </div>
              </div>

              <div className="relative z-10 flex flex-wrap items-center gap-4 lg:gap-8 bg-slate-50/80 px-5 py-3 rounded-xl border border-slate-100 lg:ml-auto">
                {/* Stats */}
                <div className="flex items-center gap-6 text-[12px] font-semibold text-slate-500">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Sent</span>
                    <span className="text-slate-900 text-[15px] font-black">240</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Opened</span>
                    <span className="text-slate-900 text-[15px] font-black">182</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Clicked</span>
                    <span className="text-slate-900 text-[15px] font-black">89</span>
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-200 hidden lg:block" />

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button className="flex items-center justify-center w-9 h-9 bg-white text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-cyan-600 transition-colors shadow-sm active:scale-95">
                    <Edit3 size={15} />
                  </button>
                  <button className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-lg text-[11px] font-bold shadow-sm hover:shadow-md hover:shadow-cyan-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all outline-none">
                    Preview <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
