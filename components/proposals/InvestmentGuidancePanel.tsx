"use client";
import { useEffect, useState } from "react";
import {
  generateInvestmentGuidanceAction,
  getLatestInvestmentGuidanceAction,
  type InvestmentAncillary,
  type InvestmentAssumption,
  type InvestmentBasis,
  type InvestmentConfidence,
  type InvestmentLineItem,
  type InvestmentReport,
  type InvestmentScenario,
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

const factorText = (factor: number) => `×${factor.toFixed(2)}`;

const ancillaryPresentation: Record<
  InvestmentAncillary["status"],
  { label: string; chip: string }
> = {
  estimated: { label: "Estimated", chip: "bg-emerald-100 text-emerald-800" },
  venue_dependent: { label: "Venue dependent", chip: "bg-amber-100 text-amber-800" },
  no_data: { label: "No data", chip: "bg-slate-100 text-slate-600" },
};

const confidencePresentation: Record<
  InvestmentConfidence["band"],
  { label: string; chip: string }
> = {
  high: { label: "High", chip: "bg-emerald-100 text-emerald-800" },
  medium: { label: "Medium", chip: "bg-amber-100 text-amber-800" },
  low: { label: "Low", chip: "bg-rose-100 text-rose-800" },
};

// The engine's condition keys, said the way a producer would say them.
const unionLabels: Record<string, string> = {
  non_union_baseline: "non-union",
  union_light: "union (light)",
  union_standard: "union standard",
  union_heavy_nyc_chicago_sf: "union (heavy jurisdiction)",
};
const inHouseLabels: Record<string, string> = {
  outside_independent_av_baseline: "outside AV",
  hotel_in_house_typical: "venue in-house AV",
};
const humanizeKey = (key: string) => key.replace(/_/g, " ").trim();
// A neutral 1.0 multiplier is noise: name the choice, print the number only when it moves the range.
const withFactor = (label: string, factor: number) =>
  factor === 1 ? label : `${label} ${factorText(factor)}`;

/** "Chicago ×1.20 · union standard ×1.40 · outside AV · 3 show days (equipment ×1.80)" */
const basisSummary = (basis: InvestmentBasis): string => {
  const parts: string[] = [];
  if (basis.market) parts.push(withFactor(basis.market, basis.regionalFactor));
  if (basis.unionKey)
    parts.push(withFactor(unionLabels[basis.unionKey] ?? humanizeKey(basis.unionKey), basis.unionFactor));
  if (basis.inHouseKey)
    parts.push(
      withFactor(inHouseLabels[basis.inHouseKey] ?? humanizeKey(basis.inHouseKey), basis.inHouseFactor),
    );
  if (basis.serviceChargeFactor !== 1)
    parts.push(`service charge ${factorText(basis.serviceChargeFactor)}`);
  if (basis.days >= 1)
    parts.push(
      `${basis.days} show day${basis.days === 1 ? "" : "s"}` +
        (basis.multiDayFactor !== 1 ? ` (equipment ${factorText(basis.multiDayFactor)})` : ""),
    );
  return parts.join(" · ");
};

const ConfidenceHeader = ({ confidence }: { confidence: InvestmentConfidence }) => {
  const tone = confidencePresentation[confidence.band];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone.chip}`}>
          {tone.label} confidence — {confidence.score}/100
        </span>
        {confidence.deductions.length === 0 && (
          <span className="text-xs text-slate-500">No missing pricing-critical inputs.</span>
        )}
      </div>
      {confidence.deductions.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {confidence.deductions.map((deduction) => (
            <li
              key={deduction.ruleKey || deduction.label}
              title={deduction.reason || undefined}
              className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600"
            >
              {deduction.label} −{deduction.deduction}
            </li>
          ))}
        </ul>
      )}
      {confidence.note &&
        (confidence.band === "low" ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-900">
            {confidence.note}
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-600">{confidence.note}</p>
        ))}
    </div>
  );
};

const ScenarioStrip = ({
  scenarios,
  currency,
}: {
  scenarios: InvestmentScenario[];
  currency: string | null;
}) => (
  <div>
    <h4 className="text-sm font-semibold text-slate-900">Scenarios</h4>
    <p className="mt-1 text-xs text-slate-500">
      Alternative labor and AV-provider stacks for the same scope — compare them,
      don&apos;t add them up.
    </p>
    <ul className="mt-2 grid gap-2 sm:grid-cols-3">
      {scenarios.map((scenario) => (
        <li
          key={scenario.key}
          title={`${money(scenario.lowMinor, currency)} – ${money(scenario.highMinor, currency)}`}
          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {scenario.label}
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
            {money(scenario.midMinor, currency)}
          </p>
          <p className="text-xs tabular-nums text-slate-500">
            {money(scenario.lowMinor, currency)} – {money(scenario.highMinor, currency)}
          </p>
          {scenario.basis && <p className="mt-1 text-xs text-slate-500">{scenario.basis}</p>}
        </li>
      ))}
    </ul>
  </div>
);

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
      {item.appliedFactors.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-1">
          {item.appliedFactors.map((factor) => (
            <li
              key={`${factor.kind}-${factor.label}`}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
            >
              {factor.label} {factorText(factor.factor)}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
};

const Assumptions = ({ assumptions }: { assumptions: InvestmentAssumption[] }) => {
  // The engine prefixes implied components with "implied_"; everything else is a
  // documented planning default rather than a scope decision.
  const implied = assumptions.filter((assumption) => assumption.key.startsWith("implied_"));
  const defaults = assumptions.filter((assumption) => !assumption.key.startsWith("implied_"));
  return (
    <>
      {implied.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Assumed included — confirm ({implied.length})
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            The package needs these, so they are priced in. Confirm them with the
            client before quoting.
          </p>
          <ul className="mt-2 space-y-2">
            {implied.map((assumption) => (
              <li
                key={assumption.key}
                className="rounded-lg border border-amber-200 bg-amber-50 p-3"
              >
                <p className="text-sm font-semibold text-amber-900">{assumption.label}</p>
                <p className="mt-1 text-sm text-amber-800">{assumption.note}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {defaults.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Planning assumptions ({defaults.length})
          </h4>
          <ul className="mt-2 space-y-1">
            {defaults.map((assumption) => (
              <li key={assumption.key} className="text-xs text-slate-500">
                <span className="font-medium text-slate-600">{assumption.label}</span> —{" "}
                {assumption.note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
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

  const basisLine = report?.basis ? basisSummary(report.basis) : "";

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
          {report.confidence && <ConfidenceHeader confidence={report.confidence} />}

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

          {basisLine && (
            <p className="-mt-3 text-xs text-slate-500">
              Priced on {basisLine}.
              {report.basis?.showDayEquipmentBasis
                ? ` ${report.basis.showDayEquipmentBasis}`
                : ""}
            </p>
          )}

          {report.scenarios.length > 0 && (
            <ScenarioStrip scenarios={report.scenarios} currency={report.currency} />
          )}

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
                    {report.lineItems.map((item, index) => (
                      <tr
                        key={`${item.templateKey}-${item.componentKey}-${index}`}
                        className="border-b align-top"
                      >
                        <td className="py-2 pr-3">
                          <span className="font-medium text-slate-900">{item.label}</span>
                          {item.kind && (
                            <span
                              className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                item.kind === "labor"
                                  ? "bg-violet-100 text-violet-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {item.kind}
                            </span>
                          )}
                          {item.implied && (
                            <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              assumed
                            </span>
                          )}
                          {item.quantity !== null && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.quantity}
                              {item.unitLabel ? ` ${item.unitLabel}` : ""}
                            </p>
                          )}
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

          {report.assumptions.length > 0 && <Assumptions assumptions={report.assumptions} />}

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
                {report.refusals.map((refusal, index) => (
                  <li
                    key={`${refusal.category}-${index}`}
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
