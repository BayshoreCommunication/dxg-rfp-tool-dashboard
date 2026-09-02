import type { VendorResponseItem } from "@/app/actions/vendorResponse";
import IntelligenceStatusChip from "@/components/proposalIntelligence/IntelligenceStatusChip";
import ManualVendorResponseDialog from "@/components/vendor/ManualVendorResponseDialog";
import { intelligenceSurfaceClasses } from "@/lib/proposalIntelligence/surfaces";
import { extractionStatusToIntelligenceStatus } from "@/lib/proposalIntelligence/statusVocabulary";
import { cn } from "@/lib/utils";
import { existingVendorSummaries } from "@/lib/vendorResponses/manualResponse";
import type {
  ResponseCardSummary,
} from "@/lib/vendorResponses/responseCardSummary";
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

const symbolCurrencies: Record<string, string> = {
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
};

const parseCommercialTotal = (value: string) => {
  const match = value
    .trim()
    .replaceAll(",", "")
    .match(/^(?:([A-Z]{3})\s*)?([$€£])?\s*(-?\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  const currency = match[1]?.toUpperCase() ?? (match[2] ? symbolCurrencies[match[2]] : undefined);
  const amount = Number(match[3]);
  return currency && Number.isFinite(amount) ? { currency, amount } : null;
};

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
};

const formatCommercialTotal = (value: string) => {
  const parsed = parseCommercialTotal(value);
  return parsed ? formatMoney(parsed.amount, parsed.currency) : value;
};

const commercialTotalFact = (summary: ResponseCardSummary | undefined) =>
  summary?.headlineFacts.find(
    (fact) => fact.label === "Total cost" || fact.label === "Commercial total",
  );

/**
 * The stated totals side by side, when at least two responses state one in
 * the same currency. Nothing is inferred: a response without a parseable
 * total is simply absent from the range.
 */
const statedTotalRange = (
  responses: VendorResponseItem[],
  summaries: Record<string, ResponseCardSummary>,
) => {
  const totals = responses.flatMap((response) => {
    const fact = commercialTotalFact(summaries[response._id]);
    const parsed = fact ? parseCommercialTotal(fact.value) : null;
    return parsed ? [{ responseId: response._id, ...parsed }] : [];
  });
  if (totals.length < 2) return null;
  const currency = totals[0].currency;
  if (totals.some((total) => total.currency !== currency)) return null;
  const amounts = totals.map((total) => total.amount);
  const lowest = Math.min(...amounts);
  const highest = Math.max(...amounts);
  const lowestIds = totals.filter((total) => total.amount === lowest).map((total) => total.responseId);
  return {
    count: totals.length,
    currency,
    lowest,
    highest,
    // A tie has no single lowest bid, so no card is singled out.
    lowestResponseId: lowestIds.length === 1 ? lowestIds[0] : null,
  };
};

const fileType = (name: string) => {
  const extension = name.split(".").pop()?.trim();
  return extension && extension !== name ? extension.toUpperCase() : "FILE";
};

const extractionLabels: Record<ResponseCardSummary["extractionStatus"], string> = {
  not_started: "Files not read yet",
  processing: "Reading files",
  ready: "All files read",
  partial: "Some pages unread",
  unreadable: "Files could not be read",
  failed: "Reading failed",
  unavailable: "Read status unavailable",
};

const exclusionNotes: Record<NonNullable<ResponseCardSummary["comparisonBlocked"]>, string> = {
  partial_sources: "Left out of the vendor comparison until every page of its files can be read.",
  unreadable: "Left out of the vendor comparison because its files could not be read.",
  failed: "Left out of the vendor comparison because reading its files failed.",
  no_version: "Left out of the vendor comparison because it has no versioned submission.",
};

const coverageSentence = (summary: ResponseCardSummary) => {
  const coverage = summary.requirementCoverage;
  if (!coverage) {
    return summary.extractionStatus === "ready"
      ? "Files are read. Analyze the response to see which requirements it answers."
      : "Files are still being processed. Open the response for the latest details.";
  }
  if (coverage.total === 0) {
    return "No requirements have been mapped to this response yet.";
  }
  if (coverage.total === 1) {
    return coverage.answered === 1
      ? "The single mapped requirement is answered."
      : "The single mapped requirement is not answered.";
  }
  const lead =
    coverage.answered === coverage.total
      ? `All ${coverage.total} requirements answered.`
      : `${coverage.answered} of ${coverage.total} requirements answered.`;
  const gaps = [
    coverage.partlyAnswered ? `${coverage.partlyAnswered} partly answered` : null,
    coverage.notAnswered ? `${coverage.notAnswered} not answered` : null,
    coverage.conflicting ? `${coverage.conflicting} conflicting` : null,
  ].filter(Boolean);
  const mandatory = coverage.mandatoryNotAnswered
    ? ` ${coverage.mandatoryNotAnswered} mandatory ${coverage.mandatoryNotAnswered === 1 ? "requirement is" : "requirements are"} unanswered.`
    : "";
  return `${lead}${gaps.length ? ` ${gaps.join(", ")}.` : ""}${mandatory}`;
};

const responseOverview = (summary: ResponseCardSummary) => {
  const exclusion = summary.comparisonBlocked ? ` ${exclusionNotes[summary.comparisonBlocked]}` : "";
  return `${coverageSentence(summary)}${exclusion}`;
};

function ResponseCard({
  response,
  summary,
  lowestStatedTotal,
}: {
  response: VendorResponseItem;
  summary: ResponseCardSummary;
  lowestStatedTotal: boolean;
}) {
  const receivedAt = response.versionReceivedAt ?? response.createdAt;
  const commercialTotal = commercialTotalFact(summary);
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
          <p className="text-xs font-extrabold uppercase tracking-wide text-gray">Total cost</p>
          <p className="mt-1 whitespace-nowrap text-sm font-extrabold text-navy">
            {commercialTotal ? formatCommercialTotal(commercialTotal.value) : "Not stated"}
          </p>
          {lowestStatedTotal && (
            <p className="mt-1 text-xs font-semibold text-brand-dark">Lowest stated total</p>
          )}
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
  openManualResponse = false,
}: {
  proposalId: string;
  proposalTitle: string;
  responses: VendorResponseItem[];
  summaries: Record<string, ResponseCardSummary>;
  /** Open the manual-entry dialog on arrival (deep link from a response page). */
  openManualResponse?: boolean;
}) {
  const comparableCount = responses.filter((response) => summaries[response._id]?.isComparable).length;
  const responseNeedingReview = responses.find((response) => !summaries[response._id]?.isComparable);
  const totalRange = statedTotalRange(responses, summaries);

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
              {totalRange && (
                <p className="mt-2 text-sm font-semibold text-navy">
                  Stated totals range from {formatMoney(totalRange.lowest, totalRange.currency)} to{" "}
                  {formatMoney(totalRange.highest, totalRange.currency)}
                  {totalRange.count < responses.length
                    ? ` across ${totalRange.count} of ${responses.length} responses.`
                    : "."}
                </p>
              )}
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
                ) : responses.length === 1 && comparableCount === 1 ? (
                  <>
                    <p className="text-xs font-semibold leading-4 text-gray sm:text-right">
                      1 more readable response needed
                    </p>
                    <Link
                      href={`/email/send-email?proposalId=${encodeURIComponent(proposalId)}`}
                      className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:w-auto"
                    >
                      <MailPlus size={16} aria-hidden="true" /> Invite another vendor
                    </Link>
                  </>
                ) : responseNeedingReview ? (
                  <>
                    <p className="text-xs font-semibold leading-4 text-gray sm:text-right">
                      Resolve response issues to unlock comparison
                    </p>
                    <Link
                      href={`/vendor-responses/${encodeURIComponent(responseNeedingReview._id)}`}
                      className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-brand px-4 text-sm font-extrabold text-brand-dark hover:bg-brand-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:w-auto"
                    >
                      Review response issues <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold leading-4 text-gray sm:text-right">
                      Add readable responses to unlock comparison
                    </p>
                    <Link
                      href={`/email/send-email?proposalId=${encodeURIComponent(proposalId)}`}
                      className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:w-auto"
                    >
                      <MailPlus size={16} aria-hidden="true" /> Invite another vendor
                    </Link>
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
            <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Link
                href={`/email/send-email?proposalId=${encodeURIComponent(proposalId)}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <MailPlus size={16} aria-hidden="true" /> Invite vendors
              </Link>
              <ManualVendorResponseDialog
                proposalId={proposalId}
                existingVendors={[]}
                defaultOpen={openManualResponse}
              />
            </div>
          </section>
        ) : (
          <section className="mt-5" aria-label="Submitted vendor responses">
            {/* One or two cards leave room beside them, so the action sits above
                the row. A full row of three has no such gap — it goes below. */}
            {responses.length < 3 && (
              <div className="mb-3 flex justify-end">
                <ManualVendorResponseDialog
                  proposalId={proposalId}
                  existingVendors={existingVendorSummaries(responses)}
                  defaultOpen={openManualResponse}
                />
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {responses.map((response) => (
                <ResponseCard
                  key={response._id}
                  response={response}
                  summary={summaries[response._id]}
                  lowestStatedTotal={totalRange?.lowestResponseId === response._id}
                />
              ))}
            </div>
            {responses.length >= 3 && (
              <div className="mt-4 flex justify-end">
                <ManualVendorResponseDialog
                  proposalId={proposalId}
                  existingVendors={existingVendorSummaries(responses)}
                  defaultOpen={openManualResponse}
                />
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
