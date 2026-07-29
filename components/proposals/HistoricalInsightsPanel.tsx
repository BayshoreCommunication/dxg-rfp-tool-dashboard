"use client";

import {
  generateHistoricalInsightsAction,
  getLatestHistoricalInsightsAction,
  type HistoricalInsightsReport,
} from "@/app/actions/historicalInsights";
import { getProposalsAction } from "@/app/actions/proposals";
import { useEffect, useMemo, useState } from "react";

type ProposalOption = { id: string; label: string; updatedAt: string };

const statusLabel: Record<string, string> = {
  exists_in_both: "In both",
  reference_only: "Reference only",
  current_only: "Current only",
  not_present: "Not present",
};

export default function HistoricalInsightsPanel({
  proposalId,
}: {
  proposalId: string;
}) {
  const [options, setOptions] = useState<ProposalOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [report, setReport] = useState<HistoricalInsightsReport>();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void Promise.all([
      getProposalsAction({
        archived: false,
        isCopy: false,
        page: 1,
        limit: 50,
        sortBy: "updatedAt",
        sortOrder: "desc",
      }),
      getLatestHistoricalInsightsAction(proposalId),
    ]).then(([proposalsResult, reportResult]) => {
      if (!active) return;
      if (proposalsResult.success && Array.isArray(proposalsResult.data)) {
        setOptions(
          proposalsResult.data.flatMap((item) => {
            if (!item || typeof item !== "object") return [];
            const proposal = item as Record<string, unknown>;
            const event =
              proposal.event && typeof proposal.event === "object"
                ? (proposal.event as Record<string, unknown>)
                : {};
            const id = String(proposal._id || "");
            if (!id || id === proposalId) return [];
            return [{
              id,
              label:
                typeof event.eventName === "string" && event.eventName.trim()
                  ? event.eventName.trim()
                  : "Untitled proposal",
              updatedAt:
                typeof proposal.updatedAt === "string" ? proposal.updatedAt : "",
            }];
          }),
        );
      } else if (!proposalsResult.success) {
        setError(proposalsResult.message || "Historical proposals could not be loaded.");
      }
      if (reportResult.success) setReport(reportResult.data);
      else if (reportResult.code !== "HISTORICAL_INSIGHTS_NOT_FOUND")
        setError(reportResult.message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [proposalId]);

  const selectedLabels = useMemo(
    () => selected.map((id) => options.find((option) => option.id === id)?.label).filter(Boolean),
    [options, selected],
  );

  const toggle = (id: string) => {
    setSelected((existing) =>
      existing.includes(id)
        ? existing.filter((item) => item !== id)
        : existing.length < 5
          ? [...existing, id]
          : existing,
    );
  };

  const compare = async () => {
    if (!selected.length) {
      setError("Select at least one historical proposal.");
      return;
    }
    setRunning(true);
    setError(undefined);
    const result = await generateHistoricalInsightsAction(proposalId, selected);
    setRunning(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setReport(result.data);
  };

  return (
    <section
      aria-labelledby="historical-insights-title"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <h3 id="historical-insights-title" className="text-lg font-semibold text-slate-900">
        Learn from selected proposals
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Compare planning structure with proposals you explicitly select. No
        values are copied, and client details and exact pricing stay excluded.
      </p>

      {loading ? (
        <p role="status" className="mt-4 text-sm text-slate-600">
          Loading available references…
        </p>
      ) : options.length ? (
        <details className="mt-4 rounded-lg border border-slate-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
            Select references ({selected.length}/5)
          </summary>
          <fieldset className="max-h-56 space-y-1 overflow-y-auto border-t border-slate-200 p-3">
            <legend className="sr-only">Historical proposals</legend>
            {options.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.id)}
                  disabled={!selected.includes(option.id) && selected.length >= 5}
                  onChange={() => toggle(option.id)}
                  className="h-4 w-4 rounded border-slate-300 text-[#087f69]"
                />
                <span className="min-w-0 flex-1 truncate text-slate-800">
                  {option.label}
                </span>
                {option.updatedAt && (
                  <span className="text-xs text-slate-500">
                    {new Date(option.updatedAt).toLocaleDateString("en-US")}
                  </span>
                )}
              </label>
            ))}
          </fieldset>
        </details>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          No other active proposals are available as references.
        </p>
      )}

      {selectedLabels.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          Selected: {selectedLabels.join(", ")}
        </p>
      )}
      <button
        type="button"
        disabled={running || selected.length === 0}
        onClick={() => void compare()}
        className="mt-3 rounded-lg bg-[#087f69] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running ? "Comparing…" : "Compare selected proposals"}
      </button>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {report && (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-slate-700">
            <strong>{report.insights.length} planning ideas</strong> from{" "}
            {report.references.length} explicitly selected{" "}
            {report.references.length === 1 ? "reference" : "references"}.
            Historical patterns are not current-event facts.
          </div>
          <details open className="rounded-lg border border-slate-200">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
              Section comparison
            </summary>
            <ul className="divide-y divide-slate-100 border-t border-slate-200">
              {report.comparisons
                .filter((item) => item.status !== "not_present")
                .map((comparison) => (
                  <li key={comparison.section} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{comparison.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{comparison.detail}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {statusLabel[comparison.status]}
                    </span>
                  </li>
                ))}
            </ul>
          </details>
          <ul className="space-y-2" aria-label="Historical planning insights">
            {report.insights.map((insight) => (
              <li key={insight.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    {insight.applicability === "may_apply" ? "May apply" : "Confirm"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{insight.detail}</p>
                {insight.question && (
                  <p className="mt-2 text-xs font-medium text-slate-700">
                    Ask: {insight.question}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-slate-500">
                  Source:{" "}
                  {insight.provenance
                    .map((source) => `${source.referenceKey} · v${source.proposalVersion}`)
                    .join(", ")}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            Read-only comparison · no automatic field copy ·{" "}
            {report.analysisVersion}
          </p>
        </div>
      )}
    </section>
  );
}
