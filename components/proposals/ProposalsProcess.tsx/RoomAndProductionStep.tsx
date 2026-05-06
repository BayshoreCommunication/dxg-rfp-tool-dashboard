"use client";

import GlobalDateTimeInput from "@/components/shared/GlobalDateTimeInput";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { ProposalSettings, RoomByRoomData } from "../AddNewProposal";
import { InfoTooltip, PillCheckbox, PillRadio, toggleItem } from "./shared";

// ─── Style constants ─────────────────────────────────────────────────────────
const labelClass =
  "mb-2 block text-sm font-semibold text-[#8f98bf] uppercase tracking-wide";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";
const prodLabelClass =
  "mb-3 block text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";

// ─── Date helpers ─────────────────────────────────────────────────────────────
const normalizeDateFormat = (format: string) =>
  (format || "MM/DD/YYYY").replaceAll("_", "-").toUpperCase();

type DateTimePickerFormat = "dd-MM-yyyy" | "yyyy-MM-dd" | "MM-dd-yyyy";

const toPickerFormat = (displayFormat: string): DateTimePickerFormat => {
  const f = displayFormat.toUpperCase();
  if (f === "DD/MM/YYYY") return "dd-MM-yyyy";
  if (f === "YYYY-MM-DD") return "yyyy-MM-dd";
  return "MM-dd-yyyy";
};

const fromStringToDate = (value?: string) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const fromDateToString = (value: Date | null) => {
  if (!value) return "";
  const y = value.getFullYear();
  const mo = `${value.getMonth() + 1}`.padStart(2, "0");
  const d = `${value.getDate()}`.padStart(2, "0");
  const h = `${value.getHours()}`.padStart(2, "0");
  const mi = `${value.getMinutes()}`.padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
};

// ─── Tooltip text for date/time fields ───────────────────────────────────────
const dateTips: Record<string, string> = {
  "Load-in": "When AV crew arrives to set up equipment — typically several hours before show time.",
  "Rehearsal": "Scheduled time for speaker run-throughs or technical checks with live AV.",
  "Show Start": "Official start time of the program in this room.",
  "Show End": "Expected wrap time for the program. Affects crew hours and teardown schedule.",
};

// ─── Default room factory ────────────────────────────────────────────────────
export const defaultRoom = (): RoomByRoomData => ({
  roomFunction: "",
  estimatedAttendeesInRoom: "",
  loadInDateTime: "",
  rehearsalDateTime: "",
  showStartDateTime: "",
  showEndDateTime: "",
  audioSystemForHowManyPpl: "",
  podiumMic: { podiumMic: "", podiumMicQty: "" },
  wirelessMics: { wirelessMics: "", wirelessMicsQty: "", wirelessMicsType: "" },
  audioRecording: "",
  largeMonitorsOrScreenProjector: {
    largeMonitorsOrScreenProjector: "",
    largeMonitorsQty: "",
  },
  ledWall: "",
  clientProvideOwnPresentationLaptop: {
    clientProvideOwnPresentationLaptop: "",
    clientLaptopQty: "",
  },
  presentationLaptops: { presentationLaptops: "", presentationLaptopQty: "" },
  videoPlayback: { videoPlayback: "", videoPlaybackCount: "" },
  videoFormatAspectRatio: "",
  audienceQa: { audienceQa: "", audienceQaMethod: "" },
  cameras: { cameras: "", camerasQty: "" },
  videoRecording: { videoRecording: "", videoRecordingType: "" },
  stageWashLighting: {
    stageWashLighting: "",
    stageWashLightingStageSize: "",
  },
  backlightingFor: "",
  drapeOrScenicUplighting: "",
  audienceLighting: "",
  programConfidenceMonitor: {
    programConfidenceMonitor: "",
    programConfidenceMonitorQty: "",
  },
  notesConfidenceMonitor: {
    notesConfidenceMonitor: "",
    notesConfidenceMonitorQty: "",
  },
  speakerTimer: "",
  scenicStageDesign: "",
  contentVideoNeeds: "",
  unionLabor: "",
  showCrewNeeded: [],
  otherRolesNeeded: "",
});

