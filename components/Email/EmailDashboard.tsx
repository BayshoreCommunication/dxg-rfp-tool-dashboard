"use client";

import {
  deleteEmailCampaignAction,
  getEmailCampaignsAction,
} from "@/app/actions/email";
import { BarChart3, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

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
  const totalItems = pagination.total || 0;
  const fromItem = totalItems === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const toItem = Math.min(currentPage * PER_PAGE, totalItems);

  if (loading) {
    return (
      <div className="space-y-6 px-6">
        {[1, 2, 3, 4, 5, 6].map((key) => (
          <LoadingSkeletonCard key={key} />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
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
    <div className="space-y-6 px-6">
      {campaigns.map((campaign) => {
        const title = campaign.subject?.trim() || FALLBACK_TITLE;
        const body = campaign.message?.trim() || FALLBACK_BODY;
        const isDeleting = deletingCampaignId === campaign._id;

        return (
          <div
            key={campaign._id}
            className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-cyan-50 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-14 -left-14 h-40 w-40 rounded-full bg-blue-50 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Left side */}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-700">
                    Proposal Email
                  </span>
                  {/* <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                    <Clock size={10} />
                    {campaign?.createdAt
                      ? new Date(campaign.createdAt).toLocaleDateString()
                      : "No date"}
                  </span> */}
                </div>

                <h1 className="text-2xl font-black text-slate-900 tracking-tight truncate">
                  {title}
                </h1>

                <p className="mt-1 text-[15px] leading-6 text-slate-500 line-clamp-2">
                  {body}
                </p>

                <p className="mt-3 text-[14px] font-medium text-slate-400">
                  {campaign?.createdAt
                    ? new Date(campaign.createdAt).toLocaleString()
                    : "Not available"}
                </p>
              </div>

              {/* Center */}
              <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-center lg:gap-6">
                <MetricCard label="Sent" value={campaign.sentCount || 0} />
                {/* <MetricCard label="Views" value={campaign.openedCount || 0} /> */}
                <MetricCard label="Click" value={campaign.clickedCount || 0} />
              </div>

              {/* Right side */}
              <div className="flex justify-start lg:justify-end">
                <button
                  type="button"
                  onClick={() => handleDelete(campaign._id)}
                  disabled={isDeleting}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-md hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer "
                >
                  <Trash2 size={15} />
                  {isDeleting ? "Deleting..." : "Delete"}
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

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="w-126px rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-3 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-[20px] font-black text-slate-900 leading-none">
        {value}
      </p>
    </div>
  );
}
