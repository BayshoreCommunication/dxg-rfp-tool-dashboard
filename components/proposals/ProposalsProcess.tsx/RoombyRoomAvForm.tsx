"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ProposalData } from "../AddNewProposal";

/* ─── Shared style constants (same pattern as ProposalsSettings) ─── */
const labelClass = "mb-2 block text-sm font-semibold text-[#8f98bf] uppercase tracking-wide";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";
const selectClass = inputClass + " appearance-none pr-8";

const SelectCaret = () => (
  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary">
    <ChevronDown size={16} />
  </span>
);

/* ─── Checkbox helper ─── */
const toggleArrayItem = (arr: string[], item: string) =>
  arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

/* ─── Inline unit input ─── */
const UnitInput = ({
  value,
  onChange,
  unit = "ft",
  placeholder = "",
}: {
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  placeholder?: string;
}) => (
  <div className="flex overflow-hidden rounded-md border border-[#d7dce3] bg-white">
    <input
      className="h-10 w-full px-3 text-sm text-[#1f2d5d] outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
    <span className="flex items-center px-3 border-l border-[#d7dce3] text-xs font-semibold text-[#8f98bf] bg-[#f5f6f8]">
      {unit}
    </span>
  </div>
);

/* ─── Section divider ─── */
const SectionTitle = ({ title }: { title: string }) => (
  <div className="pt-2 pb-1 border-b border-[#d7dce3]">
    <h3 className="text-[13px] font-bold text-[#0f1b57] uppercase tracking-widest">{title}</h3>
  </div>
);

