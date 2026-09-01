"use client";

import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import IntelligenceStatusChip from "@/components/proposalIntelligence/IntelligenceStatusChip";
import { intelligenceSurfaceClasses } from "@/lib/proposalIntelligence/surfaces";
import {
  canReweight,
  initialCriterionWeights,
  rankWithWeights,
  rebalanceWeights,
} from "@/lib/proposalIntelligence/reweighting";
import { cn } from "@/lib/utils";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

export default function ProposalReweighting({ workspace }: { workspace: ComparisonWorkspace }) {
  const original = useMemo(() => initialCriterionWeights(workspace), [workspace]);
  const [weights, setWeights] = useState(original);
  const available = canReweight(workspace);
  const ranking = useMemo(() => available ? rankWithWeights(workspace, weights) : [], [available, weights, workspace]);

  return (
    <section className={cn(intelligenceSurfaceClasses.card, "mt-5")} aria-labelledby="reweighting-title">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">Comparison controls</p><h2 id="reweighting-title" className="mt-2 text-2xl font-extrabold text-navy">Try different priorities</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-gray">See how the ranking would change if some criteria mattered more. This is a sandbox: vendors that miss a must-pass requirement stay excluded, and nothing here changes the approved weights or the official recommendation.</p></div><IntelligenceStatusChip status={available ? "complete" : "unavailable"} label={available ? "Available" : "Not available for this run"} /></header>
      {!available ? (
        <div className={cn(intelligenceSurfaceClasses.block, "mt-5 bg-gray-panel")}><h3 className="text-sm font-extrabold text-navy">Not available for this comparison</h3><p className="mt-2 text-sm leading-6 text-gray">This older comparison only saved each vendor&rsquo;s total score, not the per-criterion detail needed for what-if rankings. Run a new comparison to enable this.</p></div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className={intelligenceSurfaceClasses.block}>
            <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-extrabold text-navy"><SlidersHorizontal size={16} aria-hidden="true" /> Criterion weights</h3><button type="button" onClick={() => setWeights(original)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-gray-border px-3 text-xs font-bold text-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><RotateCcw size={13} aria-hidden="true" /> Reset</button></div>
            <div className="mt-4 space-y-4">{weights.map((criterion) => <label key={criterion.criterionId} className="block"><span className="flex items-center justify-between gap-3 text-sm"><span className="font-bold text-navy">{criterion.name}</span><span className="font-mono font-extrabold text-brand-dark">{criterion.weight.toFixed(1)}%</span></span><input aria-label={`${criterion.name} weight`} type="range" min="0" max="100" step="1" value={Math.round(criterion.weight)} onChange={(event) => setWeights((current) => rebalanceWeights(current, criterion.criterionId, Number(event.target.value)))} className="mt-2 w-full accent-brand" /></label>)}</div>
            <p className="mt-4 font-mono text-xs text-gray">Total {weights.reduce((total, item) => total + item.weight, 0).toFixed(1)}% · Other criteria rebalance proportionally.</p>
          </div>
          <div className={intelligenceSurfaceClasses.block}><h3 className="text-sm font-extrabold text-navy">What-if ranking</h3><ol className="mt-3 space-y-2">{ranking.map((vendor, index) => <li key={vendor.participantId} className={cn(intelligenceSurfaceClasses.block, "bg-gray-panel p-3")}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-navy">{vendor.eligible ? `#${index + 1} ` : ""}{vendor.vendorLabel}</p><p className="mt-1 text-xs text-gray">{vendor.eligible ? "Meets all must-pass requirements" : "Excluded — missed a must-pass requirement"}</p></div><span className="font-mono text-lg font-extrabold text-brand-dark">{vendor.score.toFixed(2)}</span></div><details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Score inputs</summary><ul className="mt-2 space-y-1 font-mono text-xs text-gray">{vendor.breakdown.map((item) => <li key={item.criterionId}>{item.name}: {item.meanScore.toFixed(2)}/{item.rubricMaximum.toFixed(2)} × {item.weight.toFixed(1)}% = {item.contribution.toFixed(2)}</li>)}</ul></details></li>)}</ol></div>
        </div>
      )}
    </section>
  );
}
