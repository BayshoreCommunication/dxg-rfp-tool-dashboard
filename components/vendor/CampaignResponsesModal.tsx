"use client";

import {
  getVendorResponsesAction,
  markVendorResponseReadAction,
  VendorResponseItem,
} from "@/app/actions/vendorResponse";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Inbox,
  Mail,
  MessageSquare,
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

  const unreadCount = responses.filter((r) => !r.isRead).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2, 6, 23, 0.65)", backdropFilter: "blur(8px)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl shadow-2xl"
        style={{
          height: "78vh",
          background: "#fff",
          boxShadow: "0 32px 80px -12px rgba(2,6,23,0.35), 0 0 0 1px rgba(0,0,0,0.06)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="shrink-0 px-7 py-5"
          style={{
            background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
                <MessageSquare size={18} className="text-cyan-300" />
              </div>
              <div>
                <h2 className="text-[18px] font-black tracking-tight text-white">
                  Vendor Responses
                </h2>
                <p className="mt-0.5 max-w-xs truncate text-[12px] text-blue-200/80">
                  {campaignTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Total badge */}
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-bold text-white backdrop-blur-sm">
                {totalCount} {totalCount === 1 ? "response" : "responses"}
              </span>
              {/* Unread badge */}
              {unreadCount > 0 && (
                <span className="rounded-full border border-red-400/40 bg-red-500/80 px-2.5 py-1 text-[12px] font-bold text-white">
                  {unreadCount} unread
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── List panel ── */}
          <div
            className={cn(
              "flex flex-col min-h-0 bg-slate-50/70",
              selected ? "w-80 shrink-0 border-r border-slate-200/70" : "flex-1",
            )}
          >
            <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3">
              {loading ? (
                <div className="flex flex-col gap-2.5 pt-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 animate-pulse"
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
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <Inbox size={28} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-600">
                      No responses yet
                    </p>
                    <p className="mt-1 text-[13px] text-slate-400">
                      Vendor responses will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {responses.map((item) => {
                    const [bg, fg] = getAvatarColor(item.vendorName);
                    const isSelected = selected?._id === item._id;
                    return (
                      <li key={item._id}>
                        <button
                          type="button"
                          onClick={() => openResponse(item)}
                          className={cn(
                            "flex w-full items-start gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-all duration-150",
                            isSelected
                              ? "border-cyan-200 bg-cyan-50 shadow-sm"
                              : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm",
                          )}
                        >
                          {/* Avatar */}
                          <div
                            className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-[13px] font-black"
                            style={{ background: bg, color: fg }}
                          >
                            {getInitials(item.vendorName)}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "truncate text-[14px]",
                                  item.isRead
                                    ? "font-semibold text-slate-700"
                                    : "font-black text-slate-900",
                                )}
                              >
                                {item.vendorName}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {!item.isRead && (
                                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                                )}
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                            <p className="mt-0.5 text-[12px] text-slate-500 truncate">
                              {item.submittedBy}
                            </p>
                            {item.message && (
                              <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex shrink-0 items-center justify-center gap-3 border-t border-slate-200/70 bg-white/80 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[13px] font-semibold text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* ── Detail panel ── */}
          {selected && (
            <div className="flex-1 overflow-y-auto" style={{ background: "#f8fafc" }}>
              {/* Detail header */}
              <div className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/95 backdrop-blur-sm px-7 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {(() => {
                      const [bg, fg] = getAvatarColor(selected.vendorName);
                      return (
                        <div
                          className="shrink-0 h-11 w-11 rounded-2xl flex items-center justify-center text-[14px] font-black shadow-sm"
                          style={{ background: bg, color: fg }}
                        >
                          {getInitials(selected.vendorName)}
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <h3 className="text-[17px] font-black text-slate-900 truncate">
                        {selected.vendorName}
                      </h3>
                      <p className="text-[13px] text-slate-500 truncate">
                        {selected.submittedBy}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shadow-sm"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Detail content */}
              <div className="px-7 py-6 space-y-3">

                {/* Info cards row */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard
                    icon={<User size={13} />}
                    label="Company"
                    value={selected.vendorName}
                  />
                  <InfoCard
                    icon={<User size={13} />}
                    label="Contact"
                    value={selected.submittedBy}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <InfoCard
                    icon={<Mail size={13} />}
                    label="Email"
                    value={selected.email}
                    isEmail
                  />
                  <InfoCard
                    icon={<Calendar size={13} />}
                    label="Received"
                    value={formatDate(selected.createdAt)}
                  />
                </div>

                {/* Message */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageSquare size={13} className="text-slate-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Message
                    </span>
                  </div>
                  {selected.message ? (
                    <p className="text-[14px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {selected.message}
                    </p>
                  ) : (
                    <p className="text-[13px] italic text-slate-400">
                      No message provided
                    </p>
                  )}
                </div>

                {/* Documents */}
                {selected.documents.length > 0 && (
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <FileText size={13} className="text-slate-400" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Documents ({selected.documents.length})
                      </span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {selected.documents.map((doc, i) => (
                        <li key={i}>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-700 transition-all hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
                          >
                            <FileText
                              size={15}
                              className="shrink-0 text-slate-400 transition-colors group-hover:text-cyan-500"
                            />
                            <span className="flex-1 truncate font-semibold">
                              {doc.name}
                            </span>
                            <ExternalLink
                              size={12}
                              className="shrink-0 text-slate-400 transition-colors group-hover:text-cyan-500"
                            />
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

/* ── Reusable info card ── */
function InfoCard({
  icon,
  label,
  value,
  isEmail = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isEmail?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-slate-400">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
      {isEmail ? (
        <a
          href={`mailto:${value}`}
          className="block truncate text-[13px] font-semibold text-cyan-600 hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="truncate text-[14px] font-bold text-slate-800">{value}</p>
      )}
    </div>
  );
}