interface RoombyRoomAvFormProps {
  data: ProposalData;
  onChange: (updates: Partial<ProposalData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

const riggingOptions = ["Overhead", "Projection", "Creative Video", "LED Walls", "Truss"];
const stageRiserOptions = ["4×8", "4×4", "8×8", "Custom"];
const roomSetupOptions = ["Theatre", "Classroom", "Banquet Rounds", "U-Shape", "Boardroom", "Cocktail", "Custom"];
const avSpecOptions = ["Basic", "Standard", "Premium", "Custom"];
const mainSoundOptions = ["L'Acoustics", "d&b audiotechnik", "Meyer Sound", "QSC", "JBL", "Other"];
const frontScreenOptions = ["16:9", "4:3", "Custom Aspect", "Curved", "LED"];

const RoombyRoomAvForm = ({ data, onChange, onContinue, onBack }: RoombyRoomAvFormProps) => {
  const [setupOpen, setSetupOpen] = useState(false);
  const [avSpecOpen, setAvSpecOpen] = useState(false);
  const [mainSoundOpen, setMainSoundOpen] = useState(false);
  const [frontScreenOpen, setFrontScreenOpen] = useState(false);

  const handleClear = () => {
    onChange({
      roomFunction: "",
      numberOfRooms: "",
      ceilingHeight: "",
      roomSetup: "",
      showPrep: "",
      showSize: "",
      hasPipeAndDrape: false,
      showRig: false,
      rigPowerSize: "",
      preferredRigging: [],
      decibelLimitation: "",
      avSpec: "",
      avPa: "",
      mainSound: "",
      mainSoundSize: "",
      hearingImpaired: "",
      preferredA1: "",
      recordAudio: "",
      chairs: "",
      stageRisers: [],
      backdropsWallSize: "",
      scenicElements: false,
      videoStage: false,
      frontScreen: "",
      contentVideoNeeds: "",
    });
  };

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#d7dce3]">
        <h2 className="text-[20px] font-semibold text-[#0f1b57]">Room-by-Room AV Needs</h2>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-6 py-6 space-y-6">

        {/* ── Room Setup Section ── */}
        <SectionTitle title="Room Setup" />

        {/* Room/Hall Function */}
        <div>
          <label htmlFor="roomFunction" className={labelClass}>Room / Hall Function</label>
          <input
            id="roomFunction"
            className={inputClass}
            placeholder="Select Room / Space"
            value={data.roomFunction}
            onChange={(e) => onChange({ roomFunction: e.target.value })}
          />
        </div>

        {/* Number of Rooms & Ceiling */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Number of Rooms in the Room</label>
            <input
              type="number"
              className={inputClass}
              placeholder="0"
              value={data.numberOfRooms}
              onChange={(e) => onChange({ numberOfRooms: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Ceiling Height</label>
            <UnitInput value={data.ceilingHeight} onChange={(v) => onChange({ ceilingHeight: v })} placeholder="0" />
          </div>
        </div>

        {/* Room Setup dropdown */}
        <div>
          <label className={labelClass}>Room Setup</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSetupOpen((p) => !p)}
              className={selectClass + " flex items-center justify-between cursor-pointer"}
            >
              <span className={data.roomSetup ? "text-[#1f2d5d]" : "text-gray-400"}>
                {data.roomSetup || "Select Setup"}
              </span>
              <ChevronDown size={16} className="text-primary flex-shrink-0" />
            </button>
            {setupOpen && (
              <div className="absolute z-10 w-full mt-1 rounded-md border border-[#d7dce3] bg-white shadow-md overflow-hidden">
                {roomSetupOptions.map((opt) => (
                  <label key={opt} className="flex items-center justify-between px-4 py-2.5 text-sm text-[#1f2d5d] hover:bg-sky-50 cursor-pointer">
                    <span>{opt}</span>
                    <input
                      type="radio"
                      checked={data.roomSetup === opt}
                      onChange={() => { onChange({ roomSetup: opt }); setSetupOpen(false); }}
                      className="accent-[#373798]"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Show Prep & Show Size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Show Prep</label>
            <UnitInput value={data.showPrep} onChange={(v) => onChange({ showPrep: v })} placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>Show Size</label>
            <UnitInput value={data.showSize} onChange={(v) => onChange({ showSize: v })} placeholder="0" />
          </div>
        </div>

        {/* Pipe & Drape + Show Rig */}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-[#8f98bf]">
            <input
              type="checkbox"
              checked={data.hasPipeAndDrape}
              onChange={(e) => onChange({ hasPipeAndDrape: e.target.checked })}
              className="h-4 w-4 rounded accent-[#373798]"
            />
            Does area have Pipe &amp; Drape?
          </label>
          <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-[#8f98bf]">
            <input
              type="checkbox"
              checked={data.showRig}
              onChange={(e) => onChange({ showRig: e.target.checked })}
              className="h-4 w-4 rounded accent-[#373798]"
            />
            Show Rig
          </label>
        </div>

        {/* Rig Power/Size */}
        {data.showRig && (
          <div>
            <label className={labelClass}>Power / Size Rig</label>
            <input
              className={inputClass}
              placeholder="Describe rig power or size"
              value={data.rigPowerSize}
              onChange={(e) => onChange({ rigPowerSize: e.target.value })}
            />
          </div>
        )}

        {/* Preferred Rigging */}
        <div>
          <label className={labelClass}>Preferred Rigging</label>
          <div className="flex flex-wrap gap-3">
            {riggingOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-[#1f2d5d]">
                <input
                  type="checkbox"
                  checked={data.preferredRigging.includes(opt)}
                  onChange={() => onChange({ preferredRigging: toggleArrayItem(data.preferredRigging, opt) })}
                  className="h-4 w-4 rounded accent-[#373798]"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* ── Sound Section ── */}
        <SectionTitle title="Sound" />

        {/* Decibel Limitation */}
        <div>
          <label className={labelClass}>Decibel Limitation</label>
          <input
            className={inputClass}
            placeholder="e.g. 85 dB"
            value={data.decibelLimitation}
            onChange={(e) => onChange({ decibelLimitation: e.target.value })}
          />
        </div>

        {/* AV Spec */}
        <div>
          <label className={labelClass}>AV Spec</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAvSpecOpen((p) => !p)}
              className={selectClass + " flex items-center justify-between cursor-pointer"}
            >
              <span className={data.avSpec ? "text-[#1f2d5d]" : "text-gray-400"}>
                {data.avSpec || "Select AV Spec"}
              </span>
              <ChevronDown size={16} className="text-primary flex-shrink-0" />
            </button>
            {avSpecOpen && (
              <div className="absolute z-10 w-full mt-1 rounded-md border border-[#d7dce3] bg-white shadow-md overflow-hidden">
                {avSpecOptions.map((opt) => (
                  <label key={opt} className="flex items-center justify-between px-4 py-2.5 text-sm text-[#1f2d5d] hover:bg-sky-50 cursor-pointer">
                    <span>{opt}</span>
                    <input
                      type="radio"
                      checked={data.avSpec === opt}
                      onChange={() => { onChange({ avSpec: opt }); setAvSpecOpen(false); }}
                      className="accent-[#373798]"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AV / PA */}
        <div>
          <label className={labelClass}>AV PA?</label>
          <div className="flex gap-6">
            {["Yes", "No"].map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-[#1f2d5d]">
                <input
                  type="radio"
                  name="avPa"
                  checked={data.avPa === opt}
                  onChange={() => onChange({ avPa: opt })}
                  className="accent-[#35bdf2] h-4 w-4"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Main Sound & Size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Main Sound</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMainSoundOpen((p) => !p)}
                className={selectClass + " flex items-center justify-between cursor-pointer"}
              >
                <span className={data.mainSound ? "text-[#1f2d5d]" : "text-gray-400"}>
                  {data.mainSound || "Select Brand"}
                </span>
                <ChevronDown size={16} className="text-primary flex-shrink-0" />
              </button>
              {mainSoundOpen && (
                <div className="absolute z-10 w-full mt-1 rounded-md border border-[#d7dce3] bg-white shadow-md overflow-hidden">
                  {mainSoundOptions.map((opt) => (
                    <label key={opt} className="flex items-center justify-between px-4 py-2.5 text-sm text-[#1f2d5d] hover:bg-sky-50 cursor-pointer">
                      <span>{opt}</span>
                      <input
                        type="radio"
                        checked={data.mainSound === opt}
                        onChange={() => { onChange({ mainSound: opt }); setMainSoundOpen(false); }}
                        className="accent-[#373798]"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className={labelClass}>Main Sound Size</label>
            <input
              className={inputClass}
              placeholder="e.g. Line Array 12"
              value={data.mainSoundSize}
              onChange={(e) => onChange({ mainSoundSize: e.target.value })}
            />
          </div>
        </div>

        {/* Hearing Impaired & Preferred A1 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Hearing Impaired</label>
            <div className="flex gap-6 mt-1">
              {["Yes", "No"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-[#1f2d5d]">
                  <input
                    type="radio"
                    name="hearingImpaired"
                    checked={data.hearingImpaired === opt}
                    onChange={() => onChange({ hearingImpaired: opt })}
                    className="accent-[#35bdf2] h-4 w-4"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Preferred A1</label>
            <input
              className={inputClass}
              placeholder="Name or preference"
              value={data.preferredA1}
              onChange={(e) => onChange({ preferredA1: e.target.value })}
            />
          </div>
        </div>

        {/* Record Audio */}
        <div>
          <label className={labelClass}>Record Audio?</label>
          <div className="flex gap-6">
            {["Yes", "No", "Multi-Track"].map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-[#1f2d5d]">
                <input
                  type="radio"
                  name="recordAudio"
                  checked={data.recordAudio === opt}
                  onChange={() => onChange({ recordAudio: opt })}
                  className="accent-[#35bdf2] h-4 w-4"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* ── Stage Section ── */}
        <SectionTitle title="Stage" />

        {/* Chairs */}
        <div>
          <label className={labelClass}>Chairs</label>
          <input
            type="number"
            className={inputClass}
            placeholder="Number of chairs"
            value={data.chairs}
            onChange={(e) => onChange({ chairs: e.target.value })}
          />
        </div>

        {/* Stage Risers */}
        <div>
          <label className={labelClass}>Stage Risers</label>
          <div className="flex flex-wrap gap-3">
            {stageRiserOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-[#1f2d5d]">
                <input
                  type="checkbox"
                  checked={data.stageRisers.includes(opt)}
                  onChange={() => onChange({ stageRisers: toggleArrayItem(data.stageRisers, opt) })}
                  className="h-4 w-4 rounded accent-[#373798]"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* Backdrops Wall Size */}
        <div>
          <label className={labelClass}>Backdrops / Wall Size (Staging)</label>
          <UnitInput
            value={data.backdropsWallSize}
            onChange={(v) => onChange({ backdropsWallSize: v })}
            placeholder="Width"
            unit="ft"
          />
        </div>

        {/* Scenic Elements & Video Stage */}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-[#8f98bf]">
            <input
              type="checkbox"
              checked={data.scenicElements}
              onChange={(e) => onChange({ scenicElements: e.target.checked })}
              className="h-4 w-4 rounded accent-[#373798]"
            />
            Scenic Elements
          </label>
          <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-[#8f98bf]">
            <input
              type="checkbox"
              checked={data.videoStage}
              onChange={(e) => onChange({ videoStage: e.target.checked })}
              className="h-4 w-4 rounded accent-[#373798]"
            />
            Video Stage
          </label>
        </div>

        {/* Front Screen */}
        <div>
          <label className={labelClass}>Front Screen (Staging)</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setFrontScreenOpen((p) => !p)}
              className={selectClass + " flex items-center justify-between cursor-pointer"}
            >
              <span className={data.frontScreen ? "text-[#1f2d5d]" : "text-gray-400"}>
                {data.frontScreen || "Select screen format"}
              </span>
              <ChevronDown size={16} className="text-primary flex-shrink-0" />
            </button>
            {frontScreenOpen && (
              <div className="absolute z-10 w-full mt-1 rounded-md border border-[#d7dce3] bg-white shadow-md overflow-hidden">
                {frontScreenOptions.map((opt) => (
                  <label key={opt} className="flex items-center justify-between px-4 py-2.5 text-sm text-[#1f2d5d] hover:bg-sky-50 cursor-pointer">
                    <span>{opt}</span>
                    <input
                      type="radio"
                      checked={data.frontScreen === opt}
                      onChange={() => { onChange({ frontScreen: opt }); setFrontScreenOpen(false); }}
                      className="accent-[#373798]"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Content / Video Needs ── */}
        <SectionTitle title="Content / Video Needs" />
        <div>
          <label className={labelClass}>Describe your content or video needs</label>
          <textarea
            rows={4}
            className="w-full rounded-md border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
            placeholder="Describe your requirements..."
            value={data.contentVideoNeeds}
            onChange={(e) => onChange({ contentVideoNeeds: e.target.value })}
          />
        </div>

      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-[#d7dce3]">
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

export default RoombyRoomAvForm;