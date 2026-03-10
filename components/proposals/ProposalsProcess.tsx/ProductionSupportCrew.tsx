"use client";

import { RotateCcw } from "lucide-react";
import { ProposalData } from "../AddNewProposal";

/* ─── Shared style constants ─── */
const labelClass = "mb-3 block text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";

/* ─── Pill Radio Button ─── */
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
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />
    {value}
  </label>
);

/* ─── Pill Checkbox ─── */
const PillCheckbox = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label
    className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 cursor-pointer text-sm font-semibold transition-all select-none ${
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
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    {label}
  </label>
);

const toggleItem = (arr: string[], item: string) =>
  arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

const crewRoles = [
  "A1 (AUDIO)",
  "V1 (VIDEO)",
  "TD (TECHNICAL DIRECTOR)",
  "GRAPHICS OP",
  "CAMERA OPERATOR",
  "SHOWCALLER",
  "STAGE MANAGER",
  "LIGHTING DIRECTOR",
];

interface ProductionSupportCrewProps {
  data: ProposalData;
  onChange: (updates: Partial<ProposalData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

const ProductionSupportCrew = ({
  data,
  onChange,
  onContinue,
  onBack,
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
    <section className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Production Support &amp; Crew</h2>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-8 py-8 space-y-10">

        {/* Scenic / Stage Design */}
        <div>
          <label className={labelClass}>
            Scenic / Stage Design?{" "}
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
        </div>

        {/* Union Labor */}
        <div>
          <label className={labelClass}>Will this venue require union labor?</label>
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
        </div>

        {/* Show Crew Needed */}
        <div>
          <label className={labelClass}>Show Crew Needed</label>
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
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-2 text-sm font-semibold text-[#8f98bf] hover:text-red-400 transition-colors"
          >
            <RotateCcw size={15} />
            CLEAR
          </button>
        </div>

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