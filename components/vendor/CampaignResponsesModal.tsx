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
  Mail,
  User,
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

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const AVATAR_COLORS = [
  ["#e0f2fe", "#0284c7"],
  ["#dcfce7", "#16a34a"],
  ["#fef3c7", "#d97706"],
  ["#f3e8ff", "#9333ea"],
  ["#ffe4e6", "#e11d48"],
  ["#ccfbf1", "#0d9488"],
];

const getAvatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

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
    return () => {
      mounted = false;
    };
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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        style={{ height: "70vh" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-linear-to-r from-slate-50 to-white px-8 py-5">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Vendor Responses
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 line-clamp-1 max-w-sm">
              {campaignTitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1 text-sm font-bold text-cyan-700">
              {totalCount} {totalCount === 1 ? "response" : "responses"}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body — takes all remaining height, never grows past modal */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* List panel */}
          <div
            className={cn(
              "flex flex-col min-h-0",
              selected ? "w-85 shrink-0 border-r border-slate-100" : "flex-1",
            )}
          >
            {/* Scrollable area */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="flex flex-col gap-3 p-5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4 animate-pulse"
                    >
                      <div className="h-11 w-11 shrink-0 rounded-2xl bg-slate-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-2/3 rounded bg-slate-100" />
                        <div className="h-3 w-1/2 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : responses.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 border border-slate-100">
                    <Inbox size={28} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-600">
                      No responses yet
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Responses for this campaign will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 p-3">
                  {responses.map((item) => {
                    const [bg, fg] = getAvatarColor(item.vendorName);
                    const isSelected = selected?._id === item._id;
                    return (
                      <li key={item._id}>
                        <button
                          type="button"
                          onClick={() => openResponse(item)}
                          className={cn(
                            "flex w-full items-start gap-4 rounded-2xl px-4 py-4 text-left transition-all duration-150",
                            isSelected
                              ? "bg-cyan-50 ring-1 ring-cyan-200"
                              : "hover:bg-slate-50",
                          )}
                        >
                          {/* Avatar */}
                          <div
                            className="shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center text-base font-black"
                            style={{ background: bg, color: fg }}
                          >
                            {getInitials(item.vendorName)}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            {/* Company name LEFT · date RIGHT */}
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "truncate text-[16px]",
                                  item.isRead
                                    ? "font-semibold text-slate-700"
                                    : "font-black text-slate-900",
                                )}
                              >
                                {item.vendorName}
                              </span>
                              <span className="shrink-0 text-[12px] text-slate-400 font-medium">
                                {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            {/* Contact name LEFT · unread dot RIGHT */}
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <p className="text-[13px] text-slate-500 truncate">
                                {item.submittedBy}
                              </p>
                              {!item.isRead && (
                                <div className="shrink-0 h-2 w-2 rounded-full bg-cyan-500" />
                              )}
                            </div>
                            {item.message && (
                              <p className="mt-1.5 line-clamp-1 text-[12px] text-slate-400">
                                {item.message}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {/* end scrollable area */}

            {/* Pagination — pinned to bottom */}
            {totalPages > 1 && (
              <div className="flex shrink-0 items-center justify-center gap-3 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-sm font-medium text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="flex-1 overflow-y-auto bg-slate-50/60">
              {/* Detail header */}
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-8 py-5">
                <div className="flex items-center gap-4 min-w-0">
                  {(() => {
                    const [bg, fg] = getAvatarColor(selected.vendorName);
                    return (
                      <div
                        className="shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center text-base font-black"
                        style={{ background: bg, color: fg }}
                      >
                        {getInitials(selected.vendorName)}
                      </div>
                    );
                  })()}
                  <div className="min-w-0">
                    <h3 className="text-xl font-black text-slate-900 truncate">
                      {selected.vendorName}
                    </h3>
                    <p className="text-[14px] text-slate-500 truncate">
                      {selected.submittedBy}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Detail content */}
              <div className="px-7 py-6 space-y-4">
                {/* Company + Contact row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={13} className="text-slate-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Company</span>
                    </div>
                    <p className="text-[15px] font-black text-slate-900 truncate">
                      {selected.vendorName}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={13} className="text-slate-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Contact</span>
                    </div>
                    <p className="text-[15px] font-bold text-slate-800 truncate">
                      {selected.submittedBy}
                    </p>
                  </div>
                </div>

                {/* Email + Date row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail size={13} className="text-slate-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</span>
                    </div>
                    <a
                      href={`mailto:${selected.email}`}
                      className="text-[14px] font-semibold text-cyan-600 hover:underline truncate block"
                    >
                      {selected.email}
                    </a>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Received</span>
                    </div>
                    <p className="text-[14px] font-semibold text-slate-700">
                      {formatDate(selected.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Message */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Message
                  </p>
                  {selected.message ? (
                    <p className="text-[15px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {selected.message}
                    </p>
                  ) : (
                    <p className="text-[14px] text-slate-400 italic">No message provided</p>
                  )}
                </div>

                {/* Documents */}
                {selected.documents.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-5">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Documents ({selected.documents.length})
                    </p>
                    <ul className="space-y-2">
                      {selected.documents.map((doc, i) => (
                        <li key={i}>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[14px] text-slate-700 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 transition-colors group"
                          >
                            <FileText size={16} className="shrink-0 text-slate-400 group-hover:text-cyan-500" />
                            <span className="flex-1 truncate font-semibold">{doc.name}</span>
                            <ExternalLink size={13} className="shrink-0 text-slate-400 group-hover:text-cyan-500" />
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
