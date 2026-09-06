"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
import { formatAppDateTime } from "@/lib/dateFormat";

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
const analysisStatus = {
  exact_approved_value: {
    label: "Exact approved value",
    tone: "bg-emerald-100 text-emerald-800",
  },
  estimate_range: {
    label: "Approved estimate range",
    tone: "bg-cyan-100 text-cyan-800",
  },
  incomplete: {
    label: "Incomplete estimate",
    tone: "bg-amber-100 text-amber-800",
  },
} as const;

const budgetTiers: Record<string, { label: string; low: number | null; high: number | null }> = {
  Essential: { label: "Essential · $10K–$25K", low: 1_000_000, high: 2_500_000 },
  Standard: { label: "Standard · $25K–$50K", low: 2_500_000, high: 5_000_000 },
  Production: { label: "Production · $50K–$100K", low: 5_000_000, high: 10_000_000 },
  Premium: { label: "Premium · $100K–$250K", low: 10_000_000, high: 25_000_000 },
  Enterprise: { label: "Enterprise · $250K–$500K", low: 25_000_000, high: 50_000_000 },
  Signature: { label: "Signature · $500K+", low: 50_000_000, high: null },
  "Not Yet Determined": { label: "Not yet determined", low: null, high: null },
};

const displayDeductionLabel = (deduction: InvestmentConfidence["deductions"][number]) => {
  if (deduction.ruleKey === "market_city_unknown") return "Pricing market not confirmed";
  return deduction.label;
};

const friendlyConfidenceNote = (note: string) =>
  note
    .replaceAll("Market / city unknown", "Pricing market not confirmed")
    .replaceAll("Market not identified", "Pricing market not confirmed");

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

const questionByRule: Record<string, string> = {
  scope_vague: "What parts of the event should the production partner provide?",
  no_line_items_to_price: "What audio, video, lighting, staging, or event support do you need?",
  in_house_status_unknown: "Will the venue require its own audio and video provider?",
  hotel_in_house_vs_outside_av_unknown:
    "Will the venue provide the audio and video equipment, or can you use an outside partner?",
  market_city_unknown: "In which city will the event take place?",
  projection_brightness_lumens_not_stated:
    "Approximately how large should the main screen or video wall be?",
  screen_led_size_or_pixel_pitch_not_stated:
    "Approximately how large should the main screen or video wall be?",
  hybrid_streaming_scope_unclear: "Will remote attendees watch the event online?",
  wireless_channel_count_not_stated:
    "Approximately how many wireless microphones will you need?",
  connectivity_bandwidth_needs_unknown:
    "Will the venue provide dedicated internet for the event?",
  interpretation_accessibility_needs_unstated:
    "Do you need captioning, sign-language support, or language interpretation?",
  union_status_unknown: "Does the venue require union labor?",
};

const friendlyQuestion = (deduction: InvestmentConfidence["deductions"][number]) =>
  questionByRule[deduction.ruleKey] ??
  (deduction.ruleKey.includes("scope_vague")
    ? "What parts of the event should the production partner provide?"
    : deduction.ruleKey.includes("in_house")
      ? "Will the venue provide the audio and video equipment, or can you use an outside partner?"
      : deduction.ruleKey.includes("calibrated")
        ? "Do you have a previous event budget or vendor quote we can use as a reference?"
        : `Can you confirm this planning detail: ${deduction.label.replace(/\s*unknown|\s*not stated/gi, "")}?`);

