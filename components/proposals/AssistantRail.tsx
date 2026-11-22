"use client";

import { FileText, PencilLine, Sparkles } from "lucide-react";
import Link from "next/link";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// The right-hand rail of the AI workspace: status and progress, the details captured so far, and
// the documents the assistant has read. These are read-only summaries built from data the
// workspace already holds. Changing a value happens in the conversation or in the editor, so
// nothing here can overwrite what the planner entered.

export type RailSummaryProps = {
  title: string;
  detail: string;
  working: boolean;
  documents: number;
  details: number;
  /** "3/9", or an em dash before the questions exist. */
  questions: string;
};

export function RailSummary({ title, detail, working, documents, details, questions }: RailSummaryProps) {
  const stats = [
    { label: "Documents", value: String(documents) },
    { label: "Details captured", value: String(details) },
    { label: "Questions completed", value: questions },
  ];
  return (
    <section aria-labelledby="rail-ai-title" tabIndex={0} className="outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-card">
      <Card padding="md" className="relative overflow-hidden">
        <div className="flex items-start gap-3">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-control bg-brand-soft text-action">
            {working ? (
              <span aria-hidden className="absolute inset-[-4px] rounded-card border border-dashed border-action/60 motion-safe:animate-[ai-orbit_5s_linear_infinite]" />
            ) : null}
            <Sparkles size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-action">AI workspace</p>
            <h2 id="rail-ai-title" className="mt-0.5 text-sm font-semibold text-heading">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-body">{detail}</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-control border border-line bg-surface-muted p-2">
              <dt className="text-xs leading-4 text-muted">{stat.label}</dt>
              <dd className="mt-0.5 text-base font-extrabold text-heading">{stat.value}</dd>
            </div>
          ))}
        </dl>
        <p role="status" className="mt-3 flex items-center gap-2 text-xs font-semibold text-body">
          <span aria-hidden className={cn("h-2 w-2 rounded-full", working ? "bg-action motion-safe:animate-pulse" : "bg-success")} />
          {working ? "AI is actively working" : "Your files and answers stay private to this proposal"}
        </p>
      </Card>
    </section>
  );
}

export type RailDetailRow = { label: string; value: string };

export function RailDetails({ rows, editHref }: { rows: RailDetailRow[]; editHref: string | null }) {
  return (
    <section aria-labelledby="rail-details-title">
      <Card padding="md">
        <div className="flex items-center justify-between gap-2">
          <h2 id="rail-details-title" className="text-[15px] font-bold text-heading">Proposal details</h2>
          {editHref && rows.length > 0 ? (
            <Link
              href={editHref}
              className="inline-flex min-h-8 items-center gap-1 rounded-control px-2 text-xs font-semibold text-action hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <PencilLine size={13} aria-hidden />
              Edit all details
            </Link>
          ) : null}
        </div>
        {rows.length === 0 ? (
          <p className="mt-2 text-xs leading-5 text-muted">Details appear here as the assistant reads your brief and you answer its questions.</p>
        ) : (
          <>
            <dl className="mt-3 divide-y divide-line">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3 py-2">
                  <dt className="shrink-0 text-xs text-muted">{row.label}</dt>
                  <dd className="min-w-0 break-words text-right text-sm font-semibold text-heading">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs leading-5 text-muted">A read-only summary. Change a value in the conversation or with Edit all details.</p>
          </>
        )}
      </Card>
    </section>
  );
}

export type RailSource = { id: string; name: string; status: string };

// Only "ready" is a status the workspace itself relies on. Anything that looks like a failure is
// flagged for attention and everything else is shown as still being checked.
const FAILED = /fail|block|reject|quarantin|infect|error/i;
export const sourceStatus = (status: string): { label: string; tone: BadgeTone } => {
  if (status === "ready") return { label: "Ready", tone: "success" };
  if (FAILED.test(status)) return { label: "Needs attention", tone: "danger" };
  return { label: "Checking", tone: "info" };
};

export function RailSources({ sources }: { sources: RailSource[] }) {
  if (sources.length === 0) return null;
  return (
    <section aria-labelledby="rail-sources-title">
      <Card padding="md">
        <h2 id="rail-sources-title" className="text-[15px] font-bold text-heading">Source documents</h2>
        <ul className="mt-3 space-y-2">
          {sources.map((source) => {
            const status = sourceStatus(source.status);
            return (
              <li key={source.id} className="flex items-center gap-2.5 rounded-control border border-line bg-surface-muted px-2.5 py-2">
                <FileText size={15} aria-hidden className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-heading" title={source.name}>{source.name}</span>
                <Badge tone={status.tone}>{status.label}</Badge>
              </li>
            );
          })}
        </ul>
      </Card>
    </section>
  );
}
