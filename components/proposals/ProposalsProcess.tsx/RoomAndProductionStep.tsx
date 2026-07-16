"use client";

import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Copy, Download, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import type { ProposalSettings, RoomByRoomData } from "../AddNewProposal";
import { InfoTooltip, PillCheckbox, PillRadio, toggleItem } from "./shared";
import GlobalDateTimeInput from "@/components/shared/GlobalDateTimeInput";
import { normalizeScheduleTimesAction } from "@/app/actions/proposals";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const dayOfWeekFromDate = (isoDate: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? "" : WEEKDAY_NAMES[date.getDay()];
};

const toDateTime = (iso: string): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

// ─── Schedule upload (Excel) helpers ──────────────────────────────────────────
const excelCellToIsoDate = (val: unknown): string => {
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "number" && isFinite(val)) {
    // Excel serial date: days since 1899-12-30
    const epoch = Date.UTC(1899, 11, 30);
    const date = new Date(epoch + val * 86400000);
    return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    const mdY = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdY) {
      const [, mm, dd, yyyy] = mdY;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  return "";
};

const findRowKey = (row: Record<string, unknown>, candidates: string[]): string | undefined =>
  Object.keys(row).find((k) => candidates.includes(k.trim().toLowerCase()));

const matchRoomSetup = (value: string): string => {
  const v = value.trim().toLowerCase();
  if (!v) return "";
  const exact = ROOM_SETUP_OPTIONS.find((opt) => opt.toLowerCase() === v);
  if (exact) return exact;
  if (/round.*(?:of\s*)?8\b|\b8\s*[-\s]?top/.test(v)) return "Round of 8";
  if (/round/.test(v)) return "Rounds of 10";
  if (/classroom/.test(v)) return "Classroom";
  if (/theat(er|re)/.test(v)) return "Theater";
  return "";
};

/** Extracts hours/minutes from an Excel time-of-day cell (Date object, numeric fraction, or "H:MM AM/PM" string). */
const extractTimeOfDay = (val: unknown): { hours: number; minutes: number } | null => {
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return { hours: val.getUTCHours(), minutes: val.getUTCMinutes() };
  }
  if (typeof val === "number" && isFinite(val)) {
    const frac = val - Math.floor(val);
    const totalMinutes = Math.round(frac * 24 * 60);
    return { hours: Math.floor(totalMinutes / 60) % 24, minutes: totalMinutes % 60 };
  }
  if (typeof val === "string") {
    // Tolerate common spreadsheet typos: "11;15 AM" or "2.30pm" instead of "11:15 AM" / "2:30pm".
    const normalized = val.trim().replace(/\s+/g, " ").replace(/^(\d{1,2})[;.,](\d{2})/, "$1:$2");
    const m = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      if (m[3]) {
        const ap = m[3].toUpperCase();
        if (ap === "PM" && h !== 12) h += 12;
        if (ap === "AM" && h === 12) h = 0;
      }
      return { hours: h, minutes: min };
    }
  }
  return null;
};

/** "HH:MM" (24-hour, e.g. from the LLM normalizer) into hours/minutes. */
const parse24HourTime = (val: string): { hours: number; minutes: number } | null => {
  const m = val.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return { hours: h, minutes: min };
};

/** Combines an ISO date (YYYY-MM-DD) with a time-of-day cell into a full ISO datetime string. */
const combineDateAndTime = (isoDate: string, val: unknown): string => {
  if (!isoDate) return "";
  const time = extractTimeOfDay(val);
  if (!time) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d, time.hours, time.minutes));
  return isNaN(dt.getTime()) ? "" : dt.toISOString();
};

/** A time cell that the local parser couldn't confidently read, queued for the LLM fallback. */
type TimeFixup = { dedupeKey: string; field: "start" | "end"; raw: string; scheduleDate: string };

