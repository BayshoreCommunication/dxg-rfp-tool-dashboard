"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ProposalSettings, RoomByRoomData } from "../AddNewProposal";
import { InfoTooltip, PillCheckbox, PillRadio, toggleItem } from "./shared";

// â”€â”€â”€ Style constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#00c2c9] focus:outline-none focus:ring-2 focus:ring-[#00c2c9]/20";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#8f98bf]";
const subPanelClass =
  "mt-3 rounded-xl border border-[#e0e7ff] bg-[#f5f7ff] p-4";
const subPanelHeader =
  "mb-3 text-xs font-bold uppercase tracking-widest text-[#8f98bf]";

// â”€â”€â”€ YES/NO button helper (Tailwind-safe) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const yesNoCls = (opt: "Yes" | "No", value: string): string => {
  const base =
    "flex h-10 min-w-[72px] cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all";
  if (value !== opt) return `${base} border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300`;
  if (opt === "Yes") return `${base} border-emerald-400 bg-emerald-50 text-emerald-700`;
  return `${base} border-rose-400 bg-rose-50 text-rose-700`;
};

const YesNo = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "Yes" | "No") => void;
}) => (
  <div className="flex gap-3">
    <button type="button" className={yesNoCls("Yes", value)} onClick={() => onChange("Yes")}>âœ“ Yes</button>
    <button type="button" className={yesNoCls("No", value)} onClick={() => onChange("No")}>âœ— No</button>
  </div>
);

// â”€â”€â”€ Lighting options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LIGHTING_OPTIONS = [
  "Stage Wash",
  "Backlighting",
  "Scenic Uplighting",
  "Audience Lighting",
  "Moving Lights / Programmable Effects",
  "Color Wash (Theatrical)",
  "Pin Spots on Podium / Speakers",
  "None / Minimal â€” House lighting only",
];

// â”€â”€â”€ Crew roles (with qty flag) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CREW_ROLES: { label: string; hasQty: boolean }[] = [
  { label: "A1 (Audio Engineer)", hasQty: false },
  { label: "A2 (Audio Assist)", hasQty: true },
  { label: "V1 (Video Engineer)", hasQty: false },
  { label: "V2 (Video Assist)", hasQty: true },
  { label: "TD (Technical Director)", hasQty: false },
  { label: "L1 (Lighting Director)", hasQty: false },
  { label: "Graphics Operator", hasQty: true },
  { label: "Camera Operator", hasQty: true },
  { label: "Showcaller", hasQty: false },
  { label: "Teleprompter Operator", hasQty: true },
  { label: "Breakout Room Manager", hasQty: true },
  { label: "Vendor Recommendation Requested", hasQty: false },
];

const TELEPROMPTER_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Portuguese",
  "Mandarin",
  "Japanese",
  "German",
  "Arabic",
  "Other",
];

// â”€â”€â”€ Default room factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const defaultRoom = (): RoomByRoomData => ({
  roomFunction: "",
  estimatedAttendeesInRoom: "",
  stageDimensions: "",
  loadInDateTime: "",
  rehearsalDateTime: "",
  showStartDateTime: "",
  showEndDateTime: "",
  audioSystemRequired: "",
  audioSystemForHowManyPpl: "",
  podiumMic: { podiumMic: "", podiumMicQty: "" },
  wirelessMics: { wirelessMics: "", wirelessMicsQty: "", wirelessMicsType: "" },
  audioRecording: "",
  audienceQa: { audienceQa: "", audienceQaMethod: "" },
  ledWall: "",
  ledWallSpecs: "",
  ledWallWidth: "",
  ledWallHeight: "",
  ledWallShape: "",
  ledWallPixelPitch: "",
  ledWallSwitcher: "",
  ledWallNotes: "",
  largeMonitorsOrScreenProjector: { largeMonitorsOrScreenProjector: "", largeMonitorsQty: "" },
  clientProvideOwnPresentationLaptop: { clientProvideOwnPresentationLaptop: "", clientLaptopQty: "" },
  presentationLaptops: { presentationLaptops: "", presentationLaptopQty: "" },
  videoPlayback: { videoPlayback: "", videoPlaybackCount: "" },
  videoFormatAspectRatio: "",
  cameras: { cameras: "", camerasQty: "" },
  videoRecording: { videoRecording: "", videoRecordingType: "" },
  lightingRequirements: [],
  stageWashLighting: { stageWashLighting: "", stageWashLightingStageSize: "" },
  backlightingFor: "",
  drapeOrScenicUplighting: "",
  audienceLighting: "",
  scenicStageDesign: "",
  scenicStageDesignNotes: "",
  teleprompterRequired: "",
  teleprompterBilingual: "",
  teleprompterLanguages: [],
  confidenceMonitorsRequired: "",
  programConfidenceMonitor: { programConfidenceMonitor: "", programConfidenceMonitorQty: "" },
  notesConfidenceMonitor: { notesConfidenceMonitor: "", notesConfidenceMonitorQty: "" },
  speakerTimer: "",
  contentVideoNeeds: "",
  unionLabor: "",
  showCrewNeeded: [],
  showCrewQty: {},
  otherRolesNeeded: "",
});

