"use client";

import {
  Check,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  Search,
  Share2,
  Users,
} from "lucide-react";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";

type ProposalStatus =
  | "unsubmitted"
  | "submitted"
  | "reviewed"
  | "approved"
  | "rejected";

type ProposalItem = {
  _id: string;
  status?: string;
  isDraft?: boolean;
  isActive?: boolean;
  isFavorite?: boolean;
  viewsCount?: number;
  createdAt?: string;
  event?: { eventName?: string };
  contact?: {
    contactFirstName?: string;
    contactLastName?: string;
    contactEmail?: string;
  };
};

const STATUS_CONFIG: Record<
  ProposalStatus,
  { label: string; dot: string; pill: string }
> = {
  unsubmitted: {
    label: "Draft",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600 border-slate-200",
  },
  submitted: {
    label: "Submitted",
    dot: "bg-sky-400",
    pill: "bg-sky-50 text-sky-600 border-sky-200",
  },
  reviewed: {
    label: "Reviewed",
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-600 border-amber-200",
  },
  approved: {
    label: "Approved",
    dot: "bg-emerald-400",
    pill: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  rejected: {
    label: "Expired",
    dot: "bg-rose-400",
    pill: "bg-rose-50 text-rose-600 border-rose-200",
  },
};

function toStatus(value?: string): ProposalStatus {
  const normalized = (value || "unsubmitted").toLowerCase();
  if (
    normalized === "unsubmitted" ||
    normalized === "submitted" ||
    normalized === "reviewed" ||
    normalized === "approved" ||
    normalized === "rejected"
  ) {
    return normalized as ProposalStatus;
  }
  return "unsubmitted";
}

type DashboardFilterType = "all" | "draft" | "live" | "favorite" | "expired";

const FILTER_TABS: Array<{ key: DashboardFilterType; label: string }> = [
  { key: "all", label: "ALL" },
  { key: "draft", label: "DRAFT" },
  { key: "live", label: "LIVE" },
  { key: "favorite", label: "FAVORITE" },
  { key: "expired", label: "EXPIRED" },
];

function toSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDashboardDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

function IconButton({
  icon,
  tooltip,
  onClick,
}: {
  icon: React.ReactNode;
  tooltip?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={tooltip}
      onClick={onClick}
      className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-300 transition-all duration-150 hover:scale-105 active:scale-95"
    >
      {icon}
    </button>
  );
}

function ProposalRow({ proposal }: { proposal: ProposalItem }) {
  const title = proposal.event?.eventName || "Untitled Proposal";
  const status = toStatus(proposal.status);
  const cfg = STATUS_CONFIG[status];
  const created = formatDashboardDate(proposal.createdAt);
  const views = proposal.viewsCount || 0;
  const clientName = `${proposal.contact?.contactFirstName || ""} ${
    proposal.contact?.contactLastName || ""
  }`.trim();
  const slug = `${toSlug(title) || "proposal"}-${proposal._id}`;
  const [copied, setCopied] = useState(false);

  const handleCopyProposalUrl = async () => {
    if (!slug) return;
    const proposalUrl = `${window.location.origin}/proposal-view/${slug}`;
    try {
      await navigator.clipboard.writeText(proposalUrl);
    } catch {
      const input = document.createElement("input");
      input.value = proposalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    toast.success("Proposal link copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <tr className="group transition-colors duration-150 hover:bg-slate-50/80 border-b border-slate-100 last:border-0">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ background: "linear-gradient(135deg, #00c2c9 0%, #06b6d4 30%, #0ea5e9 60%, #2563eb 100%)" }}>
            <span className="text-[10px] font-black text-white">
              {(title || "UP").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-800 leading-tight group-hover:text-[#00c2c9] transition-colors duration-150">
              {title}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {proposal._id}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4 text-[13px] text-slate-600 font-medium">
        <div className="flex items-center gap-1.5">
          <Users size={12} className="text-slate-400" />
          {clientName || proposal.contact?.contactEmail || "-"}
        </div>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${cfg.pill}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-400 font-medium">
          <Clock size={11} />
          {created}
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-semibold">
          <Eye size={12} className="text-slate-400" />
          {views}
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5">
          <IconButton
            icon={copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            tooltip={copied ? "Copied!" : "Copy Link"}
            onClick={handleCopyProposalUrl}
          />
          <Link href={`/proposal/${slug}`} target="_blank">
            <IconButton icon={<Eye size={14} />} tooltip="Preview" />
          </Link>
          <Link
            href={`/email/send-email?proposalId=${proposal._id}`}
            className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
            style={{ background: "linear-gradient(135deg, #00c2c9 0%, #06b6d4 30%, #0ea5e9 60%, #2563eb 100%)" }}
          >
            <Share2 size={12} />
            Share
          </Link>
        </div>
      </td>
    </tr>
  );
}

export default function DashboardTableList({
  proposals,
}: {
  proposals: ProposalItem[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DashboardFilterType>("all");

  const filtered = useMemo(
    () =>
      proposals.filter((p) => {
        const title = p.event?.eventName || "";
        const clientName = `${p.contact?.contactFirstName || ""} ${
          p.contact?.contactLastName || ""
        }`.trim();
        const matchSearch =
          !search ||
          title.toLowerCase().includes(search.toLowerCase()) ||
          clientName.toLowerCase().includes(search.toLowerCase()) ||
          (p.contact?.contactEmail || "")
            .toLowerCase()
            .includes(search.toLowerCase());

        const status = toStatus(p.status);
        const matchStatus =
          filter === "all" ||
          (filter === "draft" && p.isDraft) ||
          (filter === "live" && status === "submitted") ||
          (filter === "favorite" && Boolean(p.isFavorite)) ||
          (filter === "expired" &&
            !p.isDraft &&
            (p.isActive === false || status === "rejected"));

        return matchSearch && matchStatus;
      }),
    [filter, proposals, search],
  );

  const tabCounts = useMemo(
    () => ({
      all: proposals.length,
      draft: proposals.filter((p) => p.isDraft).length,
      live: proposals.filter((p) => toStatus(p.status) === "submitted").length,
      favorite: proposals.filter((p) => Boolean(p.isFavorite)).length,
      expired: proposals.filter(
        (p) =>
          !p.isDraft &&
          (p.isActive === false || toStatus(p.status) === "rejected"),
      ).length,
    }),
    [proposals],
  );

  return (
    <div className="space-y-6 px-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 flex-wrap gap-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-black text-slate-900 tracking-tight">
              Latest Proposals
            </h3>
            <span className="bg-slate-100 text-slate-500 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {proposals.length}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
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
                className="pl-8 pr-3 py-2 text-[12px] bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#00c2c9] focus:ring-1 focus:ring-[#00c2c9]/20 transition-all duration-150 w-72"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 no-scrollbar">
              {FILTER_TABS.map((tab) => {
                const isActive = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    className={`flex flex-shrink-0 items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all duration-200 ${
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
                      {tabCounts[tab.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {[
                  "Proposal",
                  "Client",
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
                filtered.map((p) => <ProposalRow key={p._id} proposal={p} />)
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-400 text-sm font-medium"
                  >
                    No proposals found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[12px] text-slate-400 font-medium">
            Showing{" "}
            <span className="text-slate-700 font-bold">{filtered.length}</span>{" "}
            of{" "}
            <span className="text-slate-700 font-bold">{proposals.length}</span>{" "}
            proposals
          </p>
          <Link
            href="/proposals"
            className="flex items-center gap-1 text-[12px] font-bold text-[#00c2c9] hover:text-brand-dark transition-colors duration-150"
          >
            View all proposals <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
