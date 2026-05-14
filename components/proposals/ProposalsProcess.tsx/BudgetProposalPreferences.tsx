"use client";

import { ExternalLink } from "lucide-react";
import type { BudgetData, ProposalSettings } from "../AddNewProposal";
import { InfoTooltip, PillCheckbox, toggleItem } from "./shared";

/* ─── Style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#35bdf2] focus:outline-none focus:ring-2 focus:ring-[#35bdf2]/20";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#8f98bf]";
const subPanelClass =
  "mt-3 rounded-xl border border-[#e0e7ff] bg-[#f5f7ff] p-4";
const errorClass = "mt-1 text-sm text-red-500 normal-case";

/* ─── Tailwind-safe YES/NO buttons ─── */
const yesNoCls = (opt: "YES" | "NO", value: string): string => {
  const base =
    "flex h-10 min-w-[72px] cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all";
  if (value !== opt)
    return `${base} border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300`;
  if (opt === "YES") return `${base} border-emerald-400 bg-emerald-50 text-emerald-700`;
  return `${base} border-rose-400 bg-rose-50 text-rose-700`;
};

const YesNo = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "YES" | "NO") => void;
}) => (
  <div className="flex gap-3">
    <button type="button" className={yesNoCls("YES", value)} onClick={() => onChange("YES")}>
      ✓ Yes
    </button>
    <button type="button" className={yesNoCls("NO", value)} onClick={() => onChange("NO")}>
      ✗ No
    </button>
  </div>
);

const Group = ({ label }: { label: string }) => (
  <div className="mb-5 mt-8 border-t border-[#e8edf5] pt-6 first:mt-0 first:border-0 first:pt-0">
    <p className={groupLabelClass}>{label}</p>
  </div>
);

/* ─── Static options ─── */
const BUDGET_OPTIONS = ["<$10K", "$10–25K", "$25–50K", "$50–100K", "$100–250K", "$250K+", "Other"];
const FORMAT_OPTIONS = ["GEAR ITEMIZATION", "LABOR BREAKDOWN", "ALL-IN ESTIMATE", "ADD-ON OPTIONS"];
const TIMELINE_OPTIONS = [
  "Within 24 Hours",
  "Within 3 Business Days",
  "1 Week",
  "2 Weeks",
  "Flexible",
];
const SCORING_OPTIONS = [
  "Price / Budget",
  "Technical Approach",
  "Experience & Portfolio",
  "Crew Quality",
  "Creative Vision",
  "Responsiveness",
  "Local Market Knowledge",
  "Sustainability Practices",
];
const HEAR_OPTIONS = ["Referral", "Venue", "Google", "Social Media", "LinkedIn", "Other"];

/* ─── Inline select ─── */
const SelectField = ({
  value,
  onChange,
  options,
  placeholder,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  hasError?: boolean;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`${inputClass} ${hasError && !value ? "border-red-400 ring-1 ring-red-400/20 bg-red-50/30" : ""}`}
  >
    <option value="">{placeholder}</option>
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
);

