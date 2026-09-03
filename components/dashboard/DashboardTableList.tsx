"use client";

import { createProposalViewAccessGrantAction } from "@/app/actions/proposals";
import {
  buildProposalViewShareUrl,
  copyTextToClipboard,
} from "@/lib/proposals/proposalShareLink";
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

/**
 * A row is a draft if it shows the Draft badge. The badge reads the status
 * while the filter and counts read isDraft, so a proposal carrying one but not
 * the other listed as "Draft" under a DRAFT tab that counted zero.
 */
const isDraftRow = (proposal: { isDraft?: boolean; status?: string }): boolean =>
  proposal.isDraft === true || toStatus(proposal.status) === "unsubmitted";

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
  disabled = false,
}: {
  icon: React.ReactNode;
  tooltip?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={tooltip}
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-300 transition-all duration-150 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
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
  const [copying, setCopying] = useState(false);

  const handleCopyProposalUrl = async () => {
    if (!slug || copying) return;
    setCopying(true);
    try {
      const grant = await createProposalViewAccessGrantAction(proposal._id);
      if (!grant.success || !grant.token) {
        toast.error(grant.message || "Could not create a secure proposal link.");
        return;
      }
      const proposalUrl = buildProposalViewShareUrl(
        window.location.origin,
        slug,
        grant.token,
      );
      await copyTextToClipboard(proposalUrl);
    } catch {
      toast.error("Could not copy the proposal link. Please try again.");
      return;
    } finally {
      setCopying(false);
    }
    setCopied(true);
    toast.success("Secure proposal link copied. It is valid for 30 days.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <tr className="group transition-colors duration-150 hover:bg-slate-50/80 border-b border-slate-100 last:border-0">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}>
            <span className="text-[10px] font-black text-white">
              {(title || "UP").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-800 leading-tight group-hover:text-[#008ad2] transition-colors duration-150">
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
            disabled={copying}
          />
          <Link href={`/proposal/${slug}`} target="_blank">
            <IconButton icon={<Eye size={14} />} tooltip="Preview" />
          </Link>
          <Link
            href={`/email/send-email?proposalId=${proposal._id}`}
            className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
            style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}
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
  totalProposals,
}: {
  /** The most recent proposals only; the full count arrives separately. */
  proposals: ProposalItem[];
  totalProposals?: number;
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
          (filter === "draft" && isDraftRow(p)) ||
          (filter === "live" && status === "submitted") ||
          (filter === "favorite" && Boolean(p.isFavorite)) ||
          (filter === "expired" &&
            !isDraftRow(p) &&
            (p.isActive === false || status === "rejected"));

        return matchSearch && matchStatus;
      }),
    [filter, proposals, search],
  );

  const tabCounts = useMemo(
    () => ({
      all: proposals.length,
      draft: proposals.filter(isDraftRow).length,
      live: proposals.filter((p) => toStatus(p.status) === "submitted").length,
      favorite: proposals.filter((p) => Boolean(p.isFavorite)).length,
      expired: proposals.filter(
        (p) =>
          !isDraftRow(p) &&
          (p.isActive === false || toStatus(p.status) === "rejected"),
      ).length,
    }),
    [proposals],
  );

  return (
    <div className="space-y-6 px-1 sm:px-2 lg:px-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <h3 className="whitespace-nowrap text-[14px] font-black tracking-tight text-slate-900">
              Latest Proposals
            </h3>
            <span className="bg-slate-100 text-slate-500 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {proposals.length}
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <div className="relative w-full sm:w-auto">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search proposals..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-[12px] text-slate-700 placeholder-slate-400 transition-all duration-150 focus:border-[#008ad2] focus:outline-none focus:ring-1 focus:ring-[#008ad2]/20 sm:w-64 xl:w-72"
              />
            </div>

            <div className="-mb-1 flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto">
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

        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[760px] text-left">
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

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-[12px] text-slate-400 font-medium">
            {/* This table only ever holds the latest few; say so instead of "5 of 5". */}
            Showing{" "}
            <span className="text-slate-700 font-bold">{filtered.length}</span>{" "}
            of your{" "}
            <span className="text-slate-700 font-bold">{proposals.length}</span>{" "}
            most recent proposals
            {typeof totalProposals === "number" && totalProposals > proposals.length ? (
              <>
                {" "}· <span className="text-slate-700 font-bold">{totalProposals}</span> in total
              </>
            ) : null}
          </p>
          <Link
            href="/proposals"
            className="flex items-center gap-1 text-[12px] font-bold text-[#008ad2] hover:text-brand-dark transition-colors duration-150"
          >
            View all proposals <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
