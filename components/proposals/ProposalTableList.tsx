"use client";

import {
  copyProposalAction,
  createProposalViewAccessGrantAction,
  deleteProposalAction,
  getProposalsAction,
  permanentlyDeleteProposalAction,
  restoreProposalAction,
  updateProposalMetaAction,
} from "@/app/actions/proposals";
import {
  Archive,
  ArchiveRestore,
  Clock,
  Copy,
  CopyPlus,
  Edit3,
  Eye,
  FileText,
  Heart,
  Loader2,
  Plus,
  Share2,
  Trash2,
  TrendingUp,
} from "lucide-react";
import SaveCopyModal from "./SaveCopyModal";
import ProposalDeletionDialog, { type ProposalDeletionMode } from "./ProposalDeletionDialog";
import Link from "next/link";
import StarterLinks from "./StarterLinks";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  buildProposalViewShareUrl,
  copyTextToClipboard,
} from "@/lib/proposals/proposalShareLink";
import type { ProposalFilterType } from "./ProposalFilters";
import { formatAppDate } from "@/lib/dateFormat";

type ProposalListItem = {
  _id: string;
  status?: "unsubmitted" | "submitted" | "reviewed" | "approved" | "rejected";
  isDraft?: boolean;
  isAccepted?: boolean;
  isOpen?: boolean;
  isActive?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  archivedAt?: string;
  isCopy?: boolean;
  viewsCount?: number;
  createdAt?: string;
  proposalSetting?: {
    proposals?: {
      expiryDate?: string;
    };
  };
  event?: {
    eventName?: string;
  };
  contact?: {
    contactFirstName?: string;
    contactLastName?: string;
  };
};

// Plain words for each filter in the empty state ("No draft proposals yet").
const EMPTY_FILTER_LABEL: Record<ProposalFilterType, string> = {
  all: "",
  draft: "draft",
  live: "live",
  favorite: "favorite",
  expired: "expired",
  archive: "archived",
  saved: "saved",
};

type ProposalTableListProps = {
  searchValue: string;
  activeFilter: ProposalFilterType;
  onRefreshCounts?: () => void;
};

type ProposalPagination = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

// Cards are compact, so a scroll page can hold more than the old pager did.
const PER_PAGE = 10;

/**
 * Append a freshly fetched page, dropping ids already on screen.
 *
 * Offset pagination shifts when a proposal is archived mid-scroll, so the next
 * page can repeat a row we already hold. Duplicate React keys would follow.
 */
const mergeProposals = (
  current: ProposalListItem[],
  incoming: ProposalListItem[],
) => {
  const seen = new Set(current.map((item) => item._id).filter(Boolean));
  return [
    ...current,
    ...incoming.filter((item) => !item._id || !seen.has(item._id)),
  ];
};

