"use client";

import {
  getVendorResponsesAction,
  markVendorResponseReadAction,
  VendorResponseItem,
} from "@/app/actions/vendorResponse";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Inbox,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  proposalId: string;
  campaignTitle: string;
  onClose: () => void;
};

const PER_PAGE = 15;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function CampaignResponsesModal({
  proposalId,
  campaignTitle,
  onClose,
}: Props) {
  const [responses, setResponses] = useState<VendorResponseItem[]>([]);
  const [selected, setSelected] = useState<VendorResponseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const res = await getVendorResponsesAction({
        proposalId,
        page,
        limit: PER_PAGE,
      });
      if (!mounted) return;
      if (res?.success && Array.isArray(res.data)) {
        setResponses(res.data as VendorResponseItem[]);
        setTotalPages(res.pagination?.totalPages ?? 1);
        setTotalCount(res.pagination?.total ?? 0);
      } else {
        setResponses([]);
      }
      setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [proposalId, page]);

  const openResponse = async (item: VendorResponseItem) => {
    setSelected(item);
    if (!item.isRead) {
      await markVendorResponseReadAction(item._id);
      setResponses((prev) =>
        prev.map((r) => (r._id === item._id ? { ...r, isRead: true } : r)),
      );
    }
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-[15px] font-black text-slate-900">
              Responses
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 line-clamp-1">
              {campaignTitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {totalCount} total
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* List */}
          <div
            className={cn(
              "flex flex-col overflow-y-auto border-r border-slate-100",
              selected ? "w-[280px] shrink-0" : "flex-1",
            )}
          >
            {loading ? (
              <div className="flex flex-1 flex-col gap-3 p-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse space-y-2 rounded-xl border border-slate-100 p-4">
                    <div className="h-3 w-2/3 rounded bg-slate-100" />
                    <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : responses.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                  <Inbox size={22} className="text-slate-300" />
                </div>
                <p className="text-[13px] font-medium text-slate-400">
                  No responses for this campaign yet
                </p>
              </div>
            ) : (
              <ul>
                {responses.map((item) => (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => openResponse(item)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3.5 text-left transition-colors hover:bg-slate-50",
                        selected?._id === item._id && "bg-cyan-50",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          item.isRead ? "bg-transparent" : "bg-cyan-500",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-[13px]",
                              item.isRead
                                ? "font-medium text-slate-700"
                                : "font-bold text-slate-900",
                            )}
                          >
                            {item.vendorName}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                          {item.submittedBy} · {item.email}
                        </p>
                        {item.message && (
                          <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">
                            {item.message}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-[11px] text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900">
                    {selected.vendorName}
                  </h3>
                  <p className="text-[12px] text-slate-500">
                    {selected.submittedBy} &middot;{" "}
                    <a
                      href={`mailto:${selected.email}`}
                      className="text-cyan-600 hover:underline"
                    >
                      {selected.email}
                    </a>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Received {formatDate(selected.createdAt)}
                </p>

                {selected.message && (
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Message
                    </p>
                    <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-700">
                      {selected.message}
                    </div>
                  </div>
                )}

                {selected.documents.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Documents ({selected.documents.length})
                    </p>
                    <ul className="space-y-2">
                      {selected.documents.map((doc, i) => (
                        <li key={i}>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-700 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 transition-colors"
                          >
                            <FileText size={13} className="shrink-0 text-slate-400" />
                            <span className="flex-1 truncate">{doc.name}</span>
                            <ExternalLink size={12} className="shrink-0 text-slate-400" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
