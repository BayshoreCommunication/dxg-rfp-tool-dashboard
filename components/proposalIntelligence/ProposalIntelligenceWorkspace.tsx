"use client";

import { getComparisonWorkspaceAction, type ComparisonEvidence, type ComparisonRequirement, type ComparisonView, type ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import { formatIntelligenceTimestamp } from "@/lib/proposalIntelligence/formatTimestamp";
import { describeFreshnessReasons, describeRefusalCodes } from "@/lib/proposalIntelligence/plainLanguage";
import { coverageFromVerdict, coveragePresentation } from "@/lib/proposalIntelligence/coverageVocabulary";
import { buildRecommendationSummary, buildVendorComparison, comparisonOverviewCounts } from "@/lib/proposalIntelligence/recommendationSummary";
import EvidenceExcerpt from "@/components/proposalIntelligence/EvidenceExcerpt";
import RerunComparisonButton from "@/components/proposalIntelligence/RerunComparisonButton";
import ScoreGapExplanation from "@/components/proposalIntelligence/ScoreGapExplanation";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, FileSearch, Printer, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export const intelligenceTabs = ["overview", "requirements", "technical", "commercial", "evaluation", "reports"] as const;
export type IntelligenceTab = (typeof intelligenceTabs)[number];
type EvidenceSelection = {
  title: string;
  vendorLabel: string;
  rationale: string;
  evidence: ComparisonEvidence[];
  reviewHistory?: ComparisonRequirement["vendors"][number]["reviewHistory"];
};
type Props = {
  proposalId: string;
  proposalTitle: string;
  tab: IntelligenceTab;
  initialWorkspace: ComparisonWorkspace;
  runs: ComparisonView[];
};

const terminal = new Set(["succeeded", "succeeded_with_warnings", "failed", "cancelled"]);
const label = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const verdictLabel = (verdict: string) => coveragePresentation[coverageFromVerdict(verdict)].label;
const verdictTone = (verdict: string) => coveragePresentation[coverageFromVerdict(verdict)].className;
const locatorText = (locator: Record<string, unknown>) =>
  Object.entries(locator)
    .map(([key, value]) => `${label(key)}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");

function EvidenceDrawer({ selection, onClose }: { selection: EvidenceSelection; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/35"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside role="dialog" aria-modal="true" aria-labelledby="evidence-drawer-title" className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#008ad2]">Cited vendor evidence</p>
            <h2 id="evidence-drawer-title" className="mt-1 text-lg font-extrabold text-slate-950">
              {selection.title}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">{selection.vendorLabel}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close evidence drawer" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
            <X size={18} />
          </button>
        </header>
        <div className="space-y-5 p-5">
          <section>
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Assessment rationale</h3>
            <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{selection.rationale}</p>
          </section>
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Evidence passages</h3>
              <span className="text-xs font-bold text-slate-400">{selection.evidence.length}</span>
            </div>
            {selection.evidence.length ? (
              <div className="mt-2 space-y-3">
                {selection.evidence.map((evidence) => (
                  <article key={`${evidence.evidenceId}:${evidence.supportRole ?? "evidence"}`} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900">{evidence.sourceLabel}</span>
                      {evidence.supportRole && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800">{label(evidence.supportRole)}</span>}
                    </div>
                    <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">{locatorText(evidence.locator)}</p>
                    <blockquote className="mt-3 border-l-2 border-[#008ad2] pl-3 text-sm leading-6 text-slate-700"><EvidenceExcerpt content={evidence.excerpt} context={[selection.title]}/></blockquote>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-[10px] font-bold text-slate-400">Verification details</summary>
                      <p className="mt-1 break-all font-mono text-[10px] text-slate-400">Evidence checksum {evidence.contentChecksum}</p>
                    </details>
                    {evidence.facts?.length ? (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-extrabold uppercase text-slate-500">Extracted facts</p>
                        <ul className="mt-2 space-y-2">
                          {evidence.facts.map((fact) => (
                            <li key={fact.factId} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                              <strong>{label(fact.key)}</strong>: {fact.statement}
                              {fact.contradictionGroup && <span className="ml-2 text-fuchsia-700">Contradiction retained</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">No supporting text from the vendor&rsquo;s response backs this assessment. Treat it as needing review.</p>
            )}
          </section>
          {selection.reviewHistory?.length ? (
            <section>
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Review history</h3>
              <ol className="mt-2 space-y-2">
                {selection.reviewHistory.map((review) => (
                  <li key={review.reviewId} className="rounded-xl border border-slate-200 p-3 text-xs text-slate-700">
                    <strong>{label(review.decision)}</strong> · {label(review.reasonCode)}
                    <p className="mt-1 text-slate-500">
                      {review.note || "No note provided."} · {formatIntelligenceTimestamp(review.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function RequirementMatrix({ requirements, onEvidence }: { requirements: ComparisonRequirement[]; onEvidence: (selection: EvidenceSelection) => void }) {
  const vendors = requirements[0]?.vendors ?? [];
  if (!requirements.length) return <EmptyState title="No requirements in this view" text="This comparison snapshot does not contain requirements for this category." />;
  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block" aria-label="Vendor requirement comparison matrix">
        <table className="min-w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-80 border-b border-r border-slate-200 bg-slate-50 p-4 text-xs font-extrabold text-slate-700">Approved requirement</th>
              {vendors.map((vendor) => (
                <th key={vendor.participantId} className="min-w-60 border-b border-slate-200 bg-slate-50 p-4 text-xs font-extrabold text-slate-700">
                  {vendor.vendorLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requirements.map((requirement) => (
              <tr
                key={requirement.requirementId}
                style={{
                  contentVisibility: "auto",
                  containIntrinsicSize: "0 104px",
                }}
              >
                <th scope="row" className="sticky left-0 z-10 border-b border-r border-slate-100 bg-white p-4 align-top">
                  <div className="flex flex-wrap gap-1">
                    {requirement.mandatoryStatus === "mandatory" && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">Mandatory</span>}
                    {requirement.eligibility && <span className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-extrabold text-fuchsia-700">Eligibility gate</span>}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{label(requirement.kind)}</span>
                  </div>
                  <p className="mt-2 text-sm font-extrabold text-slate-950">{requirement.title}</p>
                  <p className="mt-1 line-clamp-3 text-xs font-normal leading-5 text-slate-500">{requirement.text}</p>
                </th>
                {requirement.vendors.map((vendor) => (
                  <td key={vendor.participantId} className="border-b border-slate-100 p-4 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${verdictTone(vendor.verdict)}`}>{verdictLabel(vendor.verdict)}</span>
                      {vendor.confidence !== null && vendor.confidence < 0.7 && <span className="text-[10px] font-bold text-amber-800">Low AI confidence ({Math.round(vendor.confidence * 100)}%) — verify the source</span>}
                    </div>
                    {vendor.needsHumanReview && (
                      <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-amber-800">
                        <AlertTriangle size={12} />
                        Human review needed{vendor.reviewReasons.length ? `: ${vendor.reviewReasons.map(label).join(", ")}` : ""}
                      </p>
                    )}
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{vendor.rationale}</p>
                    <button
                      type="button"
                      onClick={() =>
                        onEvidence({
                          title: requirement.title,
                          vendorLabel: vendor.vendorLabel,
                          rationale: vendor.rationale,
                          evidence: vendor.evidence,
                          reviewHistory: vendor.reviewHistory,
                        })
                      }
                      className="mt-3 inline-flex min-h-8 items-center gap-1 text-xs font-extrabold text-[#0077b6] hover:underline"
                    >
                      Inspect {vendor.evidence.length} citation
                      {vendor.evidence.length === 1 ? "" : "s"}
                      <ChevronRight size={13} />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {requirements.map((requirement) => (
          <article
            key={requirement.requirementId}
            className="rounded-2xl border border-slate-200 bg-white p-4"
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "0 240px",
            }}
          >
            <div className="flex flex-wrap gap-1">
              {requirement.mandatoryStatus === "mandatory" && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">Mandatory</span>}
              {requirement.eligibility && <span className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-extrabold text-fuchsia-700">Eligibility gate</span>}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{label(requirement.kind)}</span>
            </div>
            <h3 className="mt-2 text-sm font-extrabold text-slate-950">{requirement.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{requirement.text}</p>
            <div className="mt-3 space-y-2">
              {requirement.vendors.map((vendor) => (
                <details key={vendor.participantId} className="rounded-xl bg-slate-50 p-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-extrabold text-slate-800">
                    <span>{vendor.vendorLabel}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] ${verdictTone(vendor.verdict)}`}>{verdictLabel(vendor.verdict)}</span>
                  </summary>
                  {vendor.confidence !== null && vendor.confidence < 0.7 && <p className="mt-2 text-[10px] font-bold text-amber-800">Low AI confidence ({Math.round(vendor.confidence * 100)}%) — verify the source</p>}
                  {vendor.needsHumanReview && <p className="mt-2 text-[10px] font-bold text-amber-800">Human review needed{vendor.reviewReasons.length ? `: ${vendor.reviewReasons.map(label).join(", ")}` : ""}</p>}
                  <p className="mt-3 text-xs leading-5 text-slate-600">{vendor.rationale}</p>
                  <button
                    type="button"
                    onClick={() =>
                      onEvidence({
                        title: requirement.title,
                        vendorLabel: vendor.vendorLabel,
                        rationale: vendor.rationale,
                        evidence: vendor.evidence,
                        reviewHistory: vendor.reviewHistory,
                      })
                    }
                    className="mt-3 text-xs font-extrabold text-[#0077b6]"
                  >
                    Inspect evidence
                  </button>
                </details>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <FileSearch className="mx-auto text-slate-400" size={28} />
      <h2 className="mt-3 font-extrabold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function RecommendationPanel({ workspace }: { workspace: ComparisonWorkspace }) {
  const recommendation = workspace.recommendation;
  const stale = workspace.freshness.state === "stale";
  if (!recommendation) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>This older comparison has no saved recommendation.</strong> Run a new comparison to produce a ranking.</div>;
  const leader = recommendation.bestParticipantId ? recommendation.ranking.find((item) => item.participantId === recommendation.bestParticipantId) : null;
  // Past tense once the inputs have moved on: this is what an old run found.
  const title = recommendation.status === "recommended" && leader
    ? (stale ? `Out-of-date result: ${leader.vendorLabel} was the strongest fit` : `${leader.vendorLabel} is the strongest fit`)
    : recommendation.status === "close_call"
      ? (stale ? "Out-of-date result: the leading vendors were a close call" : "The leading vendors are a close call")
      : (stale ? "Out-of-date result: no vendor met every must-pass requirement" : "No vendor meets every must-pass requirement");
  const tone = recommendation.status === "recommended" ? "border-emerald-200 bg-emerald-50/60" : recommendation.status === "close_call" ? "border-amber-200 bg-amber-50/60" : "border-rose-200 bg-rose-50/60";
  const summary = leader
    ? buildRecommendationSummary({
      leaderId: leader.participantId,
      ranking: recommendation.ranking,
      requirements: workspace.intelligence.requirements,
      commercial: workspace.intelligence.commercial,
      canViewCommercial: workspace.intelligence.permissions.viewCommercial,
    })
    : null;
  const comparison = summary?.alternatives ?? buildVendorComparison({
    ranking: recommendation.ranking,
    requirements: workspace.intelligence.requirements,
    commercial: workspace.intelligence.commercial,
    canViewCommercial: workspace.intelligence.permissions.viewCommercial,
  });
  const noLeaderText = recommendation.status === "close_call"
    ? `These vendors are too close to separate on the evidence alone. Read the comparison below and make the call yourself.`
    : `No response answers every must-pass requirement, so none can be recommended. Ask the vendors below for the missing answers, or reconsider which requirements are must-pass.`;
  return <section className={`rounded-2xl border p-5 ${tone}`} aria-labelledby="recommendation-title">
    <div className="max-w-4xl">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{stale ? "Earlier suggestion \u00b7 inputs have changed since" : "Suggested shortlist \u00b7 you decide"}</p>
      <h2 id="recommendation-title" className="mt-2 text-xl font-extrabold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{summary ? summary.overview : noLeaderText}</p>
    </div>

    {summary && summary.strengths.length > 0 && <div className="mt-4 rounded-xl border border-white/80 bg-white/80 p-4">
      <h3 className="text-xs font-extrabold text-slate-900">Why {leader!.vendorLabel} comes out ahead</h3>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-700">{summary.strengths.map((strength) => <li key={strength} className="flex gap-2"><CheckCircle2 size={15} className="mt-1 shrink-0 text-emerald-600" /><span>{strength}</span></li>)}</ul>
    </div>}

    {summary && summary.watchOuts.length > 0 && <div className="mt-3 rounded-xl border border-white/80 bg-white/80 p-4">
      <h3 className="text-xs font-extrabold text-slate-900">Check these before you decide</h3>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-700">{summary.watchOuts.map((item) => <li key={item} className="flex gap-2"><AlertTriangle size={15} className="mt-1 shrink-0 text-amber-600" /><span>{item}</span></li>)}</ul>
    </div>}

    {comparison.length > 0 && <div className="mt-3 rounded-xl border border-white/80 bg-white/80 p-4">
      <h3 className="text-xs font-extrabold text-slate-900">{summary ? `How the ${comparison.length === 1 ? "other vendor compares" : "others compare"}` : "How the vendors compare"}</h3>
      <ul className="mt-2 space-y-3">{comparison.map((alternative) => <li key={alternative.participantId}>
        <p className="text-sm font-bold text-slate-900">{alternative.vendorLabel}</p>
        <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-sm leading-6 text-slate-600">{alternative.points.map((point) => <li key={point}>{point}</li>)}</ul>
      </li>)}</ul>
    </div>}

    <p className="mt-4 text-xs leading-5 text-slate-600">This is a suggestion drawn from what the vendors wrote, not a decision. Open any vendor to read the quotes behind every line above.</p>
  </section>;
}

function ExecutiveReport({ proposalId, proposalTitle, workspace }: { proposalId: string; proposalTitle: string; workspace: ComparisonWorkspace }) {
  const overview = workspace.intelligence.overview;
  const reportBase = `/proposals/${proposalId}/intelligence/comparisons/${workspace.run.runId}`;
  const mandatory = comparisonOverviewCounts({ requirements: workspace.intelligence.requirements, participantIds: workspace.participants.map((participant) => participant.participantId) });
  const summary = [
    { label: "Vendor responses", value: overview.responseCount },
    { label: "Approved requirements", value: overview.approvedRequirementCount },
    { label: "Must-haves unanswered", value: mandatory.mandatoryUnanswered, hint: "added up across vendors" },
    { label: "Must-haves partly answered", value: mandatory.mandatoryPartlyAnswered, hint: "added up across vendors" },
    { label: "Unresolved reviews", value: overview.unresolvedReviewCount },
  ];
  const recommendationOrder = new Map(workspace.recommendation?.ranking.map((item, index) => [item.participantId, index]) ?? []);
  const vendorSnapshots = workspace.participants.map((participant) => ({
    participant,
    commercial: workspace.intelligence.commercial.find((item) => item.participantId === participant.participantId),
    evaluation: workspace.intelligence.evaluation.find((item) => item.participantId === participant.participantId),
    risks: workspace.intelligence.risks.filter((item) => item.participantId === participant.participantId),
  })).sort((left, right) => (recommendationOrder.get(left.participant.participantId) ?? Number.MAX_SAFE_INTEGER) - (recommendationOrder.get(right.participant.participantId) ?? Number.MAX_SAFE_INTEGER));
  const formatMoney = (amount: number | null, currency: string | null) =>
    amount === null
      ? "Not submitted"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency || "USD",
          maximumFractionDigits: 2,
        }).format(amount);

  return (
    <article data-executive-report className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-labelledby="executive-report-title">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          body {
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          [data-executive-report],
          [data-executive-report] * {
            visibility: visible !important;
          }

          [data-executive-report] {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            max-width: none !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          [data-executive-report] .executive-report-no-print {
            display: none !important;
          }

          [data-executive-report] .executive-report-print-only {
            display: block !important;
          }

          [data-executive-report] .executive-report-print-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <header className="executive-report-print-avoid border-b border-slate-200 bg-slate-950 px-5 py-7 text-white sm:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-sky-200">Comparison snapshot · Executive report</p>
            <p className="executive-report-print-only mt-4 hidden text-sm font-extrabold text-white">{proposalTitle}</p>
            <h2 id="executive-report-title" className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Your vendor comparison at a glance</h2>
            <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base sm:leading-7">The key findings from the responses you received, measured against the criteria you approved. RFPilot organizes the evidence; the vendor decision is yours.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-2 text-xs font-extrabold text-emerald-200">
              <CheckCircle2 size={14} />
              {workspace.freshness.state === "stale" ? "Historical comparison" : workspace.recommendation ? "Comparison ready to review" : "Recommendation unavailable"}
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="executive-report-no-print inline-flex min-h-9 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <Printer size={14} />
              Print report
            </button>
          </div>
        </div>
      </header>

      <div className="p-5 sm:p-7">
        <section className="executive-report-print-avoid" aria-labelledby="report-snapshot-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 id="report-snapshot-title" className="font-extrabold text-slate-950">Procurement snapshot</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Key counts from this completed comparison.</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${workspace.freshness.state === "current" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{workspace.freshness.state === "current" ? "Current inputs" : "Historical inputs"}</span>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {summary.map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{item.label}</dt>
                <dd className="mt-2 text-2xl font-extrabold text-slate-950">{item.value}</dd>
                {"hint" in item && item.hint && <dd className="mt-0.5 text-[10px] text-slate-500">{item.hint}</dd>}
              </div>
            ))}
          </dl>
        </section>

        <div className="executive-report-print-avoid mt-8"><RecommendationPanel workspace={workspace} /></div>

        <section className="mt-8" aria-labelledby="vendor-report-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 id="vendor-report-title" className="font-extrabold text-slate-950">Vendor comparison</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{workspace.recommendation ? "Vendors are listed in the ranking order shown above." : "This older comparison has no saved ranking, so vendors are listed in their original order."}</p>
            </div>
            <Link href={`${reportBase}/requirements`} className="executive-report-no-print inline-flex min-h-9 items-center gap-1 text-xs font-extrabold text-[#0077b6] hover:underline">Open requirement matrix <ChevronRight size={13} /></Link>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {vendorSnapshots.map(({ participant, commercial, evaluation, risks }) => (
              <article key={participant.participantId} className="executive-report-print-avoid rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-slate-950">{participant.vendorLabel}</h4>
                                      </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${participant.warningCount ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{participant.warningCount ? `${participant.warningCount} source warning${participant.warningCount === 1 ? "" : "s"}` : "Sources ready"}</span>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Commercial position</p>
                  {!workspace.intelligence.permissions.viewCommercial ? (
                    <p className="mt-2 text-sm font-extrabold text-slate-800">Pricing hidden until evaluation completes</p>
                  ) : commercial ? (
                    <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-lg font-extrabold text-slate-950">{formatMoney(commercial.submittedTotal, commercial.submittedCurrency)}</p>
                        <p className="text-[10px] font-semibold text-slate-500">Vendor-submitted total</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${commercial.comparable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{commercial.comparable ? `Comparable ${formatMoney(commercial.normalizedTotal, commercial.normalizedCurrency)}` : "Can't compare directly"}</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-extrabold text-slate-800">No commercial summary available</p>
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Scoring</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">{evaluation ? (evaluation.completedEvaluatorCount > 0 ? "Scored" : "Not scored yet") : "Not available"}</p>
                    {evaluation ? <p className="mt-1 text-xs text-slate-500">Recorded contribution {evaluation.weightedContributionTotal.toFixed(2)} / 100</p> : null}
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Risk highlights</p>
                    {risks.length ? (
                      <ul className="mt-1 space-y-1 text-xs leading-5 text-slate-600">
                        {risks.slice(0, 2).map((risk) => <li key={risk.riskId}>• {risk.title}</li>)}
                      </ul>
                    ) : <p className="mt-1 text-sm font-extrabold text-slate-900">No risks flagged</p>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

      </div>
    </article>
  );
}

export default function ProposalIntelligenceWorkspace({ proposalId, proposalTitle, tab, initialWorkspace }: Props) {
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [selection, setSelection] = useState<EvidenceSelection>();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (terminal.has(workspace.run.status) || !visible) return;
    const timer = window.setTimeout(async () => {
      const result = await getComparisonWorkspaceAction(proposalId, workspace.run.runId);
      if (result.success) setWorkspace(result.data);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [proposalId, visible, workspace.run.runId, workspace.run.status]);
  const formatMoney = (amount: number | null, currency: string | null) =>
    amount === null
      ? "Not submitted"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency || "USD",
          maximumFractionDigits: 2,
        }).format(amount);
  const tabHref = (nextTab: IntelligenceTab, runId = workspace.run.runId) => `/proposals/${proposalId}/intelligence/comparisons/${runId}/${nextTab}`;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <Link href={`/proposals/${proposalId}/intelligence`} className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-500 hover:text-[#008ad2]">
          <ArrowLeft size={14} />
          Proposal intelligence home
        </Link>
        <header className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#008ad2]">Comparison results</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{proposalTitle}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Comparison from {formatIntelligenceTimestamp(workspace.run.createdAt)} · {workspace.run.participantCount} vendors
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${workspace.run.status.startsWith("succeeded") ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800"}`}>{label(workspace.run.status)}</span>
            <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${workspace.freshness.state === "stale" ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-800"}`}>{workspace.freshness.state === "stale" ? "Out of date" : "Up to date"}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-700">{workspace.manifest.priceVisibility === "hidden" ? "Pricing hidden until scoring is finished" : "Pricing visible"}</span>
          </div>
          {!terminal.has(workspace.run.status) && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-violet-100" role="progressbar" aria-label="Comparison progress" aria-valuenow={Math.round(workspace.run.progress)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-violet-600" style={{ width: `${workspace.run.progress}%` }} />
              </div>
              <p className="mt-1 text-right text-xs font-bold text-violet-700">{Math.round(workspace.run.progress)}%</p>
            </div>
          )}
          {workspace.freshness.state === "stale" && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <AlertTriangle size={15} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <strong>Out of date.</strong> {describeFreshnessReasons(workspace.freshness.reasons) || "The proposal inputs changed after this comparison ran."} The results stay readable; run a new comparison for an up-to-date view.
              </span>
              <RerunComparisonButton proposalId={proposalId} className="shrink-0 bg-amber-700 hover:bg-amber-800" />
            </div>
          )}
        </header>
        <nav aria-label="Proposal intelligence views" className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
          <div className="flex min-w-max gap-1">
            {intelligenceTabs.map((item) => (
              <Link key={item} href={tabHref(item)} aria-current={tab === item ? "page" : undefined} className={`rounded-xl px-4 py-2.5 text-xs font-extrabold ${tab === item ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                {item === "reports" ? "Executive report" : label(item)}
              </Link>
            ))}
          </div>
        </nav>

        <section className="mt-5">
          {tab === "overview" && (
            <>
              <RecommendationPanel workspace={workspace} />
            </>
          )}
          {tab === "requirements" && <RequirementMatrix requirements={workspace.intelligence.requirements} onEvidence={setSelection} />}
          {tab === "technical" && (
            <>
              <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
                <strong>Technical view:</strong> technical, staffing, reference, and sustainability requirements from this comparison snapshot. Open a cell to inspect its source evidence.
              </div>
              <RequirementMatrix requirements={workspace.intelligence.technical} onEvidence={setSelection} />
            </>
          )}
          {tab === "commercial" &&
            (!workspace.intelligence.permissions.viewCommercial ? (
              <EmptyState title="Pricing is hidden" text="Pricing is hidden for this comparison to prevent price bias during evaluation. Totals and line items will appear once commercial access is granted." />
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {workspace.intelligence.commercial.map((item) => (
                  <article key={item.participantId} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-extrabold text-slate-950">{item.vendorLabel}</h2>
                        <p className="mt-1 text-xs text-slate-500">Submitted and normalized values remain distinct.</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${item.comparable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{item.comparable ? "Comparable" : "Can't compare directly"}</span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <dt className="text-[10px] font-extrabold uppercase text-slate-500">Vendor submitted</dt>
                        <dd className="mt-1 text-lg font-extrabold text-slate-950">{formatMoney(item.submittedTotal, item.submittedCurrency)}</dd>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <dt className="text-[10px] font-extrabold uppercase text-slate-500">Normalized comparison</dt>
                        <dd className="mt-1 text-lg font-extrabold text-slate-950">{item.comparable ? formatMoney(item.normalizedTotal, item.normalizedCurrency) : "Not directly comparable"}</dd>
                      </div>
                    </dl>
                    {item.refusalCodes.length ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">This quote can&rsquo;t be compared directly. {describeRefusalCodes(item.refusalCodes)} Ask the vendor to clarify rather than guessing.</p> : null}
                    {item.lineItems.length ? (
                      <details className="mt-3 rounded-xl border border-slate-200 p-3">
                        <summary className="cursor-pointer text-xs font-extrabold text-slate-800">{item.lineItems.length} cited commercial line items</summary>
                        <ul className="mt-3 space-y-2">
                          {item.lineItems.map((line) => (
                            <li key={line.lineItemId} className="flex justify-between gap-3 text-xs text-slate-600">
                              <span>
                                {line.description}
                                {line.optionOrExclusion ? " · option/exclusion" : ""}
                              </span>
                              <strong>{formatMoney(line.amount, line.currency)}</strong>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </article>
                ))}
              </div>
            ))}
          {tab === "evaluation" && (
            <>
              <RecommendationPanel workspace={workspace} />
              <ScoreGapExplanation workspace={workspace} className="mt-4" />
            </>
          )}
          {tab === "reports" && <ExecutiveReport proposalId={proposalId} proposalTitle={proposalTitle} workspace={workspace} />}
        </section>
        {selection && <EvidenceDrawer selection={selection} onClose={() => setSelection(undefined)} />}
      </div>
    </main>
  );
}
