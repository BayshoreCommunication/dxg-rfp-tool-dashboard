"use client";

import {
  deleteEmailCampaignAction,
  getEmailCampaignsAction,
} from "@/app/actions/email";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  BarChart3,
  CircleAlert,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  MousePointerClick,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { formatAppDateTime } from "@/lib/dateFormat";

type EmailCampaign = {
  _id: string;
  proposalId?: string;
  proposalTitle: string;
  subject: string;
  message?: string;
  totalRecipients?: number;
  sentCount?: number;
  openedCount?: number;
  clickedCount?: number;
  vendorResponseClickCount?: number;
  vendorResponseCount?: number;
  unreadResponseCount?: number;
  recipients?: Array<{
    email?: string;
    status?: "sent" | "failed";
  }>;
  createdAt: string;
};

type EmailPagination = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

const FALLBACK_TITLE =
  "Official email request to the prospect to sign the proposal link";
const FALLBACK_BODY =
  "This email will be sent if you choose to notify the prospect when publishing a proposal.";
const PER_PAGE = 6;

const buildPageItems = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      "...",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
};

export default function EmailDashboard() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [pagination, setPagination] = useState<EmailPagination>({
    page: 1,
    limit: PER_PAGE,
    total: 0,
    totalPages: 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(
    null,
  );
  const loadData = useCallback(async (page = 1) => {
    setLoading(true);
    const campaignsRes = await getEmailCampaignsAction({
      page,
      limit: PER_PAGE,
    });

    if (campaignsRes.success && Array.isArray(campaignsRes.data)) {
      setCampaigns(campaignsRes.data as EmailCampaign[]);
      setPagination(
        campaignsRes.pagination && typeof campaignsRes.pagination === "object"
          ? (campaignsRes.pagination as EmailPagination)
          : { page, limit: PER_PAGE, total: 0, totalPages: 1 },
      );
    } else {
      setCampaigns([]);
      setPagination({ page, limit: PER_PAGE, total: 0, totalPages: 1 });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // The async loader owns loading/data state for this page transition.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData(currentPage);
  }, [currentPage, loadData]);

  const handleDelete = async (campaignId: string) => {
    setDeletingCampaignId(campaignId);
    const res = await deleteEmailCampaignAction(campaignId);
    setDeletingCampaignId(null);

    if (!res.success) {
      toast.error(res.message || "Failed to delete email campaign.");
      return;
    }

    toast.success(res.message || "Email campaign deleted.");
    const nextPage =
      campaigns.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
    setCurrentPage(nextPage);
    await loadData(nextPage);
  };

  const totalPages = Math.max(1, pagination.totalPages || 1);
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4, 5, 6].map((key) => (
          <LoadingSkeletonCard key={key} />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white  px-6 py-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <BarChart3 size={28} strokeWidth={1.8} />
        </div>
        <p className="mt-5 text-[18px] font-semibold text-slate-800">
          No sent email analytics yet
        </p>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-slate-500">
          Once you send proposal emails, delivery, opens, and clicks will appear
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {campaigns.map((campaign) => {
        const title = campaign.subject?.trim() || FALLBACK_TITLE;
        const body = campaign.message?.trim() || FALLBACK_BODY;
        const isDeleting = deletingCampaignId === campaign._id;

        return (
          <div
            key={campaign._id}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-[#008ad2]/5 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-14 -left-14 h-40 w-40 rounded-full bg-[#2563eb]/5 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Left side */}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#008ad2]/30 bg-[#008ad2]/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-dark">
                    Proposal Email
                  </span>
                  {/* <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                    <Clock size={10} />
                    {campaign?.createdAt
                      ? new Date(campaign.createdAt).toLocaleDateString()
                      : "No date"}
                  </span> */}
                </div>

                <h2 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-2xl">
                  {title}
                </h2>

                <p className="mt-1 text-[15px] leading-6 text-slate-500 line-clamp-2">
                  {body}
                </p>

                <CampaignRecipients recipients={campaign.recipients} />

                <p className="mt-3 text-[14px] font-medium text-slate-400">
                  {campaign?.createdAt
                    ? formatAppDateTime(campaign.createdAt, "Not available")
                    : "Not available"}
                </p>
              </div>

              {/* Campaign metrics and actions */}
              <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-center lg:gap-4">
                <MetricCard
                  label="Sent"
                  value={campaign.sentCount || 0}
                  icon={<Send size={16} />}
                  tooltip="Total emails sent to recipients"
                />
                <MetricCard
                  label="View Clicks"
                  value={campaign.clickedCount || 0}
                  icon={<Eye size={16} />}
                  tooltip="Number of times recipients clicked to view the proposal"
                />
                <MetricCard
                  label="Submit Clicks"
                  value={campaign.vendorResponseClickCount || 0}
                  icon={<MousePointerClick size={16} />}
                  tooltip="Number of times recipients clicked the submit button"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(campaign._id)}
                  disabled={isDeleting}
                  className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-center text-rose-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:shadow-md hover:shadow-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={16} aria-hidden="true" />
                  <span className="mt-1 text-[8px] font-bold uppercase leading-tight tracking-[0.12em]">
                    {isDeleting ? "Deleting..." : "Delete"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="pt-2">
        <div className="flex justify-end">
          <nav aria-label="Email campaigns pagination">
            <ul className="flex -space-x-px text-sm">
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentPage === 1}
                  className="flex h-10 w-10 items-center justify-center rounded-s-lg border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft size={16} />
                </button>
              </li>

              {buildPageItems(currentPage, totalPages).map((item, index) =>
                item === "..." ? (
                  <li key={`ellipsis-${index}`}>
                    <span className="flex h-10 w-10 items-center justify-center border border-slate-200 bg-slate-50 text-slate-400">
                      ...
                    </span>
                  </li>
                ) : (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(item as number)}
                      aria-current={currentPage === item ? "page" : undefined}
                      className={`flex h-10 w-10 items-center justify-center border border-slate-200 font-semibold transition-colors ${
                        currentPage === item
                          ? "bg-sky-100 text-sky-700"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {item}
                    </button>
                  </li>
                ),
              )}

              <li>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="flex h-10 w-10 items-center justify-center rounded-e-lg border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight size={16} />
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}

function CampaignRecipients({
  recipients,
}: {
  recipients?: EmailCampaign["recipients"];
}) {
  const validRecipients = (recipients ?? []).filter(
    (recipient): recipient is { email: string; status?: "sent" | "failed" } =>
      typeof recipient.email === "string" && recipient.email.trim().length > 0,
  );

  if (validRecipients.length === 0) {
    return (
      <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-400">
        <Mail size={14} aria-hidden="true" /> Recipient details unavailable
      </p>
    );
  }

  const recipientChip = (
    recipient: { email: string; status?: "sent" | "failed" },
    index: number,
  ) => {
    const failed = recipient.status === "failed";
    return (
      <span
        key={`${recipient.email}-${index}`}
        title={failed ? `Delivery failed: ${recipient.email}` : `Sent to ${recipient.email}`}
        className={cn(
          "inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors",
          failed
            ? "border-rose-200 bg-rose-50/80 text-rose-700 hover:border-rose-300 hover:bg-rose-50"
            : "border-sky-200/80 bg-sky-50/80 text-slate-700 hover:border-sky-300 hover:bg-sky-50",
        )}
      >
        {failed ? (
          <CircleAlert
            size={14}
            className="shrink-0 text-rose-500"
            aria-hidden="true"
          />
        ) : (
          <BadgeCheck
            size={14}
            className="shrink-0 text-emerald-500"
            aria-hidden="true"
          />
        )}
        <span className="min-w-0 break-all sm:break-normal">
          {recipient.email}
        </span>
        <span className="sr-only">{failed ? "delivery failed" : "sent"}</span>
      </span>
    );
  };

  return (
    <div
      className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start"
      aria-label="Campaign recipients"
    >
      <span className="inline-flex min-h-8 shrink-0 items-center gap-1.5 text-xs font-bold text-slate-500">
        <Mail size={14} className="text-[#008ad2]" aria-hidden="true" />
        Recipients
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        {validRecipients.map(recipientChip)}
      </div>
    </div>
  );
}

function LoadingSkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-5 w-40 animate-pulse rounded-full bg-slate-100" />
          <div className="h-6 w-4/5 animate-pulse rounded-md bg-slate-100" />
          <div className="h-4 w-3/5 animate-pulse rounded-md bg-slate-100" />
          <div className="h-3 w-1/3 animate-pulse rounded-md bg-slate-100" />
        </div>

        <div className="flex items-center gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[78px] w-[94px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
            />
          ))}
        </div>

        <div className="h-[42px] w-[110px] animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  highlight = false,
  tooltip,
  unreadCount,
  onClick,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  icon?: React.ReactNode;
  tooltip?: string;
  unreadCount?: number;
  onClick?: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setShowTooltip(true), 300);
  };
  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTooltip(false);
  };

  const baseClass = cn(
    "relative flex flex-col items-center justify-center w-[76px] h-[76px] rounded-xl border text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md select-none",
    highlight ? "border-emerald-200" : "border-slate-200",
    onClick ? "cursor-pointer" : "",
  );
  const style = {
    background: highlight
      ? "linear-gradient(to bottom, #ecfdf5, #ffffff)"
      : "linear-gradient(to bottom, #ffffff, #f8fafc)",
  };

  const content = (
    <>
      {/* Unread badge */}
      {unreadCount && unreadCount > 0 ? (
        <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md z-10">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}


      {/* Value — middle */}
      <p
        className={cn(
          "text-[16px] font-black leading-none",
          highlight ? "text-emerald-700" : "text-slate-900",
        )}
      >
        {value}
      </p>

      {/* Label — bottom */}
      <p
        className={cn(
          "mt-0.5 text-[8px] font-bold uppercase tracking-[0.12em] leading-tight",
          highlight ? "text-emerald-600" : "text-slate-500",
        )}
      >
        {label}
      </p>

      {/* Tooltip */}
      {tooltip && showTooltip && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg">
          {tooltip}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={baseClass}
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={baseClass}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {content}
    </div>
  );
}