// â”€â”€â”€ Section divider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Group = ({ label }: { label: string }) => (
  <div className="mb-5 mt-7 first:mt-0">
    <p className={groupLabelClass}>{label}</p>
    <div className="h-px bg-[#e8edf5]" />
  </div>
);

// â”€â”€â”€ Single room form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RoomForm = ({
  data,
  onChange,
  showErrors,
  roomIndex,
}: {
  data: RoomByRoomData;
  onChange: (u: Partial<RoomByRoomData>) => void;
  showErrors: boolean;
  roomIndex: number;
}) => {
  const uid = `room-${roomIndex}`;
  const errCls = (v: string) =>
    showErrors && !v.trim() ? "border-red-400 focus:border-red-400" : "";

  const crewQty: Record<string, string> = data.showCrewQty ?? {};
  const lighting = data.lightingRequirements ?? [];

  // Auto-suggest crew based on current selections
  const autoSuggest: string[] = [];
  if (data.audioSystemRequired === "Yes") autoSuggest.push("A1 (Audio Engineer)");
  if (data.ledWall === "Yes") autoSuggest.push("V1 (Video Engineer)", "V2 (Video Assist)", "Graphics Operator", "TD (Technical Director)");
  if (data.cameras?.cameras === "Yes") autoSuggest.push("Camera Operator");
  if (data.teleprompterRequired === "Yes") autoSuggest.push("Teleprompter Operator");
  if (lighting.includes("Moving Lights / Programmable Effects")) autoSuggest.push("L1 (Lighting Director)");
  const unaddedSuggestions = autoSuggest.filter((r) => !data.showCrewNeeded.includes(r));

  return (
    <div className="space-y-5 px-6 py-6">

      {/* â”€â”€ Identity â”€â”€ */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>
            Room Name / Label <span className="text-red-500">*</span>
            <InfoTooltip text="Give this room a clear name. Examples: 'General Session Stage', 'Breakout Room A', 'VIP Lounge'. Vendors will see this name throughout the RFP as the sub-header for this room's section." />
          </label>
          <input
            maxLength={80}
            className={`${inputClass} ${errCls(data.roomFunction)}`}
            value={data.roomFunction}
            onChange={(e) => onChange({ roomFunction: e.target.value })}
            placeholder="e.g. Main Keynote Ballroom"
          />
          <div className="mt-1 flex justify-end">
            <span className="text-xs text-[#8f98bf]">{data.roomFunction.length}/80</span>
          </div>
        </div>
        <div>
          <label className={labelClass}>
            Room Attendee Capacity <span className="text-red-500">*</span>
            <InfoTooltip text="Expected number of attendees in this specific room. Drives audio system sizing â€” vendors will spec a distributed array based on this number." />
          </label>
          <input
            type="number"
            min={1}
            max={50000}
            className={`${inputClass} ${errCls(data.estimatedAttendeesInRoom)}`}
            value={data.estimatedAttendeesInRoom}
            onChange={(e) => onChange({ estimatedAttendeesInRoom: e.target.value })}
            placeholder="e.g. 1200"
          />
        </div>
      </div>

      {/* Stage Dimensions */}
      <div>
        <label className={labelClass}>
          Stage Dimensions <span className="text-red-500">*</span>
          <InfoTooltip text="Stage dimensions in feet â€” Width Ã— Depth Ã— Height (optional). Standard general session stage is 60ft x 24ft; large keynote stages run 100â€“200ft wide. If no formal stage: enter 'Floor presentation â€” no stage.'" />
        </label>
        <input
          className={`${inputClass} ${errCls(data.stageDimensions)}`}
          value={data.stageDimensions}
          onChange={(e) => onChange({ stageDimensions: e.target.value })}
          placeholder="e.g. 120ft Ã— 40ft Ã— 3ft"
        />
      </div>

      {/* â”€â”€ Audio â”€â”€ */}
      <Group label="Audio" />

      <div>
        <label className={labelClass}>
          Audio System Required? <span className="text-red-500">*</span>
          <InfoTooltip text="Does this room need a full audio system (speakers, mixing, microphones)? Almost all production rooms require this. Select No only for spaces like a quiet VIP lounge with no programmed content." />
        </label>
        <YesNo
          value={data.audioSystemRequired}
          onChange={(v) => onChange({ audioSystemRequired: v })}
        />

        {data.audioSystemRequired === "Yes" && (
          <div className={subPanelClass}>
            <p className={subPanelHeader}>Audio Sub-Questions</p>

            <div className="grid grid-cols-2 gap-5 mb-4">
              {/* Podium Mic */}
              <div>
                <label className={labelClass}>
                  Podium Mic Required?
                  <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                  <InfoTooltip text="Fixed microphone mounted at the lectern for standing presenters. Separate from handheld or lavalier mics for moving presenters." />
                </label>
                <YesNo
                  value={data.podiumMic.podiumMic}
                  onChange={(v) =>
                    onChange({ podiumMic: { ...data.podiumMic, podiumMic: v } })
                  }
                />
              </div>

              {/* Audience Q&A Style */}
              <div>
                <label className={labelClass}>
                  Audience Q&amp;A Style
                  <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                  <InfoTooltip text="How will audience questions be taken? Passed handheld is most common under 500 people; floor mics for larger rooms; digital tools work best for hybrid events." />
                </label>
                <select
                  className={inputClass}
                  value={data.audienceQa.audienceQaMethod}
                  onChange={(e) =>
                    onChange({
                      audienceQa: { ...data.audienceQa, audienceQaMethod: e.target.value },
                    })
                  }
                >
                  <option value="">Select Q&amp;A methodâ€¦</option>
                  <option>No Q&A â€” Presentation only</option>
                  <option>Passed Handheld Mic â€” Staff walks mics to audience</option>
                  <option>Fixed Floor Mics â€” Stationary mics in aisles</option>
                  <option>Digital / App-Based (Slido, Mentimeter, etc.)</option>
                  <option>Combination â€” Multiple methods</option>
                </select>
              </div>
            </div>

            {/* Wireless Mics */}
            <div className="mb-4">
              <label className={labelClass}>
                Wireless Mics?
                <InfoTooltip text="Battery-powered microphones for speakers who move on stage. Specify quantity so the AV company can allocate transmitters and receivers." />
              </label>
              <YesNo
                value={data.wirelessMics.wirelessMics}
                onChange={(v) =>
                  onChange({
                    wirelessMics: {
                      wirelessMics: v,
                      wirelessMicsQty: v !== "Yes" ? "" : data.wirelessMics.wirelessMicsQty,
                      wirelessMicsType: v !== "Yes" ? "" : data.wirelessMics.wirelessMicsType,
                    },
                  })
                }
              />
              {data.wirelessMics.wirelessMics === "Yes" && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <label className={`${labelClass} mt-0`}>Quantity</label>
                    <input
                      type="number"
                      className={inputClass}
                      placeholder="How many?"
                      value={data.wirelessMics.wirelessMicsQty}
                      onChange={(e) =>
                        onChange({
                          wirelessMics: { ...data.wirelessMics, wirelessMicsQty: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={`${labelClass} mt-0`}>Type</label>
                    <select
                      className={inputClass}
                      value={data.wirelessMics.wirelessMicsType}
                      onChange={(e) =>
                        onChange({
                          wirelessMics: { ...data.wirelessMics, wirelessMicsType: e.target.value },
                        })
                      }
                    >
                      <option value="">Select typeâ€¦</option>
                      <option>Handhelds</option>
                      <option>Headset Mics</option>
                      <option>Lavalier (Lav) Mics</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Recording */}
            <div>
              <label className={labelClass}>
                Audio Recording?
                <InfoTooltip text="Whether the audio from this session should be captured to a file for post-event distribution or review." />
              </label>
              <YesNo
                value={data.audioRecording}
                onChange={(v) => onChange({ audioRecording: v })}
              />
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€ Stage & Video â”€â”€ */}
      <Group label="Stage & Video" />

      {/* LED Wall */}
      <div>
        <label className={labelClass}>
          LED Wall Required? <span className="text-red-500">*</span>
          <InfoTooltip text="Will this room use an LED video wall as the primary stage backdrop? LED walls deliver the highest visual impact but significantly increase budget. If No, screens will use projection or standard displays." />
        </label>
        <YesNo
          value={data.ledWall}
          onChange={(v) =>
            onChange({
              ledWall: v,
              ...(v !== "Yes"
                ? { ledWallWidth: "", ledWallHeight: "", ledWallShape: "", ledWallPixelPitch: "", ledWallSwitcher: "", ledWallNotes: "", ledWallSpecs: "" }
                : {}),
            })
          }
        />
        {data.ledWall === "Yes" && (
          <div className={subPanelClass}>
            <p className={subPanelHeader}>LED Wall Specifications</p>

            {/* Width + Height */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Width (ft)
                  <InfoTooltip text="Total LED wall width in feet. Walls over 60ft significantly impact budget and trigger a Producer consultation recommendation." />
                </label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="e.g. 80"
                  value={data.ledWallWidth ?? ""}
                  onChange={(e) => onChange({ ledWallWidth: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Height (ft)
                  <InfoTooltip text="Total LED wall height in feet." />
                </label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="e.g. 20"
                  value={data.ledWallHeight ?? ""}
                  onChange={(e) => onChange({ ledWallHeight: e.target.value })}
                />
              </div>
            </div>

            {/* Shape + Pixel Pitch */}
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Shape
                  <InfoTooltip text="Curved LED walls require specialized rigging and content production â€” flag this early as it significantly impacts budget." />
                </label>
                <select
                  className={inputClass}
                  value={data.ledWallShape ?? ""}
                  onChange={(e) => onChange({ ledWallShape: e.target.value })}
                >
                  <option value="">Select shapeâ€¦</option>
                  <option>Flat / Straight</option>
                  <option>Curved</option>
                  <option>Multi-Panel / Segmented</option>
                  <option>Wraparound</option>
                </select>
                {data.ledWallShape === "Curved" && (
                  <p className="mt-1 text-xs text-amber-600 normal-case">
                    Curved LED may trigger a Producer Insight consultation.
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  Pixel Pitch Preference
                  <InfoTooltip text="Finer pixel pitch = sharper image at close range. 1.9mm is premium for stages under 30ft. 3.9mm is acceptable for large arenas." />
                </label>
                <select
                  className={inputClass}
                  value={data.ledWallPixelPitch ?? ""}
                  onChange={(e) => onChange({ ledWallPixelPitch: e.target.value })}
                >
                  <option value="">Select preferenceâ€¦</option>
                  <option>1.9mm or finer (Premium)</option>
                  <option>2.6mm (Standard)</option>
                  <option>3.9mm (Acceptable for distance)</option>
                  <option>Vendor Recommendation</option>
                </select>
              </div>
            </div>

            {/* Switcher */}
            <div className="mb-4">
              <label className={labelClass}>
                Switcher / Processor Requirement
                <InfoTooltip text="The video processor that drives the LED wall. Barco E2 is the industry standard for large-format LED. Specify preference or defer to vendor." />
              </label>
              <select
                className={inputClass}
                value={data.ledWallSwitcher ?? ""}
                onChange={(e) => onChange({ ledWallSwitcher: e.target.value })}
              >
                <option value="">Select preferenceâ€¦</option>
                <option>Barco E2 (Preferred)</option>
                <option>Barco S3</option>
                <option>Roland / Other</option>
                <option>Vendor Recommendation</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass}>
                Additional Notes
                <span className="ml-2 text-xs font-normal normal-case text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                className="w-full resize-none rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#00c2c9] focus:outline-none focus:ring-2 focus:ring-[#00c2c9]/20"
                placeholder="e.g. Center I-MAG playback, lower-third overlays, integration with timecode..."
                value={data.ledWallNotes ?? ""}
                onChange={(e) => onChange({ ledWallNotes: e.target.value })}
              />
            </div>

            {data.ledWallWidth && Number(data.ledWallWidth) >= 60 && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <span className="shrink-0">âš ï¸</span>
                <span>
                  <strong>Large LED Wall:</strong> Walls â‰¥ 60ft may trigger a Producer Insight Call recommendation.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Large Monitors */}
      <div>
        <label className={labelClass}>
          Large Monitors or Screen &amp; Projector?
          <InfoTooltip text="Audience-facing displays for content viewing. Used when LED wall is not specified or in addition to it." />
        </label>
        <YesNo
          value={data.largeMonitorsOrScreenProjector.largeMonitorsOrScreenProjector}
          onChange={(v) =>
            onChange({
              largeMonitorsOrScreenProjector: {
                largeMonitorsOrScreenProjector: v,
                largeMonitorsQty: v !== "Yes" ? "" : data.largeMonitorsOrScreenProjector.largeMonitorsQty,
              },
            })
          }
        />
        {data.largeMonitorsOrScreenProjector.largeMonitorsOrScreenProjector === "Yes" && (
          <input
            className={`${inputClass} mt-3`}
            placeholder="Quantity?"
            value={data.largeMonitorsOrScreenProjector.largeMonitorsQty}
            onChange={(e) =>
              onChange({
                largeMonitorsOrScreenProjector: {
                  ...data.largeMonitorsOrScreenProjector,
                  largeMonitorsQty: e.target.value,
                },
              })
            }
          />
        )}
      </div>

      {/* Video Format / Aspect Ratio */}
      <div>
        <label className={labelClass}>
          Video Format / Aspect Ratio <span className="text-red-500">*</span>
          <InfoTooltip text="What video aspect ratio will source content be produced in? 16:9 HD is most common; 4K is preferred for LED walls and large screens; ultrawide and custom ratios require specialized content production." />
        </label>
        <div className="flex flex-wrap gap-3">
          {[
            "16:9 Native 4K",
            "16:9 Native 1080p HD",
            "21:9 Cinematic / Ultrawide",
            "Custom LED Pixel Map",
            "Multiple Aspect Ratios",
            "Vendor Recommendation",
          ].map((opt) => (
            <PillRadio
              key={opt}
              name={`${uid}-aspect`}
              value={opt}
              checked={data.videoFormatAspectRatio === opt}
              onChange={() => onChange({ videoFormatAspectRatio: opt })}
            />
          ))}
        </div>
      </div>

      {/* Scenic Stage Design */}
      <div>
        <label className={labelClass}>
          Scenic Stage Design Required? <span className="text-red-500">*</span>
          <InfoTooltip text="Do you need custom scenic elements built for the stage â€” set pieces, branded scenic walls, custom podium? Scenic adds production value but increases budget and load-in time. A producer call is recommended." />
        </label>
        <YesNo
          value={data.scenicStageDesign}
          onChange={(v) =>
            onChange({
              scenicStageDesign: v,
              scenicStageDesignNotes: v !== "Yes" ? "" : (data.scenicStageDesignNotes ?? ""),
            })
          }
        />
        {data.scenicStageDesign === "Yes" && (
          <div className={subPanelClass}>
            <p className={subPanelHeader}>Scenic Notes</p>
            <label className={labelClass}>
              Describe Your Scenic Vision
              <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
              <InfoTooltip text="Set pieces, branded elements, color direction, reference materials. You can upload mood boards on Page 8." />
            </label>
            <textarea
              rows={3}
              maxLength={600}
              className="w-full resize-none rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#00c2c9] focus:outline-none focus:ring-2 focus:ring-[#00c2c9]/20"
              placeholder='e.g. "Custom branded scenic wall flanking the LED, integrated lighting, illuminated logo above stage. Reference: minimalist editorial style, dark navy palette."'
              value={data.scenicStageDesignNotes ?? ""}
              onChange={(e) => onChange({ scenicStageDesignNotes: e.target.value })}
            />
            <div className="mt-1 flex justify-between items-center">
              <p className="text-xs text-amber-600 normal-case">
                Scenic stage design may trigger a Producer Insight consultation recommendation.
              </p>
              <span className="text-xs text-[#8f98bf] shrink-0 ml-2">
                {(data.scenicStageDesignNotes ?? "").length}/600
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Video Playback */}
      <div>
        <label className={labelClass}>
          Video Playback?
          <InfoTooltip text="Pre-recorded video content â€” sizzle reels, intro videos, b-roll â€” to be played during the session. Specify the number of clips." />
        </label>
        <YesNo
          value={data.videoPlayback.videoPlayback}
          onChange={(v) =>
            onChange({
              videoPlayback: {
                videoPlayback: v,
                videoPlaybackCount: v !== "Yes" ? "" : data.videoPlayback.videoPlaybackCount,
              },
            })
          }
        />
        {data.videoPlayback.videoPlayback === "Yes" && (
          <input
            className={`${inputClass} mt-3`}
            placeholder="How many clips?"
            value={data.videoPlayback.videoPlaybackCount}
            onChange={(e) =>
              onChange({
                videoPlayback: { ...data.videoPlayback, videoPlaybackCount: e.target.value },
              })
            }
          />
        )}
      </div>

      {/* Cameras */}
      <div>
        <label className={labelClass}>
          Cameras?
          <InfoTooltip text="Camera coverage for IMAG (image magnification on screens) or for video recording. Specify quantity so the AV company can plan camera positions and operators." />
        </label>
        <YesNo
          value={data.cameras.cameras}
          onChange={(v) =>
            onChange({
              cameras: {
                cameras: v,
                camerasQty: v !== "Yes" ? "" : data.cameras.camerasQty,
              },
            })
          }
        />
        {data.cameras.cameras === "Yes" && (
          <input
            className={`${inputClass} mt-3`}
            placeholder="How many cameras?"
            value={data.cameras.camerasQty}
            onChange={(e) =>
              onChange({ cameras: { ...data.cameras, camerasQty: e.target.value } })
            }
          />
        )}
      </div>

      {/* Video Recording */}
      <div>
        <label className={labelClass}>
          Video Recording?
          <InfoTooltip text="Whether the session should be recorded. 'Camera Feed Only' captures the stage image. 'Presentation Only' captures slides. 'Side by Side' combines both." />
        </label>
        <YesNo
          value={data.videoRecording.videoRecording}
          onChange={(v) =>
            onChange({
              videoRecording: {
                videoRecording: v,
                videoRecordingType: v !== "Yes" ? "" : data.videoRecording.videoRecordingType,
              },
            })
          }
        />
        {data.videoRecording.videoRecording === "Yes" && (
          <div className="mt-3 flex flex-wrap gap-3">
            {["Camera Feed Only", "Presentation Only", "Side by Side (Camera and Presentation)", "All The Above"].map(
              (opt) => (
                <PillRadio
                  key={opt}
                  name={`${uid}-recordingType`}
                  value={opt}
                  checked={data.videoRecording.videoRecordingType === opt}
                  onChange={() =>
                    onChange({
                      videoRecording: { ...data.videoRecording, videoRecordingType: opt },
                    })
                  }
                />
              ),
            )}
          </div>
        )}
      </div>

      {/* Presentation Laptops */}
      <div>
        <label className={labelClass}>
          Presentation Laptops?
          <InfoTooltip text="Laptops provided by the AV company to run presenter slideshows or media playback." />
        </label>
        <YesNo
          value={data.presentationLaptops.presentationLaptops}
          onChange={(v) =>
            onChange({
              presentationLaptops: {
                presentationLaptops: v,
                presentationLaptopQty: v !== "Yes" ? "" : data.presentationLaptops.presentationLaptopQty,
              },
            })
          }
        />
        {data.presentationLaptops.presentationLaptops === "Yes" && (
          <input
            className={`${inputClass} mt-3`}
            placeholder="Quantity?"
            value={data.presentationLaptops.presentationLaptopQty}
            onChange={(e) =>
              onChange({
                presentationLaptops: {
                  ...data.presentationLaptops,
                  presentationLaptopQty: e.target.value,
                },
              })
            }
          />
        )}
      </div>

      {/* â”€â”€ Lighting â”€â”€ */}
      <Group label="Lighting" />

      <div>
        <label className={labelClass}>
          Lighting Requirements <span className="text-red-500">*</span>
          <InfoTooltip text="Select all lighting types needed. Backlighting and audience lighting are essential if you have cameras and IMAG. Moving lights add energy but require a Lighting Director (L1) on crew." />
        </label>
        <p className="mb-3 text-xs text-slate-500 normal-case">
          Select all that apply, or select &quot;None / Minimal&quot; if house lighting only.
          {lighting.includes("Moving Lights / Programmable Effects") && (
            <span className="ml-1 text-[#00c2c9] font-semibold">
              L1 (Lighting Director) will be auto-suggested in crew below.
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-3">
          {LIGHTING_OPTIONS.map((opt) => (
            <PillCheckbox
              key={opt}
              label={opt}
              checked={lighting.includes(opt)}
              onChange={() =>
                onChange({
                  lightingRequirements: toggleItem(lighting, opt),
                })
              }
            />
          ))}
        </div>
        {showErrors && lighting.length === 0 && (
          <p className="mt-2 text-sm normal-case text-red-500">
            Please select at least one lighting option or &quot;None / Minimal&quot;.
          </p>
        )}
      </div>

      {/* â”€â”€ Confidence Monitors â”€â”€ */}
      <Group label="Confidence Monitors" />

      <div>
        <label className={labelClass}>
          Confidence Monitors Required? <span className="text-red-500">*</span>
          <InfoTooltip text="Confidence monitors are screens on the front of stage facing presenters, showing their slides and/or notes. Standard for any event with prepared keynote presentations." />
        </label>
        <YesNo
          value={data.confidenceMonitorsRequired}
          onChange={(v) =>
            onChange({
              confidenceMonitorsRequired: v,
              programConfidenceMonitor:
                v !== "Yes"
                  ? { programConfidenceMonitor: "", programConfidenceMonitorQty: "" }
                  : data.programConfidenceMonitor,
              notesConfidenceMonitor:
                v !== "Yes"
                  ? { notesConfidenceMonitor: "", notesConfidenceMonitorQty: "" }
                  : data.notesConfidenceMonitor,
              speakerTimer: v !== "Yes" ? "" : data.speakerTimer,
            })
          }
        />

        {data.confidenceMonitorsRequired === "Yes" && (
          <div className={subPanelClass}>
            <p className={subPanelHeader}>Monitor Sub-Questions</p>
            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className={labelClass}>
                  Program Monitors (qty)
                  <InfoTooltip text="Screens showing the current slide or live program feed â€” what the audience sees. Standard setup: 2 monitors angled toward stage left and stage right." />
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  className={inputClass}
                  placeholder="0"
                  value={data.programConfidenceMonitor?.programConfidenceMonitorQty ?? ""}
                  onChange={(e) =>
                    onChange({
                      programConfidenceMonitor: {
                        programConfidenceMonitor: "Yes",
                        programConfidenceMonitorQty: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>
                  Notes Monitors (qty)
                  <InfoTooltip text="Screens showing speaker notes or teleprompter text. Often combined with teleprompter operators." />
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  className={inputClass}
                  placeholder="0"
                  value={data.notesConfidenceMonitor?.notesConfidenceMonitorQty ?? ""}
                  onChange={(e) =>
                    onChange({
                      notesConfidenceMonitor: {
                        notesConfidenceMonitor: "Yes",
                        notesConfidenceMonitorQty: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>
                  Speaker Timer?
                  <InfoTooltip text="Countdown display visible to the speaker showing remaining session time. Essential for tightly scheduled programs with multiple speakers." />
                </label>
                <YesNo
                  value={data.speakerTimer}
                  onChange={(v) => onChange({ speakerTimer: v })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€ Teleprompter â”€â”€ */}
      <Group label="Teleprompter" />

      <div>
        <label className={labelClass}>
          Teleprompter Required? <span className="text-red-500">*</span>
          <InfoTooltip text="Will any speakers use a teleprompter (scrolling script on glass panels)? Common for CEOs, scripted keynotes, and broadcast-quality productions. Requires a dedicated teleprompter operator." />
        </label>
        <YesNo
          value={data.teleprompterRequired}
          onChange={(v) =>
            onChange({
              teleprompterRequired: v,
              teleprompterBilingual: v !== "Yes" ? "" : data.teleprompterBilingual,
              teleprompterLanguages: v !== "Yes" ? [] : data.teleprompterLanguages,
            })
          }
        />

        {data.teleprompterRequired === "Yes" && (
          <div className={subPanelClass}>
            <p className={subPanelHeader}>Teleprompter Sub-Questions</p>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>
                  Bilingual Teleprompter?
                  <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                  <InfoTooltip text="Will the teleprompter operate in multiple languages simultaneously? Bilingual operators are specialized â€” flag this early. Common for international audiences and dual-language broadcasts." />
                </label>
                <YesNo
                  value={data.teleprompterBilingual}
                  onChange={(v) => onChange({ teleprompterBilingual: v })}
                />
                {data.teleprompterBilingual === "Yes" && (
                  <p className="mt-1 text-xs text-amber-600 normal-case">
                    Bilingual teleprompter may trigger a Producer Insight consultation.
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  Languages
                  <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                  <InfoTooltip text="Languages the teleprompter content will be displayed in. Each additional language typically requires a separate operator. Minimum 2 if bilingual." />
                </label>
                <div className="flex flex-wrap gap-2">
                  {TELEPROMPTER_LANGUAGES.map((lang) => (
                    <PillCheckbox
                      key={lang}
                      label={lang}
                      checked={(data.teleprompterLanguages ?? []).includes(lang)}
                      onChange={() =>
                        onChange({
                          teleprompterLanguages: toggleItem(data.teleprompterLanguages ?? [], lang),
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€ Show Crew â”€â”€ */}
      <Group label="Show Crew" />

      {/* Auto-suggestions banner */}
      {unaddedSuggestions.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-[#00c2c9]/30 bg-[#00c2c9]/5 p-3 text-xs text-[#009198]">
          <span className="shrink-0 font-bold">âš¡</span>
          <div>
            <strong>Auto-suggestions based on your selections:</strong>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {unaddedSuggestions.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() =>
                    onChange({ showCrewNeeded: [...data.showCrewNeeded, role] })
                  }
                  className="rounded-full border border-[#00c2c9]/30 bg-white px-2.5 py-0.5 text-xs font-semibold text-[#009198] hover:bg-[#00c2c9]/10 transition-colors"
                >
                  + {role}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        className={`-mx-1 rounded-lg px-1 py-1 transition-colors ${
          showErrors && data.showCrewNeeded.length === 0 ? "bg-red-50" : ""
        }`}
      >
        <label className={labelClass}>
          Show Crew Needed <span className="text-red-500">*</span>
          <InfoTooltip text="Select all technical crew roles needed for this room. Each role generates a line item in the Show Crew callout bar. Teleprompter Operators and Breakout Room Managers route to the Special Note box." />
        </label>
        <p className="mb-3 text-xs text-slate-400 normal-case">
          Select &quot;Vendor Recommendation Requested&quot; to let the AV vendor propose the right crew.
        </p>
        <div className="flex flex-wrap gap-3">
          {CREW_ROLES.map(({ label: role }) => (
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

        {/* Quantity inputs for selected roles that support qty */}
        {CREW_ROLES.filter(
          ({ label: role, hasQty }) => hasQty && data.showCrewNeeded.includes(role),
        ).length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CREW_ROLES.filter(
              ({ label: role, hasQty }) => hasQty && data.showCrewNeeded.includes(role),
            ).map(({ label: role }) => (
              <div key={role} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#1f2d5d]">{role}</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="h-8 w-14 rounded-md border border-[#d7dce3] bg-white text-center text-sm font-bold text-[#1f2d5d] outline-none focus:border-[#00c2c9] focus:ring-1 focus:ring-[#00c2c9]/20"
                  placeholder="qty"
                  value={crewQty[role] ?? ""}
                  onChange={(e) =>
                    onChange({ showCrewQty: { ...crewQty, [role]: e.target.value } })
                  }
                />
              </div>
            ))}
          </div>
        )}

        {showErrors && data.showCrewNeeded.length === 0 && (
          <p className="mt-2 text-sm normal-case text-red-500">Please select at least one crew role.</p>
        )}
      </div>

      <div>
        <label className={labelClass}>
          Other Roles or Support Needed?{" "}
          <span className="font-normal normal-case tracking-normal text-slate-400 text-xs">(Optional)</span>
          <InfoTooltip text="Any additional positions not listed â€” e.g. LED technician, drone operator, or show caller support." />
        </label>
        <textarea
          rows={3}
          className="w-full resize-none rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#00c2c9] focus:outline-none focus:ring-2 focus:ring-[#00c2c9]/20"
          placeholder="Write hereâ€¦"
          value={data.otherRolesNeeded}
          onChange={(e) => onChange({ otherRolesNeeded: e.target.value })}
        />
      </div>

      {/* â”€â”€ Union Labor â”€â”€ */}
      <div
        className={`-mx-1 rounded-lg px-1 py-1 transition-colors ${
          showErrors && !data.unionLabor ? "bg-red-50" : ""
        }`}
      >
        <label className={labelClass}>
          Will this room require union labor? <span className="text-red-500">*</span>
          <InfoTooltip text="Some venues mandate certified union AV technicians (IATSE, IBEW). This affects crew costs, call times, and scheduling lead time â€” all flagged in Section 6 of the RFP." />
        </label>
        <div className="flex flex-wrap gap-3">
          {(["Yes", "No", "Not Sure"] as const).map((opt) => (
            <PillRadio
              key={opt}
              name={`${uid}-union`}
              value={opt}
              checked={data.unionLabor === opt}
              onChange={() => onChange({ unionLabor: opt })}
            />
          ))}
        </div>
        {showErrors && !data.unionLabor && (
          <p className="mt-2 text-sm normal-case text-red-500">Please select an option.</p>
        )}
      </div>
    </div>
  );
};

// â”€â”€â”€ Room accordion card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RoomCard = ({
  room,
  index,
  total,
  isExpanded,
  onToggle,
  onChange,
  showErrors,
}: {
  room: RoomByRoomData;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (u: Partial<RoomByRoomData>) => void;
  showErrors: boolean;
}) => {
  const roomLabel = room.roomFunction.trim() || `Room ${index + 1}`;

  return (
    <div className="overflow-hidden rounded-xl border border-[#d7dce3] bg-white">
      <div
        className="flex cursor-pointer items-center justify-between px-5 py-4 transition-colors hover:bg-slate-50"
        style={{ borderBottom: isExpanded ? "1px solid #d7dce3" : "none" }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #00c2c9 0%, #06b6d4 30%, #0ea5e9 60%, #2563eb 100%)" }}
          >
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-bold text-[#1f2d5d]">
              {roomLabel}
              <span className="ml-2 text-xs font-normal text-[#8f98bf]">
                Room {index + 1} of {total}
              </span>
            </p>
            {!isExpanded && room.estimatedAttendeesInRoom && (
              <p className="text-xs text-[#8f98bf]">{room.estimatedAttendeesInRoom} attendees</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <div className="ml-1 text-[#8f98bf]">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <RoomForm
          data={room}
          onChange={onChange}
          showErrors={showErrors}
          roomIndex={index}
        />
      )}
    </div>
  );
};

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Props {
  rooms: RoomByRoomData[];
  onRoomsChange: (rooms: RoomByRoomData[]) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
  isInPersonOnly?: boolean;
}

const RoomAndProductionStep = ({
  rooms,
  onRoomsChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
  isInPersonOnly = false,
}: Props) => {
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set([0]));

  const toggleRoom = (i: number) =>
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const updateRoom = (i: number, updates: Partial<RoomByRoomData>) =>
    onRoomsChange(rooms.map((r, idx) => (idx === i ? { ...r, ...updates } : r)));

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#00c2c9]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#00c2c9]">
            Page 2B of 9
          </span>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-600">
            Repeating Module
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Room Specifications</h2>
        <p className="mt-1 text-sm text-[#8f98bf]">
          One module per room â€” each room generates its own section in the RFP.
        </p>
      </div>

      {/* Rooms */}
      <div className="flex-1 space-y-3 px-6 py-6">
        {rooms.map((room, i) => (
          <div key={i}>
            <RoomCard
              room={room}
              index={i}
              total={rooms.length}
              isExpanded={expandedRooms.has(i)}
              onToggle={() => toggleRoom(i)}
              onChange={(u) => updateRoom(i, u)}
              showErrors={showErrors}
            />
          </div>
        ))}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-[#d7dce3] px-5 py-2.5 text-sm font-semibold text-[#1f2d5d] hover:bg-[#f5f7ff] transition-colors"
        >
          â† Venue &amp; Schedule
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 rounded-lg bg-[#00c2c9] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(0,194,201,0.35)] hover:bg-[#009198] transition-colors active:scale-95"
        >
          {isInPersonOnly ? "Content & Creative" : "Hybrid & Virtual"} â†’
        </button>
      </div>
    </section>
  );
};

export default RoomAndProductionStep;
