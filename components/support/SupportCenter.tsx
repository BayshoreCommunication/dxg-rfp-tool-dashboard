"use client";

import { LifeBuoy, MessageSquarePlus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { SupportPagination, SupportTicket } from "@/app/actions/supportDesk";
import NewSupportTicketForm from "./NewSupportTicketForm";
import SupportDateTime from "./SupportDateTime";
import { categoryLabel, statusClass, statusLabel } from "./supportLabels";
import { useSupportRealtimeRefresh } from "./useSupportRealtimeRefresh";

type Props = {
  tickets: SupportTicket[];
  pagination: SupportPagination | null;
  errorMessage?: string;
  view: "active" | "all";
  startOpen?: boolean;
};

export default function SupportCenter({ tickets, pagination, errorMessage, view, startOpen = false }: Props) {
  const [composing, setComposing] = useState(startOpen || tickets.length === 0);
  const unread = tickets.filter((ticket) => ticket.unreadForRequester > 0).length;
  useSupportRealtimeRefresh();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pb-16 pt-6 sm:px-6">
      <header className="relative">
        <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#008ad2]/5 via-[#008ad2]/3 to-slate-900/5 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#008ad2]">
              <Sparkles size={10} className="fill-[#008ad2]" aria-hidden="true" />
              Talk to a person at DXG
            </span>
            <h1 className="text-[30px] font-black leading-none tracking-tight text-slate-900">Support</h1>
            <p className="mt-2 max-w-xl text-[13px] font-medium text-slate-500">
              Stuck, or something not working? Send DXG a message and follow the reply here. The AI Assistant stays
              available for quick how-to questions.
            </p>
          </div>
          {!composing && (
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#008ad2] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0076b4]"
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              New request
            </button>
          )}
        </div>
      </header>

      {composing && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="new-request-title">
          <h2 id="new-request-title" className="text-base font-bold text-slate-900">
            New request
          </h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            A DXG support agent will reply here and you&apos;ll get a notification.
          </p>
          <NewSupportTicketForm onCancel={tickets.length > 0 ? () => setComposing(false) : undefined} />
        </section>
      )}

      <section aria-labelledby="requests-title" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 id="requests-title" className="text-base font-bold text-slate-900">
            Your requests
            {unread > 0 && (
              <span className="ml-2 rounded-full bg-[#008ad2]/10 px-2 py-0.5 text-[11px] font-bold text-[#0069a0]">
                {unread} new repl{unread === 1 ? "y" : "ies"}
              </span>
            )}
          </h2>
          <nav aria-label="Request filter" className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold">
            <Link
              href="/support"
              className={`rounded-lg px-3 py-1.5 transition ${view === "active" ? "bg-white text-[#0069a0] shadow-sm" : "text-slate-500"}`}
            >
              Active
            </Link>
            <Link
              href="/support?view=all"
              className={`rounded-lg px-3 py-1.5 transition ${view === "all" ? "bg-white text-[#0069a0] shadow-sm" : "text-slate-500"}`}
            >
              All
            </Link>
          </nav>
        </div>

        {errorMessage ? (
          <p role="alert" className="px-5 py-8 text-center text-sm font-semibold text-rose-700">
            {errorMessage}
          </p>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <LifeBuoy className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-bold text-slate-600">
              {view === "active" ? "No open requests" : "No requests yet"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {view === "active" ? "Resolved requests are under All." : "Use New request whenever you need a hand."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tickets.map((ticket) => {
              const isUnread = ticket.unreadForRequester > 0;
              return (
                <li key={ticket.id}>
                  <Link
                    href={`/support/${ticket.id}`}
                    className={`flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50 ${isUnread ? "bg-[#008ad2]/[0.03]" : ""}`}
                  >
                    <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${isUnread ? "bg-[#008ad2]" : "bg-transparent"}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">#{ticket.ticketNumber}</span>
                        <span className={`truncate text-sm ${isUnread ? "font-black text-slate-900" : "font-semibold text-slate-800"}`}>
                          {ticket.subject}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${statusClass(ticket.status)}`}>
                          {statusLabel(ticket.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {categoryLabel(ticket.category)} · {ticket.messageCount} message{ticket.messageCount === 1 ? "" : "s"} · updated{" "}
                        <SupportDateTime value={ticket.lastMessageAt} />
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {pagination && pagination.totalPages > 1 && (
          <nav aria-label="Request pages" className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              {pagination.page > 1 && (
                <Link href={`/support?view=${view}&page=${pagination.page - 1}`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold">
                  Previous
                </Link>
              )}
              {pagination.page < pagination.totalPages && (
                <Link href={`/support?view=${view}&page=${pagination.page + 1}`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold">
                  Next
                </Link>
              )}
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}
