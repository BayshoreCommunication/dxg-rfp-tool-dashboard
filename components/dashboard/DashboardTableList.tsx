"use client";

import {
  BarChart3,
  ChevronRight,
  Clock,
  Copy,
  Edit3,
  Eye,
  Filter,
  Search,
  Share2,
  Users
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Status = "PUBLISHED" | "DRAFT" | "REVIEW" | "SENT";

interface Proposal {
  id: string;
  name: string;
  client: string;
  amount: string;
  status: Status;
  date: string;
  views: number;
  type: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────
const PROPOSALS: Proposal[] = [
  {
    id: "PRO-001",
    name: "AR's New Proposal",
    client: "AR Sahak",
    amount: "$5,900",
    status: "PUBLISHED",
    date: "Mar 11, 2026",
    views: 24,
    type: "Demo",
  },
  {
    id: "PRO-002",
    name: "Enterprise Cloud Solution",
    client: "TechCorp Inc.",
    amount: "$12,400",
    status: "SENT",
    date: "Mar 09, 2026",
    views: 8,
    type: "Enterprise",
  },
  {
    id: "PRO-003",
    name: "Marketing Automation Suite",
    client: "BrightMedia LLC",
    amount: "$3,750",
    status: "REVIEW",
    date: "Mar 07, 2026",
    views: 3,
    type: "SaaS",
  },
  {
    id: "PRO-004",
    name: "Annual Support Package",
    client: "Global Logistics",
    amount: "$8,200",
    status: "DRAFT",
    date: "Mar 05, 2026",
    views: 0,
    type: "Support",
  },
  {
    id: "PRO-005",
    name: "SEO Growth Campaign",
    client: "Sunrise Retail",
    amount: "$2,300",
    status: "PUBLISHED",
    date: "Mar 02, 2026",
    views: 41,
    type: "Marketing",
  },
];

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  Status,
  { label: string; dot: string; pill: string }
> = {
  PUBLISHED: {
    label: "Published",
    dot: "bg-emerald-400",
    pill: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  SENT: {
    label: "Sent",
    dot: "bg-sky-400",
    pill: "bg-sky-50 text-sky-600 border-sky-200",
  },
  REVIEW: {
    label: "In Review",
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-600 border-amber-200",
  },
  DRAFT: {
    label: "Draft",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

// ── IconButton ─────────────────────────────────────────────────────────────────
function IconButton({
  icon,
  tooltip,
}: {
  icon: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <button
      title={tooltip}
      className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-300 transition-all duration-150 hover:scale-105 active:scale-95"
    >
      {icon}
    </button>
  );
}

// ── Proposal Row ──────────────────────────────────────────────────────────────
function ProposalRow({ proposal }: { proposal: Proposal }) {
  const cfg = STATUS_CONFIG[proposal.status];
  return (
    <tr className="group transition-colors duration-150 hover:bg-slate-50/80 border-b border-slate-100 last:border-0">
      {/* Name + ID */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-[10px] font-black text-white">
              {proposal.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-800 leading-tight group-hover:text-cyan-600 transition-colors duration-150">
              {proposal.name}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {proposal.id}
            </p>
          </div>
        </div>
      </td>

      {/* Client */}
      <td className="px-5 py-4 text-[13px] text-slate-600 font-medium">
        <div className="flex items-center gap-1.5">
          <Users size={12} className="text-slate-400" />
          {proposal.client}
        </div>
      </td>

      {/* Type */}
      <td className="px-5 py-4">
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
          {proposal.type}
        </span>
      </td>

      {/* Amount */}
      <td className="px-5 py-4">
        <span className="text-[14px] font-black text-slate-900 tracking-tight">
          {proposal.amount}
        </span>
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${cfg.pill}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${proposal.status === "PUBLISHED" ? "animate-pulse" : ""}`} />
          {cfg.label}
        </span>
      </td>

      {/* Date */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-400 font-medium">
          <Clock size={11} />
          {proposal.date}
        </div>
      </td>

      {/* Views */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-semibold">
          <Eye size={12} className="text-slate-400" />
          {proposal.views}
        </div>
      </td>

      {/* Actions */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5  transition-opacity duration-150">
          <IconButton icon={<Copy size={14} />} tooltip="Copy" />
          <IconButton icon={<BarChart3 size={14} />} tooltip="Analytics" />
          <IconButton
            icon={<Edit3 size={14} />}
            tooltip="Edit"
          />
          <button className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
            <Share2 size={12} />
            Share
          </button>
        </div>
      </td>
    </tr>
  );
}


// ── Main Export ───────────────────────────────────────────────────────────────
export default function DashboardTableList() {
  const [filter, setFilter] = useState<Status | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const filtered = PROPOSALS.filter((p) => {
    const matchStatus = filter === "ALL" || p.status === filter;
    const matchSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const tabs: (Status | "ALL")[] = ["ALL", "PUBLISHED", "SENT", "REVIEW", "DRAFT"];

  return (
    <div className="space-y-6 px-5">
      {/* ── Featured Proposal ── */}


      {/* ── Proposals Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 flex-wrap gap-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-black text-slate-900 tracking-tight">
              Recent Proposals
            </h3>
            <span className="bg-slate-100 text-slate-500 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {PROPOSALS.length}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search proposals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-[12px] bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-200 transition-all duration-150 w-72"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1.5">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all duration-150 ${
                    filter === t
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t === "ALL" ? "All" : STATUS_CONFIG[t as Status].label}
                </button>
              ))}
            </div>

            <button className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-all duration-150">
              <Filter size={12} />
              Filter
            </button>

          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {[
                  "Proposal",
                  "Client",
                  "Type",
                  "Amount",
                  "Status",
                  "Date",
                  "Views",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((p) => <ProposalRow key={p.id} proposal={p} />)
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-slate-400 text-sm font-medium"
                  >
                    No proposals match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[12px] text-slate-400 font-medium">
            Showing{" "}
            <span className="text-slate-700 font-bold">{filtered.length}</span>{" "}
            of{" "}
            <span className="text-slate-700 font-bold">{PROPOSALS.length}</span>{" "}
            proposals
          </p>
          <Link
            href="/proposals"
            className="flex items-center gap-1 text-[12px] font-bold text-cyan-600 hover:text-cyan-500 transition-colors duration-150"
          >
            View all proposals <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
