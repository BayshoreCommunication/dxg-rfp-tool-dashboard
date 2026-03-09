import {
  ChevronDown,
  Edit3,
  FileText,
  Mail,
  MailOpen,
  MousePointer2,
  Send,
  Users,
} from "lucide-react";
import React from "react";

// --- Types ---
type Status = "PUBLISHED" | "DRAFT";

interface Stat {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconColor: string;
  valColor: string;
}

// --- Mock Data ---
const STATS: Stat[] = [
  {
    title: "Total Proposals",
    value: "182",
    icon: <FileText size={14} />,
    iconColor: "text-blue-500",
    valColor: "text-green-500",
  },
  {
    title: "Total Email Sent",
    value: "1827",
    icon: <Send size={14} />,
    iconColor: "text-cyan-400",
    valColor: "text-cyan-400",
  },
  {
    title: "Total Email Opened",
    value: "1303",
    icon: <MailOpen size={14} />,
    iconColor: "text-pink-500",
    valColor: "text-pink-500",
  },
  {
    title: "Total Email Clicked",
    value: "1827",
    icon: <MousePointer2 size={14} />,
    iconColor: "text-orange-500",
    valColor: "text-orange-500",
  },
];

// --- Main Component ---
export default function EmailDashboard() {
  return (
    <div className="">
      <div className="">
        {/* 4. Sender Settings */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
            Sender Settings
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-200 rounded-md flex items-center justify-center text-slate-400">
              <Users size={24} />
            </div>
            <button className="bg-[#E0F7FA] text-cyan-500 px-5 py-2 rounded-md text-xs font-bold hover:bg-cyan-100 transition-colors">
              Customize
            </button>
          </div>
          <div className="flex items-center gap-2 text-cyan-500 text-xs font-bold pt-4">
            <Mail size={14} /> Proposal email
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-sm shadow-sm border-l-4 border-cyan-400 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-cyan-500">
                  Official email request to the prospect to sign the proposal
                  link
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  This email will be sent if you choose to notify the prospect
                  when publishing a proposal.
                </p>
              </div>
              <div className="flex items-center gap-10 text-[11px] font-medium text-slate-600">
                <span className="flex items-center gap-1">
                  Sent <b className="text-slate-900">0</b>
                </span>
                <span className="flex items-center gap-1">
                  Opened <b className="text-slate-900">0</b>
                </span>
                <span className="flex items-center gap-1">
                  Clicked <b className="text-slate-900">0</b>
                </span>
                <button className="flex items-center gap-1 bg-[#E0F7FA] text-cyan-500 px-4 py-2 rounded-md font-bold uppercase text-[10px] hover:bg-cyan-100 transition-colors">
                  <ChevronDown size={14} /> Customize
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Sub-component for Table Rows ---
function ProposalRow({ name, id, status, clicked, opened }: any) {
  return (
    <div
      className={`grid grid-cols-12 items-center bg-white px-6 py-4 rounded-sm shadow-sm border-l-4 transition-all hover:shadow-md ${status === "PUBLISHED" ? "border-cyan-400" : "border-slate-400"}`}
    >
      <div className="col-span-4">
        <p className="text-[13px] font-semibold text-slate-700">{name}</p>
        <p className="text-[10px] text-slate-400">{id}</p>
      </div>
      <div className="col-span-2 text-center text-[13px] text-slate-600">
        Demo
      </div>
      <div className="col-span-1 text-center text-[13px] text-slate-600">
        {clicked}
      </div>
      <div className="col-span-1 text-center text-[13px] text-slate-600">
        {opened}
      </div>
      <div className="col-span-1 text-center text-[13px] text-slate-600 font-semibold">
        $ 5,900
      </div>
      <div className="col-span-2 flex justify-center">
        <span
          className={`px-6 py-1 rounded-full text-[10px] font-bold tracking-wider ${status === "PUBLISHED" ? "bg-[#E0F7FA] text-[#26C6DA]" : "bg-slate-200 text-slate-500"}`}
        >
          {status}
        </span>
      </div>
      <div className="col-span-1 flex justify-end">
        <button className="flex items-center gap-1 bg-[#F5F3FF] text-[#5B21B6] px-3 py-1.5 rounded-md text-[10px] font-bold hover:bg-violet-100 transition-colors">
          <Edit3 size={12} /> EDIT
        </button>
      </div>
    </div>
  );
}
