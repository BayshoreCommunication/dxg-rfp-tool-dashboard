"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ProposalData } from "../AddNewProposal";

/* ─── Pill Radio Button (reusing same pattern as ProductionSupportCrew) ─── */
const PillRadio = ({
  name,
  value,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label
    className={`flex items-center gap-2 px-5 py-2 rounded-full border-2 cursor-pointer text-sm font-semibold transition-all select-none ${
      checked
        ? "border-[#35bdf2] bg-white text-[#1f2d5d]"
        : "border-[#d7dce3] bg-white text-[#8f98bf] hover:border-[#35bdf2]/60"
    }`}
  >
    <span
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        checked ? "border-[#35bdf2]" : "border-[#d7dce3]"
      }`}
    >
      {checked && <span className="w-2 h-2 rounded-full bg-[#35bdf2]" />}
    </span>
    <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
    {value}
  </label>
);

const labelClass = "mb-3 block text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

const ampOptions = ["15amp", "20amp", "30amp", "100amp", "200amp", "400amp"];

interface VenueTechnicalRequirementsProps {
  data: ProposalData;
  onChange: (updates: Partial<ProposalData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

const VenueTechnicalRequirements = ({
  data,
  onChange,
  onContinue,
  onBack,
}: VenueTechnicalRequirementsProps) => {
  const [ampOpen, setAmpOpen] = useState(false);

  const handleClear = () => {
    onChange({
      needRiggingForFlown: "",
      riggingPlotOrSpecs: "",
      needDedicatedPowerDrops: "",
      standardAmpWall: "",
      powerDropsHowMany: "",
    });
  };

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Venue &amp; Technical Requirements</h2>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-8 py-8 space-y-10">

        {/* Need Rigging for Flown Elements? */}
        <div>
          <label className={labelClass}>Need Rigging for Flown Elements?</label>
          <div className="flex gap-3">
            {(["YES", "NO"] as const).map((opt) => (
              <PillRadio
                key={opt}
                name="needRiggingForFlown"
                value={opt}
                checked={data.needRiggingForFlown === opt}
                onChange={() => onChange({ needRiggingForFlown: opt })}
              />
            ))}
          </div>
        </div>

        {/* Rigging Plot or Existing Specs */}
        <div>
          <label htmlFor="riggingPlot" className={labelClass}>
            Do you have a rigging plot or existing specs?
          </label>
          <input
            id="riggingPlot"
            className={inputClass}
            placeholder="Describe or paste link..."
            value={data.riggingPlotOrSpecs}
            onChange={(e) => onChange({ riggingPlotOrSpecs: e.target.value })}
          />
        </div>

        {/* Need Dedicated Power Drops? */}
        <div>
          <label className={labelClass}>Need Dedicated Power Drops?</label>
          <div className="flex gap-3 mb-5">
            {(["YES", "NO"] as const).map((opt) => (
              <PillRadio
                key={opt}
                name="needDedicatedPowerDrops"
                value={opt}
                checked={data.needDedicatedPowerDrops === opt}
                onChange={() => onChange({ needDedicatedPowerDrops: opt })}
              />
            ))}
          </div>

          {/* Amp Wall selector — shown when YES */}
          {data.needDedicatedPowerDrops === "YES" && (
            <div className="rounded-md border border-[#d7dce3] bg-white overflow-hidden">
              {/* Dropdown trigger */}
              <button
                type="button"
                onClick={() => setAmpOpen((p) => !p)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 transition-colors"
              >
                <span className={data.standardAmpWall ? "text-[#1f2d5d]" : ""}>
                  {data.standardAmpWall || "Select Standard AMP Wall"}
                </span>
                <ChevronDown size={16} className="text-primary flex-shrink-0" />
              </button>

              {/* Amp options list */}
              {ampOpen && (
                <div className="border-t border-[#d7dce3]">
                  {ampOptions.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center justify-between px-4 py-3 text-sm text-[#1f2d5d] hover:bg-sky-50 cursor-pointer border-b border-[#f0f0f0] last:border-0"
                    >
                      <span>{opt}</span>
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          data.standardAmpWall === opt
                            ? "bg-[#35bdf2]"
                            : "border-2 border-[#d7dce3]"
                        }`}
                      >
                        {data.standardAmpWall === opt && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <input
                        type="radio"
                        className="sr-only"
                        checked={data.standardAmpWall === opt}
                        onChange={() => {
                          onChange({ standardAmpWall: opt });
                          setAmpOpen(false);
                        }}
                      />
                    </label>
                  ))}
                </div>
              )}

              {/* How many next each */}
              <div className="border-t border-[#d7dce3] px-4 py-3">
                <label className="mb-2 block text-sm font-semibold text-[#8f98bf]">
                  How many next each?
                </label>
                <textarea
                  rows={3}
                  value={data.powerDropsHowMany}
                  onChange={(e) => onChange({ powerDropsHowMany: e.target.value })}
                  placeholder="Write here..."
                  className="w-full rounded-md border border-[#d7dce3] bg-white px-3 py-2 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                />
              </div>
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

export default VenueTechnicalRequirements;