/* ─── Props ─── */
interface BudgetProposalPreferencesProps {
  data: BudgetData;
  onChange: (updates: Partial<BudgetData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
}

const BudgetProposalPreferences = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
}: BudgetProposalPreferencesProps) => {
  /* Guard legacy data */
  const safeData: BudgetData = {
    estimatedAvBudget: "",
    budgetCustomAmount: "",
    proposalFormatPreferences: [],
    timelineForProposal: "",
    decisionDate: "",
    competitiveBid: "",
    numberOfProposals: "",
    scoringPriorities: [],
    scoringNotes: "",
    callWithDxgProducer: "",
    howDidYouHear: "",
    howDidYouHearOther: "",
    ...data,
  };

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white">
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#35bdf2]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#35bdf2]">
            Page 7 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Budget &amp; Proposal Preferences</h2>
        <p className="mt-1 text-sm text-[#8f98bf]">Scoring criteria, timeline, and consultation preferences</p>
      </div>

      {/* ── Form Body ── */}
      <div className="flex-1 px-8 py-8">

        {/* ══════ GROUP: BUDGET ══════ */}
        <Group label="Budget" />

        {/* Estimated AV Budget */}
        <div className="mb-6">
          <label className={labelClass}>
            Estimated AV Budget <span className="text-red-500">*</span>
            <InfoTooltip text="Your approximate budget for audio/visual equipment and labor. Helps us tailor the scope and detail of the proposal." />
          </label>
          <SelectField
            value={safeData.estimatedAvBudget}
            onChange={(v) => onChange({ estimatedAvBudget: v, budgetCustomAmount: v !== "Other" ? "" : safeData.budgetCustomAmount })}
            options={BUDGET_OPTIONS}
            placeholder="Select estimated AV budget"
            hasError={showErrors}
          />
          {safeData.estimatedAvBudget === "Other" && (
            <div className={subPanelClass}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8f98bf]">Specify Amount</p>
              <input
                type="text"
                value={safeData.budgetCustomAmount}
                onChange={(e) => onChange({ budgetCustomAmount: e.target.value })}
                placeholder={`Enter amount in ${proposalSettings.proposals.defaultCurrency}`}
                className={inputClass}
              />
            </div>
          )}
          {showErrors && !safeData.estimatedAvBudget && (
            <p className={errorClass}>Estimated AV budget is required.</p>
          )}
          {showErrors && safeData.estimatedAvBudget === "Other" && !safeData.budgetCustomAmount.trim() && (
            <p className={errorClass}>Please specify the custom amount.</p>
          )}
        </div>

        {/* Proposal Format Preferences */}
        <div className="mb-6">
          <label className={labelClass}>
            Proposal Format Preferences
            <InfoTooltip text="Choose how you'd like the proposal broken down — itemized gear list, labor costs, or an all-inclusive estimate." />
          </label>
          <div className="flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map((opt) => (
              <PillCheckbox
                key={opt}
                label={opt}
                checked={safeData.proposalFormatPreferences.includes(opt)}
                onChange={() =>
                  onChange({ proposalFormatPreferences: toggleItem(safeData.proposalFormatPreferences, opt) })
                }
              />
            ))}
          </div>
        </div>

        {/* ══════ GROUP: TIMELINE ══════ */}
        <Group label="Timeline" />

        {/* Proposal Timeline */}
        <div className="mb-6">
          <label className={labelClass}>
            Proposal Timeline <span className="text-red-500">*</span>
            <InfoTooltip text="How soon do you need the proposal delivered? This helps us prioritize our turnaround." />
          </label>
          <SelectField
            value={safeData.timelineForProposal}
            onChange={(v) => onChange({ timelineForProposal: v })}
            options={TIMELINE_OPTIONS}
            placeholder="Select turnaround timeline"
            hasError={showErrors}
          />
          {showErrors && !safeData.timelineForProposal && (
            <p className={errorClass}>Proposal timeline is required.</p>
          )}
        </div>

        {/* Target Decision Date */}
        <div className="mb-6">
          <label className={labelClass}>
            Target Decision Date
            <InfoTooltip text="The date by which you plan to award or select a vendor. Helps us schedule follow-ups appropriately." />
          </label>
          <input
            type="date"
            value={safeData.decisionDate}
            onChange={(e) => onChange({ decisionDate: e.target.value })}
            className={inputClass}
          />
        </div>

        {/* ══════ GROUP: BID & SCORING ══════ */}
        <Group label="Bid & Scoring" />

        {/* Competitive Bid */}
        <div className="mb-6">
          <label className={labelClass}>
            Competitive Bid?
            <InfoTooltip text="Are multiple vendors being solicited for this proposal? Helps us understand the competitive context." />
          </label>
          <YesNo
            value={safeData.competitiveBid}
            onChange={(v) =>
              onChange({ competitiveBid: v, numberOfProposals: v === "NO" ? "" : safeData.numberOfProposals })
            }
          />
          {safeData.competitiveBid === "YES" && (
            <div className={subPanelClass}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8f98bf]">
                How many vendors are being solicited?
              </p>
              <input
                type="number"
                min="1"
                value={safeData.numberOfProposals}
                onChange={(e) => onChange({ numberOfProposals: e.target.value })}
                placeholder="e.g. 3"
                className={inputClass}
              />
            </div>
          )}
        </div>

        {/* Scoring Priorities */}
        <div className="mb-6">
          <label className={labelClass}>
            Scoring Priorities
            <InfoTooltip text="Select the criteria that matter most when evaluating proposals. We'll weight our response accordingly." />
          </label>
          <div className="flex flex-wrap gap-2">
            {SCORING_OPTIONS.map((opt) => (
              <PillCheckbox
                key={opt}
                label={opt}
                checked={safeData.scoringPriorities.includes(opt)}
                onChange={() =>
                  onChange({ scoringPriorities: toggleItem(safeData.scoringPriorities, opt) })
                }
              />
            ))}
          </div>
        </div>

        {/* Scoring Notes */}
        <div className="mb-6">
          <label className={labelClass}>
            Scoring Notes / Evaluation Instructions
            <InfoTooltip text="Any additional context about how proposals will be evaluated, scoring rubrics, or special requirements." />
          </label>
          <textarea
            rows={3}
            value={safeData.scoringNotes}
            onChange={(e) => onChange({ scoringNotes: e.target.value })}
            placeholder="e.g. Price accounts for 40% of scoring; creative vision for 30%..."
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* ══════ GROUP: PRODUCER CONSULTATION ══════ */}
        <Group label="Producer Consultation" />

        {/* Call with DXG Producer */}
        <div className="mb-6">
          <label className={labelClass}>
            Call with DXG Producer? <span className="text-red-500">*</span>
            <InfoTooltip text="A brief discovery call with your DXG producer helps clarify requirements and speeds up the proposal process." />
          </label>
          <YesNo
            value={safeData.callWithDxgProducer}
            onChange={(v) => onChange({ callWithDxgProducer: v })}
          />
          {safeData.callWithDxgProducer === "YES" && (
            <div className={subPanelClass}>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#35bdf2] hover:underline"
              >
                Schedule a call with your DXG producer
                <ExternalLink size={13} />
              </a>
            </div>
          )}
          {showErrors && !safeData.callWithDxgProducer && (
            <p className={errorClass}>Please indicate whether you'd like a producer call.</p>
          )}
        </div>

        {/* ══════ GROUP: REFERRAL ══════ */}
        <Group label="Referral" />

        {/* How Did You Hear */}
        <div className="mb-6">
          <label className={labelClass}>
            How did you hear about this tool? <span className="text-red-500">*</span>
            <InfoTooltip text="Helps us understand where our clients are coming from so we can improve our outreach and support." />
          </label>
          <SelectField
            value={safeData.howDidYouHear}
            onChange={(v) =>
              onChange({ howDidYouHear: v, howDidYouHearOther: v !== "Other" ? "" : safeData.howDidYouHearOther })
            }
            options={HEAR_OPTIONS}
            placeholder="Select how you heard about us"
            hasError={showErrors}
          />
          {safeData.howDidYouHear === "Other" && (
            <div className={subPanelClass}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8f98bf]">Please specify</p>
              <textarea
                rows={2}
                value={safeData.howDidYouHearOther}
                onChange={(e) => onChange({ howDidYouHearOther: e.target.value })}
                placeholder="Tell us more..."
                className={`${inputClass} resize-none`}
              />
            </div>
          )}
          {showErrors && !safeData.howDidYouHear && (
            <p className={errorClass}>Please let us know how you heard about us.</p>
          )}
          {showErrors && safeData.howDidYouHear === "Other" && !safeData.howDidYouHearOther.trim() && (
            <p className={errorClass}>Please specify how you heard about us.</p>
          )}
        </div>

      </div>

      {/* ── Footer Nav ── */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-[#d7dce3] px-5 py-2.5 text-sm font-semibold text-[#1f2d5d] hover:bg-[#f5f7ff] transition-colors"
        >
          ← Venue &amp; Technical
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 rounded-lg bg-[#35bdf2] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(53,189,242,0.35)] hover:bg-[#20a9de] transition-colors active:scale-95"
        >
          Uploads &amp; Co-Vendors →
        </button>
      </div>
    </section>
  );
};

export default BudgetProposalPreferences;
