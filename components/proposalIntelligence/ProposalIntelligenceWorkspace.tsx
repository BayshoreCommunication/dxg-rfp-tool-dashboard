"use client";

import { getComparisonWorkspaceAction, recordComparisonDecisionAction, type ComparisonEvidence, type ComparisonRequirement, type ComparisonView, type ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import type { IntelligenceOperationsBundle } from "@/app/actions/proposalIntelligenceOperations";
import { formatIntelligenceTimestamp } from "@/lib/proposalIntelligence/formatTimestamp";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, ClipboardCheck, FileSearch, History, LockKeyhole, Scale, ShieldAlert, Users, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

export const intelligenceTabs = ["overview", "requirements", "technical", "commercial", "risks", "evaluation", "reports"] as const;
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
  operationsBundle?: IntelligenceOperationsBundle;
};

const ReportCenter = dynamic(() => import("@/components/proposalIntelligence/ProposalIntelligenceOperationsWorkspace").then((module) => module.ReportCenter));

const terminal = new Set(["succeeded", "succeeded_with_warnings", "failed", "cancelled"]);
const label = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const verdictTone: Record<string, string> = {
  addressed: "bg-emerald-100 text-emerald-800",
  partially_addressed: "bg-amber-100 text-amber-900",
  missing: "bg-rose-100 text-rose-800",
  contradictory: "bg-fuchsia-100 text-fuchsia-900",
  not_applicable: "bg-slate-100 text-slate-600",
  not_assessable: "bg-slate-100 text-slate-700",
};
const riskTone: Record<string, string> = {
  high: "bg-rose-100 text-rose-800",
  medium: "bg-amber-100 text-amber-900",
  low: "bg-sky-100 text-sky-800",
};
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
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Persisted rationale</h3>
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
                    <blockquote className="mt-3 border-l-2 border-[#008ad2] pl-3 text-sm leading-6 text-slate-700">{evidence.excerpt}</blockquote>
                    <p className="mt-3 break-all font-mono text-[10px] text-slate-400">Evidence checksum {evidence.contentChecksum}</p>
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
              <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">No supporting passage was persisted for this assessment. Treat it as requiring review.</p>
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
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{label(requirement.kind)}</span>
                  </div>
                  <p className="mt-2 text-sm font-extrabold text-slate-950">{requirement.title}</p>
                  <p className="mt-1 line-clamp-3 text-xs font-normal leading-5 text-slate-500">{requirement.text}</p>
                </th>
                {requirement.vendors.map((vendor) => (
                  <td key={vendor.participantId} className="border-b border-slate-100 p-4 align-top">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${verdictTone[vendor.verdict] ?? verdictTone.not_assessable}`}>{label(vendor.verdict)}</span>
                    {vendor.needsHumanReview && (
                      <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-amber-800">
                        <AlertTriangle size={12} />
                        Human review needed
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
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{label(requirement.kind)}</span>
            </div>
            <h3 className="mt-2 text-sm font-extrabold text-slate-950">{requirement.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{requirement.text}</p>
            <div className="mt-3 space-y-2">
              {requirement.vendors.map((vendor) => (
                <details key={vendor.participantId} className="rounded-xl bg-slate-50 p-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-extrabold text-slate-800">
                    <span>{vendor.vendorLabel}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] ${verdictTone[vendor.verdict] ?? verdictTone.not_assessable}`}>{label(vendor.verdict)}</span>
                  </summary>
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

function ExecutiveReport({ proposalId, workspace }: { proposalId: string; workspace: ComparisonWorkspace }) {
  const overview = workspace.intelligence.overview;
  const reportBase = `/proposals/${proposalId}/intelligence/comparisons/${workspace.run.runId}`;
  const summary = [
    { label: "Vendor responses", value: overview.responseCount },
    { label: "Approved requirements", value: overview.approvedRequirementCount },
    { label: "Mandatory gaps", value: overview.mandatoryGapCount },
    { label: "Unresolved reviews", value: overview.unresolvedReviewCount },
    { label: "Evaluator completion", value: `${overview.evaluatorCompletedCount}/${overview.evaluatorAssignedCount}` },
  ];
  const vendorSnapshots = workspace.participants.map((participant) => ({
    participant,
    commercial: workspace.intelligence.commercial.find((item) => item.participantId === participant.participantId),
    evaluation: workspace.intelligence.evaluation.find((item) => item.participantId === participant.participantId),
    risks: workspace.intelligence.risks.filter((item) => item.participantId === participant.participantId),
  }));
  const latestDecision = workspace.intelligence.decisions[0];
  const formatMoney = (amount: number | null, currency: string | null) =>
    amount === null
      ? "Not submitted"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency || "USD",
          maximumFractionDigits: 2,
        }).format(amount);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-labelledby="executive-report-title">
      <header className="border-b border-slate-200 bg-slate-950 px-5 py-7 text-white sm:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-sky-200">Comparison snapshot · Executive report</p>
            <h2 id="executive-report-title" className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Your vendor comparison at a glance</h2>
            <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base sm:leading-7">Review the key findings from the selected vendor responses and evaluation criteria. RFPilot organizes the evidence for your team; the final vendor decision always remains with your reviewers.</p>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-2 text-xs font-extrabold text-emerald-200">
            <CheckCircle2 size={14} />
            Comparison ready to review
          </span>
        </div>
      </header>

      <div className="p-5 sm:p-7">
        <section aria-labelledby="report-snapshot-title">
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
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-8" aria-labelledby="vendor-report-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 id="vendor-report-title" className="font-extrabold text-slate-950">Vendor comparison</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Vendors are shown in the saved response order, not ranked or recommended.</p>
            </div>
            <Link href={`${reportBase}/requirements`} className="inline-flex min-h-9 items-center gap-1 text-xs font-extrabold text-[#0077b6] hover:underline">Open requirement matrix <ChevronRight size={13} /></Link>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {vendorSnapshots.map(({ participant, commercial, evaluation, risks }) => (
              <article key={participant.participantId} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-slate-950">{participant.vendorLabel}</h4>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Response version {participant.versionId.slice(0, 8)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${participant.warningCount ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{participant.warningCount ? `${participant.warningCount} source warning${participant.warningCount === 1 ? "" : "s"}` : "Sources ready"}</span>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Commercial position</p>
                  {!workspace.intelligence.permissions.viewCommercial ? (
                    <p className="mt-2 text-sm font-extrabold text-slate-800">Commercial values sealed</p>
                  ) : commercial ? (
                    <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-lg font-extrabold text-slate-950">{formatMoney(commercial.submittedTotal, commercial.submittedCurrency)}</p>
                        <p className="text-[10px] font-semibold text-slate-500">Vendor-submitted total</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${commercial.comparable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{commercial.comparable ? `Normalized ${formatMoney(commercial.normalizedTotal, commercial.normalizedCurrency)}` : "Normalization refused"}</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-extrabold text-slate-800">No commercial summary available</p>
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Human evaluation</p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">{evaluation ? `${evaluation.completedEvaluatorCount}/${evaluation.evaluatorCount} evaluators complete` : "Not available"}</p>
                    {evaluation ? <p className="mt-1 text-xs text-slate-500">Persisted contribution {evaluation.weightedContributionTotal.toFixed(2)}</p> : null}
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Risk highlights</p>
                    {risks.length ? (
                      <ul className="mt-1 space-y-1 text-xs leading-5 text-slate-600">
                        {risks.slice(0, 2).map((risk) => <li key={risk.riskId}>• {risk.title}</li>)}
                      </ul>
                    ) : <p className="mt-1 text-sm font-extrabold text-slate-900">No persisted risk flags</p>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2" aria-label="Review and decision summary">
          <article className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-950">Priority review signals</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Evidence-backed items requiring procurement attention.</p>
              </div>
              <Link href={`${reportBase}/risks`} className="shrink-0 text-xs font-extrabold text-[#0077b6] hover:underline">View all risks</Link>
            </div>
            {workspace.intelligence.risks.length ? (
              <ul className="mt-4 space-y-3">
                {workspace.intelligence.risks.slice(0, 5).map((risk) => (
                  <li key={risk.riskId} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${riskTone[risk.severity] ?? riskTone.low}`}>{label(risk.severity)}</span>
                      <span className="text-[10px] font-bold text-slate-500">{risk.vendorLabel}</span>
                    </div>
                    <p className="mt-2 text-xs font-extrabold text-slate-800">{risk.title}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No evidence-backed risk flags were persisted for this run.</p>}
          </article>

          <article className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-950">Human decision</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Only a recorded procurement decision appears here.</p>
              </div>
              <Link href={`${reportBase}/evaluation`} className="shrink-0 text-xs font-extrabold text-[#0077b6] hover:underline">Open evaluation</Link>
            </div>
            {latestDecision ? (
              <div className="mt-4 rounded-xl bg-violet-50 p-4">
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-extrabold text-violet-800">{label(latestDecision.decisionType)}</span>
                {latestDecision.selectedParticipantIds.length ? <p className="mt-3 text-sm font-extrabold text-violet-950">{latestDecision.selectedParticipantIds.map((id) => workspace.participants.find((participant) => participant.participantId === id)?.vendorLabel ?? "Historical participant").join(", ")}</p> : null}
                <p className="mt-2 text-sm leading-6 text-violet-900">{latestDecision.rationale}</p>
                <p className="mt-2 text-[10px] font-semibold text-violet-600">Recorded {formatIntelligenceTimestamp(latestDecision.createdAt)}</p>
              </div>
            ) : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No human shortlist or selection has been recorded. RFPilot does not generate an automatic winner.</p>}
          </article>
        </section>

        <footer className="mt-8 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-5 text-sky-900">This report summarizes persisted evidence and human evaluation state. Use the detailed tabs to inspect citations, resolve reviews, and record the procurement decision.</footer>
      </div>
    </article>
  );
}

function DecisionWorkspace({ proposalId, workspace, onChanged }: { proposalId: string; workspace: ComparisonWorkspace; onChanged: (workspace: ComparisonWorkspace) => void }) {
  const [decisionType, setDecisionType] = useState<"" | "shortlist" | "selection" | "no_award">("");
  const [selected, setSelected] = useState<string[]>([]);
  const [rationale, setRationale] = useState("");
  const [acknowledgeStale, setAcknowledgeStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const choose = (participantId: string) => setSelected((current) => (decisionType === "selection" ? [participantId] : current.includes(participantId) ? current.filter((id) => id !== participantId) : [...current, participantId]));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(undefined);
    if (!decisionType) {
      setMessage("Choose the human decision being recorded.");
      return;
    }
    setBusy(true);
    const result = await recordComparisonDecisionAction(proposalId, workspace.run.runId, {
      decisionType,
      selectedParticipantIds: selected,
      rationale,
      acknowledgeStale,
    });
    if (!result.success) {
      setBusy(false);
      setMessage(result.message);
      return;
    }
    const refreshed = await getComparisonWorkspaceAction(proposalId, workspace.run.runId);
    setBusy(false);
    if (refreshed.success) {
      onChanged(refreshed.data);
      setDecisionType("");
      setSelected([]);
      setRationale("");
      setAcknowledgeStale(false);
      setMessage("Decision recorded as a new immutable history entry.");
    } else setMessage(refreshed.message);
  };
  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]" aria-labelledby="decision-record-title">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700">
            <Scale size={18} />
          </span>
          <div>
            <h2 id="decision-record-title" className="font-extrabold text-slate-950">
              Record a human decision
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">The system does not recommend, rank, or preselect a vendor. Your rationale becomes an append-only record tied to this run.</p>
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className="text-xs font-extrabold text-slate-700">Decision type</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(["shortlist", "selection", "no_award"] as const).map((type) => (
              <label key={type} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${decisionType === type ? "border-violet-500 bg-violet-50 text-violet-900" : "border-slate-200 text-slate-700"}`}>
                <input
                  type="radio"
                  name="decisionType"
                  value={type}
                  checked={decisionType === type}
                  onChange={() => {
                    setDecisionType(type);
                    setSelected([]);
                  }}
                />
                {label(type)}
              </label>
            ))}
          </div>
        </fieldset>
        {decisionType && decisionType !== "no_award" && (
          <fieldset className="mt-4">
            <legend className="text-xs font-extrabold text-slate-700">{decisionType === "selection" ? "Selected vendor" : "Shortlisted vendors"}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {workspace.participants.map((participant) => (
                <label key={participant.participantId} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-bold text-slate-800">
                  <input type={decisionType === "selection" ? "radio" : "checkbox"} name="selectedVendor" checked={selected.includes(participant.participantId)} onChange={() => choose(participant.participantId)} />
                  {participant.vendorLabel}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <label className="mt-4 block text-xs font-extrabold text-slate-700">
          Decision rationale
          <textarea required minLength={20} maxLength={5000} rows={5} value={rationale} onChange={(event) => setRationale(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal leading-6 outline-none focus:border-violet-500" placeholder="Explain the procurement judgment, tradeoffs, and any conditions…" />
        </label>
        {workspace.freshness.state === "stale" && (
          <label className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900">
            <input required type="checkbox" checked={acknowledgeStale} onChange={(event) => setAcknowledgeStale(event.target.checked)} className="mt-0.5" />I understand this run is historical and no longer matches the current proposal inputs.
          </label>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button disabled={busy} type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-4 text-xs font-extrabold text-white disabled:opacity-50">
            <LockKeyhole size={14} />
            {busy ? "Recording…" : "Record decision"}
          </button>
          {message && (
            <p role="status" className={`text-xs font-semibold ${message.startsWith("Decision recorded") ? "text-emerald-700" : "text-rose-700"}`}>
              {message}
            </p>
          )}
        </div>
      </form>
      <article className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-slate-950">Decision history</h2>
          <span className="text-xs font-bold text-slate-400">{workspace.intelligence.decisions.length} entries</span>
        </div>
        {workspace.intelligence.decisions.length ? (
          <ol className="mt-4 space-y-3">
            {workspace.intelligence.decisions.map((decision, index) => (
              <li key={decision.decisionId} className="rounded-xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-extrabold text-violet-800">{label(decision.decisionType)}</span>
                  {index === 0 && <span className="text-[10px] font-extrabold uppercase text-emerald-700">Latest record</span>}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{decision.rationale}</p>
                {decision.selectedParticipantIds.length ? <p className="mt-2 text-xs font-bold text-slate-600">Vendors: {decision.selectedParticipantIds.map((id) => workspace.participants.find((participant) => participant.participantId === id)?.vendorLabel ?? "Historical participant").join(", ")}</p> : null}
                <p className="mt-2 text-[10px] text-slate-400">
                  {formatIntelligenceTimestamp(decision.createdAt)} · Manifest {decision.manifestChecksum.slice(0, 12)}…
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No procurement decision has been recorded for this run.</p>
        )}
      </article>
    </section>
  );
}

export default function ProposalIntelligenceWorkspace({ proposalId, proposalTitle, tab, initialWorkspace, runs, operationsBundle }: Props) {
  const router = useRouter();
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
  const currentRun = runs.find((run) => run.run.runId === workspace.run.runId);
  const overview = workspace.intelligence.overview;
  const formatMoney = (amount: number | null, currency: string | null) =>
    amount === null
      ? "Not submitted"
      : new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currency || "USD",
          maximumFractionDigits: 2,
        }).format(amount);
  const tabHref = (nextTab: IntelligenceTab, runId = workspace.run.runId) => `/proposals/${proposalId}/intelligence/comparisons/${runId}/${nextTab}`;
  const summary = [
    { label: "Responses", value: overview.responseCount, icon: Users },
    {
      label: "Approved requirements",
      value: overview.approvedRequirementCount,
      icon: ClipboardCheck,
    },
    {
      label: "Mandatory gaps",
      value: overview.mandatoryGapCount,
      icon: ShieldAlert,
    },
    {
      label: "Unresolved reviews",
      value: overview.unresolvedReviewCount,
      icon: AlertTriangle,
    },
    {
      label: "Evaluator completion",
      value: `${overview.evaluatorCompletedCount}/${overview.evaluatorAssignedCount}`,
      icon: CheckCircle2,
    },
  ];
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
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#008ad2]">Comparison snapshot workspace</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{proposalTitle}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Run {workspace.run.runId.slice(0, 8)} · {workspace.run.participantCount} vendor versions · Manifest {workspace.manifest.checksum.slice(0, 12)}…
              </p>
            </div>
            <label className="text-xs font-extrabold text-slate-700">
              Comparison run
              <select value={workspace.run.runId} onChange={(event) => router.push(tabHref(tab, event.target.value))} className="mt-1.5 block h-11 min-w-72 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold">
                {runs.map((run) => (
                  <option key={run.run.runId} value={run.run.runId}>
                    {formatIntelligenceTimestamp(run.run.createdAt)} · {run.run.participantCount} vendors · {run.freshness.state}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${workspace.run.status.startsWith("succeeded") ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800"}`}>{label(workspace.run.status)}</span>
            <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${workspace.freshness.state === "stale" ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-800"}`}>{label(workspace.freshness.state)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-700">Pricing: {label(workspace.manifest.priceVisibility)}</span>
          </div>
          {!terminal.has(workspace.run.status) && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-violet-100" role="progressbar" aria-label="Comparison progress" aria-valuenow={Math.round(workspace.run.progress)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-violet-600" style={{ width: `${workspace.run.progress}%` }} />
              </div>
              <p className="mt-1 text-right text-xs font-bold text-violet-700">{Math.round(workspace.run.progress)}% · restored from persisted job state</p>
            </div>
          )}
          {workspace.freshness.state === "stale" && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>
                <strong>Historical run:</strong> {workspace.freshness.reasons.map(label).join(", ")}. Results remain readable, but a current comparison requires a new run.
              </span>
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {summary.map((item) => (
                  <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <item.icon size={17} className="text-[#008ad2]" />
                    <p className="mt-3 text-2xl font-extrabold text-slate-950">{item.value}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.label}</p>
                  </article>
                ))}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="font-extrabold text-slate-950">Vendor responses included</h2>
                  <ul className="mt-3 space-y-2">
                    {workspace.participants.map((participant) => (
                      <li key={participant.participantId} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                        <span className="font-extrabold text-slate-800">{participant.vendorLabel}</span>
                        <span className="text-slate-500">
                          {label(participant.status)} · version {participant.versionId.slice(0, 8)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="font-extrabold text-slate-950">Interpretation guardrails</h2>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    <li>• AI assessments summarize cited response evidence; they do not decide the procurement outcome.</li>
                    <li>• Missing or contradictory mandatory responses are review flags, not automatic disqualifications.</li>
                    <li>• Submitted pricing stays separate from normalized, comparable pricing.</li>
                    <li>• Human evaluator contributions are displayed exactly as persisted by the backend.</li>
                  </ul>
                </article>
              </div>
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
              <EmptyState title="Commercial values are sealed" text="This comparison manifest hides pricing. The API has omitted submitted totals, normalized totals, and line items." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {workspace.intelligence.commercial.map((item) => (
                  <article key={item.participantId} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-extrabold text-slate-950">{item.vendorLabel}</h2>
                        <p className="mt-1 text-xs text-slate-500">Submitted and normalized values remain distinct.</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${item.comparable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{item.comparable ? "Comparable" : "Not comparable"}</span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <dt className="text-[10px] font-extrabold uppercase text-slate-500">Vendor submitted</dt>
                        <dd className="mt-1 text-lg font-extrabold text-slate-950">{formatMoney(item.submittedTotal, item.submittedCurrency)}</dd>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <dt className="text-[10px] font-extrabold uppercase text-slate-500">Normalized comparison</dt>
                        <dd className="mt-1 text-lg font-extrabold text-slate-950">{item.comparable ? formatMoney(item.normalizedTotal, item.normalizedCurrency) : "Refused"}</dd>
                      </div>
                    </dl>
                    {item.refusalCodes.length ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Normalization refused: {item.refusalCodes.map(label).join(", ")}</p> : null}
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
          {tab === "risks" &&
            (workspace.intelligence.risks.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {workspace.intelligence.risks.map((risk) => (
                  <article key={risk.riskId} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${riskTone[risk.severity] ?? riskTone.low}`}>{label(risk.severity)}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{label(risk.category)}</span>
                    </div>
                    <h2 className="mt-3 font-extrabold text-slate-950">{risk.title}</h2>
                    <p className="mt-1 text-xs font-bold text-slate-500">{risk.vendorLabel}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{risk.basis}</p>
                    {risk.question && (
                      <div className="mt-3 rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-900">
                        <strong>Clarification candidate:</strong> {risk.question}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setSelection({
                          title: risk.title,
                          vendorLabel: risk.vendorLabel,
                          rationale: risk.basis,
                          evidence: risk.evidence,
                        })
                      }
                      className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-extrabold text-[#0077b6]"
                    >
                      Inspect {risk.evidence.length} citation
                      {risk.evidence.length === 1 ? "" : "s"}
                      <ChevronRight size={13} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No persisted risks" text="This comparison snapshot did not produce any evidence-backed risk flags." />
            ))}
          {tab === "evaluation" && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {workspace.intelligence.evaluation.map((item) => (
                  <article key={item.participantId} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="font-extrabold text-slate-950">{item.vendorLabel}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Human scoring recorded for this comparison. Vendors are shown in saved response order, not ranked.</p>
                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <dt className="text-[10px] font-extrabold uppercase text-slate-500">Contribution</dt>
                        <dd className="mt-1 text-xl font-extrabold text-slate-950">{item.weightedContributionTotal.toFixed(2)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-extrabold uppercase text-slate-500">Scores</dt>
                        <dd className="mt-1 text-xl font-extrabold text-slate-950">{item.submittedScores}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-extrabold uppercase text-slate-500">Evaluators</dt>
                        <dd className="mt-1 text-xl font-extrabold text-slate-950">
                          {item.completedEvaluatorCount}/{item.evaluatorCount}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-extrabold uppercase text-slate-500">Conflicts</dt>
                        <dd className="mt-1 text-xl font-extrabold text-slate-950">{item.conflictCount}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
              <DecisionWorkspace proposalId={proposalId} workspace={workspace} onChanged={setWorkspace} />
            </>
          )}
          {tab === "reports" && (
            <>
              <ExecutiveReport proposalId={proposalId} workspace={workspace} />
              {operationsBundle ? <ReportCenter proposalId={proposalId} runId={workspace.run.runId} initialBundle={operationsBundle} viewCommercial={workspace.intelligence.permissions.viewCommercial} /> : <div className="mt-4"><EmptyState title="Export options are temporarily unavailable" text="The in-app executive report remains available. Refresh before exporting a PDF, Excel workbook, or clarification pack." /></div>}
            </>
          )}
        </section>
        {selection && <EvidenceDrawer selection={selection} onClose={() => setSelection(undefined)} />}
        <p className="mt-6 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
          <History size={12} />
          Viewing comparison snapshot {currentRun?.run.runId ?? workspace.run.runId}; changing tabs keeps the same comparison.
        </p>
      </div>
    </main>
  );
}