// ─── Shared field components ──────────────────────────────────────────────────
const YesNoField = ({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex gap-6">
    {["Yes", "No"].map((opt) => (
      <label
        key={`${name}-${opt}`}
        className="flex cursor-pointer items-center gap-2 text-sm text-[#1f2d5d]"
      >
        <input
          type="radio"
          name={name}
          checked={value === opt}
          onChange={() => onChange(opt)}
          className="h-4 w-4 accent-[#35bdf2]"
        />
        {opt}
      </label>
    ))}
  </div>
);

const YesNoWithQty = ({
  name,
  value,
  qty,
  onValueChange,
  onQtyChange,
}: {
  name: string;
  value: string;
  qty: string;
  onValueChange: (v: string) => void;
  onQtyChange: (v: string) => void;
}) => (
  <div className="space-y-3">
    <YesNoField name={name} value={value} onChange={onValueChange} />
    {value === "Yes" && (
      <input
        className={inputClass}
        placeholder="How many?"
        value={qty}
        onChange={(e) => onQtyChange(e.target.value)}
      />
    )}
  </div>
);

const RadioOptionsField = ({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-wrap gap-6">
    {options.map((opt) => (
      <label
        key={`${name}-${opt}`}
        className="flex cursor-pointer items-center gap-2 text-sm text-[#1f2d5d]"
      >
        <input
          type="radio"
          name={name}
          checked={value === opt}
          onChange={() => onChange(opt)}
          className="h-4 w-4 accent-[#35bdf2]"
        />
        {opt}
      </label>
    ))}
  </div>
);

// ─── Crew roles ───────────────────────────────────────────────────────────────
const CREW_ROLES = [
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

// ─── Single room form ─────────────────────────────────────────────────────────
interface RoomFormProps {
  data: RoomByRoomData;
  onChange: (updates: Partial<RoomByRoomData>) => void;
  showErrors: boolean;
  pickerFormat: DateTimePickerFormat;
  roomIndex: number;
}

const RoomForm = ({
  data,
  onChange,
  showErrors,
  pickerFormat,
  roomIndex,
}: RoomFormProps) => {
  const err = (v: string) => showErrors && !v.trim();
  const uid = `room-${roomIndex}`;

  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <label className={labelClass}>
          Room Name or Function <span className="text-red-500">*</span>
          <InfoTooltip text="The name of this room or its purpose — e.g. Main Ballroom, Breakout Room A. Used to identify each space in the proposal." />
        </label>
        <input
          className={`${inputClass} ${err(data.roomFunction) ? "border-red-500" : ""}`}
          value={data.roomFunction}
          onChange={(e) => onChange({ roomFunction: e.target.value })}
          placeholder="e.g. Main Ballroom, Breakout Room A"
        />
      </div>

      <div>
        <label className={labelClass}>
          Estimated Attendees <span className="text-red-500">*</span>
          <InfoTooltip text="Number of guests expected in this specific room. Used to size audio coverage and seating layout." />
        </label>
        <input
          className={`${inputClass} ${err(data.estimatedAttendeesInRoom) ? "border-red-500" : ""}`}
          value={data.estimatedAttendeesInRoom}
          onChange={(e) =>
            onChange({ estimatedAttendeesInRoom: e.target.value })
          }
          placeholder="Enter attendee count"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(
          [
            { key: "loadInDateTime", label: "Load-in" },
            { key: "rehearsalDateTime", label: "Rehearsal" },
          ] as const
        ).map(({ key, label }) => (
          <div key={key}>
            <label className="mb-2 flex items-center gap-1 text-sm font-semibold text-[#8f98bf]">
              {label} <span className="text-red-500">*</span>
              <InfoTooltip text={dateTips[label] ?? ""} />
            </label>
            <GlobalDateTimeInput
              label={label}
              value={fromStringToDate(data[key])}
              onChange={(d) => onChange({ [key]: fromDateToString(d) })}
              format={pickerFormat}
              showTime
              use12Hours
              hideLabel
              showFormatInLabel={false}
              showErrorMessage={false}
              inputClassName={`${inputClass} pr-10 ${err(data[key]) ? "border-red-500" : ""}`}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(
          [
            { key: "showStartDateTime", label: "Show Start" },
            { key: "showEndDateTime", label: "Show End" },
          ] as const
        ).map(({ key, label }) => (
          <div key={key}>
            <label className="mb-2 flex items-center gap-1 text-sm font-semibold text-[#8f98bf]">
              {label} <span className="text-red-500">*</span>
              <InfoTooltip text={dateTips[label] ?? ""} />
            </label>
            <GlobalDateTimeInput
              label={label}
              value={fromStringToDate(data[key])}
              onChange={(d) => onChange({ [key]: fromDateToString(d) })}
              format={pickerFormat}
              showTime
              use12Hours
              hideLabel
              showFormatInLabel={false}
              showErrorMessage={false}
              inputClassName={`${inputClass} pr-10 ${err(data[key]) ? "border-red-500" : ""}`}
            />
          </div>
        ))}
      </div>

      <div>
        <label className={labelClass}>
          Audio System — How Many People
          <InfoTooltip text="Size of the audience this audio system needs to cover in this room. Helps determine speaker placement and amplification." />
        </label>
        <input
          className={inputClass}
          value={data.audioSystemForHowManyPpl}
          onChange={(e) =>
            onChange({ audioSystemForHowManyPpl: e.target.value })
          }
          placeholder="Enter people count"
        />
      </div>

      {/* Podium Mic */}
      <div>
        <label className={labelClass}>
          Podium Mic
          <InfoTooltip text="A fixed microphone mounted at the lectern or podium for standing presenters." />
        </label>
        <YesNoField
          name={`${uid}-podiumMic`}
          value={data.podiumMic.podiumMic}
          onChange={(v) =>
            onChange({
              podiumMic: {
                ...data.podiumMic,
                podiumMic: v,
                podiumMicQty: v !== "Yes" ? "" : data.podiumMic.podiumMicQty,
              },
            })
          }
        />
      </div>

      {/* Wireless Mics */}
      <div>
        <label className={labelClass}>
          Wireless Mics
          <InfoTooltip text="Battery-powered microphones for speakers who move around the stage or audience area." />
        </label>
        <div className="space-y-3">
          <YesNoWithQty
            name={`${uid}-wirelessMics`}
            value={data.wirelessMics.wirelessMics}
            qty={data.wirelessMics.wirelessMicsQty}
            onValueChange={(v) =>
              onChange({
                wirelessMics: {
                  wirelessMics: v,
                  wirelessMicsQty:
                    v !== "Yes" ? "" : data.wirelessMics.wirelessMicsQty,
                  wirelessMicsType:
                    v !== "Yes" ? "" : data.wirelessMics.wirelessMicsType,
                },
              })
            }
            onQtyChange={(v) =>
              onChange({
                wirelessMics: { ...data.wirelessMics, wirelessMicsQty: v },
              })
            }
          />
          {data.wirelessMics.wirelessMics === "Yes" && (
            <div>
              <label className={labelClass}>
                Wireless Mic Type
                <InfoTooltip text="Choose between handheld (held by speaker) or headset (worn on head) wireless microphones." />
              </label>
              <RadioOptionsField
                name={`${uid}-wirelessMicsType`}
                value={data.wirelessMics.wirelessMicsType}
                options={["Handhelds", "Headset Mics"]}
                onChange={(v) =>
                  onChange({
                    wirelessMics: { ...data.wirelessMics, wirelessMicsType: v },
                  })
                }
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Audio Recording
          <InfoTooltip text="Whether you need the audio from this session captured to a file for post-event distribution or review." />
        </label>
        <YesNoField
          name={`${uid}-audioRecording`}
          value={data.audioRecording}
          onChange={(v) => onChange({ audioRecording: v })}
        />
      </div>

      <div>
        <label className={labelClass}>
          Large Monitors or Screen &amp; Projector
          <InfoTooltip text="Displays for audience viewing — either large flat-panel monitors or a projected image on a screen." />
        </label>
        <YesNoWithQty
          name={`${uid}-largeMonitors`}
          value={
            data.largeMonitorsOrScreenProjector.largeMonitorsOrScreenProjector
          }
          qty={data.largeMonitorsOrScreenProjector.largeMonitorsQty}
          onValueChange={(v) =>
            onChange({
              largeMonitorsOrScreenProjector: {
                largeMonitorsOrScreenProjector: v,
                largeMonitorsQty:
                  v !== "Yes"
                    ? ""
                    : data.largeMonitorsOrScreenProjector.largeMonitorsQty,
              },
            })
          }
          onQtyChange={(v) =>
            onChange({
              largeMonitorsOrScreenProjector: {
                ...data.largeMonitorsOrScreenProjector,
                largeMonitorsQty: v,
              },
            })
          }
        />
      </div>

      <div>
        <label className={labelClass}>
          LED Wall
          <InfoTooltip text="A modular LED display panel system for high-impact visuals, video playback, or branded backdrops." />
        </label>
        <YesNoField
          name={`${uid}-ledWall`}
          value={data.ledWall}
          onChange={(v) => onChange({ ledWall: v })}
        />
      </div>

      <div>
        <label className={labelClass}>
          Client Provide Own Presentation Laptop
          <InfoTooltip text="Whether the presenter will bring their own laptop to drive the slides. If No, DXG can provide one." />
        </label>
        <YesNoWithQty
          name={`${uid}-clientLaptop`}
          value={
            data.clientProvideOwnPresentationLaptop
              .clientProvideOwnPresentationLaptop
          }
          qty={data.clientProvideOwnPresentationLaptop.clientLaptopQty}
          onValueChange={(v) =>
            onChange({
              clientProvideOwnPresentationLaptop: {
                clientProvideOwnPresentationLaptop: v,
                clientLaptopQty:
                  v !== "Yes"
                    ? ""
                    : data.clientProvideOwnPresentationLaptop.clientLaptopQty,
              },
            })
          }
          onQtyChange={(v) =>
            onChange({
              clientProvideOwnPresentationLaptop: {
                ...data.clientProvideOwnPresentationLaptop,
                clientLaptopQty: v,
              },
            })
          }
        />
      </div>

      <div>
        <label className={labelClass}>
          Presentation Laptops
          <InfoTooltip text="Laptops provided by DXG for running presenter slideshows or media playback." />
        </label>
        <YesNoWithQty
          name={`${uid}-presentationLaptops`}
          value={data.presentationLaptops.presentationLaptops}
          qty={data.presentationLaptops.presentationLaptopQty}
          onValueChange={(v) =>
            onChange({
              presentationLaptops: {
                presentationLaptops: v,
                presentationLaptopQty:
                  v !== "Yes"
                    ? ""
                    : data.presentationLaptops.presentationLaptopQty,
              },
            })
          }
          onQtyChange={(v) =>
            onChange({
              presentationLaptops: {
                ...data.presentationLaptops,
                presentationLaptopQty: v,
              },
            })
          }
        />
      </div>

      <div>
        <label className={labelClass}>
          Video Playback
          <InfoTooltip text="Pre-recorded video content — sizzle reels, intro videos, or b-roll — to be played during the event." />
        </label>
        <div className="space-y-3">
          <YesNoField
            name={`${uid}-videoPlayback`}
            value={data.videoPlayback.videoPlayback}
            onChange={(v) =>
              onChange({
                videoPlayback: {
                  videoPlayback: v,
                  videoPlaybackCount:
                    v !== "Yes" ? "" : data.videoPlayback.videoPlaybackCount,
                },
              })
            }
          />
          {data.videoPlayback.videoPlayback === "Yes" && (
            <input
              className={inputClass}
              value={data.videoPlayback.videoPlaybackCount}
              onChange={(e) =>
                onChange({
                  videoPlayback: {
                    ...data.videoPlayback,
                    videoPlaybackCount: e.target.value,
                  },
                })
              }
              placeholder="How many?"
            />
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Video Format / Aspect Ratio
          <InfoTooltip text="The screen dimensions your content was designed for — 16:9 is standard widescreen." />
        </label>
        <RadioOptionsField
          name={`${uid}-aspectRatio`}
          value={data.videoFormatAspectRatio}
          options={["16:9 format", "Unique Aspect Ratio", "Both"]}
          onChange={(v) => onChange({ videoFormatAspectRatio: v })}
        />
      </div>

      <div>
        <label className={labelClass}>
          Audience Q&amp;A
          <InfoTooltip text="Whether the audience will ask questions during the session and how they'll submit them." />
        </label>
        <div className="space-y-3">
          <YesNoField
            name={`${uid}-audienceQa`}
            value={data.audienceQa.audienceQa}
            onChange={(v) =>
              onChange({
                audienceQa: {
                  audienceQa: v,
                  audienceQaMethod:
                    v !== "Yes" ? "" : data.audienceQa.audienceQaMethod,
                },
              })
            }
          />
          {data.audienceQa.audienceQa === "Yes" && (
            <RadioOptionsField
              name={`${uid}-qaMethod`}
              value={data.audienceQa.audienceQaMethod}
              options={["Via an App", "Passing a Microphone", "Both"]}
              onChange={(v) =>
                onChange({
                  audienceQa: { ...data.audienceQa, audienceQaMethod: v },
                })
              }
            />
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Cameras
          <InfoTooltip text="Camera coverage for IMAG (image magnification on screens) or for recording the event." />
        </label>
        <YesNoWithQty
          name={`${uid}-cameras`}
          value={data.cameras.cameras}
          qty={data.cameras.camerasQty}
          onValueChange={(v) =>
            onChange({
              cameras: {
                cameras: v,
                camerasQty: v !== "Yes" ? "" : data.cameras.camerasQty,
              },
            })
          }
          onQtyChange={(v) =>
            onChange({ cameras: { ...data.cameras, camerasQty: v } })
          }
        />
      </div>

      <div>
        <label className={labelClass}>
          Video Recording
          <InfoTooltip text="Whether the event should be recorded for post-event distribution, review, or archive." />
        </label>
        <div className="space-y-3">
          <YesNoField
            name={`${uid}-videoRecording`}
            value={data.videoRecording.videoRecording}
            onChange={(v) =>
              onChange({
                videoRecording: {
                  videoRecording: v,
                  videoRecordingType:
                    v !== "Yes" ? "" : data.videoRecording.videoRecordingType,
                },
              })
            }
          />
          {data.videoRecording.videoRecording === "Yes" && (
            <RadioOptionsField
              name={`${uid}-recordingType`}
              value={data.videoRecording.videoRecordingType}
              options={[
                "Camera Feed Only",
                "Presentation Only",
                "Side by Side (Camera and Presentation)",
                "All The Above",
              ]}
              onChange={(v) =>
                onChange({
                  videoRecording: {
                    ...data.videoRecording,
                    videoRecordingType: v,
                  },
                })
              }
            />
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Stage Wash Lighting
          <InfoTooltip text="Broad lighting that illuminates the entire stage area evenly so presenters are clearly visible." />
        </label>
        <div className="space-y-3">
          <YesNoField
            name={`${uid}-stageWash`}
            value={data.stageWashLighting.stageWashLighting}
            onChange={(v) =>
              onChange({
                stageWashLighting: {
                  stageWashLighting: v,
                  stageWashLightingStageSize:
                    v !== "Yes"
                      ? ""
                      : data.stageWashLighting.stageWashLightingStageSize,
                },
              })
            }
          />
          {data.stageWashLighting.stageWashLighting === "Yes" && (
            <input
              className={inputClass}
              value={data.stageWashLighting.stageWashLightingStageSize}
              onChange={(e) =>
                onChange({
                  stageWashLighting: {
                    ...data.stageWashLighting,
                    stageWashLightingStageSize: e.target.value,
                  },
                })
              }
              placeholder="Enter stage size"
            />
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Backlighting for Video
          <InfoTooltip text="Lighting placed behind subjects to separate them from the background — improves on-camera image quality." />
        </label>
        <YesNoField
          name={`${uid}-backlighting`}
          value={data.backlightingFor}
          onChange={(v) => onChange({ backlightingFor: v })}
        />
      </div>

      <div>
        <label className={labelClass}>
          Drape or Scenic Uplighting
          <InfoTooltip text="Colored lights directed upward at drape or scenic elements to create mood and ambiance." />
        </label>
        <YesNoField
          name={`${uid}-drape`}
          value={data.drapeOrScenicUplighting}
          onChange={(v) => onChange({ drapeOrScenicUplighting: v })}
        />
      </div>

      <div>
        <label className={labelClass}>
          Audience Lighting
          <InfoTooltip text="Lighting in the seating area — for ambiance, reading programs, or audience participation moments." />
        </label>
        <YesNoField
          name={`${uid}-audienceLighting`}
          value={data.audienceLighting}
          onChange={(v) => onChange({ audienceLighting: v })}
        />
      </div>

      <div>
        <label className={labelClass}>
          Program Confidence Monitor
          <InfoTooltip text="A screen facing the presenter showing the current slide or live program feed so they can reference it without turning around." />
        </label>
        <YesNoWithQty
          name={`${uid}-progMonitor`}
          value={data.programConfidenceMonitor?.programConfidenceMonitor || ""}
          qty={data.programConfidenceMonitor?.programConfidenceMonitorQty || ""}
          onValueChange={(v) =>
            onChange({
              programConfidenceMonitor: {
                ...data.programConfidenceMonitor,
                programConfidenceMonitor: v,
                programConfidenceMonitorQty:
                  v === "Yes"
                    ? data.programConfidenceMonitor
                        ?.programConfidenceMonitorQty || ""
                    : "",
              },
            })
          }
          onQtyChange={(v) =>
            onChange({
              programConfidenceMonitor: {
                ...data.programConfidenceMonitor,
                programConfidenceMonitorQty: v,
              },
            })
          }
        />
      </div>

      <div>
        <label className={labelClass}>
          Notes Confidence Monitor
          <InfoTooltip text="A screen facing the presenter showing speaker notes or a teleprompter feed." />
        </label>
        <YesNoWithQty
          name={`${uid}-notesMonitor`}
          value={data.notesConfidenceMonitor?.notesConfidenceMonitor || ""}
          qty={data.notesConfidenceMonitor?.notesConfidenceMonitorQty || ""}
          onValueChange={(v) =>
            onChange({
              notesConfidenceMonitor: {
                ...data.notesConfidenceMonitor,
                notesConfidenceMonitor: v,
                notesConfidenceMonitorQty:
                  v === "Yes"
                    ? data.notesConfidenceMonitor?.notesConfidenceMonitorQty ||
                      ""
                    : "",
              },
            })
          }
          onQtyChange={(v) =>
            onChange({
              notesConfidenceMonitor: {
                ...data.notesConfidenceMonitor,
                notesConfidenceMonitorQty: v,
              },
            })
          }
        />
      </div>

      <div>
        <label className={labelClass}>
          Speaker Timer
          <InfoTooltip text="A countdown display visible to the speaker so they can pace their presentation and stay on schedule." />
        </label>
        <YesNoField
          name={`${uid}-speakerTimer`}
          value={data.speakerTimer}
          onChange={(v) => onChange({ speakerTimer: v })}
        />
      </div>

      <div>
        <label className={labelClass}>
          Scenic / Stage Design
          <InfoTooltip text="Custom set pieces, branded backdrops, or scenic elements beyond standard AV staging." />
        </label>
        <YesNoField
          name={`${uid}-scenic`}
          value={data.scenicStageDesign}
          onChange={(v) => onChange({ scenicStageDesign: v as "Yes" | "No" | "" })}
        />
      </div>

      <div>
        <label className={labelClass}>
          Describe your content or video needs
          <InfoTooltip text="Describe any custom graphics, animated content, live switching, or video production required for this room." />
        </label>
        <textarea
          rows={4}
          className="w-full resize-none rounded-md border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          placeholder="Describe your requirements..."
          value={data.contentVideoNeeds}
          onChange={(e) => onChange({ contentVideoNeeds: e.target.value })}
        />
      </div>

      {/* Union Labor */}
      <div
        className={`-m-1 rounded-lg p-4 transition-colors ${
          showErrors && !data.unionLabor ? "bg-red-50" : ""
        }`}
      >
        <label className={prodLabelClass}>
          Will this venue require union labor?{" "}
          <span className="text-red-500">*</span>
          <InfoTooltip text="Some venues mandate certified union AV technicians. This affects crew costs and scheduling lead time." />
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
          <p className="mt-2 text-sm normal-case text-red-500">
            Please select an option.
          </p>
        )}
      </div>

      {/* Show Crew Needed */}
      <div
        className={`-m-1 rounded-lg p-4 transition-colors ${
          showErrors && data.showCrewNeeded.length === 0 ? "bg-red-50" : ""
        }`}
      >
        <label className={prodLabelClass}>
          Show Crew Needed <span className="text-red-500">*</span>
          <InfoTooltip text="Select all technical crew roles needed for this room's production. Each role represents a specialized position." />
        </label>
        <div className="flex flex-wrap gap-3">
          {CREW_ROLES.map((role) => (
            <PillCheckbox
              key={role}
              label={role}
              checked={data.showCrewNeeded.includes(role)}
              onChange={() =>
                onChange({
                  showCrewNeeded: toggleItem(data.showCrewNeeded, role),
                })
              }
            />
          ))}
        </div>
        {showErrors && data.showCrewNeeded.length === 0 && (
          <p className="mt-2 text-sm normal-case text-red-500">
            Please select at least one crew role.
          </p>
        )}
      </div>

      {/* Other Roles */}
      <div>
        <label className={prodLabelClass}>
          Other Roles or Support Needed?{" "}
          <span className="font-normal normal-case tracking-normal text-[#8f98bf]">
            (Optional)
          </span>
          <InfoTooltip text="Any additional crew positions not listed above — e.g. LED technician, drone operator, hair & makeup, or show caller support." />
        </label>
        <textarea
          rows={4}
          value={data.otherRolesNeeded}
          onChange={(e) => onChange({ otherRolesNeeded: e.target.value })}
          placeholder="Write here..."
          className="w-full resize-none rounded-md border border-[#d7dce3] bg-white px-4 py-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </div>
    </div>
  );
};

// ─── Room accordion card ──────────────────────────────────────────────────────
interface RoomCardProps {
  room: RoomByRoomData;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updates: Partial<RoomByRoomData>) => void;
  onDelete: () => void;
  showErrors: boolean;
  pickerFormat: DateTimePickerFormat;
}

const RoomCard = ({
  room,
  index,
  total,
  isExpanded,
  onToggle,
  onChange,
  onDelete,
  showErrors,
  pickerFormat,
}: RoomCardProps) => {
  const roomLabel = room.roomFunction.trim() || `Room ${index + 1}`;

  return (
    <div className="rounded-xl border border-[#d7dce3] bg-white overflow-hidden">
      {/* Card header */}
      <div
        className="flex cursor-pointer items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
        style={{ borderBottom: isExpanded ? "1px solid #d7dce3" : "none" }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #35bdf2, #6366f1)" }}
          >
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-bold text-[#1f2d5d]">{roomLabel}</p>
            {!isExpanded && room.estimatedAttendeesInRoom && (
              <p className="text-xs text-[#8f98bf]">
                {room.estimatedAttendeesInRoom} attendees
              </p>
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {total > 1 && (
            <button
              type="button"
              onClick={onDelete}
              title="Remove this room"
              className="rounded-lg border border-[#d7dce3] bg-white p-1.5 text-[#8f98bf] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-400"
            >
              <Trash2 size={13} />
            </button>
          )}
          <div className="ml-1 text-[#8f98bf]">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded form */}
      {isExpanded && (
        <RoomForm
          data={room}
          onChange={onChange}
          showErrors={showErrors}
          pickerFormat={pickerFormat}
          roomIndex={index}
        />
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
interface RoomAndProductionStepProps {
  rooms: RoomByRoomData[];
  onRoomsChange: (rooms: RoomByRoomData[]) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
}

const RoomAndProductionStep = ({
  rooms,
  onRoomsChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
}: RoomAndProductionStepProps) => {
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set([0]));

  const currentDateFormat = normalizeDateFormat(
    proposalSettings.proposals.dateFormat,
  );
  const pickerFormat = toPickerFormat(currentDateFormat);

  const toggleRoom = (i: number) =>
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const addRoom = () => {
    const newRooms = [...rooms, defaultRoom()];
    onRoomsChange(newRooms);
    setExpandedRooms((prev) => new Set([...prev, newRooms.length - 1]));
  };

  const copyRoom = (i: number) => {
    const newRooms = [...rooms, { ...rooms[i] }];
    onRoomsChange(newRooms);
    setExpandedRooms((prev) => new Set([...prev, newRooms.length - 1]));
  };

  const deleteRoom = (i: number) => {
    if (rooms.length === 1) return;
    onRoomsChange(rooms.filter((_, idx) => idx !== i));
    setExpandedRooms((prev) => {
      const next = new Set<number>();
      prev.forEach((n) => {
        if (n < i) next.add(n);
        else if (n > i) next.add(n - 1);
      });
      return next;
    });
  };

  const updateRoom = (i: number, updates: Partial<RoomByRoomData>) => {
    onRoomsChange(
      rooms.map((r, idx) => (idx === i ? { ...r, ...updates } : r)),
    );
  };

  const clearRoom = (i: number) => {
    onRoomsChange(rooms.map((r, idx) => (idx === i ? defaultRoom() : r)));
  };

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{
        fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)`,
      }}
    >
      {/* ── Header ── */}
      <div className="border-b border-[#d7dce3] px-6 py-5">
        <h2 className="text-[20px] font-semibold text-[#0f1b57]">
          Room-by-Room AV Needs &amp; Production
        </h2>
        <p className="mt-0.5 text-sm text-[#8f98bf]">
          Add one section per event room, then fill in your production crew
          details below.
        </p>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-6 py-6 space-y-4">
        {/* Rooms list */}
        <div className="space-y-3">
          {rooms.map((room, i) => (
            <div key={i}>
              <RoomCard
                room={room}
                index={i}
                total={rooms.length}
                isExpanded={expandedRooms.has(i)}
                onToggle={() => toggleRoom(i)}
                onChange={(u) => updateRoom(i, u)}
                onDelete={() => deleteRoom(i)}
                showErrors={showErrors}
                pickerFormat={pickerFormat}
              />
              {/* Per-room actions — only visible when expanded */}
              {expandedRooms.has(i) && (
                <div className="mt-1 flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => clearRoom(i)}
                    className="flex items-center gap-2 text-sm font-semibold text-[#8f98bf] hover:text-red-400 transition-colors"
                  >
                    <RotateCcw size={15} />
                    CLEAR
                  </button>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => copyRoom(i)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#d7dce3] bg-white px-2.5 py-2 text-xs font-semibold text-[#8f98bf] transition-colors hover:border-sky-300 hover:text-[#35bdf2] cursor-pointer"
                    >
                      <Copy size={12} />
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={addRoom}
                      className="flex items-center gap-1.5 rounded-lg bg-[#35bdf2] px-2.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#20A4D5] cursor-pointer"
                    >
                      <Plus size={12} />
                      Add Room
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between border-t border-[#d7dce3] px-6 py-4">
        <div className="text-xs text-[#8f98bf]">
          {rooms.length} room{rooms.length !== 1 ? "s" : ""} added
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-10 rounded-md border border-[#d7dce3] px-6 text-sm font-semibold text-[#1f2d5d] transition-colors hover:bg-gray-50"
          >
            BACK
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="h-10 rounded-md bg-[#35bdf2] px-8 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(56,189,248,0.39)] transition-transform active:scale-95 hover:bg-[#20A4D5]"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </section>
  );
};

export default RoomAndProductionStep;