const parseScheduleWorkbook = async (
  buffer: ArrayBuffer,
  normalizeTimes: (values: string[]) => Promise<(string | null)[]>,
): Promise<{ rooms: RoomByRoomData[]; totalRows: number }> => {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rooms: [], totalRows: 0 };
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  // Keyed by normalized room name (falling back to function name when no room column exists)
  // so repeated sessions in the same physical room collapse into a single room module.
  const byKey = new Map<string, RoomByRoomData>();
  const fixups: TimeFixup[] = [];

  for (const row of json) {
    const dateKey = findRowKey(row, ["date"]);
    const dayKey = findRowKey(row, ["day"]);
    const roomKey = findRowKey(row, ["room", "room name", "room #", "room number", "room no"]);
    const functionKey = findRowKey(row, ["function name", "function", "session name", "session"]);
    const setupKey = findRowKey(row, ["room setup", "setup", "room set", "set"]);
    const attendeesKey = findRowKey(row, [
      "# of attendees",
      "number of attendees",
      "attendees",
      "room capacity",
      "capacity",
      "expected attendees",
    ]);
    const startTimeKey = findRowKey(row, ["start time", "show start time"]);
    const endTimeKey = findRowKey(row, ["end time", "show end time"]);

    const roomNameRaw = roomKey ? String(row[roomKey] ?? "").trim() : "";
    const functionNameRaw = functionKey ? String(row[functionKey] ?? "").trim() : "";
    const dedupeKey = roomNameRaw
      ? `room:${roomNameRaw.toLowerCase()}`
      : functionNameRaw
        ? `func:${functionNameRaw.toLowerCase()}`
        : "";
    if (!dedupeKey || byKey.has(dedupeKey)) continue;

    const scheduleDate = dateKey ? excelCellToIsoDate(row[dateKey]) : "";
    const dayRaw = dayKey ? String(row[dayKey] ?? "").trim() : "";

    const startRawVal = startTimeKey ? row[startTimeKey] : undefined;
    const endRawVal = endTimeKey ? row[endTimeKey] : undefined;
    const showStartDateTime = startTimeKey ? combineDateAndTime(scheduleDate, startRawVal) : "";
    const showEndDateTime = endTimeKey ? combineDateAndTime(scheduleDate, endRawVal) : "";

    // Local parsing failed but the cell wasn't actually blank — queue it for the LLM fallback
    // instead of silently dropping it (typos like "11;15 AM" land here).
    if (!showStartDateTime && typeof startRawVal === "string" && startRawVal.trim()) {
      fixups.push({ dedupeKey, field: "start", raw: startRawVal.trim(), scheduleDate });
    }
    if (!showEndDateTime && typeof endRawVal === "string" && endRawVal.trim()) {
      fixups.push({ dedupeKey, field: "end", raw: endRawVal.trim(), scheduleDate });
    }

    byKey.set(dedupeKey, {
      ...defaultRoom(),
      roomFunction: functionNameRaw,
      roomLocation: roomNameRaw,
      roomSetup: setupKey ? matchRoomSetup(String(row[setupKey] ?? "")) : "",
      scheduleDate,
      scheduleDay: dayRaw || dayOfWeekFromDate(scheduleDate),
      estimatedAttendeesInRoom: attendeesKey ? String(row[attendeesKey] ?? "").trim() : "",
      showStartDateTime,
      showEndDateTime,
    });
  }

  if (fixups.length > 0) {
    const uniqueRaw = Array.from(new Set(fixups.map((f) => f.raw)));
    try {
      const results = await normalizeTimes(uniqueRaw);
      const rawToResolved = new Map(uniqueRaw.map((raw, i) => [raw, results[i] ?? null]));
      for (const fixup of fixups) {
        const resolved = rawToResolved.get(fixup.raw);
        if (!resolved) continue;
        const time = parse24HourTime(resolved);
        if (!time || !fixup.scheduleDate) continue;
        const [y, m, d] = fixup.scheduleDate.split("-").map(Number);
        if (!y || !m || !d) continue;
        const dt = new Date(Date.UTC(y, m - 1, d, time.hours, time.minutes));
        if (isNaN(dt.getTime())) continue;
        const room = byKey.get(fixup.dedupeKey);
        if (!room) continue;
        if (fixup.field === "start") room.showStartDateTime = dt.toISOString();
        else room.showEndDateTime = dt.toISOString();
      }
    } catch {
      // LLM fallback is best-effort; leave those specific fields blank rather than failing the whole upload.
    }
  }

  return { rooms: Array.from(byKey.values()), totalRows: json.length };
};

// ─── Style constants ──────────────────────────────────────────────────────────
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#222628] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#008ad2] focus:outline-none focus:ring-2 focus:ring-[#008ad2]/20";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#969798]";
const subPanelClass =
  "mt-3 rounded-xl border border-[#eeeeee] bg-[#f9f9f9] p-4";
const subPanelHeader =
  "mb-3 text-xs font-bold uppercase tracking-widest text-[#969798]";

// ─── YES/NO button helper (Tailwind-safe) ─────────────────────────────────────
const yesNoCls = (opt: "Yes" | "No", value: string): string => {
  const base =
    "flex h-10 min-w-[72px] cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all";
  if (value !== opt) return `${base} border-[#e4e4e4] bg-white text-[#969798] hover:border-slate-300`;
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
    <button type="button" className={yesNoCls("Yes", value)} onClick={() => onChange("Yes")}>✓ Yes</button>
    <button type="button" className={yesNoCls("No", value)} onClick={() => onChange("No")}>✗ No</button>
  </div>
);

// ─── Lighting options ─────────────────────────────────────────────────────────
const LIGHTING_OPTIONS = [
  "Stage Wash",
  "Backlighting",
  "Scenic Uplighting",
  "Audience Lighting",
  "Moving Lights / Programmable Effects",
  "Color Wash (Theatrical)",
  "Pin Spots on Podium / Speakers",
  "None / Minimal — House lighting only",
];