export default function ProposalTableList({
  searchValue,
  activeFilter,
  onRefreshCounts,
}: ProposalTableListProps) {
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedFilter, setLoadedFilter] = useState(activeFilter);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [permanentDeletingId, setPermanentDeletingId] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<{ proposal: ProposalListItem; mode: ProposalDeletionMode } | null>(null);
  const [deletionError, setDeletionError] = useState("");
  const deletionInFlight = useRef(false);
  const [favoritingId, setFavoritingId] = useState<string | null>(null);
  const [copyModalProposal, setCopyModalProposal] = useState<ProposalListItem | null>(null);
  const [copyingSaving, setCopyingSaving] = useState(false);
  const [copyingLinkId, setCopyingLinkId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [pagination, setPagination] = useState<ProposalPagination>({
    page: 1,
    limit: PER_PAGE,
    total: 0,
    totalPages: 1,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Which list we are scrolling through, and how deep into it we are. Filter,
  // search and refresh all start a different list, so the page number travels
  // with the key: a stale page number can never be applied to a new list.
  const listKey = `${activeFilter}::${searchValue.trim()}::${refreshTick}`;
  const [cursor, setCursor] = useState({ key: listKey, page: 1 });
  if (cursor.key !== listKey) {
    // Reset during render (not in an effect) so the fetch below never fires
    // once for the old page and again for page 1.
    setCursor({ key: listKey, page: 1 });
  }
  const currentPage = cursor.page;

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const hasMore = currentPage < totalPages;

  const loadMore = useCallback(() => {
    if (loadMoreError) {
      // Retry the page that failed rather than skipping past it.
      setLoadMoreError("");
      setRetryTick((tick) => tick + 1);
      return;
    }
    setCursor((prev) => ({ ...prev, page: prev.page + 1 }));
  }, [loadMoreError]);

  const parseExpiryDays = (expiryValue?: string): number | null => {
    if (!expiryValue) return null;
    const trimmed = expiryValue.trim().toLowerCase();
    if (!trimmed || trimmed === "none") return null;
    const match = trimmed.match(/(\d+)/);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };

  const formatDisplayDate = (value?: string): string => formatAppDate(value);

  const getExpiryMeta = (
    createdAt?: string,
    expiryValue?: string,
  ): {
    expiryLabel: string;
    expiryDateLabel: string;
    isExpiredByDate: boolean;
  } => {
    const createdDate = createdAt ? new Date(createdAt) : null;
    const expiryDays = parseExpiryDays(expiryValue);

    if (!createdDate || Number.isNaN(createdDate.getTime()) || !expiryDays) {
      return {
        expiryLabel: "No expiry",
        expiryDateLabel: "-",
        isExpiredByDate: false,
      };
    }

    const expiryDate = new Date(
      createdDate.getTime() + expiryDays * 24 * 60 * 60 * 1000,
    );
    const now = Date.now();
    const diffMs = expiryDate.getTime() - now;
    const dayMs = 24 * 60 * 60 * 1000;

    if (diffMs < 0) {
      const daysAfterExpiry = Math.max(1, Math.floor(Math.abs(diffMs) / dayMs));
      return {
        expiryLabel: `Expired ${daysAfterExpiry} day${daysAfterExpiry > 1 ? "s" : ""} ago`,
        expiryDateLabel: formatDisplayDate(expiryDate.toISOString()),
        isExpiredByDate: true,
      };
    }

    const daysLeft = Math.ceil(diffMs / dayMs);
    return {
      expiryLabel: `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`,
      expiryDateLabel: formatDisplayDate(expiryDate.toISOString()),
      isExpiredByDate: false,
    };
  };

  useEffect(() => {
    let mounted = true;
    // Page 1 is a fresh list and follows the search debounce; a scrolled-to page
    // is already a deliberate request, so it goes out immediately.
    const isFirstPage = currentPage === 1;

    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);

    const fetchPage = async () => {
      const params: {
        page: number;
        limit: number;
        search?: string;
        status?: string;
        favorite?: boolean;
        isActive?: boolean;
        archived?: boolean;
        isCopy?: boolean;
        isDraft?: boolean;
      } = {
        page: currentPage,
        limit: PER_PAGE,
      };

      const search = searchValue.trim();
      if (search) {
        params.search = search;
      }

      if (activeFilter === "draft") {
        params.isDraft = true;
      } else if (activeFilter === "live") {
        params.status = "submitted";
      } else if (activeFilter === "favorite") {
        params.favorite = true;
      } else if (activeFilter === "expired") {
        params.isActive = false;
      } else if (activeFilter === "archive") {
        params.archived = true;
      } else if (activeFilter === "saved") {
        params.isCopy = true;
      }

      const listRes = await getProposalsAction(params);

      if (!mounted) return;

      if (listRes.success && Array.isArray(listRes.data)) {
        const incoming = listRes.data as ProposalListItem[];
        setProposals((prev) =>
          isFirstPage ? incoming : mergeProposals(prev, incoming),
        );
        setPagination(
          listRes.pagination && typeof listRes.pagination === "object"
            ? (listRes.pagination as ProposalPagination)
            : { page: currentPage, limit: PER_PAGE, total: 0, totalPages: 1 },
        );
        setLoadMoreError("");
      } else if (isFirstPage) {
        setProposals([]);
        setPagination({
          page: currentPage,
          limit: PER_PAGE,
          total: 0,
          totalPages: 1,
        });
      } else {
        // Keep what is already on screen and let the planner retry this page.
        setLoadMoreError("Could not load more proposals.");
      }

      setLoadedFilter(activeFilter);
      setLoading(false);
      setLoadingMore(false);
    };

    const timer = setTimeout(() => void fetchPage(), isFirstPage ? 300 : 0);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [activeFilter, currentPage, refreshTick, retryTick, searchValue]);

  // Pull the next page as the sentinel below the list comes into view. Paused
  // while a request is in flight or a retry is waiting, so scrolling past the
  // end cannot queue a burst of requests.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading || loadingMore || loadMoreError) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      // Start fetching before the sentinel is actually on screen.
      { rootMargin: "300px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMoreError, loadMore]);

  /**
   * Drop a row the planner just archived, restored or deleted.
   *
   * Re-fetching would mean replaying every page they had scrolled through, so
   * the row goes out locally. If that empties the list we do reload from the
   * top, because the next page's rows have shifted up into view.
   */
  const removeProposalLocally = (proposalId: string) => {
    const remaining = proposals.filter((item) => item._id !== proposalId);
    setProposals(remaining);
    setPagination((prev) => ({
      ...prev,
      total: Math.max(0, (prev.total ?? 1) - 1),
    }));
    if (remaining.length === 0) setRefreshTick((tick) => tick + 1);
  };

  const requestDeletion = (proposal: ProposalListItem, mode: ProposalDeletionMode) => {
    if (!proposal._id || deletionInFlight.current) return;
    setDeletionError("");
    setPendingDeletion({ proposal, mode });
  };

  const cancelDeletion = () => {
    if (!deletionInFlight.current) setPendingDeletion(null);
  };

  const confirmDeletion = async () => {
    if (!pendingDeletion || deletionInFlight.current) return;
    const proposalId = pendingDeletion.proposal._id;
    const permanent = pendingDeletion.mode === "permanent";
    deletionInFlight.current = true;
    setDeletionError("");
    if (permanent) setPermanentDeletingId(proposalId);
    else setDeletingId(proposalId);
    try {
      const res = await (permanent ? permanentlyDeleteProposalAction(proposalId) : deleteProposalAction(proposalId));
      if (!res.success) {
        setDeletionError(res.message || (permanent ? "Could not delete this proposal. Please try again." : "Could not archive this proposal. Please try again."));
        return;
      }
      setPendingDeletion(null);
      toast.success(permanent ? "Proposal permanently deleted." : "Proposal moved to archive.");
      removeProposalLocally(proposalId);
      onRefreshCounts?.();
    } catch {
      setDeletionError(permanent ? "Could not delete this proposal. Please try again." : "Could not archive this proposal. Please try again.");
    } finally {
      deletionInFlight.current = false;
      setDeletingId(null);
      setPermanentDeletingId(null);
    }
  };

  const handleRestoreProposal = async (proposal: ProposalListItem) => {
    const proposalId = proposal._id;
    if (!proposalId || restoringId) return;

    setRestoringId(proposalId);
    try {
      const res = await restoreProposalAction(proposalId);
      if (!res.success) {
        toast.error(res.message || "Failed to restore proposal.");
        return;
      }
      toast.success("Proposal restored successfully.");
      removeProposalLocally(proposalId);
      onRefreshCounts?.();
    } finally {
      setRestoringId(null);
    }
  };

  const handleCopyProposalUrl = async (
    proposalId: string,
    proposalSlug: string,
  ) => {
    if (!proposalId || !proposalSlug || copyingLinkId) return;

    setCopyingLinkId(proposalId);
    try {
      const grant = await createProposalViewAccessGrantAction(proposalId);
      if (!grant.success || !grant.token) {
        toast.error(grant.message || "Could not create a secure proposal link.");
        return;
      }

      const proposalUrl = buildProposalViewShareUrl(
        window.location.origin,
        proposalSlug,
        grant.token,
      );
      await copyTextToClipboard(proposalUrl);
      toast.success("Secure proposal link copied. It is valid for 30 days.");
    } catch {
      toast.error("Could not copy the proposal link. Please try again.");
    } finally {
      setCopyingLinkId(null);
    }
  };

  const handleSaveCopy = async (overrides: {
    eventName: string;
    startDate: string;
    endDate: string;
  }) => {
    if (!copyModalProposal?._id) return;
    setCopyingSaving(true);
    try {
      const result = await copyProposalAction(copyModalProposal._id, {
        eventName: overrides.eventName,
        ...(overrides.startDate ? { startDate: overrides.startDate } : {}),
        ...(overrides.endDate ? { endDate: overrides.endDate } : {}),
        isDraft: false,
      });
      if (result.success) {
        toast.success("Copy saved successfully!");
        setCopyModalProposal(null);
        setRefreshTick((prev) => prev + 1);
        onRefreshCounts?.();
      } else {
        toast.error(result.message || "Failed to save copy.");
      }
    } catch {
      toast.error("An error occurred while saving the copy.");
    } finally {
      setCopyingSaving(false);
    }
  };

  const handleToggleFavorite = async (proposal: ProposalListItem) => {
    if (!proposal?._id || favoritingId) return;

    const nextFavorite = !Boolean(proposal.isFavorite);
    const removeFromFavoriteList =
      activeFilter === "favorite" && !nextFavorite;
    const originalIndex = proposals.findIndex(
      (item) => item._id === proposal._id,
    );
    setFavoritingId(proposal._id);

    try {
      setProposals((prev) =>
        removeFromFavoriteList
          ? prev.filter((item) => item._id !== proposal._id)
          : prev.map((item) =>
              item._id === proposal._id
                ? { ...item, isFavorite: nextFavorite }
                : item,
            ),
      );

      const res = await updateProposalMetaAction(proposal._id, {
        isFavorite: nextFavorite,
      });

      if (!res.success) {
        setProposals((prev) => {
          if (!removeFromFavoriteList) {
            return prev.map((item) =>
              item._id === proposal._id
                ? { ...item, isFavorite: !nextFavorite }
                : item,
            );
          }
          if (prev.some((item) => item._id === proposal._id)) return prev;
          const restored = [...prev];
          restored.splice(
            Math.max(0, Math.min(originalIndex, restored.length)),
            0,
            { ...proposal, isFavorite: true },
          );
          return restored;
        });
        toast.error(res.message || "Failed to update favorite.");
      } else {
        if (removeFromFavoriteList) {
          setRefreshTick((prev) => prev + 1);
        }
        onRefreshCounts?.();
      }
    } finally {
      setFavoritingId(null);
    }
  };

  return (
    <>
    <div className="-mt-6 min-h-screen px-1 py-6 font-sans text-slate-800 sm:px-2 lg:px-6">
      <div className="space-y-4">
        {loading || loadedFilter !== activeFilter ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={`proposal-skeleton-${item}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-2/5 rounded bg-slate-100 animate-pulse" />
                    <div className="h-3 w-1/3 rounded bg-slate-100 animate-pulse" />
                    <div className="h-3 w-1/4 rounded bg-slate-100 animate-pulse" />
                  </div>
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <div className="h-9 w-16 rounded-lg bg-slate-100 animate-pulse" />
                    <div className="h-9 w-9 rounded-lg bg-slate-100 animate-pulse" />
                    <div className="h-9 w-9 rounded-lg bg-slate-100 animate-pulse" />
                    <div className="h-9 w-9 rounded-lg bg-slate-100 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : proposals.length === 0 && activeFilter === "all" && !searchValue.trim() ? (
          // The account has no proposals at all. Say what the product is and
          // offer the three ways to start, instead of blaming a filter the
          // planner never touched.
          <section
            aria-labelledby="proposals-first-run-title"
            data-testid="proposals-first-run"
            className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              No proposals yet
            </p>
            <h2
              id="proposals-first-run-title"
              className="mt-2 text-balance text-2xl font-bold tracking-tight text-slate-900"
            >
              Create your first RFP
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
              RFPilot turns your event details into an AV production RFP, the
              request you send to vendors so they can quote. Nothing goes out
              until you pick vendors.
            </p>
            <StarterLinks className="mt-6" />
          </section>
        ) : proposals.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-12 px-6 text-center shadow-sm">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <FileText size={64} strokeWidth={1.6} />
            </div>

            <p className="mx-auto mt-7 max-w-md text-[20px] font-semibold leading-snug text-slate-700">
              {searchValue.trim()
                ? `Nothing matches “${searchValue.trim()}”. Try a different search.`
                : `No ${EMPTY_FILTER_LABEL[activeFilter]} proposals yet. Try another filter.`}
            </p>

            <div className="mt-7 mx-auto max-w-[180px]">
              <Link
                href="/proposals/add-new-proposal"
                className="group relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-[13px] font-bold uppercase tracking-widest text-white shadow-[0_4px_20px_rgba(14,165,233,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(14,165,233,0.6)] active:translate-y-0"
                style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
                <Plus size={15} strokeWidth={3} className="shrink-0" />
                New Proposal
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
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
              const createdAt = formatDisplayDate(proposal?.createdAt);
              const views = proposal?.viewsCount ?? 0;
              const isDraft = proposal?.isDraft === true;
              const isCopy = proposal?.isCopy === true;
              const status = proposal?.status ?? "unsubmitted";
              // For copies the backend may not clear isDraft or set isActive when submitting,
              // so use status as the authoritative signal for both draft and live state.
              const effectiveDraft = isCopy ? status !== "submitted" : isDraft;
              // isSavedDraft: copy that has NOT yet been submitted — shows violet "offline" colours
              const isSavedDraft = isCopy && effectiveDraft;
              // Backend may not set isActive:true when a copy is submitted; a submitted copy is live.
              const isEffectivelyActive = isCopy
                ? status === "submitted"
                : proposal?.isActive !== false;
              const submittedLabel =
                status === "submitted" ? "Submitted"
                : status === "reviewed" ? "Reviewed"
                : status === "approved" ? "Approved"
                : status === "rejected" ? "Rejected"
                : "Not Submitted";
              const expiryMeta = getExpiryMeta(
                proposal?.createdAt,
                proposal?.proposalSetting?.proposals?.expiryDate,
              );
              // Only submitted (non-draft) proposals can expire.
              const isExpired = !effectiveDraft && expiryMeta.isExpiredByDate;
              const liveOrExpiredLabel = effectiveDraft
                ? "Offline"
                : isExpired
                ? "Expired"
                : isEffectivelyActive
                ? "Live"
                : "Offline";
              // Sharing follows the badge exactly: only a Live proposal can go to vendors.
              const isLive = liveOrExpiredLabel === "Live";
              const statusBadgeClass = isSavedDraft
                ? "bg-violet-50 text-violet-600 border-violet-200"
                : isExpired
                ? "bg-rose-50 border-rose-200 text-rose-600"
                : isEffectivelyActive
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200";
              const statusDotClass = isSavedDraft
                ? "bg-violet-400"
                : isExpired
                ? "bg-rose-400"
                : isEffectivelyActive
                ? "bg-emerald-400 animate-pulse"
                : "bg-slate-400";
              const isArchiveView = activeFilter === "archive";
              const archivedDate = proposal?.archivedAt ? new Date(proposal.archivedAt) : null;
              const daysUntilPurge = archivedDate
                ? Math.max(0, Math.ceil((archivedDate.getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)))
                : null;

              return (
                <article
                  key={proposal._id || `proposal-${index}`}
                  data-testid="proposal-card"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md sm:px-4 sm:py-3"
                >
                  <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                    <div className="min-w-0 flex-1">
                      {/* State first, then what the RFP is called, then its dates. */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isArchiveView ? (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              <Archive size={9} />
                              Archived
                            </span>
                            {daysUntilPurge !== null && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold"
                                style={
                                  daysUntilPurge <= 7
                                    ? {
                                        background: "var(--dxg-danger-surface)",
                                        color: "var(--dxg-danger-text)",
                                        borderColor: "var(--dxg-danger-border)",
                                      }
                                    : {
                                        background: "var(--dxg-warning-surface)",
                                        color: "var(--dxg-warning-text)",
                                        borderColor: "var(--dxg-warning-border)",
                                      }
                                }
                              >
                                {daysUntilPurge}d until deletion
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {isCopy ? (
                              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                                Saved Copy
                              </span>
                            ) : isDraft ? (
                              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                Draft
                              </span>
                            ) : null}
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {submittedLabel}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`}
                              />
                              {liveOrExpiredLabel}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="mt-1.5 break-words text-[15px] font-bold leading-snug tracking-tight text-slate-900 sm:truncate">
                        {title}
                      </h3>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-slate-400">
                        {isArchiveView
                          ? archivedDate && (
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <Clock size={9} />
                                Archived:{" "}
                                <b className="ml-0.5 text-slate-700">
                                  {formatDisplayDate(proposal.archivedAt)}
                                </b>
                              </span>
                            )
                          : (
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <Clock size={9} />
                                Created:{" "}
                                <b className="ml-0.5 text-slate-700">{createdAt}</b>
                              </span>
                            )}

                        {/* Date and remaining-days pill are one fact, so they
                            wrap as one unit instead of splitting across lines. */}
                        {expiryMeta.expiryDateLabel !== "-" && (
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <Clock
                              size={9}
                              className={isExpired ? "text-rose-400" : undefined}
                            />
                            Expiry:{" "}
                            <b
                              className={`ml-0.5 ${isExpired ? "text-rose-600" : "text-slate-700"}`}
                            >
                              {expiryMeta.expiryDateLabel}
                            </b>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                isExpired
                                  ? "border border-rose-100 bg-rose-50 text-rose-500"
                                  : "border border-emerald-100 bg-emerald-50 text-emerald-600"
                              }`}
                            >
                              {expiryMeta.expiryLabel}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto lg:shrink-0">
                      <div className="flex items-center gap-2">
                        {/* Favorite button — hidden for copies (copies cannot be favourited) */}
                        {!isCopy && (
                          <button
                            type="button"
                            aria-label={proposal?.isFavorite ? "Remove favorite" : "Mark as favorite"}
                            title={proposal?.isFavorite ? "Remove favorite" : "Mark as favorite"}
                            disabled={favoritingId === proposal._id}
                            onClick={() => void handleToggleFavorite(proposal)}
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-slate-400 shadow-sm transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${proposal?.isFavorite ? "border-rose-200 bg-rose-50 text-rose-500 hover:text-rose-600" : "border-slate-200 bg-white hover:border-slate-300 hover:text-slate-600"}`}
                          >
                            <Heart
                              size={15}
                              className={proposal?.isFavorite ? "fill-current text-rose-500" : ""}
                            />
                          </button>
                        )}
                        <div className="flex h-9 w-full flex-1 items-center justify-between gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 sm:w-auto sm:flex-none sm:justify-center">
                          <TrendingUp size={10} className="text-emerald-500" />
                          <span className="text-base font-black leading-none text-slate-800">
                            {views}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            views
                          </span>
                        </div>
                      </div>

                      {isArchiveView ? (
                        <div className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:items-center">
                          <button
                            type="button"
                            onClick={() => void handleRestoreProposal(proposal)}
                            disabled={restoringId === proposal._id}
                            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 text-[11px] font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-4"
                          >
                            <ArchiveRestore size={14} />
                            {restoringId === proposal._id ? "Restoring..." : "Restore"}
                          </button>
                          <ActionButton
                            icon={<Trash2 size={14} />}
                            label={permanentDeletingId === proposal._id ? "Deleting..." : "Delete forever"}
                            onClick={() => requestDeletion(proposal, "permanent")}
                            disabled={permanentDeletingId === proposal._id}
                          />
                        </div>
                      ) : (
                        <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:items-center">
                          <ActionButton
                            icon={<Copy size={14} />}
                            label={copyingLinkId === proposal._id ? "Creating link..." : "Copy URL"}
                            onClick={() => void handleCopyProposalUrl(proposal._id, proposalSlug)}
                            disabled={copyingLinkId !== null}
                          />
                          <ActionLink
                            href={`/proposal/${proposalSlug}`}
                            label="Preview"
                            icon={<Eye size={14} />}
                            target="_blank"
                          />
                          <ActionLink
                            href={`/proposals/proposal-edit?proposalId=${encodeURIComponent(proposal._id)}`}
                            label="Edit"
                            icon={<Edit3 size={14} />}
                          />
                          {!isCopy && (
                            <ActionButton
                              icon={<CopyPlus size={14} />}
                              label="Save a copy"
                              onClick={() => setCopyModalProposal(proposal)}
                            />
                          )}
                          <ActionButton
                            icon={<Archive size={14} />}
                            label={deletingId === proposal._id ? "Archiving..." : "Archive"}
                            title="Move to archive — recoverable for 30 days."
                            onClick={() => requestDeletion(proposal, "archive")}
                            disabled={deletingId === proposal._id}
                          />
                          {/* Only a live (published) proposal can be sent to
                              vendors; a draft or offline one keeps the slot but
                              says why it cannot be shared yet. */}
                          {isLive ? (
                            <ActionLink
                              href={`/email/send-email?proposalId=${proposal._id}`}
                              label="Share"
                              icon={<Share2 size={13} />}
                              emphasis
                            />
                          ) : (
                            <ActionButton
                              icon={<Share2 size={13} />}
                              label="Share"
                              title="Publish the proposal to share it with vendors."
                              disabled
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {hasMore && (
              <div ref={sentinelRef} data-testid="proposals-scroll-sentinel">
                {loadMoreError ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-5 text-center">
                    <p role="alert" className="text-[12px] font-medium text-slate-600">
                      {loadMoreError}
                    </p>
                    <button
                      type="button"
                      onClick={loadMore}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    >
                      Try again
                    </button>
                  </div>
                ) : loadingMore ? (
                  <div className="space-y-3">
                    {[1, 2].map((item) => (
                      <div
                        key={`proposal-more-skeleton-${item}`}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                        aria-hidden="true"
                      >
                        <div className="h-4 w-2/5 rounded bg-slate-100 animate-pulse" />
                        <div className="mt-2 h-3 w-1/4 rounded bg-slate-100 animate-pulse" />
                      </div>
                    ))}
                    <p className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      <Loader2 size={12} className="animate-spin" />
                      Loading more
                    </p>
                  </div>
                ) : (
                  // Scrolling loads the next page on its own; this keeps the
                  // same reach for keyboard users and for anything without an
                  // IntersectionObserver.
                  <button
                    type="button"
                    onClick={loadMore}
                    className="mx-auto block rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-700"
                  >
                    Load more proposals
                  </button>
                )}
              </div>
            )}

            {!hasMore && (pagination.total ?? 0) > PER_PAGE && (
              <p className="text-center text-[11px] font-medium text-slate-400">
                All {pagination.total} proposals loaded
              </p>
            )}
          </div>
        )}
      </div>
    </div>

    {pendingDeletion && (
      <ProposalDeletionDialog
        proposalName={pendingDeletion.proposal.event?.eventName || "Untitled proposal"}
        mode={pendingDeletion.mode}
        busy={deletingId !== null || permanentDeletingId !== null}
        error={deletionError}
        onCancel={cancelDeletion}
        onConfirm={() => void confirmDeletion()}
      />
    )}
    <SaveCopyModal
      isOpen={!!copyModalProposal}
      onClose={() => setCopyModalProposal(null)}
      onConfirm={(overrides) => void handleSaveCopy(overrides)}
      saving={copyingSaving}
      defaultEventName={copyModalProposal?.event?.eventName ?? ""}
    />
    </>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Hover text when it should say more than the label (e.g. why disabled). */
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-600 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-9 sm:px-0"
    >
      {icon}
      <span className="truncate sm:sr-only">{label}</span>
    </button>
  );
}

function ActionLink({
  href,
  icon,
  label,
  target,
  emphasis = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  target?: "_blank";
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 text-[10px] font-bold shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 sm:px-0 ${
        emphasis
          ? "border-[#008ad2] bg-gradient-to-br from-[#2fc6f5] to-[#008ad2] text-white hover:shadow-md hover:shadow-[#0ea5e9]/20 sm:w-auto sm:px-3.5 sm:text-[11px]"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 sm:w-9"
      }`}
    >
      {icon}
      <span className={emphasis ? "truncate" : "truncate sm:sr-only"}>{label}</span>
    </Link>
  );
}