const ConfidenceHeader = ({
  confidence,
  proposalId,
  pricingBasis,
}: {
  confidence: InvestmentConfidence;
  proposalId: string;
  pricingBasis?: string;
}) => {
  const tone = confidencePresentation[confidence.band];
  const label =
    confidence.band === "low"
      ? "Early estimate"
      : confidence.band === "medium"
        ? "Planning estimate"
        : "Detailed estimate";
  const questions = Array.from(
    new Set(confidence.deductions.map(friendlyQuestion)),
  ).slice(0, 6);
  return (
    <div className={`rounded-xl border p-4 ${confidence.band === "low" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-sm text-slate-700">
        {confidence.band === "low"
          ? "We need a few more details before we can provide a reliable planning range."
          : confidence.band === "medium"
            ? "This range is useful for early planning. A few more details will make it more precise."
            : "This range is based on detailed event information and is ready for planning conversations."}
      </p>
      {questions.length > 0 && (
        <>
          <p className="mt-4 text-sm font-semibold text-slate-900">Helpful details to confirm</p>
          <ul className="mt-2 space-y-2">
            {questions.map((question) => (
              <li key={question} className="flex gap-2 text-sm text-slate-700">
                <span aria-hidden className="text-[#087f69]">•</span>
                <span>{question}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={`/proposals/${proposalId}/assistant`}
              className="rounded-lg bg-[#087f69] px-4 py-2 text-sm font-semibold text-white"
            >
              Answer these questions
            </Link>
            <span className="text-xs text-slate-600">
              You can skip anything you don&apos;t know—we&apos;ll clearly label any assumptions.
            </span>
          </div>
        </>
      )}
      <div className="mt-4">
        <Disclosure title="How this estimate was calculated" summary="Optional technical details">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone.chip}`}>
              Estimate confidence: {confidence.score}/100
            </span>
          </div>
          {confidence.deductions.length > 0 && (
            <ul className="mt-3 space-y-1">
              {confidence.deductions.map((deduction) => (
                <li key={deduction.ruleKey || deduction.label} className="text-xs text-slate-600">
                  {displayDeductionLabel(deduction)} ({deduction.deduction}-point impact)
                </li>
              ))}
            </ul>
          )}
          {confidence.note && (
            <p className="mt-3 text-xs text-slate-600">{friendlyConfidenceNote(confidence.note)}</p>
          )}
          {pricingBasis && (
            <p className="mt-3 text-xs text-slate-600">Pricing basis: {pricingBasis}</p>
          )}
        </Disclosure>
      </div>
    </div>
  );
};

const Disclosure = ({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
}) => (
  <details className="rounded-xl border border-slate-200 bg-slate-50/60">
    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 marker:hidden">
      <span className="flex items-center justify-between gap-3">
        <span>
          {title}
          {summary && (
            <span className="ml-2 text-xs font-normal text-slate-500">{summary}</span>
          )}
        </span>
        <span aria-hidden className="text-slate-400">＋</span>
      </span>
    </summary>
    <div className="border-t border-slate-200 p-4">{children}</div>
  </details>
);

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

