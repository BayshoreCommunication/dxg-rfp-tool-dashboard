"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import type { ProposalSettings, VenueTechnicalData } from "../AddNewProposal";
import { InfoTooltip, PillRadio, useClickOutside } from "./shared";


const labelClass = "mb-3 block text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

const ampOptions = ["15amp", "20amp", "30amp", "100amp", "200amp", "400amp"];
const platformOptions = ["Zoom", "Teams", "Vimeo", "YouTube", "Other"] as const;

interface VenueTechnicalRequirementsProps {
  data: VenueTechnicalData;
  onChange: (updates: Partial<VenueTechnicalData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
}

const VenueTechnicalRequirements = ({
  data: rawData,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
}: VenueTechnicalRequirementsProps) => {
  // Guard against stale/legacy data missing new fields
  const data: VenueTechnicalData = {
    ...rawData,
    hardlineInternet: rawData.hardlineInternet ?? { hardlineInternet: "", hardlineInternetPurpose: "" },
    livestreamVirtual: rawData.livestreamVirtual ?? { livestreamVirtual: "", livestreamPlatform: "" },
    wirelessInternetAttendees: rawData.wirelessInternetAttendees ?? "",
  };

  const [ampOpen, setAmpOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const ampRef = useRef<HTMLDivElement>(null);
  const platformRef = useRef<HTMLDivElement>(null);
  useClickOutside(ampRef, () => setAmpOpen(false));
  useClickOutside(platformRef, () => setPlatformOpen(false));

  const handleClear = () => {
    onChange({
      needRiggingForFlown: {
        needRiggingForFlown: "",
        riggingPlotOrSpecs: "",
      },
      needDedicatedPowerDrops: {
        needDedicatedPowerDrops: "",
        standardAmpWall: "",
      },
      powerDropsHowMany: "",
      hardlineInternet: {
        hardlineInternet: "",
        hardlineInternetPurpose: "",
      },
      livestreamVirtual: {
        livestreamVirtual: "",
        livestreamPlatform: "",
      },
      wirelessInternetAttendees: "",
    });
  };

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Venue &amp; Technical Requirements</h2>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-8 py-8 space-y-10">

        {/* Need Rigging for Flown Elements? */}
        <div className={`p-4 -m-4 rounded-lg transition-colors ${showErrors && !data.needRiggingForFlown.needRiggingForFlown ? "bg-red-50" : ""}`}>
          <label className={labelClass}>
            Need Rigging for Flown Elements? <span className="text-red-500">*</span>
            <InfoTooltip text="Flown elements include speakers, screens, or lighting trusses hung from the ceiling. Venues may require certified riggers for overhead equipment." />
          </label>
          <div className="flex gap-3">
            {(["YES", "NO"] as const).map((opt) => (
              <PillRadio
                key={opt}
                name="needRiggingForFlown"
                value={opt}
                checked={data.needRiggingForFlown.needRiggingForFlown === opt}
                onChange={() =>
                  onChange({
                    needRiggingForFlown: { ...data.needRiggingForFlown, needRiggingForFlown: opt },
                  })
                }
              />
            ))}
          </div>
          {showErrors && !data.needRiggingForFlown.needRiggingForFlown && (
            <p className="mt-2 text-sm text-red-500 normal-case">Please select an option.</p>
          )}
        </div>

        {/* Rigging Plot or Existing Specs */}
        <div>
          <label htmlFor="riggingPlot" className={labelClass}>
            Do you have a rigging plot or existing specs?
            <InfoTooltip text="A rigging plot shows ceiling attachment points and weight limits. Share any existing plans so we can assess compatibility with our equipment." />
          </label>
          <input
            id="riggingPlot"
            className={inputClass}
            placeholder="Describe or paste link..."
            value={data.needRiggingForFlown.riggingPlotOrSpecs}
            onChange={(e) =>
              onChange({
                needRiggingForFlown: { ...data.needRiggingForFlown, riggingPlotOrSpecs: e.target.value },
              })
            }
          />
        </div>

        {/* Need Dedicated Power Drops? */}
        <div className={`p-4 -m-4 rounded-lg transition-colors ${showErrors && !data.needDedicatedPowerDrops.needDedicatedPowerDrops ? "bg-red-50" : ""}`}>
          <label className={labelClass}>
            Need Dedicated Power Drops? <span className="text-red-500">*</span>
            <InfoTooltip text="Dedicated power drops provide separate electrical circuits for AV equipment, preventing interference and overload from standard venue power." />
          </label>
          <div className="flex gap-3 mb-5">
            {(["YES", "NO"] as const).map((opt) => (
              <PillRadio
                key={opt}
                name="needDedicatedPowerDrops"
                value={opt}
                checked={data.needDedicatedPowerDrops.needDedicatedPowerDrops === opt}
                onChange={() =>
                  onChange({
                    needDedicatedPowerDrops: { ...data.needDedicatedPowerDrops, needDedicatedPowerDrops: opt },
                  })
                }
              />
            ))}
          </div>
          {showErrors && !data.needDedicatedPowerDrops.needDedicatedPowerDrops && (
            <p className="mt-2 text-sm text-red-500 normal-case">Please select an option.</p>
          )}

          {/* Amp Wall selector — shown when YES */}
          {data.needDedicatedPowerDrops.needDedicatedPowerDrops === "YES" && (
            <>
              <label className="mb-1 block text-sm font-semibold text-[#8f98bf]">
                Standard AMP Wall
                <InfoTooltip text="Select the amperage rating of the venue's standard power wall — this determines available electrical capacity for AV equipment." />
              </label>
              <div className={`rounded-md border ${showErrors && (!data.needDedicatedPowerDrops.standardAmpWall || !data.powerDropsHowMany) ? "border-red-500" : "border-[#d7dce3]"} bg-white overflow-hidden`} ref={ampRef}>
                {/* Dropdown trigger */}
                <button
                  type="button"
                  onClick={() => setAmpOpen((p) => !p)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 transition-colors ${showErrors && !data.needDedicatedPowerDrops.standardAmpWall ? "bg-red-50/50" : ""}`}
                >
                  <span className={data.needDedicatedPowerDrops.standardAmpWall ? "text-[#1f2d5d]" : ""}>
                    {data.needDedicatedPowerDrops.standardAmpWall || "Select Standard AMP Wall"}
                  </span>
                  <ChevronDown size={16} className="text-primary flex-shrink-0" />
                </button>
                {showErrors && !data.needDedicatedPowerDrops.standardAmpWall && (
                  <div className="px-4 pb-2">
                    <p className="text-sm text-red-500 normal-case">Standard AMP Wall is required.</p>
                  </div>
                )}

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
                            data.needDedicatedPowerDrops.standardAmpWall === opt
                              ? "bg-[#35bdf2]"
                              : "border-2 border-[#d7dce3]"
                          }`}
                        >
                          {data.needDedicatedPowerDrops.standardAmpWall === opt && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <input
                          type="radio"
                          className="sr-only"
                          checked={data.needDedicatedPowerDrops.standardAmpWall === opt}
                          onChange={() => {
                            onChange({ needDedicatedPowerDrops: { ...data.needDedicatedPowerDrops, standardAmpWall: opt } });
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
                    How many next each? <span className="text-red-500">*</span>
                    <InfoTooltip text="Specify how many drops you need at each location or AV zone — e.g. '2 at stage, 1 at FOH mix position'." />
                  </label>
                  <textarea
                    rows={3}
                    value={data.powerDropsHowMany}
                    onChange={(e) => onChange({ powerDropsHowMany: e.target.value })}
                    placeholder="Write here..."
                    className={`w-full rounded-md border ${showErrors && !data.powerDropsHowMany ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-[#d7dce3] focus:border-primary focus:ring-primary/20"} bg-white px-3 py-2 text-sm text-[#1f2d5d] outline-none focus:ring-1 resize-none`}
                  />
                  {showErrors && !data.powerDropsHowMany && (
                    <p className="mt-1 text-sm text-red-500 normal-case">This field is required.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Will AV require hardline internet access? */}
        <div className={`p-4 -m-4 rounded-lg transition-colors ${showErrors && !data.hardlineInternet.hardlineInternet ? "bg-red-50" : ""}`}>
          <label className={labelClass}>
            Will AV require hardline internet access? <span className="text-red-500">*</span>
            <InfoTooltip text="Hardline internet (ethernet) provides a stable, dedicated connection for AV systems such as streaming encoders, video conferencing, or remote presenters." />
          </label>
          <div className="flex gap-3">
            {(["YES", "NO"] as const).map((opt) => (
              <PillRadio
                key={opt}
                name="hardlineInternet"
                value={opt}
                checked={data.hardlineInternet.hardlineInternet === opt}
                onChange={() =>
                  onChange({
                    hardlineInternet: { ...data.hardlineInternet, hardlineInternet: opt },
                  })
                }
              />
            ))}
          </div>
          {showErrors && !data.hardlineInternet.hardlineInternet && (
            <p className="mt-2 text-sm text-red-500 normal-case">Please select an option.</p>
          )}

          {data.hardlineInternet.hardlineInternet === "YES" && (
            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-[#8f98bf]">
                For what purpose? <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={data.hardlineInternet.hardlineInternetPurpose}
                onChange={(e) =>
                  onChange({
                    hardlineInternet: { ...data.hardlineInternet, hardlineInternetPurpose: e.target.value },
                  })
                }
                placeholder="Describe the intended use..."
                className={`w-full rounded-md border ${showErrors && !data.hardlineInternet.hardlineInternetPurpose ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-[#d7dce3] focus:border-primary focus:ring-primary/20"} bg-white px-3 py-2 text-sm text-[#1f2d5d] outline-none focus:ring-1 resize-none`}
              />
              {showErrors && !data.hardlineInternet.hardlineInternetPurpose && (
                <p className="mt-1 text-sm text-red-500 normal-case">This field is required.</p>
              )}
            </div>
          )}
        </div>

        {/* Include livestream or virtual component? */}
        <div className={`p-4 -m-4 rounded-lg transition-colors ${showErrors && !data.livestreamVirtual.livestreamVirtual ? "bg-red-50" : ""}`}>
          <label className={labelClass}>
            Include livestream or virtual component? <span className="text-red-500">*</span>
            <InfoTooltip text="Let us know if any part of your event will be broadcast live or streamed to a remote audience so we can plan the right encoding and connectivity equipment." />
          </label>
          <div className="flex gap-3">
            {(["YES", "NO"] as const).map((opt) => (
              <PillRadio
                key={opt}
                name="livestreamVirtual"
                value={opt}
                checked={data.livestreamVirtual.livestreamVirtual === opt}
                onChange={() =>
                  onChange({
                    livestreamVirtual: { ...data.livestreamVirtual, livestreamVirtual: opt },
                  })
                }
              />
            ))}
          </div>
          {showErrors && !data.livestreamVirtual.livestreamVirtual && (
            <p className="mt-2 text-sm text-red-500 normal-case">Please select an option.</p>
          )}

          {data.livestreamVirtual.livestreamVirtual === "YES" && (
            <div className="mt-5">
              <label className="mb-1 block text-sm font-semibold text-[#8f98bf]">
                What platform? <span className="text-red-500">*</span>
              </label>
              <div
                className={`rounded-md border ${showErrors && !data.livestreamVirtual.livestreamPlatform ? "border-red-500" : "border-[#d7dce3]"} bg-white overflow-hidden`}
                ref={platformRef}
              >
                <button
                  type="button"
                  onClick={() => setPlatformOpen((p) => !p)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${showErrors && !data.livestreamVirtual.livestreamPlatform ? "bg-red-50/50 text-gray-400" : "text-gray-400"}`}
                >
                  <span className={data.livestreamVirtual.livestreamPlatform ? "text-[#1f2d5d]" : ""}>
                    {data.livestreamVirtual.livestreamPlatform || "Select platform"}
                  </span>
                  <ChevronDown size={16} className="text-primary flex-shrink-0" />
                </button>
                {showErrors && !data.livestreamVirtual.livestreamPlatform && (
                  <div className="px-4 pb-2">
                    <p className="text-sm text-red-500 normal-case">Platform is required.</p>
                  </div>
                )}
                {platformOpen && (
                  <div className="border-t border-[#d7dce3]">
                    {platformOptions.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center justify-between px-4 py-3 text-sm text-[#1f2d5d] hover:bg-sky-50 cursor-pointer border-b border-[#f0f0f0] last:border-0"
                      >
                        <span>{opt}</span>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            data.livestreamVirtual.livestreamPlatform === opt
                              ? "bg-[#35bdf2]"
                              : "border-2 border-[#d7dce3]"
                          }`}
                        >
                          {data.livestreamVirtual.livestreamPlatform === opt && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <input
                          type="radio"
                          className="sr-only"
                          checked={data.livestreamVirtual.livestreamPlatform === opt}
                          onChange={() => {
                            onChange({ livestreamVirtual: { ...data.livestreamVirtual, livestreamPlatform: opt } });
                            setPlatformOpen(false);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Is wireless internet for attendees required? */}
        <div className={`p-4 -m-4 rounded-lg transition-colors ${showErrors && !data.wirelessInternetAttendees ? "bg-red-50" : ""}`}>
          <label className={labelClass}>
            Is wireless internet for attendees required? <span className="text-red-500">*</span>
            <InfoTooltip text="Indicate whether attendees will need Wi-Fi access during the event. This may affect venue selection and network infrastructure planning." />
          </label>
          <div className="flex gap-3">
            {(["YES", "NO"] as const).map((opt) => (
              <PillRadio
                key={opt}
                name="wirelessInternetAttendees"
                value={opt}
                checked={data.wirelessInternetAttendees === opt}
                onChange={() => onChange({ wirelessInternetAttendees: opt })}
              />
            ))}
          </div>
          {showErrors && !data.wirelessInternetAttendees && (
            <p className="mt-2 text-sm text-red-500 normal-case">Please select an option.</p>
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
