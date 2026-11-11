"use client";

import { ArrowLeft, Download, ScrollText } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "react-toastify";
import { exportAuditLogAction, listAuditEventsAction } from "@/app/actions/auditLog";
import TopHeader from "@/components/settings/TopHeaser";
import { memberDisplayName } from "../members/orgAccess";
import { Badge, EmptyState, InlineError, inputClass, labelClass, secondaryButtonClass, sectionClass, sectionTitleClass, Spinner, TableSkeleton } from "../members/ui";
import {
  auditErrorMessage,
  categoryValue,
  decisionOf,
  detailLines,
  EMPTY_FILTERS,
  filterProblem,
  formatAuditTime,
  hasFilters,
  SUPPORT_ACTOR,
  SUPPORT_LABEL,
  targetLabel,
  toAuditQuery,
  type AuditEvent,
  type AuditFilterOptions,
  type AuditFilters,
  type AuditPage,
} from "./auditLogModel";

type MemberOption = { userId: string; name: string | null; email: string | null };

type Props = {
  initialPage: AuditPage | null;
  initialError: string | null;
  options: AuditFilterOptions | null;
  members: MemberOption[];
};

const subscribe = () => () => {};
// False while rendering on the server and during hydration, true afterwards: times are shown in
// UTC until the browser's own time zone can be used without a hydration mismatch.
const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false);

