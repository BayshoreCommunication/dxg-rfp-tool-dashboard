"use client";

import { RotateCcw } from "lucide-react";
import type { ProductionSupportData, ProposalSettings } from "../AddNewProposal";
import { PillRadio, PillCheckbox, toggleItem } from "./shared";

/* ─── Shared style constants ─── */
const labelClass = "mb-3 block text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";

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
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Production Support &amp; Crew</h2>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-8 py-8 space-y-10">

        {/* Scenic / Stage Design */}
        <div className={`p-4 -m-4 rounded-lg transition-colors ${showErrors && !data.scenicStageDesign ? "bg-red-50" : ""}`}>
          <label className={labelClass}>
            Scenic / Stage Design? <span className="text-red-500">*</span>{" "}
            <span className="text-[#8f98bf] font-normal normal-case tracking-normal">
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
            <span className="text-[#8f98bf] font-normal normal-case tracking-normal">(Optional)</span>
          </label>
          <textarea
            rows={5}
            value={data.otherRolesNeeded}
            onChange={(e) => onChange({ otherRolesNeeded: e.target.value })}
            placeholder="Write here..."
            className="w-full rounded-md border border-[#d7dce3] bg-white px-4 py-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
          />
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

export default ProductionSupportCrew;
