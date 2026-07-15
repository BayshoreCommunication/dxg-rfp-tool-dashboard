"use client";

import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import type { ProductionSupportData, ProposalSettings } from "../AddNewProposal";
import { PillRadio, PillCheckbox, toggleItem } from "./shared";

/* ─── Shared style constants ─── */
const labelClass = "mb-3 block text-sm font-bold text-[#222628] uppercase tracking-wide";

const crewRoles = [
  "A1 (AUDIO)",
  "A2 (AUDIO ASSIST)",
  "V1 (VIDEO)",
  "V2 (VIDEO ASSIST)",
  "TD (TECHNICAL DIRECTOR)",
  "L1 (LIGHTING)",
  "L2 (LIGHTING ASSIST)",
  "GRAPHICS OP",
  "CAMERA OPERATOR",
  "SHOWCALLER",
  "STAGE MANAGER",
  "PRODUCER",
  "TELEPROMPTER OP",
  "RIGGER",
  "STAGEHAND",
  "OTHER",
];

interface ProductionSupportCrewProps {
  data: ProductionSupportData;
  onChange: (updates: Partial<ProductionSupportData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
}

const ProductionSupportCrew = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
}: ProductionSupportCrewProps) => {
  const handleClear = () => {
    onChange({
      scenicStageDesign: "",
      unionLabor: "",
      showCrewNeeded: [],
      otherRolesNeeded: "",
    });
  };

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#e4e4e4] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#e4e4e4]">
        <h2 className="text-[22px] font-bold text-[#222628]">Production Support &amp; Crew</h2>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-8 py-8 space-y-10">

        {/* Scenic / Stage Design */}
        <div className={`p-4 -m-4 rounded-lg transition-colors ${showErrors && !data.scenicStageDesign ? "bg-red-50" : ""}`}>
          <label className={labelClass}>
            Scenic / Stage Design? <span className="text-red-500">*</span>{" "}
            <span className="text-[#969798] font-normal normal-case tracking-normal">
              (We can lead the whole show or support your team.)
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            {(["Yes", "No"] as const).map((opt) => (
              <PillRadio
                key={opt}
                name="scenicStageDesign"
                value={opt}
                checked={data.scenicStageDesign === opt}
                onChange={() => onChange({ scenicStageDesign: opt })}
              />
            ))}
          </div>
          {showErrors && !data.scenicStageDesign && (
            <p className="mt-2 text-sm text-red-500 normal-case">Please select an option.</p>
          )}
        </div>

        {/* Union Labor */}
        <div className={`p-4 -m-4 rounded-lg transition-colors ${showErrors && !data.unionLabor ? "bg-red-50" : ""}`}>
          <label className={labelClass}>Will this venue require union labor? <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-3">
            {(["Yes", "No", "Not Sure"] as const).map((opt) => (
              <PillRadio
                key={opt}
                name="unionLabor"
                value={opt}
                checked={data.unionLabor === opt}
                onChange={() => onChange({ unionLabor: opt })}
              />
            ))}
          </div>
          {showErrors && !data.unionLabor && (
            <p className="mt-2 text-sm text-red-500 normal-case">Please select an option.</p>
          )}
        </div>

        {/* Show Crew Needed */}
        <div className={`p-4 -m-4 rounded-lg transition-colors ${showErrors && data.showCrewNeeded.length === 0 ? "bg-red-50" : ""}`}>
          <label className={labelClass}>Show Crew Needed <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-3">
            {crewRoles.map((role) => (
              <PillCheckbox
                key={role}
                label={role}
                checked={data.showCrewNeeded.includes(role)}
                onChange={() =>
                  onChange({ showCrewNeeded: toggleItem(data.showCrewNeeded, role) })
                }
              />
            ))}
          </div>
          {showErrors && data.showCrewNeeded.length === 0 && (
            <p className="mt-2 text-sm text-red-500 normal-case">Please select at least one crew role.</p>
          )}
        </div>

        {/* Other Roles */}
        <div>
          <label className={labelClass}>
            Other Roles or Support Needed?{" "}
            <span className="text-[#969798] font-normal normal-case tracking-normal">(Optional)</span>
          </label>
          <textarea
            rows={5}
            value={data.otherRolesNeeded}
            onChange={(e) => onChange({ otherRolesNeeded: e.target.value })}
            placeholder="Write here..."
            className="w-full rounded-md border border-[#e4e4e4] bg-white px-4 py-3 text-sm text-[#222628] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-[#e4e4e4]">
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-2 text-sm font-semibold text-[#969798] hover:text-red-400 transition-colors"
        >
          <RotateCcw size={15} />
          CLEAR
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-200"
          >
            <ArrowLeft size={15} className="shrink-0" />
            Back
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(14,165,233,0.6)] active:translate-y-0"
            style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
            Continue
            <ArrowRight size={15} className="shrink-0" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductionSupportCrew;