const downloadCsv = (csv: string, fileName: string) => {
  // The byte-order mark makes spreadsheet apps read the file as UTF-8.
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const ActorCell = ({ event }: { event: AuditEvent }) => (
  <div className="min-w-0">
    <p className="truncate text-sm font-medium text-[#222628]">{event.actor.name}</p>
    {event.actor.kind === "member" && event.actor.email && event.actor.email !== event.actor.name ? (
      <p className="truncate text-xs text-slate-500">{event.actor.email}</p>
    ) : null}
    {event.actor.kind === "support" ? <p className="text-xs text-slate-500">RFPilot staff</p> : null}
  </div>
);

// Visible on a phone; on wider screens the column header shows it, and screen readers still get it.
const cellLabel = "text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:sr-only";
const rowGrid = "grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-[170px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.5fr)_90px] md:items-start";

export default function AuditLogSettings({ initialPage, initialError, options, members }: Props) {
  const hydrated = useHydrated();
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [events, setEvents] = useState<AuditEvent[] | null>(initialPage?.events ?? null);
  const [nextCursor, setNextCursor] = useState<string | null>(initialPage?.nextCursor ?? null);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Only the newest request may update the list, so a slow answer can't overwrite a newer filter.
  const requestRef = useRef(0);

  const problem = filterProblem(filters);

  const load = useCallback(async (next: AuditFilters) => {
    const request = ++requestRef.current;
    setLoading(true);
    const result = await listAuditEventsAction(toAuditQuery(next));
    if (request !== requestRef.current) return;
    setLoading(false);
    if (result.success && result.data) {
      setEvents(result.data.events);
      setNextCursor(result.data.nextCursor);
      setError(null);
    } else {
      setError(auditErrorMessage(result, "The audit log couldn't be loaded. Try again."));
    }
  }, []);

  const change = (changes: Partial<AuditFilters>) => {
    const next = { ...filters, ...changes };
    setFilters(next);
    if (!filterProblem(next)) void load(next);
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    const request = requestRef.current;
    setLoadingMore(true);
    const result = await listAuditEventsAction(toAuditQuery(filters), nextCursor);
    setLoadingMore(false);
    // The filters changed while this page was loading: it belongs to a list that is gone.
    if (request !== requestRef.current) return;
    if (result.success && result.data) {
      const page = result.data;
      setEvents((current) => {
        const seen = new Set((current ?? []).map((event) => event.id));
        return [...(current ?? []), ...page.events.filter((event) => !seen.has(event.id))];
      });
      setNextCursor(page.nextCursor);
    } else {
      toast.error(auditErrorMessage(result, "More activity couldn't be loaded. Try again."));
    }
  };

  const exportCsv = async () => {
    if (exporting || problem) return;
    setExporting(true);
    const result = await exportAuditLogAction(toAuditQuery(filters));
    setExporting(false);
    if (!result.success || !result.data) {
      toast.error(auditErrorMessage(result, "The export couldn't be created. Try again."));
      return;
    }
    downloadCsv(result.data.csv, result.data.fileName);
    if (result.data.truncated) toast.warn(`The export holds the newest ${result.data.rows.toLocaleString("en-US")} events. Narrow the dates to get the rest.`);
    else toast.success(`Exported ${result.data.rows.toLocaleString("en-US")} event${result.data.rows === 1 ? "" : "s"}.`);
  };

  useEffect(() => () => {
    // Leaving the page: a late answer must not touch state.
    requestRef.current = -1;
  }, []);

  const filtered = hasFilters(filters);

  return (
    <div className="space-y-6 px-6 pb-8" data-testid="audit-log">
      <TopHeader />
      <Link href="/settings/security" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
        <ArrowLeft size={12} aria-hidden="true" /> Security
      </Link>
      <section className={sectionClass} aria-labelledby="audit-log-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="audit-log-title" className={sectionTitleClass}>Audit log</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Sign-ins, security changes, invitations, role and team changes, RFP sharing and RFPilot Support access in your organization. Entries can&apos;t be edited or deleted.
            </p>
          </div>
          <button type="button" className={secondaryButtonClass} onClick={() => void exportCsv()} disabled={exporting || Boolean(problem)}>
            {exporting ? <Spinner /> : <Download size={15} aria-hidden="true" />} Export CSV
          </button>
        </div>

        <form className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Audit log filters" onSubmit={(event) => event.preventDefault()}>
          <div>
            <label htmlFor="audit-actor" className={labelClass}>User</label>
            <select id="audit-actor" className={inputClass} value={filters.actor} onChange={(event) => change({ actor: event.target.value })}>
              <option value="">Everyone</option>
              <option value={SUPPORT_ACTOR}>{SUPPORT_LABEL}</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>{memberDisplayName(member)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audit-action" className={labelClass}>Action</label>
            <select id="audit-action" className={inputClass} value={filters.action} onChange={(event) => change({ action: event.target.value })}>
              <option value="">All activity</option>
              {(options?.categories ?? []).map((category) => (
                <optgroup key={category.key} label={category.label}>
                  <option value={categoryValue(category.key)}>All: {category.label}</option>
                  {category.actions.map((action) => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audit-from" className={labelClass}>From</label>
            <input id="audit-from" type="date" className={inputClass} value={filters.from} max={filters.to || undefined} onChange={(event) => change({ from: event.target.value })} />
          </div>
          <div>
            <label htmlFor="audit-to" className={labelClass}>To</label>
            <input id="audit-to" type="date" className={inputClass} value={filters.to} min={filters.from || undefined} onChange={(event) => change({ to: event.target.value })} />
          </div>
        </form>
        <div className="mt-3 flex min-h-[20px] flex-wrap items-center gap-3 text-xs text-slate-500">
          {filtered ? (
            <button type="button" className="rounded text-xs font-semibold text-slate-600 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" onClick={() => change(EMPTY_FILTERS)}>
              Clear filters
            </button>
          ) : null}
          <span>Dates use your time zone. The export follows the same filters.</span>
        </div>

        <div className="mt-5" aria-busy={loading}>
          {problem ? (
            <InlineError>{problem}</InlineError>
          ) : loading ? (
            <>
              <p className="sr-only" role="status">Loading activity…</p>
              <TableSkeleton rows={6} />
            </>
          ) : error ? (
            <div className="space-y-3">
              <InlineError>{error}</InlineError>
              <button type="button" className={secondaryButtonClass} onClick={() => void load(filters)}>Try again</button>
            </div>
          ) : events === null ? (
            <TableSkeleton rows={6} />
          ) : events.length === 0 ? (
            <EmptyState
              icon={<ScrollText size={20} />}
              title={filtered ? "No activity matches these filters" : "No activity yet"}
              body={filtered ? "Try another user, action or date range." : "Sign-ins and changes in your organization will appear here."}
            />
          ) : (
            <>
              <div className={`${rowGrid} hidden border-b border-[#e4e4e4] pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid`} aria-hidden="true">
                <span>Time</span><span>Action</span><span>User</span><span>Details</span><span>Result</span>
              </div>
              <ol aria-label="Audit events" className="divide-y divide-[#eef0f2]">
                {events.map((event) => {
                  const decision = decisionOf(event.decision);
                  const lines = detailLines(event);
                  return (
                    <li key={event.id} className={`${rowGrid} py-3`}>
                      <div>
                        <p className={cellLabel}>Time</p>
                        <time dateTime={event.occurredAt} className="text-sm text-slate-600">
                          {hydrated ? formatAuditTime(event.occurredAt) : `${formatAuditTime(event.occurredAt, "UTC")} UTC`}
                        </time>
                      </div>
                      <div className="min-w-0">
                        <p className={cellLabel}>Action</p>
                        <p className="break-words text-sm font-semibold text-[#222628]">{event.label}</p>
                        <p className="break-words text-xs text-slate-500">{targetLabel(event.target)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className={cellLabel}>User</p>
                        <ActorCell event={event} />
                      </div>
                      <div className="min-w-0">
                        <p className={cellLabel}>Details</p>
                        {lines.length > 0 ? (
                          <ul className="space-y-0.5 text-xs text-slate-600">
                            {lines.map((line) => <li key={line} className="break-words">{line}</li>)}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-500">No further details</p>
                        )}
                      </div>
                      <div>
                        <p className={cellLabel}>Result</p>
                        <Badge tone={decision.tone}>{decision.label}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500" role="status">
                  Showing {events.length.toLocaleString("en-US")} event{events.length === 1 ? "" : "s"}{nextCursor ? ", newest first" : ""}.
                </p>
                {nextCursor ? (
                  <button type="button" className={secondaryButtonClass} onClick={() => void loadMore()} disabled={loadingMore}>
                    {loadingMore ? <Spinner /> : null} Load more
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
