import type { VendorResponseItem } from "@/app/actions/vendorResponse";
import IntelligenceStatusChip from "@/components/proposalIntelligence/IntelligenceStatusChip";
import { intelligenceSurfaceClasses } from "@/lib/proposalIntelligence/surfaces";
import { extractionStatusToIntelligenceStatus } from "@/lib/proposalIntelligence/statusVocabulary";
import { cn } from "@/lib/utils";
import type { ResponseCardSummary } from "@/lib/vendorResponses/responseCardSummary";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  FileText,
  MailPlus,
  Scale,
} from "lucide-react";
import Link from "next/link";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
};

const fileType = (name: string) => {
  const extension = name.split(".").pop()?.trim();
  return extension && extension !== name ? extension.toUpperCase() : "FILE";
};

const locatorLabel = (locator: Record<string, string | number>) => {
  const entries = Object.entries(locator);
  if (entries.length === 0) return "Location recorded in source";
  return entries
    .map(([key, value]) => `${key.replaceAll("_", " ")} ${value}`)
    .join(" · ");
};

const extractionLabels: Record<ResponseCardSummary["extractionStatus"], string> = {
  not_started: "Extraction not started",
  processing: "Extraction in progress",
  ready: "Sources readable",
  partial: "Partially readable",
  unreadable: "Source unreadable",
  failed: "Extraction failed",
  unavailable: "Extraction status unavailable",
};

