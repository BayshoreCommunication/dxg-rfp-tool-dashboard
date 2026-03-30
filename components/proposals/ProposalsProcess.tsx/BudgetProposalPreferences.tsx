"use client";

import { ChevronDown, ExternalLink, RotateCcw } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { BudgetData } from "../AddNewProposal";
import { PillRadio, toggleItem, useClickOutside } from "./shared";

/* ─── Shared constants ─── */
const labelClass = "mb-3 block text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";

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

const budgetOptions = ["<$10K", "$10-25K", "$25-50K", "$50-100K", "$100K+", "Other"];
const timelineOptions = ["Within 3 Business Days", "1 Week", "2 Weeks", "Flexible"];
const formatOptions = ["GEAR ITEMIZATION", "LABOR BREAKDOWN", "ALL-IN ESTIMATE", "ADD-ON OPTIONS"];
const hearOptions = ["Referral", "Venue", "Google", "Social Media", "LinkedIn", "Other"];

interface BudgetProposalPreferencesProps {
  data: BudgetData;
  onChange: (updates: Partial<BudgetData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
}

/* ─── Dropdown component (moved OUTSIDE parent to avoid remount on each render) ─── */
const InlineDropdown = ({
  options,
  selected,
  onSelect,
  placeholder,
  open,
  setOpen,
  dropdownRef,
  showOther,
  otherValue,
  onOtherChange,
  hasError = false,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  placeholder: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  showOther?: boolean;
  otherValue?: string;
  onOtherChange?: (v: string) => void;
  hasError?: boolean;
}) => (
  <div className={`rounded-md border ${hasError ? "border-red-500 ring-1 ring-red-500/20" : "border-[#d7dce3]"} bg-white overflow-hidden`} ref={dropdownRef}>
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${hasError && !selected ? "bg-red-50/50" : ""}`}
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
              className={`h-9 w-full rounded-md border ${hasError && !otherValue ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-[#d7dce3] focus:border-primary focus:ring-primary/20"} px-3 text-sm text-[#1f2d5d] outline-none`}
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

const BudgetProposalPreferences = ({ data, onChange, onContinue, onBack, showErrors = false }: BudgetProposalPreferencesProps) => {
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [hearOpen, setHearOpen] = useState(false);

  const budgetRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const hearRef = useRef<HTMLDivElement>(null);

  useClickOutside(budgetRef, useCallback(() => setBudgetOpen(false), []));
  useClickOutside(timelineRef, useCallback(() => setTimelineOpen(false), []));
  useClickOutside(hearRef, useCallback(() => setHearOpen(false), []));

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
          <label className={labelClass}>Estimated AV Budget <span className="text-red-500">*</span></label>
          <InlineDropdown
            options={budgetOptions}
            selected={data.estimatedAvBudget}
            onSelect={(v) => onChange({ estimatedAvBudget: v })}
            placeholder="Select Estimated AV Budget"
            open={budgetOpen}
            setOpen={setBudgetOpen}
            dropdownRef={budgetRef}
            showOther
            otherValue={data.budgetCustomAmount}
            onOtherChange={(v) => onChange({ budgetCustomAmount: v })}
            hasError={showErrors && (!data.estimatedAvBudget.trim() || (data.estimatedAvBudget === "Other" && !data.budgetCustomAmount.trim()))}
          />
          {showErrors && !data.estimatedAvBudget.trim() && (
            <p className="mt-1 text-sm text-red-500 normal-case">Estimated AV Budget is required.</p>
          )}
          {showErrors && data.estimatedAvBudget === "Other" && !data.budgetCustomAmount.trim() && (
            <p className="mt-1 text-sm text-red-500 normal-case">Please specify the custom amount.</p>
          )}
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
          <label className={labelClass}>Timeline for Proposal <span className="text-red-500">*</span></label>
          <InlineDropdown
            options={timelineOptions}
            selected={data.timelineForProposal}
            onSelect={(v) => onChange({ timelineForProposal: v })}
            placeholder="Select Time Line"
            open={timelineOpen}
            setOpen={setTimelineOpen}
            dropdownRef={timelineRef}
            hasError={showErrors && !data.timelineForProposal.trim()}
          />
          {showErrors && !data.timelineForProposal.trim() && (
            <p className="mt-1 text-sm text-red-500 normal-case">Timeline is required.</p>
          )}
        </div>

        {/* Call with DXG Producer */}
        <div className={`p-4 -m-4 rounded-lg transition-colors ${showErrors && !data.callWithDxgProducer ? "bg-red-50" : ""}`}>
          <label className={labelClass}>Call with DXG Producer? <span className="text-red-500">*</span></label>
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
          {showErrors && !data.callWithDxgProducer && (
            <p className="mt-2 text-sm text-red-500 normal-case">Please select an option.</p>
          )}
        </div>

        {/* How did you hear about this tool? */}
        <div>
          <label className={labelClass}>How did you hear about this tool? <span className="text-red-500">*</span></label>
          <InlineDropdown
            options={hearOptions}
            selected={data.howDidYouHear}
            onSelect={(v) => onChange({ howDidYouHear: v })}
            placeholder="How did you hear about this tool?"
            open={hearOpen}
            setOpen={setHearOpen}
            dropdownRef={hearRef}
            showOther
            otherValue={data.howDidYouHearOther}
            onOtherChange={(v) => onChange({ howDidYouHearOther: v })}
            hasError={showErrors && (!data.howDidYouHear.trim() || (data.howDidYouHear === "Other" && !data.howDidYouHearOther.trim()))}
          />
          {/* "Other" textarea shown below dropdown when selected and closed */}
          {data.howDidYouHear === "Other" && !hearOpen && (
            <div className={`mt-2 rounded-md border ${showErrors && !data.howDidYouHearOther.trim() ? "border-red-500 ring-1 ring-red-500/20" : "border-[#d7dce3]"}`}>
              <textarea
                rows={3}
                value={data.howDidYouHearOther}
                onChange={(e) => onChange({ howDidYouHearOther: e.target.value })}
                placeholder="Write here..."
                className="w-full rounded-md px-4 py-3 text-sm text-[#1f2d5d] outline-none resize-none"
              />
            </div>
          )}
          {showErrors && !data.howDidYouHear.trim() && (
            <p className="mt-1 text-sm text-red-500 normal-case">Please let us know how you heard about us.</p>
          )}
          {showErrors && data.howDidYouHear === "Other" && !data.howDidYouHearOther.trim() && (
            <p className="mt-1 text-sm text-red-500 normal-case">Please specify how you heard about us.</p>
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
