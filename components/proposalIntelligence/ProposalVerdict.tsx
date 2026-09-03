import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import IntelligenceStatusChip from "@/components/proposalIntelligence/IntelligenceStatusChip";
import RerunComparisonButton from "@/components/proposalIntelligence/RerunComparisonButton";
import ScoreGapExplanation from "@/components/proposalIntelligence/ScoreGapExplanation";
import { intelligenceSurfaceClasses } from "@/lib/proposalIntelligence/surfaces";
import { describeFreshnessReasons } from "@/lib/proposalIntelligence/plainLanguage";
import { cn } from "@/lib/utils";
import { FileOutput, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

const readable = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

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


      <footer className="mt-5 border-t border-gray-border pt-5"><h3 className="text-sm font-extrabold text-navy">Other things you can do</h3><div className="mt-3 flex flex-wrap gap-2"><Link href={`/proposals/${proposalId}/intelligence/comparisons/${workspace.run.runId}/reports`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-border px-4 text-xs font-extrabold text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><FileOutput size={15} aria-hidden="true" />Export comparison</Link><a href="#reweighting-title" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-border px-4 text-xs font-extrabold text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><SlidersHorizontal size={15} aria-hidden="true" />Adjust criteria</a></div><p className="mt-3 text-xs leading-5 text-gray">This recommendation is calculated from the stored scores and evidence above &mdash; nothing here is generated on the fly.</p></footer>
    </section>
  );
}