function ResponseCard({
  response,
  summary,
}: {
  response: VendorResponseItem;
  summary: ResponseCardSummary;
}) {
  const receivedAt = response.versionReceivedAt ?? response.createdAt;
  const required = summary.requiredFields;
  return (
    <article className={cn(intelligenceSurfaceClasses.card, "flex h-full flex-col")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-extrabold text-navy">
            {response.vendorName || response.submittedBy || "Unnamed respondent"}
          </h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-gray">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} aria-hidden="true" />
              {formatDate(receivedAt)}
            </span>
            <span>
              {response.documents.length} {response.documents.length === 1 ? "document" : "documents"}
            </span>
          </p>
        </div>
        {!response.isRead && (
          <IntelligenceStatusChip status="attention" label="New" className="shrink-0" />
        )}
      </div>

      {summary.headlineFacts.length > 0 && (
        <dl className="mt-5 grid gap-2 sm:grid-cols-3">
          {summary.headlineFacts.map((fact) => (
            <div key={fact.factId} className={cn(intelligenceSurfaceClasses.block, "bg-gray-panel p-3")}>
              <dt className="text-xs font-semibold text-gray">{fact.label}</dt>
              <dd
                title={fact.value}
                className="mt-1 line-clamp-4 break-words font-mono text-sm font-bold text-navy"
              >
                {fact.value}
              </dd>
              <details className="mt-2 text-xs text-gray">
                <summary className="cursor-pointer font-semibold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  {fact.explicitness === "derived" ? "Derived value · view source" : "View source"}
                </summary>
                <div className="mt-2 border-l-2 border-brand pl-3">
                  <p className="font-mono font-semibold text-navy">{fact.source.sourceLabel}</p>
                  <p className="mt-1 font-mono">{locatorLabel(fact.source.locator)}</p>
                  <p className="mt-2 line-clamp-4 leading-5">{fact.source.content}</p>
                </div>
              </details>
            </div>
          ))}
        </dl>
      )}

      <section className={cn(intelligenceSurfaceClasses.block, "mt-5")} aria-label="Response completeness">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-navy">Required-field completeness</h3>
            <p className="mt-1 text-xs text-gray">
              {required
                ? `${required.present} of ${required.total} required fields have supporting evidence.`
                : "Required fields have not been evaluated yet."}
            </p>
          </div>
          <IntelligenceStatusChip
            status={extractionStatusToIntelligenceStatus(summary.extractionStatus)}
            label={extractionLabels[summary.extractionStatus]}
          />
        </div>
        {required && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-brand-muted p-2">
              <p className="font-mono text-base font-extrabold text-brand-dark">{required.present}</p>
              <p className="text-xs text-gray">Present</p>
            </div>
            <div className="rounded-xl bg-gray-panel p-2">
              <p className="font-mono text-base font-extrabold text-navy">{required.missing}</p>
              <p className="text-xs text-gray">Missing</p>
            </div>
            <div className="rounded-xl bg-gray-panel p-2">
              <p className="font-mono text-base font-extrabold text-navy">{required.conflicts}</p>
              <p className="text-xs text-gray">Conflicts</p>
            </div>
          </div>
        )}
        {required && (required.missingTitles.length > 0 || required.conflictTitles.length > 0) && (
          <details className="mt-3 text-xs text-gray">
            <summary className="cursor-pointer font-semibold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              Review {required.missing + required.conflicts} field {required.missing + required.conflicts === 1 ? "issue" : "issues"}
            </summary>
            <ul className="mt-2 space-y-1.5 pl-4">
              {required.missingTitles.map((title) => <li key={`missing-${title}`}>Not stated: {title}</li>)}
              {required.conflictTitles.map((title) => <li key={`conflict-${title}`}>Contradictory evidence: {title}</li>)}
            </ul>
          </details>
        )}
      </section>

      <section className="mt-5" aria-label="Source attachments">
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray">Source attachments</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {response.documents.length > 0 ? response.documents.map((document, index) => {
            const content = (
              <>
                <span className="rounded-md bg-navy px-1.5 py-0.5 font-mono text-xs font-bold text-white">
                  {fileType(document.name)}
                </span>
                <span className="max-w-52 truncate font-mono text-xs">{document.name}</span>
              </>
            );
            return document.url ? (
              <a
                key={`${document.name}-${index}`}
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className={cn(intelligenceSurfaceClasses.chip, "min-h-9 gap-2 text-navy hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand")}
              >
                {content}
              </a>
            ) : (
              <span key={`${document.name}-${index}`} className={cn(intelligenceSurfaceClasses.chip, "min-h-9 gap-2 text-navy")}>
                {content}
              </span>
            );
          }) : (
            <span className={cn(intelligenceSurfaceClasses.chip, "min-h-9 gap-2 bg-gray-panel px-3 text-gray")}>
              <FileText size={14} aria-hidden="true" /> No attachments
            </span>
          )}
        </div>
      </section>

      <div className="mt-auto pt-5">
        <Link
          href={`/vendor-responses/${encodeURIComponent(response._id)}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-border px-3 text-sm font-extrabold text-navy hover:border-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Open response <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function ProposalResponseCards({
  proposalId,
  proposalTitle,
  responses,
  summaries,
}: {
  proposalId: string;
  proposalTitle: string;
  responses: VendorResponseItem[];
  summaries: Record<string, ResponseCardSummary>;
}) {
  const attentionCount = responses.filter((response) => summaries[response._id]?.needsAttention).length;
  const comparableCount = responses.filter((response) => summaries[response._id]?.isComparable).length;

  return (
    <main className="min-h-screen bg-gray-panel px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/vendor-responses"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-bold text-gray hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Back to proposals
        </Link>

        <header className={cn(intelligenceSurfaceClasses.card, "mt-3 sm:p-7")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">Vendor responses</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy">{proposalTitle}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray">
                Review each submission and its source-backed extracted values before comparing vendors.
              </p>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Response counts">
              <span className={cn(intelligenceSurfaceClasses.chip, "border-brand bg-brand-muted px-3 py-1.5 text-sm font-extrabold text-brand-dark")}>
                {responses.length} {responses.length === 1 ? "response" : "responses"}
              </span>
              {attentionCount > 0 && (
                <IntelligenceStatusChip status="attention" className="gap-1.5 px-3 py-1.5 text-sm">
                  <AlertTriangle size={14} aria-hidden="true" />
                  {attentionCount} requiring attention
                </IntelligenceStatusChip>
              )}
            </div>
          </div>
        </header>

        {responses.length === 0 ? (
          <section className={cn(intelligenceSurfaceClasses.card, "mt-5 p-8 text-center sm:p-12")}>
            <MailPlus className="mx-auto text-brand" size={32} aria-hidden="true" />
            <h2 className="mt-4 text-xl font-extrabold text-navy">Responses will appear here</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray">
              Invite vendors to this proposal. Each submitted response will appear as a card with its attachments and evidence-backed completeness status.
            </p>
            <Link
              href={`/email/send-email?proposalId=${encodeURIComponent(proposalId)}`}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <MailPlus size={16} aria-hidden="true" /> Invite vendors
            </Link>
          </section>
        ) : (
          <section className="mt-5 grid gap-4 lg:grid-cols-2" aria-label="Submitted vendor responses">
            {responses.map((response) => (
              <ResponseCard key={response._id} response={response} summary={summaries[response._id]} />
            ))}
          </section>
        )}

        {responses.length > 0 && (
          <section className={cn(intelligenceSurfaceClasses.card, "mt-5 text-center sm:p-7")}>
            <Scale className="mx-auto text-brand" size={28} aria-hidden="true" />
            <h2 className="mt-3 text-xl font-extrabold text-navy">Compare these responses</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray">
              Proposal Intelligence reads the submitted versions, compares cited evidence, and keeps the final vendor decision with you.
            </p>
            {comparableCount >= 2 ? (
              <Link
                href={`/proposals/${encodeURIComponent(proposalId)}/intelligence`}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-extrabold text-white hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Proposal Intelligence <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : (
              <div className="mt-5">
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-xl bg-gray-border px-5 text-sm font-extrabold text-gray"
                >
                  Proposal Intelligence
                </button>
                <p className="mt-2 text-xs text-gray">
                  Add at least two versioned, readable responses to compare vendors. {comparableCount} currently {comparableCount === 1 ? "qualifies" : "qualify"}.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
