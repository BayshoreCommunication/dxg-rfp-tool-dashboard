"use client";

import type { ComparisonWorkspace } from "@/app/actions/comparisonOrchestration";
import { criterionOriginLabel, explainScoreGap, formatSigned, type CriterionOrigin, type ScoreGapRow } from "@/lib/proposalIntelligence/scoreExplanation";
import { intelligenceSurfaceClasses } from "@/lib/proposalIntelligence/surfaces";
import { cn } from "@/lib/utils";
import { useState } from "react";

const originTone: Record<CriterionOrigin, string> = {
  human: "text-emerald-800",
  automated: "text-sky-900",
  mixed: "text-violet-800",
  unknown: "text-gray",
};

/** One score: the number, and a bar so the eye can compare without reading. */
function ScoreCell({ value, max, origin, showOrigin, leading }: { value: number; max: number; origin: CriterionOrigin; showOrigin: boolean; leading: boolean }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <td className="py-3 pr-4 align-top">
      <span className={cn("tabular-nums text-base font-extrabold", leading ? "text-navy" : "text-slate-600")}>{value.toFixed(1)}</span>
      <span className="text-xs text-gray"> out of {max}</span>
      <span className="mt-1.5 block h-1.5 w-full max-w-[9rem] overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <span className={cn("block h-full rounded-full", leading ? "bg-brand-dark" : "bg-slate-400")} style={{ width: `${ratio * 100}%` }} />
      </span>
      {showOrigin && <span className={cn("mt-1 block text-[11px] font-bold", originTone[origin])}>{criterionOriginLabel[origin]}</span>}
    </td>
  );
}

const gapTone = (difference: number) =>
  difference > 0.005 ? "text-emerald-800" : difference < -0.005 ? "text-rose-700" : "text-gray";

/**
 * "Why the scores differ": the leader against one other vendor, area by
 * area, in words a first-time reader can follow. Points arithmetic stays out
 * of the cells; the gap column carries it.
 */
export default function ScoreGapExplanation({ workspace, className }: { workspace: ComparisonWorkspace; className?: string }) {
  const recommendation = workspace.recommendation;
  const leaderId = recommendation?.bestParticipantId ?? recommendation?.ranking.find((item) => item.eligible)?.participantId ?? null;
  const others = (recommendation?.ranking ?? []).filter((item) => item.participantId !== leaderId);
  const [rivalId, setRivalId] = useState<string | null>(null);
  if (!recommendation || !leaderId || others.length === 0) return null;
  const rival = others.find((item) => item.participantId === rivalId) ?? others[0];
  const explanation = explainScoreGap(workspace, leaderId, rival.participantId);
  // When every score has the same origin the sentence above the table says
  // so once; repeating it in every cell only adds noise.
  const showOrigins = explanation ? new Set(explanation.rows.flatMap((row: ScoreGapRow) => [row.leader.origin, row.rival.origin])).size > 1 : false;

  return (
    <section className={cn(intelligenceSurfaceClasses.block, className)} aria-labelledby="score-gap-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="score-gap-title" className="text-sm font-extrabold text-navy">Why the scores differ</h3>
          <p className="mt-1 text-sm leading-6 text-gray">Each area you chose to score, how much it counts towards the total, and how each vendor did in it. The areas that separate the two vendors most are listed first.</p>
        </div>
        {others.length > 1 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Compare the leader with">
            {others.map((item) => (
              <button
                key={item.participantId}
                type="button"
                aria-pressed={item.participantId === rival.participantId}
                onClick={() => setRivalId(item.participantId)}
                className={cn("min-h-8 rounded-full border px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand", item.participantId === rival.participantId ? "border-brand-dark bg-brand-dark text-white" : "border-gray-border text-navy hover:bg-slate-50")}
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
                  <th scope="col" className="pb-2 pr-4 font-extrabold">Area</th>
                  <th scope="col" className="pb-2 pr-4 font-extrabold">Counts for</th>
                  <th scope="col" className="pb-2 pr-4 font-extrabold">{explanation.leader.vendorLabel}</th>
                  <th scope="col" className="pb-2 pr-4 font-extrabold">{explanation.rival.vendorLabel}</th>
                  <th scope="col" className="pb-2 text-right font-extrabold">Gap</th>
                </tr>
              </thead>
              <tbody>
                {explanation.rows.map((row) => {
                  const level = Math.abs(row.difference) < 0.005;
                  return (
                    <tr key={row.criterionId} className="border-t border-gray-border">
                      <th scope="row" className="py-3 pr-4 text-left align-top font-bold text-navy">
                        {row.name}
                        {(row.leader.rationale || row.rival.rationale) && (
                          <details className="mt-1 font-normal">
                            <summary className="cursor-pointer text-xs font-bold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">What is behind this</summary>
                            <dl className="mt-1 space-y-1 text-xs leading-5 text-gray">
                              {row.leader.rationale && <div><dt className="inline font-bold text-navy">{explanation.leader.vendorLabel}: </dt><dd className="inline">{row.leader.rationale}</dd></div>}
                              {row.rival.rationale && <div><dt className="inline font-bold text-navy">{explanation.rival.vendorLabel}: </dt><dd className="inline">{row.rival.rationale}</dd></div>}
                            </dl>
                          </details>
                        )}
                      </th>
                      <td className="py-3 pr-4 align-top tabular-nums text-gray">{row.weight.toFixed(0)}% of total</td>
                      <ScoreCell value={row.leader.score} max={row.rubricMaximum} origin={row.leader.origin} showOrigin={showOrigins} leading={row.difference > 0.005} />
                      <ScoreCell value={row.rival.score} max={row.rubricMaximum} origin={row.rival.origin} showOrigin={showOrigins} leading={row.difference < -0.005} />
                      <td className={cn("py-3 text-right align-top tabular-nums", level ? "text-gray" : cn("font-extrabold", gapTone(row.difference)))}>
                        {level ? "Level" : formatSigned(row.difference)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-border font-extrabold text-navy">
                  <th scope="row" className="py-3 pr-4 text-left">Total</th>
                  <td className="py-3 pr-4 tabular-nums text-gray">100%</td>
                  <td className="py-3 pr-4 tabular-nums">{explanation.leader.total.toFixed(2)} <span className="text-xs font-normal text-gray">out of 100</span></td>
                  <td className="py-3 pr-4 tabular-nums">{explanation.rival.total.toFixed(2)} <span className="text-xs font-normal text-gray">out of 100</span></td>
                  <td className={cn("py-3 text-right tabular-nums", gapTone(explanation.gap))}>{formatSigned(explanation.gap)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-5 text-gray">Gap is the leader&rsquo;s points minus the other vendor&rsquo;s, after each area&rsquo;s share of the total is applied. A positive number favours the leader.</p>
        </>
      )}
    </section>
  );
}
