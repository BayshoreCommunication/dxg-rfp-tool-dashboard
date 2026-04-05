"use client";

import {
  deleteProposalAction,
  getProposalsAction,
} from "@/app/actions/proposals";
import {
  Clock,
  Copy,
  Edit3,
  Eye,
  FileText,
  MoreHorizontal,
  Plus,
  Share2,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { ProposalFilterType } from "./ProposalFilters";

type ProposalListItem = {
  _id: string;
  status?: string;
  isAccepted?: boolean;
  isOpen?: boolean;
  isFavorite?: boolean;
  viewsCount?: number;
  createdAt?: string;
  event?: {
    eventName?: string;
  };
  contact?: {
    contactFirstName?: string;
    contactLastName?: string;
  };
};

type ProposalTableListProps = {
  searchValue: string;
  activeFilter: ProposalFilterType;
  onCountsChange?: (
    counts: Partial<Record<ProposalFilterType, number>>,
  ) => void;
};

const getTotal = (pagination: unknown): number => {
  if (!pagination || typeof pagination !== "object") return 0;
  const total = (pagination as { total?: unknown }).total;
  return typeof total === "number" ? total : 0;
};

export default function ProposalTableList({
  searchValue,
  activeFilter,
  onCountsChange,
}: ProposalTableListProps) {
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(async () => {
      setLoading(true);

      const params: {
        page: number;
        limit: number;
        search?: string;
        status?: string;
        favorite?: boolean;
      } = {
        page: 1,
        limit: 10,
      };

      const search = searchValue.trim();
      if (search) {
        params.search = search;
      }

      if (activeFilter === "draft") {
        params.status = "draft";
      } else if (activeFilter === "live") {
        params.status = "submitted";
      } else if (activeFilter === "favorite") {
        params.favorite = true;
      }

      const [listRes, allRes, draftRes, liveRes, favoriteRes] =
        await Promise.all([
          getProposalsAction(params),
          getProposalsAction({ page: 1, limit: 1, search }),
          getProposalsAction({ page: 1, limit: 1, search, status: "draft" }),
          getProposalsAction({
            page: 1,
            limit: 1,
            search,
            status: "submitted",
          }),
          getProposalsAction({ page: 1, limit: 1, search, favorite: true }),
        ]);

      if (!mounted) return;

      if (listRes.success && Array.isArray(listRes.data)) {
        setProposals(listRes.data as ProposalListItem[]);
      } else {
        setProposals([]);
      }

      onCountsChange?.({
        all: getTotal(allRes.pagination),
        draft: getTotal(draftRes.pagination),
        live: getTotal(liveRes.pagination),
        favorite: getTotal(favoriteRes.pagination),
      });

      setLoading(false);
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [activeFilter, onCountsChange, refreshTick, searchValue]);

  const handleDeleteProposal = async (proposal: ProposalListItem) => {
    const proposalId = proposal._id;
    if (!proposalId || deletingId) return;

    const proposalName = proposal?.event?.eventName || "this proposal";
    const confirmed = window.confirm(
      `Delete "${proposalName}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(proposalId);
    try {
      const res = await deleteProposalAction(proposalId);
      if (!res.success) {
        toast.error(res.message || "Failed to delete proposal.");
        return;
      }
      toast.success("Proposal deleted successfully.");
      setRefreshTick((prev) => prev + 1);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyProposalUrl = async (proposalSlug: string) => {
    if (!proposalSlug) return;

    const proposalUrl = `${window.location.origin}/proposal/${proposalSlug}`;

    try {
      await navigator.clipboard.writeText(proposalUrl);
      toast.success("Proposal URL copied to clipboard.");
    } catch {
      const input = document.createElement("input");
      input.value = proposalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      toast.success("Proposal URL copied to clipboard.");
    }
  };

  return (
    <div className="min-h-screen py-6 font-sans text-slate-800 -mt-6 px-6">
      <div className="space-y-6">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-4 w-28 rounded bg-slate-100 animate-pulse" />
            <div className="mt-4 space-y-3">
              <div className="h-6 w-3/5 rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-2/5 rounded bg-slate-100 animate-pulse" />
              <div className="h-4 w-1/3 rounded bg-slate-100 animate-pulse" />
            </div>
            <div className="mt-6 flex items-center gap-4">
              <div className="h-16 w-20 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-10 w-10 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-10 w-10 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-10 w-10 rounded-xl bg-slate-100 animate-pulse" />
            </div>
          </div>
        ) : proposals.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-12 px-6 text-center shadow-sm">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <FileText size={64} strokeWidth={1.6} />
            </div>

            <p className="mx-auto mt-7 max-w-md text-[20px] font-semibold leading-snug text-slate-700">
              No proposals found for this filter. Try another filter or clear
              your search.
            </p>

            <div className="mt-7 mx-auto max-w-[180px]">
              <Link
                href="/proposals/add-new-proposal"
                className="group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-xl bg-primary-gradient px-5 py-2.5 text-[13px] font-bold uppercase tracking-widest text-white shadow-[0_4px_24px_rgba(45,198,245,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(45,198,245,0.55)] active:translate-y-0"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
                <Plus size={15} strokeWidth={3} className="shrink-0" />
                New Proposal
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {proposals.map((proposal, index) => {
              const title = proposal?.event?.eventName || "Untitled Proposal";
              const slugTitle = title
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
              const proposalSlug = proposal?._id
                ? `${slugTitle}-${proposal._id}`
                : slugTitle || "proposal";
              const ownerName = [
                proposal?.contact?.contactFirstName,
                proposal?.contact?.contactLastName,
              ]
                .filter(Boolean)
                .join(" ");
              const createdAt = proposal?.createdAt
                ? new Date(proposal.createdAt).toLocaleDateString()
                : "-";
              const views = proposal?.viewsCount ?? 0;
              const statusLabel = proposal?.status || "draft";
              const acceptedLabel = proposal?.isAccepted
                ? "Accepted"
                : "Not Accepted";
              const openLabel = proposal?.isOpen ? "Open" : "Closed";

              return (
                <div
                  key={proposal._id || `proposal-${index}`}
                  className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cyan-50 blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-blue-50 blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex items-start justify-between mb-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {statusLabel}
                      </span>
                      <span className="bg-slate-50 text-slate-500 border border-slate-200 px-3 py-1 rounded-full text-[11px] font-semibold">
                        {openLabel}
                      </span>
                      <span className="bg-slate-50 text-slate-500 border border-slate-200 px-3 py-1 rounded-full text-[11px] font-semibold">
                        {acceptedLabel}
                      </span>
                      {proposal?.isFavorite && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-[11px] font-semibold">
                          Favorite
                        </span>
                      )}
                      <span className="text-slate-400 text-[11px] ml-1 font-medium flex items-center gap-1">
                        <Clock size={10} />
                        Created:{" "}
                        <b className="text-slate-700 ml-1">{createdAt}</b>
                      </span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 transition-colors duration-150 p-1 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight truncate">
                        {title}
                      </h1>
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
                          <Users size={11} className="text-slate-400" />
                          Owner:{" "}
                          <span className="text-slate-800 font-semibold">
                            {ownerName || "-"}
                          </span>
                        </p>
                        <div className="text-[12px] text-slate-500 font-medium flex items-center gap-2">
                          <Share2 size={11} className="text-slate-400" />
                          Shared with:{" "}
                          <span className="text-slate-800 font-semibold">
                            Entire Team
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 shrink-0">
                      <div className="text-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <div className="text-3xl font-black text-slate-800 leading-none">
                          {views}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center justify-center gap-1">
                          <TrendingUp size={8} className="text-emerald-500" />
                          views
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <IconButton
                          icon={<Copy size={16} />}
                          tooltip="Copy URL"
                          onClick={() => void handleCopyProposalUrl(proposalSlug)}
                        />

                        <Link
                          href={`/proposal/${proposalSlug}`}
                          className="cursor-pointer"
                          target="_blank"
                        >
                          <IconButton
                            icon={<Eye size={16} />}
                            tooltip="Preview"
                          />
                        </Link>
                        <Link
                          href={`/proposals/proposal-edit?proposalId=${encodeURIComponent(proposal._id)}`}
                          className="cursor-pointer"
                        >
                          <IconButton
                            icon={<Edit3 size={16} />}
                            tooltip="Edit"
                          />
                        </Link>
                        <IconButton
                          icon={<Trash2 size={16} />}
                          tooltip={
                            deletingId === proposal._id
                              ? "Deleting..."
                              : "Delete"
                          }
                          onClick={() => void handleDeleteProposal(proposal)}
                          disabled={deletingId === proposal._id}
                        />
                        <Link
                          href={`/email/send-email?proposalId=${proposal._id}`}
                          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-md hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <Share2 size={15} /> Share
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
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
      title={tooltip}
      onClick={onClick}
      disabled={disabled}
      className="w-11 h-11 flex items-center justify-center bg-white text-slate-500 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
    >
      {icon}
    </button>
  );
}
