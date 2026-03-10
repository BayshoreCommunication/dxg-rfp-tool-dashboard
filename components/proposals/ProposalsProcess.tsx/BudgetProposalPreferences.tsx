"use client";

import { ChevronDown, ExternalLink, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ProposalData } from "../AddNewProposal";

/* ─── Shared constants ─── */
const labelClass = "mb-3 block text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";

/* ─── Pill Radio ─── */
const PillRadio = ({
  name,
  value,
  checked,
  onChange,
}: { name: string; value: string; checked: boolean; onChange: () => void }) => (
  <label
    className={`flex items-center gap-2 px-5 py-2 rounded-full border-2 cursor-pointer text-sm font-semibold transition-all select-none ${
      checked ? "border-[#35bdf2] bg-white text-[#1f2d5d]" : "border-[#d7dce3] bg-white text-[#8f98bf] hover:border-[#35bdf2]/60"
    }`}
  >
    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${checked ? "border-[#35bdf2]" : "border-[#d7dce3]"}`}>
      {checked && <span className="w-2 h-2 rounded-full bg-[#35bdf2]" />}
    </span>
    <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
    {value}
  </label>
);

/* ─── Green Checkmark ─── */
const GreenCheck = () => (
  <span className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center flex-shrink-0">
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

/* ─── Format pill checkbox ─── */
const FormatPill = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <label
    className={`flex items-center gap-2 px-4 py-1.5 rounded-full border-2 cursor-pointer text-xs font-bold transition-all select-none ${
      checked ? "border-[#10B981] bg-[#ecfdf5] text-[#10B981]" : "border-[#d7dce3] bg-white text-[#8f98bf] hover:border-[#10B981]/40"
    }`}
  >
    {checked && (
      <span className="w-3.5 h-3.5 rounded-full bg-[#10B981] flex items-center justify-center">
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )}
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    {label}
  </label>
);

const toggleItem = (arr: string[], item: string) =>
  arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

const budgetOptions = ["<$10K", "$10-25K", "$25-50K", "$50-100K", "$100K+", "Other"];
const timelineOptions = ["Within 3 Business Days", "1 Week", "2 Weeks", "Flexible"];
const formatOptions = ["GEAR ITEMIZATION", "LABOR BREAKDOWN", "ALL-IN ESTIMATE", "ADD-ON OPTIONS"];
const hearOptions = ["Referral", "Venue", "Google", "Social Media", "LinkedIn", "Other"];

interface BudgetProposalPreferencesProps {
  data: ProposalData;
  onChange: (updates: Partial<ProposalData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

const BudgetProposalPreferences = ({ data, onChange, onContinue, onBack }: BudgetProposalPreferencesProps) => {
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [hearOpen, setHearOpen] = useState(false);

  const handleClear = () => {
    onChange({
      estimatedAvBudget: "",
      budgetCustomAmount: "",
      proposalFormatPreferences: [],
      timelineForProposal: "",
      callWithDxgProducer: "",
      howDidYouHear: "",
      howDidYouHearOther: "",
    });
  };

  /* ─── Dropdown helper ─── */
  const InlineDropdown = ({
    options,
    selected,
    onSelect,
    placeholder,
    open,
    setOpen,
    showOther,
    otherValue,
    onOtherChange,
  }: {
    options: string[];
    selected: string;
    onSelect: (v: string) => void;
    placeholder: string;
    open: boolean;
    setOpen: (v: boolean) => void;
    showOther?: boolean;
    otherValue?: string;
    onOtherChange?: (v: string) => void;
  }) => (
    <div className="rounded-md border border-[#d7dce3] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
      >
        <span className={selected ? "text-[#1f2d5d] font-medium" : "text-gray-400"}>{selected || placeholder}</span>
        <ChevronDown size={16} className="text-primary flex-shrink-0" />
      </button>
      {open && (
        <div className="border-t border-[#d7dce3]">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center justify-between px-4 py-3 text-sm text-[#1f2d5d] hover:bg-sky-50 cursor-pointer border-b border-[#f0f0f0] last:border-0"
            >
              <span>{opt}</span>
              {selected === opt ? (
                <GreenCheck />
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-[#d7dce3]" />
              )}
              <input
                type="radio"
                className="sr-only"
                checked={selected === opt}
                onChange={() => { onSelect(opt); if (opt !== "Other") setOpen(false); }}
              />
            </label>
          ))}
          {showOther && selected === "Other" && (
            <div className="px-4 pb-3 pt-1">
              <input
                className="h-9 w-full rounded-md border border-[#d7dce3] px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="Enter amount..."
                value={otherValue ?? ""}
                onChange={(e) => onOtherChange?.(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Budget &amp; Proposal Preferences</h2>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-8 py-8 space-y-8">

        {/* Estimated AV Budget */}
        <div>
          <label className={labelClass}>Estimated AV Budget</label>
          <InlineDropdown
            options={budgetOptions}
            selected={data.estimatedAvBudget}
            onSelect={(v) => onChange({ estimatedAvBudget: v })}
            placeholder="Select Estimated AV Budget"
            open={budgetOpen}
            setOpen={setBudgetOpen}
            showOther
            otherValue={data.budgetCustomAmount}
            onOtherChange={(v) => onChange({ budgetCustomAmount: v })}
          />
        </div>

        {/* Proposal Format Preferences */}
        <div>
          <label className={labelClass}>Proposal Format Preferences</label>
          <div className="flex flex-wrap gap-2">
            {formatOptions.map((opt) => (
              <FormatPill
                key={opt}
                label={opt}
                checked={data.proposalFormatPreferences.includes(opt)}
                onChange={() => onChange({ proposalFormatPreferences: toggleItem(data.proposalFormatPreferences, opt) })}
              />
            ))}
          </div>
        </div>

        {/* Timeline for Proposal */}
        <div>
          <label className={labelClass}>Timeline for Proposal</label>
          <InlineDropdown
            options={timelineOptions}
            selected={data.timelineForProposal}
            onSelect={(v) => onChange({ timelineForProposal: v })}
            placeholder="Select Time Line"
            open={timelineOpen}
            setOpen={setTimelineOpen}
          />
        </div>

        {/* Call with DXG Producer */}
        <div>
          <label className={labelClass}>Call with DXG Producer?</label>
          <div className="flex gap-3 mb-3">
            {(["YES", "NO"] as const).map((opt) => (
              <PillRadio
                key={opt}
                name="callWithDxgProducer"
                value={opt}
                checked={data.callWithDxgProducer === opt}
                onChange={() => onChange({ callWithDxgProducer: opt })}
              />
            ))}
          </div>
          {data.callWithDxgProducer === "YES" && (
            <a
              href="#"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#35bdf2] hover:underline"
            >
              CAPTURE AUTO-LINK TO SCHEDULING TOOL
              <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* How did you hear about this tool? */}
        <div>
          <label className={labelClass}>How did you hear about this tool?</label>
          <InlineDropdown
            options={hearOptions}
            selected={data.howDidYouHear}
            onSelect={(v) => onChange({ howDidYouHear: v })}
            placeholder="How did you hear about this tool?"
            open={hearOpen}
            setOpen={setHearOpen}
            showOther
            otherValue={data.howDidYouHearOther}
            onOtherChange={(v) => onChange({ howDidYouHearOther: v })}
          />
          {/* "Other" textarea shown below dropdown when selected */}
          {data.howDidYouHear === "Other" && !hearOpen && (
            <div className="mt-2 rounded-md border border-[#d7dce3]">
              <textarea
                rows={3}
                value={data.howDidYouHearOther}
                onChange={(e) => onChange({ howDidYouHearOther: e.target.value })}
                placeholder="Write here..."
                className="w-full rounded-md px-4 py-3 text-sm text-[#1f2d5d] outline-none resize-none"
              />
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-2 text-sm font-semibold text-[#8f98bf] hover:text-red-400 transition-colors"
        >
          <RotateCcw size={15} />
          CLEAR
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-10 px-6 rounded-md border border-[#d7dce3] text-sm font-semibold text-[#1f2d5d] hover:bg-gray-50 transition-colors"
          >
            BACK
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="h-10 px-8 rounded-md bg-[#35bdf2] hover:bg-[#20A4D5] text-white text-sm font-bold shadow-[0_4px_14px_0_rgba(56,189,248,0.39)] transition-transform active:scale-95"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </section>
  );
};

export default BudgetProposalPreferences;