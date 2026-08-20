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
  Check,
  ChevronDown,
  MailPlus,
  Minus,
  Paperclip,
} from "lucide-react";
import Link from "next/link";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
};

const formatCommercialTotal = (value: string) => {
  const match = value
    .trim()
    .replaceAll(",", "")
    .match(/^(?:([A-Z]{3})\s*)?([$€£])?\s*(-?\d+(?:\.\d+)?)$/i);
  if (!match) return value;

  const symbolCurrencies: Record<string, string> = {
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
  };
  const currency = match[1]?.toUpperCase() ?? (match[2] ? symbolCurrencies[match[2]] : undefined);
  const amount = Number(match[3]);
  if (!currency || !Number.isFinite(amount)) return value;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return value;
  }
};

const fileType = (name: string) => {
  const extension = name.split(".").pop()?.trim();
  return extension && extension !== name ? extension.toUpperCase() : "FILE";
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

const responseOverview = (summary: ResponseCardSummary) => {
  const required = summary.requiredFields;
  if (!required) {
    return summary.extractionStatus === "ready"
      ? "Submitted sources are readable and ready for proposal intelligence."
      : "Source processing is not complete yet. Open the response for the latest details.";
  }

  const issueCount = required.missing + required.conflicts;
  if (issueCount === 0) {
    return `All ${required.total} required fields have supporting evidence.`;
  }
  return `${required.present} of ${required.total} required fields have supporting evidence. ${issueCount} ${issueCount === 1 ? "field needs" : "fields need"} review.`;
};

const attentionFlags = (
  response: VendorResponseItem,
  summary: ResponseCardSummary,
) => {
  const flags: string[] = [];
  if (!response.submissionId || !response.currentVersionId) {
    flags.push("Versioned submission data is unavailable.");
  }
  if (summary.extractionStatus !== "ready") {
    flags.push(`${extractionLabels[summary.extractionStatus]}.`);
  }
  if (summary.intelligenceStatus !== "ready") {
    flags.push(
      summary.intelligenceStatus === "not_started"
        ? "Required-field analysis has not started."
        : "Required-field analysis is unavailable.",
    );
  }
  summary.requiredFields?.missingTitles.forEach((title) => {
    flags.push(`Not stated: ${title}`);
  });
  summary.requiredFields?.conflictTitles.forEach((title) => {
    flags.push(`Conflicting evidence: ${title}`);
  });
  if (summary.contradictionCount > 0) {
    flags.push(
      `${summary.contradictionCount} evidence ${summary.contradictionCount === 1 ? "contradiction needs" : "contradictions need"} review.`,
    );
  }
  return flags;
};

function ResponseCard({
  response,
  summary,
}: {
  response: VendorResponseItem;
  summary: ResponseCardSummary;
}) {
  const receivedAt = response.versionReceivedAt ?? response.createdAt;
  const commercialTotal = summary.headlineFacts.find(
    (fact) => fact.label === "Total cost" || fact.label === "Commercial total",
  );
  const flags = attentionFlags(response, summary);
  const visibleFlags = flags.slice(0, 2);
  const remainingFlags = flags.slice(2);
  const extractionStatus = extractionStatusToIntelligenceStatus(summary.extractionStatus);
  return (
    <article className={cn(intelligenceSurfaceClasses.card, "@container flex h-full flex-col")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold leading-6 text-navy">
            {response.vendorName || response.submittedBy || "Unnamed respondent"}
          </h2>
          <p className="mt-1 font-mono text-xs text-gray">
            Version {response.currentVersionNumber ?? 1} · {formatDate(receivedAt)}
          </p>
        </div>
        {!response.isRead && (
          <IntelligenceStatusChip status="attention" label="New" className="shrink-0" />
        )}
      </div>

      <IntelligenceStatusChip status={extractionStatus} className="mt-3 w-fit gap-1.5">
        {summary.extractionStatus === "ready" ? (
          <Check size={13} strokeWidth={2.5} aria-hidden="true" />
        ) : summary.extractionStatus === "partial" ? (
          <Minus size={13} strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <AlertTriangle size={13} aria-hidden="true" />
        )}
        {extractionLabels[summary.extractionStatus]}
      </IntelligenceStatusChip>

      <div className="mt-4 grid grid-cols-1 gap-2.5 @min-[300px]:grid-cols-2" aria-label="Response highlights">
        <div className="min-w-0 rounded-2xl border border-gray-border bg-gray-panel p-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-gray">Commercial total</p>
          <p className="mt-1 whitespace-nowrap text-sm font-extrabold text-navy">
            {commercialTotal ? formatCommercialTotal(commercialTotal.value) : "Not stated"}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-gray-border bg-gray-panel p-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-gray">Attachments</p>
          {response.documents.length > 0 ? (
            <>
              {response.documents[0].url ? (
                <a
                  href={response.documents[0].url}
                  target="_blank"
                  rel="noreferrer"
                  title={response.documents[0].name}
                  className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-navy hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <Paperclip className="shrink-0" size={16} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{response.documents[0].name}</span>
                </a>
              ) : (
                <p title={response.documents[0].name} className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-navy">
                  <Paperclip className="shrink-0" size={16} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{response.documents[0].name}</span>
                </p>
              )}
              {response.documents.length > 1 && (
                <p className="mt-1 text-xs text-gray">+{response.documents.length - 1} more {response.documents.length === 2 ? "file" : "files"}</p>
              )}
            </>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray">
              <Paperclip size={16} aria-hidden="true" /> No attachments
            </p>
          )}
        </div>
      </div>

      {response.documents.length > 1 && (
        <div className="mt-2 text-xs">
            <details className="text-gray">
              <summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                View all {response.documents.length} attachments <ChevronDown size={13} aria-hidden="true" />
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {response.documents.map((document, index) => {
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
                })}
              </div>
            </details>
        </div>
      )}

      <p className="mt-4 text-sm leading-6 text-gray">{responseOverview(summary)}</p>

      <section className="mt-5 border-t border-gray-border pt-4" aria-label="Attention flags">
        <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray">Attention flags</h3>
        {flags.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-gray">
            {summary.requiredFields
              ? "None. Every required field was read from cited evidence."
              : "No attention flags found."}
          </p>
        ) : (
          <>
            <ul className="mt-2 space-y-2 text-sm leading-5 text-gray">
              {visibleFlags.map((flag) => (
                <li key={flag} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 shrink-0 text-gray" size={14} aria-hidden="true" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
            {remainingFlags.length > 0 && (
              <details className="mt-3 text-xs text-gray">
                <summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  Review {remainingFlags.length} more {remainingFlags.length === 1 ? "flag" : "flags"}
                  <ChevronDown size={13} aria-hidden="true" />
                </summary>
                <ul className="mt-2 space-y-1.5 pl-5">
                  {remainingFlags.map((flag) => <li key={flag}>{flag}</li>)}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      <div className="mt-auto pt-5">
        <Link
          href={`/vendor-responses/${encodeURIComponent(response._id)}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-border px-3 text-sm font-extrabold text-navy hover:border-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          View full response <ArrowRight size={15} aria-hidden="true" />
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
  const comparableCount = responses.filter((response) => summaries[response._id]?.isComparable).length;

  return (
    <main className="min-h-screen bg-gray-panel px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/vendor-responses"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-bold text-gray hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Back to responses
        </Link>

        <header
          aria-label="Proposal response overview"
          className={cn(intelligenceSurfaceClasses.card, "mt-3 p-5 sm:p-5")}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">Vendor responses</p>
              <h1 className="mt-1 text-2xl !font-semibold leading-7 tracking-tight text-navy">{proposalTitle}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-gray">
                Review each submission and its source-backed extracted values before comparing vendors.
              </p>
            </div>

            {responses.length > 0 && (
              <div className="shrink-0">
                {comparableCount >= 2 ? (
                  <Link
                    href={`/proposals/${encodeURIComponent(proposalId)}/intelligence`}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:w-auto"
                  >
                    Proposal Intelligence <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled
                      className="inline-flex min-h-10 w-full cursor-not-allowed items-center justify-center rounded-xl bg-gray-border px-4 text-sm font-extrabold text-gray sm:w-auto"
                    >
                      Proposal Intelligence
                    </button>
                    <p className="mt-1.5 max-w-56 text-xs leading-4 text-gray sm:text-right">
                      Add at least two readable responses. {comparableCount} currently {comparableCount === 1 ? "qualifies" : "qualify"}.
                    </p>
                  </>
                )}
              </div>
            )}
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
          <section className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-label="Submitted vendor responses">
            {responses.map((response) => (
              <ResponseCard key={response._id} response={response} summary={summaries[response._id]} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