// ─── Crew roles (with qty flag) ───────────────────────────────────────────────
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
  { label: "Stage Manager", hasQty: false },
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

// ─── Room Setup options (schedule upload / manual entry) ─────────────────────
const ROOM_SETUP_OPTIONS = ["Round of 8", "Rounds of 10", "Classroom", "Theater"];

// ─── LED Wall switcher / processor options ────────────────────────────────────
const LED_SWITCHER_OPTIONS = [
  "Barco E2/E3",
  "Spyder X80",
  "Pixelhue P20/80/Q8",
  "Millumin",
  "Vendor Recommendation",
];

// ─── Monitor / screen size options ────────────────────────────────────────────
const MONITOR_SIZE_OPTIONS = ["40\"", "43\"", "50\"", "55\"", "60\"", "65\"", "70\""];
const SCREEN_SIZE_OPTIONS = [
  "8' Tripod",
  "10' Wide Fastfold",
  "12' Wide Fastfold",
  "14' Wide Fastfold",
  "16' Wide Fastfold",
  "18' Wide Fastfold",
  "20' Wide Fastfold",
  "24' Wide Fastfold",
  "32' Wide Fastfold",
];

// ─── Video playback format options ────────────────────────────────────────────
const VIDEO_PLAYBACK_FORMAT_OPTIONS = ["4:3", "16:9", "Custom Wide Screen"];

// ─── Default room factory ─────────────────────────────────────────────────────
export const defaultRoom = (): RoomByRoomData => ({
  roomFunction: "",
  roomLocation: "",
  roomSetup: "",
  scheduleDate: "",
  scheduleDay: "",
  estimatedAttendeesInRoom: "",
  stageDimensions: "",
  loadInDateTime: "",
  rehearsalDateTime: "",
  showStartDateTime: "",
  showEndDateTime: "",
  audioSystemRequired: "",
  audioSystemForHowManyPpl: "",
  podiumMic: { podiumMic: "", podiumMicQty: "" },
  wirelessMics: { wirelessMics: "", wirelessMicsQty: "", wirelessMicsType: "", wirelessMicsTypeOther: "" },
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
  largeMonitorsOrScreenProjector: {
    largeMonitorsOrScreenProjector: "",
    numberOfMonitors: "",
    numberOfScreens: "",
    monitorSize: "",
    screenSize: "",
  },
  clientProvideOwnPresentationLaptop: { clientProvideOwnPresentationLaptop: "", clientLaptopQty: "" },
  presentationLaptops: { presentationLaptops: "", presentationLaptopQty: "" },
  videoPlayback: { videoPlayback: "", videoPlaybackCount: "", videoPlaybackFormat: "" },
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
  showCrewNeeded: [],
  showCrewQty: {},
  otherRolesNeeded: "",
});

// ─── Section divider ──────────────────────────────────────────────────────────
const Group = ({ label }: { label: string }) => (
  <div className="mb-5 mt-7 first:mt-0">
    <p className={groupLabelClass}>{label}</p>
    <div className="h-px bg-[#f0f0f0]" />
  </div>
);

