"use client";

import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import { criterionOriginLabel, explainScoreGap, formatSigned, type CriterionOrigin } from "@/lib/proposalIntelligence/scoreExplanation";
import { intelligenceSurfaceClasses } from "@/lib/proposalIntelligence/surfaces";
import { cn } from "@/lib/utils";
import { useState } from "react";

const originTone: Record<CriterionOrigin, string> = {
  human: "text-emerald-800",
  automated: "text-sky-900",
  mixed: "text-violet-800",
  unknown: "text-gray",
};

/**
 * "Why the scores differ": the leader against one other vendor, criterion by
 * criterion, with who set each score and RFPilot's reasoning in plain words.
 */
export default function ScoreGapExplanation({ workspace, className }: { workspace: ComparisonWorkspace; className?: string }) {
  const recommendation = workspace.recommendation;
  const leaderId = recommendation?.bestParticipantId ?? recommendation?.ranking.find((item) => item.eligible)?.participantId ?? null;
  const others = (recommendation?.ranking ?? []).filter((item) => item.participantId !== leaderId);
  const [rivalId, setRivalId] = useState<string | null>(null);
  if (!recommendation || !leaderId || others.length === 0) return null;
  const rival = others.find((item) => item.participantId === rivalId) ?? others[0];
  const explanation = explainScoreGap(workspace, leaderId, rival.participantId);

  return (
    <section className={cn(intelligenceSurfaceClasses.block, className)} aria-labelledby="score-gap-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="score-gap-title" className="text-sm font-extrabold text-navy">Why the scores differ</h3>
          <p className="mt-1 text-xs leading-5 text-gray">Each criterion&rsquo;s share of the total, for the leader against one other vendor.</p>
        </div>
        {others.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Compare the leader with">
            {others.map((item) => (
              <button
                key={item.participantId}
                type="button"
                aria-pressed={item.participantId === rival.participantId}
                onClick={() => setRivalId(item.participantId)}
                className={cn("min-h-8 rounded-full border px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand", item.participantId === rival.participantId ? "border-brand-dark bg-brand-dark text-white" : "border-gray-border text-navy")}
              >
                {item.vendorLabel}
              </button>
            ))}
          </div>
        )}
      </div>

      {!explanation ? (
        <p className="mt-3 text-sm leading-6 text-gray">This comparison did not save per-criterion scores for both vendors, so RFPilot cannot show where the totals come from. Run a new comparison to see that.</p>
      ) : (
        <>
          <p className="mt-3 text-sm font-bold leading-6 text-navy">{explanation.headline}{explanation.drivers ? ` ${explanation.drivers}` : ""}</p>
          {explanation.origins && <p className="mt-1 text-sm leading-6 text-gray">{explanation.origins}</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-extrabold uppercase tracking-wide text-gray">
                  <th scope="col" className="pb-2 pr-3 font-extrabold">Criterion</th>
                  <th scope="col" className="pb-2 pr-3 font-extrabold">Weight</th>
                  <th scope="col" className="pb-2 pr-3 font-extrabold">{explanation.leader.vendorLabel}</th>
                  <th scope="col" className="pb-2 pr-3 font-extrabold">{explanation.rival.vendorLabel}</th>
                  <th scope="col" className="pb-2 text-right font-extrabold">Difference</th>
                </tr>
              </thead>
              <tbody>
                {explanation.rows.map((row) => (
                  <tr key={row.criterionId} className="border-t border-gray-border align-top">
                    <th scope="row" className="py-2.5 pr-3 text-left font-bold text-navy">
                      {row.name}
                      {(row.leader.rationale || row.rival.rationale) && (
                        <details className="mt-1 font-normal">
                          <summary className="cursor-pointer text-xs font-bold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">Why these scores</summary>
                          <dl className="mt-1 space-y-1 text-xs leading-5 text-gray">
                            {row.leader.rationale && <div><dt className="inline font-bold text-navy">{explanation.leader.vendorLabel}: </dt><dd className="inline">{row.leader.rationale}</dd></div>}
                            {row.rival.rationale && <div><dt className="inline font-bold text-navy">{explanation.rival.vendorLabel}: </dt><dd className="inline">{row.rival.rationale}</dd></div>}
                          </dl>
                        </details>
                      )}
                    </th>
                    <td className="py-2.5 pr-3 tabular-nums text-gray">{row.weight.toFixed(0)}%</td>
                    <td className="py-2.5 pr-3">
                      <span className="tabular-nums font-bold text-navy">{row.leader.score.toFixed(2)} of {row.rubricMaximum}</span>
                      <span className="block text-xs tabular-nums text-gray">{row.leader.points.toFixed(2)} points</span>
                      <span className={cn("block text-xs font-bold", originTone[row.leader.origin])}>{criterionOriginLabel[row.leader.origin]}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="tabular-nums font-bold text-navy">{row.rival.score.toFixed(2)} of {row.rubricMaximum}</span>
                      <span className="block text-xs tabular-nums text-gray">{row.rival.points.toFixed(2)} points</span>
                      <span className={cn("block text-xs font-bold", originTone[row.rival.origin])}>{criterionOriginLabel[row.rival.origin]}</span>
                    </td>
                    <td className={cn("py-2.5 text-right tabular-nums font-extrabold", row.difference > 0.005 ? "text-emerald-800" : row.difference < -0.005 ? "text-rose-700" : "text-gray")}>{Math.abs(row.difference) < 0.005 ? "0.00" : formatSigned(row.difference)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-border font-extrabold text-navy">
                  <th scope="row" className="py-2.5 pr-3 text-left">Total</th>
                  <td className="py-2.5 pr-3 tabular-nums text-gray">100%</td>
                  <td className="py-2.5 pr-3 tabular-nums">{explanation.leader.total.toFixed(2)}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{explanation.rival.total.toFixed(2)}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatSigned(explanation.gap)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
