import type { ComparisonRequirement, ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import IntelligenceStatusChip from "@/components/proposalIntelligence/IntelligenceStatusChip";
import RerunComparisonButton from "@/components/proposalIntelligence/RerunComparisonButton";
import ScoreGapExplanation from "@/components/proposalIntelligence/ScoreGapExplanation";
import { comparisonCellId } from "@/lib/proposalIntelligence/anchors";
import { intelligenceSurfaceClasses } from "@/lib/proposalIntelligence/surfaces";
import { describeConfidenceReason, describeFreshnessReasons } from "@/lib/proposalIntelligence/plainLanguage";
import { cn } from "@/lib/utils";
import { ArrowRight, FileOutput, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

const readable = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

const requirementFor = (requirements: ComparisonRequirement[], participantId: string, verdicts: string[]) =>
  requirements.find((requirement) => requirement.vendors.some((vendor) => vendor.participantId === participantId && verdicts.includes(vendor.verdict)));

const assumptionText = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.map(([key, item]) => `${readable(key)}: ${typeof item === "object" ? JSON.stringify(item) : String(item)}`).join(" · ");
  }
  return "Unspecified commercial assumption";
};

export default function ProposalVerdict({ workspace, proposalId }: { workspace: ComparisonWorkspace; proposalId: string }) {
  const recommendation = workspace.recommendation;
  if (!recommendation) {
    return <section className={cn(intelligenceSurfaceClasses.card, "mt-5")} aria-labelledby="verdict-title"><p className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">Step 4 · Recommendation</p><div className="mt-2 flex flex-wrap items-center gap-3"><h2 id="verdict-title" className="text-2xl font-extrabold text-navy">No recommendation yet</h2><IntelligenceStatusChip status="unavailable" /></div><p className="mt-3 max-w-3xl text-sm leading-6 text-gray">This comparison did not produce a recommendation. RFPilot only names a leading vendor once the comparison has finished and must-pass requirements have been checked.</p></section>;
  }

  const leader = recommendation.bestParticipantId
    ? recommendation.ranking.find((vendor) => vendor.participantId === recommendation.bestParticipantId) ?? null
    : null;
  const strongest = recommendation.strongestParticipantIds.flatMap((id) => recommendation.ranking.find((vendor) => vendor.participantId === id) ?? []);
  const stale = workspace.freshness.state === "stale";
  const leaderEvidence = leader
    ? workspace.intelligence.requirements.filter((requirement) => requirement.vendors.some((vendor) => vendor.participantId === leader.participantId && ["addressed", "partially_addressed"].includes(vendor.verdict) && vendor.evidence.length > 0)).slice(0, 3)
    : [];
  const leaderGaps = leader
    ? workspace.intelligence.requirements.filter((requirement) => requirement.vendors.some((vendor) => vendor.participantId === leader.participantId && ["missing", "contradictory", "not_assessable"].includes(vendor.verdict))).slice(0, 3)
    : [];
  const leaderRisks = leader ? workspace.intelligence.risks.filter((risk) => risk.participantId === leader.participantId).slice(0, 3) : [];
  const commercial = leader ? workspace.intelligence.commercial.find((item) => item.participantId === leader.participantId) : null;
  const runners = recommendation.ranking.filter((vendor) => vendor.participantId !== leader?.participantId).slice(0, 3);

  // A stale result is history, not advice: say what it found, in the past tense.
  const verdict = recommendation.status === "no_eligible_vendor"
    ? (stale ? "Out-of-date result: no vendor met every must-pass requirement." : "No vendor currently meets every must-pass requirement.")
    : recommendation.status === "close_call"
      ? (stale
        ? `Out-of-date result: ${strongest.map((vendor) => vendor.vendorLabel).join(" and ")} were a close call.`
        : `${strongest.map((vendor) => vendor.vendorLabel).join(" and ")} are a close call; the evidence does not point to a single clear winner.`)
      : (stale
        ? `Out-of-date result: ${leader?.vendorLabel ?? "the leading vendor"} was the strongest fit when this ran.`
        : `${leader?.vendorLabel ?? "The leading vendor"} is the strongest fit in this comparison.`);

  return (
    <section className={cn(intelligenceSurfaceClasses.card, "mt-5")} aria-labelledby="verdict-title">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">Step 4 · Recommendation</p><h2 id="verdict-title" className="mt-2 text-2xl font-extrabold text-navy">{verdict}</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-gray">{recommendation.rationale}</p></div>
        <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
          <IntelligenceStatusChip status={stale ? "attention" : recommendation.status === "recommended" ? "complete" : "partial"} label={stale ? "Out of date" : recommendation.status === "close_call" ? "Close call" : readable(recommendation.status)} />
          {stale && <RerunComparisonButton proposalId={proposalId} className="min-h-11 px-5 text-sm" />}
        </div>
      </header>
      {stale && <div className={cn(intelligenceSurfaceClasses.block, "mt-5 bg-brand-muted")}><h3 className="text-sm font-extrabold text-navy">This result is out of date</h3><p className="mt-2 text-sm leading-6 text-gray">{describeFreshnessReasons(workspace.freshness.reasons) || "The proposal inputs changed after this comparison ran."} Run a new comparison before relying on it.</p><div className="mt-3"><RerunComparisonButton proposalId={proposalId} /></div></div>}
      {recommendation.ranking.length > 1 && <ScoreGapExplanation workspace={workspace} className="mt-5" />}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className={intelligenceSurfaceClasses.block}><h3 className="text-sm font-extrabold text-navy">Strongest evidence for the leader</h3>{leaderEvidence.length ? <ul className="mt-3 space-y-3">{leaderEvidence.map((requirement) => { const assessment = requirement.vendors.find((vendor) => vendor.participantId === leader?.participantId)!; return <li key={requirement.requirementId}><a href={`#${comparisonCellId(requirement.requirementId, assessment.participantId)}`} className="group block rounded-xl bg-gray-panel p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><span className="flex items-start justify-between gap-3 text-sm font-extrabold text-navy">{requirement.title}<ArrowRight size={15} className="shrink-0 text-brand" aria-hidden="true" /></span><span className="mt-1 block text-xs leading-5 text-gray">{assessment.rationale} · {assessment.evidence.length} cited {assessment.evidence.length === 1 ? "source" : "sources"}</span></a></li>; })}</ul> : <p className="mt-3 text-sm leading-6 text-gray">No single leader has requirement coverage backed by quoted evidence, so no vendor is endorsed here.</p>}</article>

        <article className={intelligenceSurfaceClasses.block}><h3 className="text-sm font-extrabold text-navy">Items to review before final decision</h3><ul className="mt-3 space-y-2">{recommendation.confidenceReasons.length ? recommendation.confidenceReasons.map((reason) => <li key={reason} className="rounded-xl bg-gray-panel p-3 text-sm leading-6 text-gray">{describeConfidenceReason(reason)}</li>) : <li className="rounded-xl bg-gray-panel p-3 text-sm text-gray">No additional recommendation review items are recorded.</li>}</ul></article>

        <article className={intelligenceSurfaceClasses.block}><h3 className="text-sm font-extrabold text-navy">Runners-up and exclusions</h3>{runners.length ? <ol className="mt-3 space-y-3">{runners.map((vendor) => { const gap = requirementFor(workspace.intelligence.requirements, vendor.participantId, ["missing", "contradictory", "not_assessable"]); const reason = !vendor.eligible ? `Missed ${vendor.eligibilityFailures} must-pass ${vendor.eligibilityFailures === 1 ? "requirement" : "requirements"}` : leader ? `${Math.max(0, leader.score - vendor.score).toFixed(2)} points behind the leader` : `${vendor.score.toFixed(2)} points`; return <li key={vendor.participantId} className="rounded-xl bg-gray-panel p-3"><p className="text-sm font-extrabold text-navy">{vendor.rank ? `#${vendor.rank} ` : ""}{vendor.vendorLabel}</p><p className="mt-1 text-xs leading-5 text-gray">{[reason,
      vendor.mandatoryGaps > 0 ? `${vendor.mandatoryGaps} mandatory gap${vendor.mandatoryGaps === 1 ? "" : "s"}` : null,
      vendor.highRisks > 0 ? `${vendor.highRisks} high risk${vendor.highRisks === 1 ? "" : "s"}` : null,
      vendor.unresolvedReviews > 0 ? `${vendor.unresolvedReviews} unresolved review${vendor.unresolvedReviews === 1 ? "" : "s"}` : null,
    ].filter(Boolean).join(" · ")}</p>{gap && <a href={`#${comparisonCellId(gap.requirementId, vendor.participantId)}`} className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Open a limiting requirement <ArrowRight size={13} aria-hidden="true" /></a>}</li>; })}</ol> : <p className="mt-3 text-sm text-gray">No ranked runner-up is stored.</p>}</article>

        <article className={intelligenceSurfaceClasses.block}><h3 className="text-sm font-extrabold text-navy">Risks, gaps, and assumptions</h3>{leaderGaps.length === 0 && leaderRisks.length === 0 && !commercial?.assumptions.length ? <p className="mt-3 text-sm leading-6 text-gray">No leader-specific gaps, risks, or commercial assumptions were stored. This does not prove that none exist.</p> : <div className="mt-3 space-y-4">{leaderGaps.length > 0 && <div><h4 className="text-xs font-extrabold uppercase tracking-wide text-gray">Requirement gaps</h4><ul className="mt-2 space-y-2">{leaderGaps.map((requirement) => <li key={requirement.requirementId}><a href={`#${comparisonCellId(requirement.requirementId, leader!.participantId)}`} className="text-sm font-bold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">{requirement.title}</a></li>)}</ul></div>}{leaderRisks.length > 0 && <div><h4 className="text-xs font-extrabold uppercase tracking-wide text-gray">Recorded risks</h4><ul className="mt-2 space-y-2">{leaderRisks.map((risk) => <li key={risk.riskId} className="text-sm text-gray">{risk.requirementId ? <a href={`#${comparisonCellId(risk.requirementId, risk.participantId)}`} className="font-bold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">{risk.title}</a> : <span className="font-bold text-navy">{risk.title}</span>} · {readable(risk.severity)} · {risk.basis}</li>)}</ul></div>}{commercial?.assumptions.length ? <div><h4 className="text-xs font-extrabold uppercase tracking-wide text-gray">Commercial assumptions</h4><ul className="mt-2 space-y-2">{commercial.assumptions.map((assumption, index) => <li key={`${index}-${assumptionText(assumption)}`} className="text-sm text-gray">{assumptionText(assumption)}</li>)}</ul></div> : null}</div>}</article>
      </div>

      <footer className="mt-5 border-t border-gray-border pt-5"><h3 className="text-sm font-extrabold text-navy">Other things you can do</h3><div className="mt-3 flex flex-wrap gap-2"><Link href={`/proposals/${proposalId}/intelligence/comparisons/${workspace.run.runId}/reports`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-border px-4 text-xs font-extrabold text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><FileOutput size={15} aria-hidden="true" />Export comparison</Link><a href="#reweighting-title" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-border px-4 text-xs font-extrabold text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><SlidersHorizontal size={15} aria-hidden="true" />Adjust criteria</a></div><p className="mt-3 text-xs leading-5 text-gray">This recommendation is calculated from the stored scores and evidence above &mdash; nothing here is generated on the fly.</p></footer>
    </section>
  );
}