// ─── Single room form ─────────────────────────────────────────────────────────
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

  const [showManualTimes, setShowManualTimes] = useState(
    Boolean(
      data.loadInDateTime || data.rehearsalDateTime || data.showStartDateTime || data.showEndDateTime,
    ),
  );

  return (
    <div className="space-y-5 px-6 py-6">

      {/* ── Identity ── */}
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
            <span className="text-xs text-[#969798]">{data.roomFunction.length}/80</span>
          </div>
        </div>
        <div>
          <label className={labelClass}>
            # of Attendees <span className="text-red-500">*</span>
            <InfoTooltip text="Expected number of attendees in this specific room. Drives audio system sizing — vendors will spec a distributed array based on this number." />
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

      {/* ── Schedule ── */}
      <Group label="Schedule" />

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>
            Date
            <span className="ml-2 text-xs font-normal normal-case text-slate-400">(optional)</span>
            <InfoTooltip text="The date this room is in use. Can be filled in manually here or bulk-uploaded via the schedule Excel upload above." />
          </label>
          <input
            type="date"
            className={inputClass}
            value={data.scheduleDate}
            onChange={(e) =>
              onChange({
                scheduleDate: e.target.value,
                scheduleDay: dayOfWeekFromDate(e.target.value),
              })
            }
          />
          {data.scheduleDay && (
            <p className="mt-1 text-xs text-[#969798] normal-case">{data.scheduleDay}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>
            Room
            <span className="ml-2 text-xs font-normal normal-case text-slate-400">(optional)</span>
            <InfoTooltip text="The physical room or space at the venue, if different from the function name above. Example: 'Grand Ballroom A'." />
          </label>
          <input
            className={inputClass}
            value={data.roomLocation}
            onChange={(e) => onChange({ roomLocation: e.target.value })}
            placeholder="e.g. Grand Ballroom A"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Room Setup
          <span className="ml-2 text-xs font-normal normal-case text-slate-400">(optional)</span>
          <InfoTooltip text="How seating/tables are arranged in this room." />
        </label>
        <select
          className={inputClass}
          value={data.roomSetup}
          onChange={(e) => onChange({ roomSetup: e.target.value })}
        >
          <option value="">Select room setup…</option>
          {ROOM_SETUP_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Manual room times */}
      <div>
        <button
          type="button"
          onClick={() => setShowManualTimes((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#008ad2] hover:text-[#0069a0] transition-colors"
        >
          <Plus size={14} className={`shrink-0 transition-transform ${showManualTimes ? "rotate-45" : ""}`} />
          Add Date &amp; Times for This Room
        </button>
        <p className="mt-1 text-xs text-slate-400 normal-case">
          Use this if load-in, rehearsal, and show times weren&apos;t included in a schedule upload.
        </p>
        {showManualTimes && (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <label className={`${labelClass} mt-0`}>Load-In</label>
              <GlobalDateTimeInput
                hideLabel
                showFormatInLabel={false}
                showTime
                use12Hours
                timeIntervals={15}
                value={toDateTime(data.loadInDateTime)}
                onChange={(d) => onChange({ loadInDateTime: d ? d.toISOString() : "" })}
                inputClassName={`${inputClass} pr-12`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#008ad2] hover:text-[#0069a0]"
                placeholder="Select date & time"
              />
            </div>
            <div>
              <label className={`${labelClass} mt-0`}>Rehearsal</label>
              <GlobalDateTimeInput
                hideLabel
                showFormatInLabel={false}
                showTime
                use12Hours
                timeIntervals={15}
                value={toDateTime(data.rehearsalDateTime)}
                onChange={(d) => onChange({ rehearsalDateTime: d ? d.toISOString() : "" })}
                inputClassName={`${inputClass} pr-12`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#008ad2] hover:text-[#0069a0]"
                placeholder="Select date & time"
              />
            </div>
            <div>
              <label className={`${labelClass} mt-0`}>Show Start</label>
              <GlobalDateTimeInput
                hideLabel
                showFormatInLabel={false}
                showTime
                use12Hours
                timeIntervals={15}
                value={toDateTime(data.showStartDateTime)}
                onChange={(d) => onChange({ showStartDateTime: d ? d.toISOString() : "" })}
                inputClassName={`${inputClass} pr-12`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#008ad2] hover:text-[#0069a0]"
                placeholder="Select date & time"
              />
            </div>
            <div>
              <label className={`${labelClass} mt-0`}>Show End</label>
              <GlobalDateTimeInput
                hideLabel
                showFormatInLabel={false}
                showTime
                use12Hours
                timeIntervals={15}
                value={toDateTime(data.showEndDateTime)}
                onChange={(d) => onChange({ showEndDateTime: d ? d.toISOString() : "" })}
                inputClassName={`${inputClass} pr-12`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#008ad2] hover:text-[#0069a0]"
                placeholder="Select date & time"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stage Dimensions */}
      <div>
        <label className={labelClass}>
          Stage Dimensions
          <span className="ml-2 text-xs font-normal normal-case text-slate-400">(optional)</span>
          <InfoTooltip text="Stage dimensions in feet — Width × Depth × Height (optional). Standard general session stage is 60ft x 24ft; large keynote stages run 100–200ft wide. If no formal stage: enter 'Floor presentation — no stage.'" />
        </label>
        <input
          className={inputClass}
          value={data.stageDimensions}
          onChange={(e) => onChange({ stageDimensions: e.target.value })}
          placeholder="e.g. 120ft × 40ft × 3ft"
        />
      </div>

      {/* ── Audio ── */}
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
                  <option value="">Select Q&amp;A method…</option>
                  <option>No Q&A — Presentation only</option>
                  <option>Passed Handheld Mic — Staff walks mics to audience</option>
                  <option>Fixed Floor Mics — Stationary mics in aisles</option>
                  <option>Digital / App-Based (Slido, Mentimeter, etc.)</option>
                  <option>Combination — Multiple methods</option>
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
                      wirelessMicsTypeOther: v !== "Yes" ? "" : data.wirelessMics.wirelessMicsTypeOther,
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
                          wirelessMics: {
                            ...data.wirelessMics,
                            wirelessMicsType: e.target.value,
                            wirelessMicsTypeOther: e.target.value !== "Other" ? "" : data.wirelessMics.wirelessMicsTypeOther,
                          },
                        })
                      }
                    >
                      <option value="">Select type…</option>
                      <option>Handhelds</option>
                      <option>Headset Mics</option>
                      <option>Lavalier (Lav) Mics</option>
                      <option>Both</option>
                      <option value="Other">Other — Specify</option>
                    </select>
                    {data.wirelessMics.wirelessMicsType === "Other" && (
                      <input
                        className={`${inputClass} mt-2`}
                        placeholder="Please specify..."
                        value={data.wirelessMics.wirelessMicsTypeOther}
                        onChange={(e) =>
                          onChange({
                            wirelessMics: { ...data.wirelessMics, wirelessMicsTypeOther: e.target.value },
                          })
                        }
                      />
                    )}
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

      {/* ── Stage & Video ── */}
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
                  <InfoTooltip text="Curved LED walls require specialized rigging and content production — flag this early as it significantly impacts budget." />
                </label>
                <select
                  className={inputClass}
                  value={data.ledWallShape ?? ""}
                  onChange={(e) => onChange({ ledWallShape: e.target.value })}
                >
                  <option value="">Select shape…</option>
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
                  <option value="">Select preference…</option>
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
                <InfoTooltip text="The video processor that drives the LED wall. Specify preference or defer to vendor." />
              </label>
              <select
                className={inputClass}
                value={data.ledWallSwitcher ?? ""}
                onChange={(e) => onChange({ ledWallSwitcher: e.target.value })}
              >
                <option value="">Select preference…</option>
                {LED_SWITCHER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
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
                className="w-full resize-none rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#008ad2] focus:outline-none focus:ring-2 focus:ring-[#008ad2]/20"
                placeholder="e.g. Center I-MAG playback, lower-third overlays, integration with timecode..."
                value={data.ledWallNotes ?? ""}
                onChange={(e) => onChange({ ledWallNotes: e.target.value })}
              />
            </div>

            {data.ledWallWidth && Number(data.ledWallWidth) >= 60 && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <span className="shrink-0">⚠️</span>
                <span>
                  <strong>Large LED Wall:</strong> Walls ≥ 60ft may trigger a Producer Insight Call recommendation.
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
                numberOfMonitors: v !== "Yes" ? "" : data.largeMonitorsOrScreenProjector.numberOfMonitors,
                numberOfScreens: v !== "Yes" ? "" : data.largeMonitorsOrScreenProjector.numberOfScreens,
                monitorSize: v !== "Yes" ? "" : data.largeMonitorsOrScreenProjector.monitorSize,
                screenSize: v !== "Yes" ? "" : data.largeMonitorsOrScreenProjector.screenSize,
              },
            })
          }
        />
        {data.largeMonitorsOrScreenProjector.largeMonitorsOrScreenProjector === "Yes" && (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <label className={`${labelClass} mt-0`}># of Monitors</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                placeholder="Quantity?"
                value={data.largeMonitorsOrScreenProjector.numberOfMonitors}
                onChange={(e) =>
                  onChange({
                    largeMonitorsOrScreenProjector: {
                      ...data.largeMonitorsOrScreenProjector,
                      numberOfMonitors: e.target.value,
                      monitorSize: Number(e.target.value) > 0 ? data.largeMonitorsOrScreenProjector.monitorSize : "",
                    },
                  })
                }
              />
            </div>
            <div>
              <label className={`${labelClass} mt-0`}># of Screens</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                placeholder="Quantity?"
                value={data.largeMonitorsOrScreenProjector.numberOfScreens}
                onChange={(e) =>
                  onChange({
                    largeMonitorsOrScreenProjector: {
                      ...data.largeMonitorsOrScreenProjector,
                      numberOfScreens: e.target.value,
                      screenSize: Number(e.target.value) > 0 ? data.largeMonitorsOrScreenProjector.screenSize : "",
                    },
                  })
                }
              />
            </div>
            {Number(data.largeMonitorsOrScreenProjector.numberOfMonitors) > 0 && (
              <div>
                <label className={`${labelClass} mt-0`}>Monitor Size</label>
                <select
                  className={inputClass}
                  value={data.largeMonitorsOrScreenProjector.monitorSize}
                  onChange={(e) =>
                    onChange({
                      largeMonitorsOrScreenProjector: {
                        ...data.largeMonitorsOrScreenProjector,
                        monitorSize: e.target.value,
                      },
                    })
                  }
                >
                  <option value="">Select size…</option>
                  {MONITOR_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}
            {Number(data.largeMonitorsOrScreenProjector.numberOfScreens) > 0 && (
              <div>
                <label className={`${labelClass} mt-0`}>Screen Size</label>
                <select
                  className={inputClass}
                  value={data.largeMonitorsOrScreenProjector.screenSize}
                  onChange={(e) =>
                    onChange({
                      largeMonitorsOrScreenProjector: {
                        ...data.largeMonitorsOrScreenProjector,
                        screenSize: e.target.value,
                      },
                    })
                  }
                >
                  <option value="">Select size…</option>
                  {SCREEN_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
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
          <InfoTooltip text="Do you need custom scenic elements built for the stage — set pieces, branded scenic walls, custom podium? Scenic adds production value but increases budget and load-in time. A producer call is recommended." />
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
              className="w-full resize-none rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#008ad2] focus:outline-none focus:ring-2 focus:ring-[#008ad2]/20"
              placeholder='e.g. "Custom branded scenic wall flanking the LED, integrated lighting, illuminated logo above stage. Reference: minimalist editorial style, dark navy palette."'
              value={data.scenicStageDesignNotes ?? ""}
              onChange={(e) => onChange({ scenicStageDesignNotes: e.target.value })}
            />
            <div className="mt-1 flex justify-between items-center">
              <p className="text-xs text-amber-600 normal-case">
                Scenic stage design may trigger a Producer Insight consultation recommendation.
              </p>
              <span className="text-xs text-[#969798] shrink-0 ml-2">
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
          <InfoTooltip text="Pre-recorded video content — sizzle reels, intro videos, b-roll — to be played during the session. Specify the number of clips." />
        </label>
        <YesNo
          value={data.videoPlayback.videoPlayback}
          onChange={(v) =>
            onChange({
              videoPlayback: {
                videoPlayback: v,
                videoPlaybackCount: v !== "Yes" ? "" : data.videoPlayback.videoPlaybackCount,
                videoPlaybackFormat: v !== "Yes" ? "" : data.videoPlayback.videoPlaybackFormat,
              },
            })
          }
        />
        {data.videoPlayback.videoPlayback === "Yes" && (
          <div className="mt-3 space-y-3">
            <input
              className={inputClass}
              placeholder="How many clips?"
              value={data.videoPlayback.videoPlaybackCount}
              onChange={(e) =>
                onChange({
                  videoPlayback: { ...data.videoPlayback, videoPlaybackCount: e.target.value },
                })
              }
            />
            <div>
              <label className={`${labelClass} mt-0`}>
                Video Format / Aspect Ratio
                <InfoTooltip text="The aspect ratio the playback video content is produced in." />
              </label>
              <div className="flex flex-wrap gap-3">
                {VIDEO_PLAYBACK_FORMAT_OPTIONS.map((opt) => (
                  <PillRadio
                    key={opt}
                    name={`${uid}-videoPlaybackFormat`}
                    value={opt}
                    checked={data.videoPlayback.videoPlaybackFormat === opt}
                    onChange={() =>
                      onChange({
                        videoPlayback: { ...data.videoPlayback, videoPlaybackFormat: opt },
                      })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
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

      {/* ── Lighting ── */}
      <Group label="Lighting" />

      <div>
        <label className={labelClass}>
          Lighting Requirements <span className="text-red-500">*</span>
          <InfoTooltip text="Select all lighting types needed. Backlighting and audience lighting are essential if you have cameras and IMAG. Moving lights add energy but require a Lighting Director (L1) on crew." />
        </label>
        <p className="mb-3 text-xs text-slate-500 normal-case">
          Select all that apply, or select &quot;None / Minimal&quot; if house lighting only.
          {lighting.includes("Moving Lights / Programmable Effects") && (
            <span className="ml-1 text-[#008ad2] font-semibold">
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

      {/* ── Confidence Monitors ── */}
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
                  <InfoTooltip text="Screens showing the current slide or live program feed — what the audience sees. Standard setup: 2 monitors angled toward stage left and stage right." />
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

      {/* ── Teleprompter ── */}
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
                  <InfoTooltip text="Will the teleprompter operate in multiple languages simultaneously? Bilingual operators are specialized — flag this early. Common for international audiences and dual-language broadcasts." />
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

      {/* ── Show Crew ── */}
      <Group label="Show Crew" />

      {/* Auto-suggestions banner */}
      {unaddedSuggestions.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-[#008ad2]/30 bg-[#008ad2]/5 p-3 text-xs text-[#0069a0]">
          <span className="shrink-0 font-bold">⚡</span>
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
                  className="rounded-full border border-[#008ad2]/30 bg-white px-2.5 py-0.5 text-xs font-semibold text-[#0069a0] hover:bg-[#008ad2]/10 transition-colors"
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
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#222628]">{role}</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="h-8 w-14 rounded-md border border-[#e4e4e4] bg-white text-center text-sm font-bold text-[#222628] outline-none focus:border-[#008ad2] focus:ring-1 focus:ring-[#008ad2]/20"
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
          <InfoTooltip text="Any additional positions not listed — e.g. LED technician, drone operator, or show caller support." />
        </label>
        <textarea
          rows={3}
          className="w-full resize-none rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#008ad2] focus:outline-none focus:ring-2 focus:ring-[#008ad2]/20"
          placeholder="Write here…"
          value={data.otherRolesNeeded}
          onChange={(e) => onChange({ otherRolesNeeded: e.target.value })}
        />
      </div>
    </div>
  );
};

// ─── Room accordion card ──────────────────────────────────────────────────────
const RoomCard = ({
  room,
  index,
  total,
  isExpanded,
  onToggle,
  onChange,
  onDuplicate,
  onDelete,
  canDelete,
  showErrors,
}: {
  room: RoomByRoomData;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (u: Partial<RoomByRoomData>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
  showErrors: boolean;
}) => {
  const roomLabel = room.roomFunction.trim() || `Room ${index + 1}`;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e4e4e4] bg-white">
      <div
        className="flex cursor-pointer items-center justify-between px-5 py-4 transition-colors hover:bg-slate-50"
        style={{ borderBottom: isExpanded ? "1px solid #e4e4e4" : "none" }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}
          >
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-bold text-[#222628]">
              {roomLabel}
              <span className="ml-2 text-xs font-normal text-[#969798]">
                Room {index + 1} of {total}
              </span>
            </p>
            {!isExpanded && room.estimatedAttendeesInRoom && (
              <p className="text-xs text-[#969798]">{room.estimatedAttendeesInRoom} attendees</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onDuplicate}
            title="Copy this room's details to start a new room"
            className="flex items-center gap-1.5 rounded-full border border-[#e4e4e4] bg-white px-3 py-1 text-xs font-semibold text-[#222628] hover:border-[#008ad2] hover:text-[#008ad2] transition-colors"
          >
            <Copy size={13} className="shrink-0" />
            Copy Room
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Remove this room"
              className="flex items-center gap-1.5 rounded-full border border-[#e4e4e4] bg-white px-3 py-1 text-xs font-semibold text-[#222628] hover:border-red-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={13} className="shrink-0" />
              Remove
            </button>
          )}
          <div className="ml-1 text-[#969798]">
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

// ─── Main component ───────────────────────────────────────────────────────────
interface Props {
  rooms: RoomByRoomData[];
  onRoomsChange: (rooms: RoomByRoomData[]) => void;
  numberOfEventRooms: string;
  onNumberOfEventRoomsChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
  isInPersonOnly?: boolean;
}

const RoomAndProductionStep = ({
  rooms,
  onRoomsChange,
  numberOfEventRooms,
  onNumberOfEventRoomsChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
  isInPersonOnly = false,
}: Props) => {
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set([0]));
  const [isUploadingSchedule, setIsUploadingSchedule] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roomCount = Math.max(1, Number(numberOfEventRooms) || 1);

  const toggleRoom = (i: number) =>
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const updateRoom = (i: number, updates: Partial<RoomByRoomData>) =>
    onRoomsChange(rooms.map((r, idx) => (idx === i ? { ...r, ...updates } : r)));

  const duplicateRoom = (i: number) => {
    const source = rooms[i];
    if (!source) return;
    const copy: RoomByRoomData = {
      ...source,
      roomFunction: source.roomFunction ? `${source.roomFunction} (Copy)` : "",
    };
    const nextRooms = [...rooms, copy];
    onRoomsChange(nextRooms);
    onNumberOfEventRoomsChange(String(nextRooms.length));
    setExpandedRooms(new Set([nextRooms.length - 1]));
  };

  const deleteRoom = (i: number) => {
    if (rooms.length <= 1) return;
    const room = rooms[i];
    const label = room?.roomFunction.trim() || `Room ${i + 1}`;
    if (!window.confirm(`Remove "${label}"? This can't be undone.`)) return;

    const nextRooms = rooms.filter((_, idx) => idx !== i);
    onRoomsChange(nextRooms);
    onNumberOfEventRoomsChange(String(nextRooms.length));
    setExpandedRooms((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < i) next.add(idx);
        else if (idx > i) next.add(idx - 1);
      });
      return next;
    });
  };

  const handleScheduleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const hasExistingData = rooms.some((r) => r.roomFunction.trim());
    if (
      hasExistingData &&
      !window.confirm(
        "This will replace all current room modules with the rooms from this schedule. Continue?",
      )
    ) {
      return;
    }

    setIsUploadingSchedule(true);
    try {
      const buffer = await file.arrayBuffer();
      const { rooms: parsedRooms, totalRows } = await parseScheduleWorkbook(buffer, async (values) => {
        const res = await normalizeScheduleTimesAction(values);
        return res.success && res.results ? res.results : values.map(() => null);
      });
      if (parsedRooms.length === 0) {
        toast.error("No rooms could be read from that file. Check the column headers and try again.");
        return;
      }
      onRoomsChange(parsedRooms);
      onNumberOfEventRoomsChange(String(parsedRooms.length));
      setExpandedRooms(new Set([0]));
      const roomWord = `room${parsedRooms.length === 1 ? "" : "s"}`;
      toast.success(
        totalRows > parsedRooms.length
          ? `Loaded ${parsedRooms.length} unique ${roomWord} from ${totalRows} schedule rows — repeated room names were consolidated.`
          : `Loaded ${parsedRooms.length} ${roomWord} from schedule.`,
      );
    } catch {
      toast.error("Couldn't read that file — please upload a valid Excel schedule.");
    } finally {
      setIsUploadingSchedule(false);
    }
  };

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#e4e4e4] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#e4e4e4]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#008ad2]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#008ad2]">
            Page 2B of 9
          </span>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-600">
            Repeating Module
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#222628]">Room Specifications &amp; Schedule</h2>
        <p className="mt-1 text-sm text-[#969798]">
          One module per room — each room generates its own section in the RFP.
        </p>
      </div>

      {/* Number of Event Rooms — stepper */}
      <div className="px-6 pt-6">
        <div className="mb-6 rounded-md border border-[#e4e4e4] p-5">
          <label className={labelClass}>
            Number of Event Rooms <span className="text-red-500">*</span>
            <InfoTooltip text="How many separate rooms require AV production? Each room gets its own specification module below. Example: 1 General Session + 1 Breakout + 1 VIP Lounge = 3 rooms." />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                onNumberOfEventRoomsChange(String(Math.max(1, roomCount - 1)))
              }
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e4e4e4] bg-white text-lg font-bold text-[#222628] hover:bg-[#f9f9f9] transition-colors select-none"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={numberOfEventRooms}
              onChange={(e) =>
                onNumberOfEventRoomsChange(
                  String(Math.max(1, Number(e.target.value) || 1)),
                )
              }
              className="h-10 w-16 rounded-lg border border-[#e4e4e4] bg-white text-center text-sm font-bold text-[#222628] outline-none focus:border-[#008ad2] focus:ring-2 focus:ring-[#008ad2]/20"
            />
            <button
              type="button"
              onClick={() => onNumberOfEventRoomsChange(String(roomCount + 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e4e4e4] bg-white text-lg font-bold text-[#222628] hover:bg-[#f9f9f9] transition-colors select-none"
            >
              +
            </button>
          </div>
          {numberOfEventRooms && Number(numberOfEventRooms) > 0 && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#008ad2]/30 bg-[#008ad2]/5 p-3 text-xs text-brand-dark">
              <span className="mt-0.5 shrink-0">⚙️</span>
              <span>
                <strong>System:</strong> This generates{" "}
                <strong>{numberOfEventRooms}</strong> Room Specification module(s) below.
              </span>
            </div>
          )}
        </div>

        {/* Schedule upload */}
        <div className="mb-6 rounded-md border border-[#e4e4e4] p-5">
          <label className={labelClass}>
            Upload Room Schedule
            <span className="ml-2 text-xs font-normal normal-case text-slate-400">(optional)</span>
            <InfoTooltip text="Upload an Excel (.xlsx) schedule to bulk-create room modules. Expected columns: Date, Day, Room, Function Name, Room Setup, # of Attendees. This replaces the current room list." />
          </label>
          <p className="mb-3 text-xs text-slate-500 normal-case">
            Columns: Date, Day, Room, Function Name, Room Setup, # of Attendees. Each row becomes a room module below.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleScheduleFileChange}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isUploadingSchedule}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-[#e4e4e4] bg-white px-4 py-2 text-sm font-semibold text-[#222628] hover:border-[#008ad2] hover:text-[#008ad2] transition-colors disabled:opacity-50"
            >
              <Upload size={15} className="shrink-0" />
              {isUploadingSchedule ? "Reading file…" : "Upload Schedule (Excel)"}
            </button>
            <a
              href="/files/RFPilot%20schedule-example-sheet.xlsx"
              download
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[#008ad2] hover:text-[#0069a0] transition-colors"
            >
              <Download size={15} className="shrink-0" />
              Download Sample Sheet
            </a>
          </div>
        </div>
      </div>

      {/* Rooms */}
      <div className="flex-1 space-y-3 px-6 pb-6">
        {rooms.map((room, i) => (
          <div key={i}>
            <RoomCard
              room={room}
              index={i}
              total={rooms.length}
              isExpanded={expandedRooms.has(i)}
              onToggle={() => toggleRoom(i)}
              onChange={(u) => updateRoom(i, u)}
              onDuplicate={() => duplicateRoom(i)}
              onDelete={() => deleteRoom(i)}
              canDelete={rooms.length > 1}
              showErrors={showErrors}
            />
          </div>
        ))}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#e4e4e4]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-200"
        >
          <ArrowLeft size={15} className="shrink-0" />
          Venue &amp; Schedule
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(14,165,233,0.6)] active:translate-y-0"
          style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
          {isInPersonOnly ? "Content & Creative" : "Hybrid & Virtual"}
          <ArrowRight size={15} className="shrink-0" />
        </button>
      </div>
    </section>
  );
};

export default RoomAndProductionStep;
