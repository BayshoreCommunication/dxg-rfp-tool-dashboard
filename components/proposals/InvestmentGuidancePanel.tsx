"use client";
import { useEffect, useState } from "react";
import {
  generateInvestmentGuidanceAction,
  getLatestInvestmentGuidanceAction,
  type InvestmentAncillary,
  type InvestmentLineItem,
  type InvestmentReport,
} from "@/app/actions/investment";

const money = (minor: number | null | undefined, currency: string | null) => {
  if (minor === null || minor === undefined || !currency) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toLocaleString()} ${currency}`;
  }
};

const ancillaryPresentation: Record<
  InvestmentAncillary["status"],
  { label: string; chip: string }
> = {
  estimated: { label: "Estimated", chip: "bg-emerald-100 text-emerald-800" },
  venue_dependent: { label: "Venue dependent", chip: "bg-amber-100 text-amber-800" },
  no_data: { label: "No data", chip: "bg-slate-100 text-slate-600" },
};

const Provenance = ({ item }: { item: InvestmentLineItem }) => {
  const drivers = Object.entries(item.provenance.drivers)
    .map(([name, quantity]) => `${quantity} ${name}`)
    .join(", ");
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-xs text-slate-500">Provenance</summary>
      <p className="mt-1 text-xs text-slate-500">
        {item.provenance.pricingRecordIds.length} approved pricing record
        {item.provenance.pricingRecordIds.length === 1 ? "" : "s"}
        {item.provenance.ruleIds.length > 0 &&
          ` · ${item.provenance.ruleIds.length} expert rule${item.provenance.ruleIds.length === 1 ? "" : "s"}`}
        {drivers && ` · scaled by ${drivers}`}
      </p>
    </details>
  );
};

export default function InvestmentGuidancePanel({ proposalId }: { proposalId: string }) {
  const [report, setReport] = useState<InvestmentReport>();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void getLatestInvestmentGuidanceAction(proposalId).then((result) => {
      if (!active) return;
      setLoading(false);
      // No report yet is a normal empty state, not an error.
      if (result.success) setReport(result.data);
      else if (result.code !== "INVESTMENT_GUIDANCE_NOT_FOUND") setError(result.message);
    });
    return () => {
      active = false;
    };
  }, [proposalId]);

  const run = async () => {
    setRunning(true);
    setError(undefined);
    const result = await generateInvestmentGuidanceAction(proposalId);
    setRunning(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setReport(result.data);
  };

  return (
    <section
      aria-labelledby="investment-guidance-title"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <h3 id="investment-guidance-title" className="text-lg font-semibold">
        Investment guidance
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        A defensible low / typical / high investment range built only from
        approved DXG pricing records and expert rules.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={running}
          onClick={() => void run()}
          className="flex items-center gap-2 rounded-lg bg-[#087f69] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running && (
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
            />
          )}
          {running ? "Generating…" : "Generate investment guidance"}
        </button>
        {loading && (
          <span role="status" className="text-sm text-slate-600">
            Loading the latest guidance…
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {!loading && !report && !error && (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Generate investment guidance to see a low / typical / high range for
          this event, with every number traced to its source.
        </p>
      )}
      {report && (
        <div className="mt-5 space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["Low", report.totalLowMinor],
                ["Typical", report.totalMidMinor],
                ["High", report.totalHighMinor],
              ] as const
            ).map(([label, minor]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {money(minor, report.currency)}
                </p>
              </div>
            ))}
          </div>

          {report.lineItems.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Line items</h4>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3 text-right">Low</th>
                      <th className="py-2 pr-3 text-right">Typical</th>
                      <th className="py-2 text-right">High</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.lineItems.map((item) => (
                      <tr key={item.category} className="border-b align-top">
                        <td className="py-2 pr-3">
                          <span className="font-medium text-slate-900">{item.label}</span>
                          <Provenance item={item} />
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {money(item.lowMinor, item.currency)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {money(item.midMinor, item.currency)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {money(item.highMinor, item.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.refusals.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Where we won&apos;t guess ({report.refusals.length})
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                These categories have no approved pricing data, so no number is
                shown — a fabricated estimate would be worse than none.
              </p>
              <ul className="mt-2 space-y-2">
                {report.refusals.map((refusal) => (
                  <li
                    key={refusal.category}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                  >
                    <p className="text-sm font-semibold text-amber-900">{refusal.reason}</p>
                    <p className="mt-1 text-sm text-amber-800">{refusal.ask}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.ancillary.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Ancillary factors</h4>
              <ul className="mt-2 space-y-2">
                {report.ancillary.map((factor) => {
                  const tone = ancillaryPresentation[factor.status];
                  return (
                    <li
                      key={factor.factor}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-200 p-3"
                    >
                      <span>
                        <span
                          className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${tone.chip}`}
                        >
                          {tone.label}
                        </span>
                        <span className="text-sm font-medium text-slate-900">{factor.factor}</span>
                        {factor.status === "estimated" ? (
                          <span className="ml-2 text-sm tabular-nums text-slate-700">
                            {money(factor.lowMinor ?? null, report.currency)} –{" "}
                            {money(factor.highMinor ?? null, report.currency)}
                          </span>
                        ) : (
                          <span className="mt-1 block text-xs text-slate-600">{factor.note}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {report.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Recommendations</h4>
              <ul className="mt-2 space-y-2">
                {report.recommendations.map((recommendation) => (
                  <li
                    key={recommendation.ruleKey}
                    className="rounded-lg border border-cyan-200 bg-cyan-50 p-4"
                  >
                    <p className="text-sm font-semibold text-slate-900">{recommendation.title}</p>
                    <p className="mt-1 text-sm text-slate-700">{recommendation.guidanceText}</p>
                    {recommendation.explanation && (
                      <p className="mt-1 text-xs text-slate-500">{recommendation.explanation}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            Every number traces to approved DXG pricing records and expert
            rules. Engine {report.engineVersion} ·{" "}
            {report.createdAt ? new Date(report.createdAt).toLocaleString() : ""}
          </p>
        </div>
      )}
    </section>
  );
}
