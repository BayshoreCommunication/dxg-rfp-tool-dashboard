"use client";

import {
  markVendorResponseReadAction,
  VendorResponseItem,
} from "@/app/actions/vendorResponse";
import { cn } from "@/lib/utils";
import { publishVendorUnreadCount } from "@/lib/vendorResponses/unreadEvents";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Inbox,
  Mail,
  Search,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VendorAnalysisSection from "./VendorAnalysisSection";
import VendorComparisonPanel from "./VendorComparisonPanel";
import { requirementRegistryHref } from "@/lib/proposalIntelligence/requirementRegistryNavigation";
import VendorExtractionSection from "./VendorExtractionSection";
import VendorFactsSection from "./VendorFactsSection";
import VendorEvaluationSection from "./VendorEvaluationSection";

type Props = {
  initialResponses: VendorResponseItem[];
  initialUnreadCount: number;
  initialGlobalUnreadCount?: number;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  basePath?: string;
  backHref?: string;
  proposalTitle?: string;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function VendorResponsesView({
  initialResponses,
  initialUnreadCount,
  initialGlobalUnreadCount = initialUnreadCount,
  currentPage,
  totalPages,
  totalCount,
  basePath = "/vendor-responses",
  backHref,
  proposalTitle,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [responses, setResponses] = useState(initialResponses);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const unreadCountRef = useRef(initialUnreadCount);
  const globalUnreadCountRef = useRef(initialGlobalUnreadCount);
  const markingReadIds = useRef(new Set<string>());
  const [selected, setSelected] = useState<VendorResponseItem | null>(
    initialResponses[0] ?? null,
  );
  const [query, setQuery] = useState("");
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  const visibleResponses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return responses;

    return responses.filter((item) =>
      [item.vendorName, item.proposalTitle, item.submittedBy, item.email]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, responses]);

  const markResponseRead = useCallback(async (item: VendorResponseItem) => {
    if (!item.isRead && !markingReadIds.current.has(item._id)) {
      markingReadIds.current.add(item._id);
      const result = await markVendorResponseReadAction(item._id);
      markingReadIds.current.delete(item._id);
      if (!result?.success) return;

      setResponses((previous) =>
        previous.map((response) =>
          response._id === item._id ? { ...response, isRead: true } : response,
        ),
      );
      setSelected((current) =>
        current?._id === item._id ? { ...current, isRead: true } : current,
      );
      const nextCount = Math.max(0, unreadCountRef.current - 1);
      unreadCountRef.current = nextCount;
      setUnreadCount(nextCount);
      const nextGlobalCount = Math.max(0, globalUnreadCountRef.current - 1);
      globalUnreadCountRef.current = nextGlobalCount;
      publishVendorUnreadCount(nextGlobalCount);
    }
  }, []);

  const openResponse = useCallback(
    (item: VendorResponseItem) => {
      setSelected(item);
      void markResponseRead(item);
    },
    [markResponseRead],
  );

  useEffect(() => {
    const initiallySelected = initialResponses[0];
    if (!initiallySelected || initiallySelected.isRead) return;

    const timer = window.setTimeout(() => {
      void markResponseRead(initiallySelected);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialResponses, markResponseRead]);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${basePath}?${params.toString()}`);
  };

  const toggleUnreadOnly = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    params.set("unreadOnly", unreadOnly ? "false" : "true");
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <section className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_55px_-34px_rgba(15,23,42,0.35)]">
      <header className="flex shrink-0 flex-col gap-4 border-b border-slate-200/80 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#008ad2] text-white shadow-[0_10px_22px_-12px_rgba(0,138,210,0.85)]">
            <Inbox size={20} strokeWidth={2.2} />
          </div>
          <div>
            {backHref && (
              <Link
                href={backHref}
                className="mb-1 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#008ad2] hover:text-[#0076b4]"
              >
                <ArrowLeft size={12} aria-hidden="true" /> All proposals
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                {proposalTitle || "Vendor Responses"}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalCount} {totalCount === 1 ? "vendor response" : "vendor responses"}
              {unreadCount > 0 && (
                <span className="ml-2 font-bold text-[#008ad2]">
                  · {unreadCount} unread
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <span className="sr-only">Search vendor responses</span>
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search responses"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#008ad2]/40 focus:bg-white focus:ring-4 focus:ring-[#008ad2]/10"
            />
          </label>
          <button
            type="button"
            onClick={toggleUnreadOnly}
            aria-label={unreadOnly ? "Show all" : "Unread only"}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition",
              unreadOnly
                ? "border-[#008ad2]/30 bg-[#008ad2]/10 text-[#0076b4]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <Mail size={14} />
            <span className="hidden sm:inline">
              {unreadOnly ? "Show all" : "Unread only"}
            </span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-50/70">
        <aside
          className={cn(
            "min-h-0 flex-col border-r border-slate-200/80 bg-white lg:flex lg:w-[390px] lg:shrink-0",
            selected ? "hidden" : "flex w-full",
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
              Inbox
            </p>
            <p className="text-xs font-semibold text-slate-400">
              {visibleResponses.length} shown
            </p>
          </div>

          <div className="dxg-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {visibleResponses.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  {query.trim() ? (
                    <Search size={22} className="text-slate-400" />
                  ) : (
                    <Inbox size={22} className="text-[#008ad2]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">
                    {query.trim()
                      ? "No matching responses"
                      : unreadOnly
                        ? "You’re all caught up"
                        : "No vendor responses yet"}
                  </p>
                  <p className="mx-auto mt-1 max-w-[260px] text-xs leading-5 text-slate-400">
                    {query.trim()
                      ? "Try a different vendor, contact, or proposal name."
                      : unreadOnly
                        ? "There are no unread responses right now. New submissions will appear here."
                        : "When a vendor submits a proposal response, it will appear here for you to review."}
                  </p>
                </div>
              </div>
            ) : (
              <ul className="py-2">
                {visibleResponses.map((item) => {
                  const isSelected = selected?._id === item._id;
                  return (
                    <li key={item._id} className="px-2">
                      <button
                        type="button"
                        onClick={() => void openResponse(item)}
                        className={cn(
                          "group relative flex w-full gap-3 rounded-2xl px-3 py-3.5 text-left transition",
                          isSelected
                            ? "bg-[#eaf7fd] shadow-[inset_0_0_0_1px_rgba(0,138,210,0.1)]"
                            : "hover:bg-slate-50",
                        )}
                      >
                        {isSelected && (
                          <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-[#008ad2]" />
                        )}
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold",
                            isSelected
                              ? "bg-[#008ad2] text-white"
                              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/70",
                          )}
                        >
                          {initials(item.vendorName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-sm",
                                item.isRead
                                  ? "font-semibold text-slate-700"
                                  : "font-extrabold text-slate-900",
                              )}
                            >
                              {item.vendorName}
                            </span>
                            <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                              {formatShortDate(item.createdAt)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {!item.isRead && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#008ad2]" />
                            )}
                            <p className="truncate text-[11px] font-semibold text-[#008ad2]">
                              {item.proposalTitle}
                            </p>
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-400">
                            {item.message || "No message included"}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-slate-200/80 bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs font-semibold text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </aside>

        {selected ? (
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/85 px-5 py-3 backdrop-blur sm:px-7">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-[#008ad2] lg:hidden"
              >
                <ArrowLeft size={15} />
                Back to inbox
              </button>
              <div className="hidden items-center gap-2 text-xs font-semibold text-slate-400 lg:flex">
                <CheckCheck size={15} className="text-[#008ad2]" />
                Response opened
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close response"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="dxg-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8 lg:px-9 lg:py-8">
              <div className="mx-auto w-full max-w-5xl">
                <VendorComparisonPanel
                  responses={responses}
                  proposalId={selected.proposalId}
                  returnTo="/vendor-responses"
                />
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#008ad2] text-base font-extrabold text-white shadow-[0_12px_28px_-16px_rgba(0,138,210,0.9)]">
                    {initials(selected.vendorName)}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-2xl font-extrabold tracking-tight text-slate-900">
                        {selected.vendorName}
                      </h2>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        Version {selected.currentVersionNumber ?? 1}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Response to{" "}
                      <span className="font-bold text-slate-700">
                        {selected.proposalTitle}
                      </span>
                    </p>
                    <Link
                      href={requirementRegistryHref(selected.proposalId, "/vendor-responses")}
                      className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#008ad2]/25 bg-[#eaf7fd] px-3 text-xs font-extrabold text-[#0076b4] transition hover:border-[#008ad2]/40 hover:bg-[#dff3fc]"
                    >
                      <ClipboardList size={14} /> Review RFP requirements
                    </Link>
                    <Link
                      href={`/vendor-responses/${selected._id}`}
                      className="ml-2 mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 transition hover:border-[#008ad2]/30 hover:text-[#0076b4]"
                    >
                      <ExternalLink size={14} aria-hidden="true" /> Open version
                      history
                    </Link>
                  </div>
                </div>

                <article className="mt-6 min-h-[330px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)]">
                  <div className="grid gap-px bg-slate-100 sm:grid-cols-[0.85fr_1.25fr_1fr]">
                    <ResponseFact
                      icon={<UserRound size={16} />}
                      label="Submitted by"
                      value={selected.submittedBy}
                    />
                    <ResponseFact
                      icon={<Mail size={16} />}
                      label="Email"
                      value={selected.email}
                      href={`mailto:${selected.email}`}
                    />
                    <ResponseFact
                      icon={<CalendarDays size={16} />}
                      label="Received"
                      value={formatDate(
                        selected.versionReceivedAt ?? selected.createdAt,
                      )}
                    />
                  </div>

                  <div className="p-5 sm:p-8 lg:p-9">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                        Proposal message
                      </p>
                    </div>
                    <div className="min-h-[118px] rounded-2xl border border-slate-100 bg-slate-50/80 p-5 text-[15px] leading-7 text-slate-700 sm:p-6">
                      {selected.message ||
                        "No message was included with this response."}
                    </div>

                    {selected.documents.length > 0 && (
                      <div className="mt-6">
                        <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                          Attachments ({selected.documents.length})
                        </p>
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {selected.documents.map((document, index) => (
                            <li key={`${document.name}-${index}`}>
                              <a
                                href={document.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#008ad2]/30 hover:bg-[#008ad2]/5 hover:text-[#0076b4]"
                              >
                                <FileText
                                  size={16}
                                  className="text-[#008ad2]"
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {document.name}
                                </span>
                                <ExternalLink
                                  size={13}
                                  className="text-slate-400"
                                />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </article>

                {selected.submissionId && selected.currentVersionId && (
                  <div className="mt-5 space-y-5">
                    <VendorExtractionSection
                      key={`${selected.submissionId}:${selected.currentVersionId}`}
                      proposalId={selected.proposalId}
                      submissionId={selected.submissionId}
                      versionId={selected.currentVersionId}
                    />
                    <VendorFactsSection
                      key={`intelligence:${selected.submissionId}:${selected.currentVersionId}`}
                      proposalId={selected.proposalId}
                      submissionId={selected.submissionId}
                      versionId={selected.currentVersionId}
                    />
                    <VendorEvaluationSection
                      key={`evaluation:${selected.submissionId}:${selected.currentVersionId}`}
                      proposalId={selected.proposalId}
                      submissionId={selected.submissionId}
                      versionId={selected.currentVersionId}
                    />
                  </div>
                )}

                <div className="mt-5">
                  <VendorAnalysisSection
                    key={selected._id}
                    responseId={selected._id}
                    proposalId={selected.proposalId}
                  />
                </div>
              </div>
            </div>
          </main>
        ) : (
          <div className="hidden flex-1 items-center justify-center p-8 text-center lg:flex">
            <div>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[#008ad2] shadow-sm ring-1 ring-slate-200">
                <Mail size={25} />
              </div>
              <h2 className="mt-5 text-lg font-extrabold text-slate-800">
                {totalCount === 0
                  ? "Responses will appear here"
                  : "Select a vendor response"}
              </h2>
              <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-slate-500">
                {totalCount === 0
                  ? "Once a vendor submits their proposal, you’ll be able to review the message, contact details, and attachments here."
                  : "Choose a response from the inbox to review its proposal details."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ResponseFact({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = href ? (
    <a
      href={href}
      className="break-all font-bold text-[#008ad2] hover:underline"
    >
      {value}
    </a>
  ) : (
    <p className="font-bold leading-5 text-slate-700">{value}</p>
  );

  return (
    <div className="min-w-0 bg-white p-5">
      <div className="mb-2 flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <div className="text-sm">{content}</div>
    </div>
  );
}