export default function InvestmentGuidancePanel({
  proposalId,
  estimatedAvBudget,
}: {
  proposalId: string;
  estimatedAvBudget?: string;
}) {
  const [report, setReport] = useState<InvestmentReport>();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();
  const autoGenerationRef = useRef<{
    proposalId: string;
    promise: ReturnType<typeof generateInvestmentGuidanceAction>;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void getLatestInvestmentGuidanceAction(proposalId).then(async (result) => {
      if (!active) return;
      if (result.success) {
        setReport(result.data);
        setLoading(false);
        return;
      }
      if (result.code !== "INVESTMENT_GUIDANCE_NOT_FOUND") {
        setError(result.message);
        setLoading(false);
        return;
      }
      // Entering See Guidance should produce the useful outcome without a
      // second discovery click. Reuse the same promise when React replays the
      // effect in development so the result is not lost and no duplicate
      // report is started.
      let generationPromise =
        autoGenerationRef.current?.proposalId === proposalId
          ? autoGenerationRef.current.promise
          : null;
      if (!generationPromise) {
        generationPromise = generateInvestmentGuidanceAction(proposalId);
        autoGenerationRef.current = {
          proposalId,
          promise: generationPromise,
        };
      }
      setRunning(true);
      const generated = await generationPromise;
      if (!active) return;
      setRunning(false);
      setLoading(false);
      if (generated.success) setReport(generated.data);
      else setError(generated.message);
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
  const selectedBudget = estimatedAvBudget ? budgetTiers[estimatedAvBudget] : undefined;
  const budgetComparison =
    report &&
    !report.budgetAnalysis &&
    selectedBudget?.low !== null &&
    selectedBudget?.low !== undefined
      ? report.totalHighMinor !== null && report.totalHighMinor < selectedBudget.low
        ? "The current scope estimate is below the selected planning budget. This usually means important room, venue, labor, or production details are still missing."
        : selectedBudget.high !== null &&
            report.totalLowMinor !== null &&
            report.totalLowMinor > selectedBudget.high
          ? "The current scope estimate is above the selected planning budget. Review scope or consider value engineering."
          : "The current scope estimate overlaps the selected planning budget."
      : undefined;

  return (
    <section
      aria-labelledby="investment-guidance-title"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <h3 id="investment-guidance-title" className="text-lg font-semibold">
        Investment guidance
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        A preliminary planning range based on the scope captured so far,
        available pricing records, and expert rules. It is not a vendor quote.
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
          {running ? "Generating…" : report ? "Recalculate guidance" : "Generate investment guidance"}
        </button>
        {/* The estimate goes to whoever approves the money, and they do not
            have a login. The document carries the refusals and assumptions
            that stop a range reading as a quote. */}
        {report && (
          <a
            href={`/api/proposals/${encodeURIComponent(proposalId)}/investment-export`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
          >
            Download estimate
          </a>
        )}
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
          {report.confidence?.band === "low" && (
            <ConfidenceHeader
              confidence={report.confidence}
              proposalId={proposalId}
              pricingBasis={basisLine}
            />
          )}

          {report.budgetAnalysis && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    analysisStatus[report.budgetAnalysis.status].tone
                  }`}
                >
                  {analysisStatus[report.budgetAnalysis.status].label}
                </span>
                <span className="text-xs text-slate-500">
                  {report.budgetAnalysis.included.length} included ·{" "}
                  {report.budgetAnalysis.missing.length} missing ·{" "}
                  {report.budgetAnalysis.needsConfirmation.length} to confirm
                </span>
              </div>
              {report.budgetAnalysis.status === "incomplete" && (
                <p className="mt-2 text-sm text-slate-600">
                  The calculated range excludes unavailable or unconfirmed
                  components. No complete total is shown until those inputs
                  have approved rates.
                </p>
              )}
            </div>
          )}

          {selectedBudget && (
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
                Planning budget
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">{selectedBudget.label}</p>
              {budgetComparison && (
                <p className="mt-1 text-sm text-slate-700">{budgetComparison}</p>
              )}
            </div>
          )}

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

          {report.confidence && report.confidence.band !== "low" && (
            <ConfidenceHeader
              confidence={report.confidence}
              proposalId={proposalId}
              pricingBasis={basisLine}
            />
          )}

          {report.budgetAnalysis?.warnings.length ? (
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Budget checks ({report.budgetAnalysis.warnings.length})
              </h4>
              <ul className="mt-2 space-y-2">
                {report.budgetAnalysis.warnings.map((warning) => (
                  <li
                    key={warning.code}
                    className={`rounded-lg border p-3 ${
                      warning.severity === "blocking"
                        ? "border-red-200 bg-red-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {warning.explanation}
                    </p>
                    {warning.estimatedImpact && (
                      <p className="mt-1 text-xs font-medium text-slate-700">
                        Estimated impact:{" "}
                        {money(
                          warning.estimatedImpact.lowMinor,
                          warning.estimatedImpact.currency,
                        )}{" "}
                        –{" "}
                        {money(
                          warning.estimatedImpact.highMinor,
                          warning.estimatedImpact.currency,
                        )}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-600">
                      {warning.suggestedNextAction}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.budgetAnalysis && (
            <Disclosure
              title="Deterministic breakdown"
              summary="Category, room, labor, equipment, and shared services"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  {
                    label: "Equipment",
                    amount: report.budgetAnalysis.equipmentSubtotal,
                  },
                  {
                    label: "Labor",
                    amount: report.budgetAnalysis.laborSubtotal,
                  },
                  {
                    label: "Shared services",
                    amount: report.budgetAnalysis.sharedServicesSubtotal,
                  },
                ].map(({ label, amount }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 text-base font-bold text-slate-900">
                        {money(
                          amount?.midMinor,
                          amount?.currency ?? report.currency,
                        )}
                      </p>
                    </div>
                  ))}
              </div>
              {report.budgetAnalysis.categoryBreakdown.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Categories
                  </h5>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {report.budgetAnalysis.categoryBreakdown.map((item) => (
                      <li
                        key={item.category}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                      >
                        <span className="capitalize text-slate-700">
                          {item.category.replaceAll("_", " ")}
                        </span>
                        <span className="font-semibold tabular-nums text-slate-900">
                          {money(item.amount.midMinor, item.amount.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.budgetAnalysis.roomBreakdown.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Rooms
                  </h5>
                  <ul className="mt-2 space-y-2">
                    {report.budgetAnalysis.roomBreakdown.map((room) => (
                      <li
                        key={room.roomKey}
                        className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200"
                      >
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="font-medium text-slate-800">
                            {room.roomLabel}
                          </span>
                          <span className="font-semibold tabular-nums text-slate-900">
                            {money(
                              room.amount?.midMinor,
                              room.amount?.currency ?? report.currency,
                            )}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {room.allocationBasis}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Disclosure>
          )}

          {report.budgetAnalysis?.possibleSavings.length ? (
            <Disclosure
              title={`Possible savings (${report.budgetAnalysis.possibleSavings.length})`}
              summary="Validate before changing scope"
            >
              <ul className="space-y-2">
                {report.budgetAnalysis.possibleSavings.map((saving) => (
                  <li
                    key={saving.key}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"
                  >
                    <p className="text-sm font-semibold text-emerald-900">
                      {saving.label}
                    </p>
                    <p className="mt-1 text-xs text-emerald-800">
                      {saving.reason}
                    </p>
                    {!saving.estimatedImpact && (
                      <p className="mt-1 text-xs text-slate-600">
                        Savings are not calculated until a supported allocation
                        and approved rate are available.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Disclosure>
          ) : null}

          {report.scenarios.length > 0 && (
            <Disclosure title={`Scenarios (${report.scenarios.length})`} summary="Compare alternative labor and provider models">
              <ScenarioStrip scenarios={report.scenarios} currency={report.currency} />
            </Disclosure>
          )}

          {report.lineItems.length > 0 && (
            <Disclosure title={`Line items (${report.lineItems.length})`} summary="Equipment and labor detail">
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
            </Disclosure>
          )}

          {report.assumptions.length > 0 && (
            <Disclosure title={`Assumptions (${report.assumptions.length})`} summary="Items to confirm before quoting">
              <Assumptions assumptions={report.assumptions} />
            </Disclosure>
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
            <Disclosure title={`Ancillary factors (${report.ancillary.length})`} summary="Venue, travel, freight, fees, and insurance">
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
            </Disclosure>
          )}

          {report.recommendations.length > 0 && (
            <Disclosure title={`Recommendations (${report.recommendations.length})`} summary="Production considerations">
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
            </Disclosure>
          )}

          <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            Calculation trace available for each line item. Confidence,
            assumptions, and missing inputs determine whether this range is
            suitable for quoting.
            {report.budgetAnalysis && (
              <>
                {" "}
                Calculation {report.budgetAnalysis.calculationVersion} · pricing{" "}
                {report.budgetAnalysis.pricingReleaseVersion} · rules{" "}
                {report.budgetAnalysis.ruleReleaseVersion}.
              </>
            )}{" "}
            Updated{" "}
            {report.createdAt ? formatAppDateTime(report.createdAt, "") : ""}
          </p>
        </div>
      )}
    </section>
  );
}
