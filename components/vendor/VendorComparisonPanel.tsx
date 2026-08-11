"use client";

import { useMemo, useState } from "react";
import { BarChart3, ChevronDown, RefreshCw, ShieldCheck } from "lucide-react";

import type { VendorResponseItem } from "@/app/actions/vendorResponse";
import {
  getLatestVendorAnalysisAction,
  type VendorAnalysisResult,
} from "@/app/actions/vendorAnalysis";

type ComparedResponse = {
  response: VendorResponseItem;
  analysis?: VendorAnalysisResult;
  unavailable?: string;
};

export const scoreVendorAnalysis = (analysis: VendorAnalysisResult): number | null => {
  const verdictValue = { addressed: 100, partial: 50, missing: 0 } as const;
  const rated = analysis.findings.filter(
    (finding) =>
      finding.kind === "compliance" &&
      finding.verdict !== null &&
      finding.verdict in verdictValue,
  );
  if (rated.length === 0) return null;
  const weighted = rated.reduce(
    (result, finding) => {
      const confidence = Math.max(0.25, Math.min(1, finding.confidence || 0));
      const value = verdictValue[finding.verdict as keyof typeof verdictValue];
      return {
        total: result.total + value * confidence,
        weight: result.weight + confidence,
      };
    },
    { total: 0, weight: 0 },
  );
  return Math.round(weighted.total / weighted.weight);
};

export default function VendorComparisonPanel({
  responses,
  proposalId,
}: {
  responses: VendorResponseItem[];
  proposalId: string;
}) {
  const candidates = useMemo(
    () => responses.filter((response) => response.proposalId === proposalId),
    [proposalId, responses],
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compared, setCompared] = useState<ComparedResponse[]>([]);

  if (
    process.env.NEXT_PUBLIC_VENDOR_ANALYSIS_ENABLED !== "true" ||
    process.env.NEXT_PUBLIC_VENDOR_ANALYSIS_VISIBLE !== "true"
  ) return null;

  const loadComparison = async () => {
    setLoading(true);
    const rows = await Promise.all(
      candidates.map(async (response): Promise<ComparedResponse> => {
        const result = await getLatestVendorAnalysisAction(response._id, response.proposalId);
        return result.success
          ? { response, analysis: result.data }
          : { response, unavailable: result.message };
      }),
    );
    setCompared(rows);
    setLoading(false);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && compared.length === 0 && candidates.length > 0) void loadComparison();
  };

  return (
    <section className="mb-5 rounded-2xl border border-violet-200 bg-violet-50/70 p-4" aria-labelledby="vendor-comparison-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="vendor-comparison-title" className="flex items-center gap-2 text-sm font-extrabold text-violet-950">
            <BarChart3 size={17} aria-hidden="true" /> Compare vendor responses
          </h3>
          <p className="mt-1 text-xs leading-5 text-violet-800">
            Summarize analyzed responses for this proposal with a transparent, confidence-weighted readiness score.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-300 bg-white px-4 text-xs font-extrabold text-violet-800 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
          {open ? "Hide comparison" : "Compare analyzed vendors"}
          <ChevronDown size={15} className={open ? "rotate-180" : ""} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className="mt-4 border-t border-violet-200 pt-4">
          {loading ? (
            <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-800">
              <RefreshCw size={15} className="animate-spin" aria-hidden="true" /> Loading the latest analyses…
            </p>
          ) : candidates.length < 2 ? (
            <p className="rounded-xl bg-white p-3 text-sm text-violet-900">
              At least two responses to the same proposal are needed for a comparison.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-violet-200 bg-white">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-violet-100/70 text-[11px] uppercase tracking-wide text-violet-900">
                  <tr>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Readiness</th>
                    <th className="px-4 py-3">Addressed</th>
                    <th className="px-4 py-3">Partial</th>
                    <th className="px-4 py-3">Missing</th>
                    <th className="px-4 py-3">Review flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {compared.map(({ response, analysis, unavailable }) => {
                    const compliance = analysis?.findings.filter((finding) => finding.kind === "compliance") ?? [];
                    const count = (verdict: string) => compliance.filter((finding) => finding.verdict === verdict).length;
                    const score = analysis ? scoreVendorAnalysis(analysis) : null;
                    const flags = analysis?.findings.filter((finding) => finding.needsHumanReview).length ?? 0;
                    return (
                      <tr key={response._id}>
                        <td className="px-4 py-3 font-bold text-slate-900">{response.vendorName}</td>
                        <td className="px-4 py-3">
                          {score === null ? <span className="text-xs text-slate-500">{unavailable || "Run analysis first"}</span> : <span className="text-lg font-extrabold text-violet-800">{score}<span className="text-xs">/100</span></span>}
                        </td>
                        <td className="px-4 py-3 text-emerald-700">{count("addressed")}</td>
                        <td className="px-4 py-3 text-amber-700">{count("partial")}</td>
                        <td className="px-4 py-3 text-red-700">{count("missing")}</td>
                        <td className="px-4 py-3">{flags}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-violet-800">
            <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            Decision support only. Scores come from addressed, partial, and missing requirement verdicts weighted by AI confidence; your approved evaluation matrix and human review remain authoritative.
          </p>
        </div>
      )}
    </section>
  );
}
