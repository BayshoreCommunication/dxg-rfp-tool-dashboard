"use client";

import {
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
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import VendorAnalysisSection from "./VendorAnalysisSection";

type Props = {
  initialResponses: VendorResponseItem[];
  initialUnreadCount: number;
  currentPage: number;
  totalPages: number;
  totalCount: number;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function VendorResponsesView({
  initialResponses,
  initialUnreadCount,
  currentPage,
  totalPages,
  totalCount,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [responses, setResponses] = useState(initialResponses);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [selected, setSelected] = useState<VendorResponseItem | null>(null);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const openResponse = async (item: VendorResponseItem) => {
    setSelected(item);
    if (!item.isRead) {
      await markVendorResponseReadAction(item._id);
      setResponses((prev) =>
        prev.map((r) => (r._id === item._id ? { ...r, isRead: true } : r)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/vendor-responses?${params.toString()}`);
  };

  const toggleUnreadOnly = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    params.set("unreadOnly", unreadOnly ? "false" : "true");
    router.push(`/vendor-responses?${params.toString()}`);
  };

  return (
    <div className="flex h-full min-h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-8 py-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Vendor Responses</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {totalCount} response{totalCount !== 1 ? "s" : ""} total
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cyan-500 px-1.5 text-[10px] font-black text-white">
                {unreadCount} new
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleUnreadOnly}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
            unreadOnly
              ? "border-cyan-300 bg-cyan-50 text-cyan-700"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          )}
        >
          <Mail size={13} />
          {unreadOnly ? "Show All" : "Unread Only"}
        </button>
      </div>

      {/* List + Detail panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Response list */}
        <div
          className={cn(
            "flex flex-col border-r border-slate-100 bg-white overflow-y-auto",
            selected ? "w-[340px] shrink-0" : "flex-1",
          )}
        >
          {responses.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                <Inbox size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-400">
                {unreadOnly ? "No unread responses" : "No responses yet"}
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
                      "flex w-full items-start gap-3 border-b border-slate-50 px-5 py-4 text-left transition-colors hover:bg-slate-50",
                      selected?._id === item._id && "bg-cyan-50",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                        item.isRead ? "bg-transparent" : "bg-cyan-500",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
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
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {item.proposalTitle}
                      </p>
                      {item.message && (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                          {item.message}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
            <div className="mx-auto max-w-2xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {selected.vendorName}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Responding to:{" "}
                    <span className="font-medium text-slate-700">
                      {selected.proposalTitle}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Submitted By
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {selected.submittedBy}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Email
                    </p>
                    <a
                      href={`mailto:${selected.email}`}
                      className="mt-1 block text-sm font-medium text-cyan-600 hover:underline"
                    >
                      {selected.email}
                    </a>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Received
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDate(selected.createdAt)}
                    </p>
                  </div>
                </div>

                {selected.message && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Message
                    </p>
                    <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                      {selected.message}
                    </div>
                  </div>
                )}

                {selected.documents.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Documents ({selected.documents.length})
                    </p>
                    <ul className="space-y-2">
                      {selected.documents.map((doc, i) => (
                        <li key={i}>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 transition-colors"
                          >
                            <FileText size={14} className="shrink-0 text-slate-400" />
                            <span className="flex-1 truncate">{doc.name}</span>
                            <ExternalLink size={12} className="shrink-0 text-slate-400" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <VendorAnalysisSection
                  key={selected._id}
                  responseId={selected._id}
                  proposalId={selected.proposalId}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-slate-100 bg-white px-8 py-4">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
