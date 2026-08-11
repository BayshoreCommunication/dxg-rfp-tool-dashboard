"use client";

import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Copy, Download, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import type { ProposalSettings, RoomByRoomData, RoomFunctionSchedule } from "../AddNewProposal";
import { InfoTooltip, PillCheckbox, PillRadio, toggleItem } from "./shared";
import GlobalDateInput from "@/components/shared/GlobalDateInput";
import GlobalDateTimeInput from "@/components/shared/GlobalDateTimeInput";
import GlobalSelect from "@/components/shared/GlobalSelect";
import GlobalTimeInput from "@/components/shared/GlobalTimeInput";
import { fromEventZoneDisplay, toEventZoneDisplay, wallClockToIso } from "./eventTimeZone";
import { normalizeScheduleTimesAction } from "@/app/actions/proposals";
import RoomRecommendationsPanel from "../RoomRecommendationsPanel";
import RoomDeletionDialog from "../RoomDeletionDialog";
import ToastMessage from "@/components/ui/ToastMessage";
import {
  SCREEN_SIZE_OTHER,
  SCREEN_SIZE_VENDOR_RECOMMENDATION,
  customMonitorSizeIsMissing,
  customScreenSizeIsMissing,
  selectMonitorSize,
  selectScreenSize,
} from "../screenSize";
import {
  CAMERA_PLAN_SPECIFIC,
  CAMERA_PLAN_VENDOR_RECOMMENDATION,
  CAMERA_TYPE_BOTH,
  CAMERA_TYPE_OTHER,
  CAMERA_TYPE_PTZ,
  CAMERA_TYPE_STUDIO,
  cameraPlanMissingFields,
  cameraPlanTotal,
} from "../cameraPlan";
import {
  ensureLedWallSlots,
  ledWallCount,
  ledWallPlanMissingFields,
  normalizeLedWalls,
} from "../ledWallPlan";
import type { ProposalExperienceMode } from "@/lib/proposals/proposalExperience";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const dayOfWeekFromDate = (isoDate: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? "" : WEEKDAY_NAMES[date.getDay()];
};


/**
 * A schedule date is a plain calendar day ("2027-03-10"), so it converts to and
 * from the picker's Date at local noon — midnight can slip to the previous day
 * in negative-offset zones.
 */
const isoDateToLocalDate = (iso: string): Date | null => {
  const [year, month, day] = (iso || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day, 12);
  return isNaN(date.getTime()) ? null : date;
};

const localDateToIsoDate = (date: Date | null): string => {
  if (!date || isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const functionScheduleDateIsWithinEventRange = (
  scheduleDate: string,
  eventStartDate?: string,
  eventEndDate?: string,
): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate)) return false;
  if (eventStartDate && scheduleDate < eventStartDate) return false;
  if (eventEndDate && scheduleDate > eventEndDate) return false;
  return true;
};

const formatScheduleDate = (iso: string): string => {
  const date = isoDateToLocalDate(iso);
  return date
    ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date)
    : iso;
};

const eventDateWindowLabel = (startDate: string, endDate: string): string => {
  if (startDate && endDate) {
    return startDate === endDate
      ? `Event date: ${formatScheduleDate(startDate)}`
      : `Event dates: ${formatScheduleDate(startDate)} – ${formatScheduleDate(endDate)}`;
  }
  if (startDate) return `On or after ${formatScheduleDate(startDate)}`;
  if (endDate) return `On or before ${formatScheduleDate(endDate)}`;
  return "Choose the function date.";
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

const timeValueToMinutes = (value: string): number | null => {
  const time = parse24HourTime(value);
  return time ? time.hours * 60 + time.minutes : null;
};

const addMinutesToTimeValue = (value: string, minutesToAdd: number): string => {
  const minutes = timeValueToMinutes(value);
  if (minutes === null) return "";
  const next = minutes + minutesToAdd;
  if (next > 23 * 60 + 45) return "";
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
};

/** HH:MM venue wall-clock value for a stored schedule instant. */
export const venueTimeValue = (iso: string, timeZoneLabel?: string | null): string => {
  const displayed = toEventZoneDisplay(iso, timeZoneLabel);
  if (!displayed) return "";
  return `${String(displayed.getHours()).padStart(2, "0")}:${String(displayed.getMinutes()).padStart(2, "0")}`;
};

/** Re-anchor a time-only control to the function's one authoritative date. */
export const functionDateTimeValue = (
  scheduleDate: string,
  timeValue: string,
  timeZoneLabel?: string | null,
): string => {
  const time = parse24HourTime(timeValue);
  return scheduleDate && time ? wallClockToIso(scheduleDate, time, timeZoneLabel) : "";
};

const isPositiveIntegerText = (value: string): boolean => /^\d+$/.test(value.trim()) && Number(value) > 0;

export const functionScheduleEndIsAfterStart = (entry: RoomFunctionSchedule): boolean => {
  if (!entry.showStartDateTime || !entry.showEndDateTime) return true;
  const start = new Date(entry.showStartDateTime).getTime();
  const end = new Date(entry.showEndDateTime).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
};

/** Combines an ISO date (YYYY-MM-DD) with a time-of-day cell into a full ISO datetime string. */
const combineDateAndTime = (isoDate: string, val: unknown, timeZoneLabel?: string | null): string => {
  if (!isoDate) return "";
  const time = extractTimeOfDay(val);
  if (!time) return "";
  // Schedule workbooks express venue wall-clock times, so anchor them to the
  // event's zone rather than the machine's — otherwise a schedule uploaded
  // from another zone stores the wrong instant and the RFP quotes vendors the
  // wrong times.
  return wallClockToIso(isoDate, time, timeZoneLabel);
};

/** A time cell that the local parser couldn't confidently read, queued for the LLM fallback. */
type TimeFixup = {
  roomIndex: number;
  functionIndex: number;
  field: "start" | "end";
  raw: string;
  scheduleDate: string;
};

export const parseScheduleWorkbook = async (
  buffer: ArrayBuffer,
  normalizeTimes: (values: string[]) => Promise<(string | null)[]>,
  /** Venue & Schedule time-zone label; times in the sheet are wall-clock there. */
  timeZoneLabel?: string | null,
): Promise<{ rooms: RoomByRoomData[]; totalRows: number }> => {
  // Keep Excel dates/times as serial numbers. Converting time-only cells into
  // JavaScript Date objects can introduce historical local-time offsets (for
  // example 1:45 becoming 1:51 in some time zones).
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  // The shipped template carries several tabs (pivot, virtual schedule, room
  // list), and planners reorder them. Read the first sheet that actually looks
  // like a schedule rather than assuming it is the leftmost one.
  const readSheet = (name: string) =>
    XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name], { defval: "" });
  const looksLikeSchedule = (rows: Record<string, unknown>[]) =>
    rows.length > 0 &&
    Boolean(findRowKey(rows[0], ["room", "room name", "room #", "room number", "room no"])) &&
    Boolean(findRowKey(rows[0], ["function name", "function", "session name", "session"]));
  let json: Record<string, unknown>[] = [];
  for (const name of workbook.SheetNames) {
    const rows = readSheet(name);
    if (looksLikeSchedule(rows)) { json = rows; break; }
  }
  // Nothing recognizable: fall back to the first sheet so the existing "no rooms
  // could be read" message still describes what the planner uploaded.
  if (json.length === 0 && workbook.SheetNames[0]) json = readSheet(workbook.SheetNames[0]);
  if (json.length === 0) return { rooms: [], totalRows: 0 };

  // Group schedule rows by physical room. Functions retain their individual
  // schedule details while the room owns one shared AV specification.
  const rooms: RoomByRoomData[] = [];
  const roomIndexByKey = new Map<string, number>();
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
    if (!roomNameRaw && !functionNameRaw) continue;

    const scheduleDate = dateKey ? excelCellToIsoDate(row[dateKey]) : "";
    const dayRaw = dayKey ? String(row[dayKey] ?? "").trim() : "";

    const startRawVal = startTimeKey ? row[startTimeKey] : undefined;
    const endRawVal = endTimeKey ? row[endTimeKey] : undefined;
    const showStartDateTime = startTimeKey ? combineDateAndTime(scheduleDate, startRawVal, timeZoneLabel) : "";
    const showEndDateTime = endTimeKey ? combineDateAndTime(scheduleDate, endRawVal, timeZoneLabel) : "";

    // Local parsing failed but the cell wasn't actually blank — queue it for the LLM fallback
    // instead of silently dropping it (typos like "11;15 AM" land here).
    const roomSetup = setupKey ? matchRoomSetup(String(row[setupKey] ?? "")) : "";
    const estimatedAttendees = attendeesKey ? String(row[attendeesKey] ?? "").trim() : "";
    const scheduleEntry: RoomFunctionSchedule = {
      functionName: functionNameRaw,
      scheduleDate,
      scheduleDay: dayRaw || dayOfWeekFromDate(scheduleDate),
      showStartDateTime,
      showEndDateTime,
      roomSetup,
      estimatedAttendees,
    };
    const physicalRoomKey = roomNameRaw
      ? `room:${roomNameRaw.toLowerCase()}`
      : `function-without-room:${functionNameRaw.toLowerCase()}:${rooms.length}`;
    let roomIndex = roomIndexByKey.get(physicalRoomKey);
    if (roomIndex === undefined) {
      roomIndex = rooms.length;
      roomIndexByKey.set(physicalRoomKey, roomIndex);
      rooms.push({
        ...defaultRoom(),
        functions: [scheduleEntry],
        roomFunction: functionNameRaw,
        roomLocation: roomNameRaw,
        roomSetup,
        scheduleDate,
        scheduleDay: scheduleEntry.scheduleDay,
        estimatedAttendeesInRoom: estimatedAttendees,
        showStartDateTime,
        showEndDateTime,
      });
    } else {
      const room = rooms[roomIndex];
      room.functions.push(scheduleEntry);
      const peak = Math.max(
        Number(room.estimatedAttendeesInRoom) || 0,
        Number(estimatedAttendees) || 0,
      );
      if (peak > 0) room.estimatedAttendeesInRoom = String(peak);
    }
    const functionIndex = rooms[roomIndex].functions.length - 1;
    if (!showStartDateTime && typeof startRawVal === "string" && startRawVal.trim()) {
      fixups.push({ roomIndex, functionIndex, field: "start", raw: startRawVal.trim(), scheduleDate });
    }
    if (!showEndDateTime && typeof endRawVal === "string" && endRawVal.trim()) {
      fixups.push({ roomIndex, functionIndex, field: "end", raw: endRawVal.trim(), scheduleDate });
    }
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
        // Repaired times are wall-clock too, so they take the same anchoring.
        const iso = wallClockToIso(fixup.scheduleDate, time, timeZoneLabel);
        if (!iso) continue;
        const room = rooms[fixup.roomIndex];
        if (!room) continue;
        const scheduleEntry = room.functions[fixup.functionIndex];
        if (!scheduleEntry) continue;
        if (fixup.field === "start") scheduleEntry.showStartDateTime = iso;
        else scheduleEntry.showEndDateTime = iso;
        if (fixup.functionIndex === 0) {
          if (fixup.field === "start") room.showStartDateTime = iso;
          else room.showEndDateTime = iso;
        }
      }
    } catch {
      // LLM fallback is best-effort; leave those specific fields blank rather than failing the whole upload.
    }
  }

  return { rooms, totalRows: json.length };
};

// ─── Style constants ──────────────────────────────────────────────────────────
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#222628] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1DBFD3] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20";
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
const FUNCTION_DURATION_OPTIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hr", minutes: 60 },
  { label: "90 min", minutes: 90 },
  { label: "2 hr", minutes: 120 },
] as const;

// ─── LED Wall switcher / processor options ────────────────────────────────────
const LED_SWITCHER_OPTIONS = [
  "Barco E2/E3",
  "Spyder X80",
  "Pixelhue P20/80/Q8",
  "Millumin",
  "Vendor Recommendation",
];

// ─── Monitor / screen size options ────────────────────────────────────────────
const MONITOR_SIZE_OPTIONS = [
  "40\"",
  "43\"",
  "50\"",
  "55\"",
  "60\"",
  "65\"",
  "70\"",
  SCREEN_SIZE_VENDOR_RECOMMENDATION,
  SCREEN_SIZE_OTHER,
];
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
  SCREEN_SIZE_VENDOR_RECOMMENDATION,
  SCREEN_SIZE_OTHER,
];

// ─── Video playback format options ────────────────────────────────────────────
const VIDEO_PLAYBACK_FORMAT_OPTIONS = ["4:3", "16:9", "Custom Wide Screen"];

// ─── Default room factory ─────────────────────────────────────────────────────
export const defaultRoom = (): RoomByRoomData => ({
  functions: [],
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
  ledWallCount: "",
  ledWalls: [],
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
    monitorSizeOther: "",
    screenSize: "",
    screenSizeOther: "",
  },
  clientProvideOwnPresentationLaptop: { clientProvideOwnPresentationLaptop: "", clientLaptopQty: "" },
  presentationLaptops: { presentationLaptops: "", presentationLaptopQty: "" },
  videoPlayback: { videoPlayback: "", videoPlaybackCount: "", videoPlaybackFormat: "" },
  videoFormatAspectRatio: "",
  cameras: {
    cameras: "", camerasQty: "", cameraPlanMode: "", cameraType: "",
    ptzCameraQty: "", studioCameraQty: "", otherCameraType: "", otherCameraQty: "",
  },
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

const defaultFunctionSchedule = (): RoomFunctionSchedule => ({
  functionName: "",
  scheduleDate: "",
  scheduleDay: "",
  showStartDateTime: "",
  showEndDateTime: "",
  roomSetup: "",
  estimatedAttendees: "",
});

const schedulesForRoom = (room: RoomByRoomData): RoomFunctionSchedule[] => {
  if (Array.isArray(room.functions) && room.functions.length > 0) return room.functions;
  const hasLegacySchedule = [
    room.roomFunction,
    room.scheduleDate,
    room.showStartDateTime,
    room.showEndDateTime,
    room.roomSetup,
    room.estimatedAttendeesInRoom,
  ].some((value) => value.trim().length > 0);
  return hasLegacySchedule
    ? [{
        functionName: room.roomFunction,
        scheduleDate: room.scheduleDate,
        scheduleDay: room.scheduleDay,
        showStartDateTime: room.showStartDateTime,
        showEndDateTime: room.showEndDateTime,
        roomSetup: room.roomSetup,
        estimatedAttendees: room.estimatedAttendeesInRoom,
      }]
    : [defaultFunctionSchedule()];
};

const PRODUCTION_ACCESS_LEAD_DAYS = 7;

const shiftIsoDate = (isoDate: string, days: number): string => {
  const date = isoDateToLocalDate(isoDate);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return localDateToIsoDate(date);
};

const earliestFunctionStart = (room: RoomByRoomData): string => {
  let earliest = "";
  let earliestAt = Number.POSITIVE_INFINITY;
  for (const entry of schedulesForRoom(room)) {
    const at = Date.parse(entry.showStartDateTime);
    if (Number.isFinite(at) && at < earliestAt) {
      earliest = entry.showStartDateTime;
      earliestAt = at;
    }
  }
  return earliest;
};

export type RoomProductionAccessErrors = {
  loadIn?: string;
  rehearsal?: string;
};

/**
 * Room access can start before the event, but a date more than a week early is
 * almost always a typo. Both optional milestones must also happen before the
 * first function, and rehearsal cannot precede load-in.
 */
export const roomProductionAccessTimeErrors = (
  room: RoomByRoomData,
  eventStartDate?: string,
  eventEndDate?: string,
  eventTimeZone?: string | null,
): RoomProductionAccessErrors => {
  const errors: RoomProductionAccessErrors = {};
  const loadInAt = Date.parse(room.loadInDateTime);
  const rehearsalAt = Date.parse(room.rehearsalDateTime);
  const firstFunctionIso = earliestFunctionStart(room);
  const firstFunctionAt = Date.parse(firstFunctionIso);
  const earliestDate = eventStartDate
    ? shiftIsoDate(eventStartDate, -PRODUCTION_ACCESS_LEAD_DAYS)
    : "";
  const earliestAt = Date.parse(
    earliestDate ? wallClockToIso(earliestDate, { hours: 0, minutes: 0 }, eventTimeZone) : "",
  );
  const fallbackEndAt = Date.parse(
    eventEndDate
      ? wallClockToIso(eventEndDate, { hours: 23, minutes: 59 }, eventTimeZone)
      : "",
  );
  const latestAt = Number.isFinite(firstFunctionAt) ? firstFunctionAt : fallbackEndAt;
  const latestMessage = Number.isFinite(firstFunctionAt)
    ? "must be before the room’s first function."
    : "must be within the event’s production window.";

  if (Number.isFinite(loadInAt)) {
    if (Number.isFinite(earliestAt) && loadInAt < earliestAt) {
      errors.loadIn = `Load-in can be no more than ${PRODUCTION_ACCESS_LEAD_DAYS} days before the event.`;
    } else if (Number.isFinite(latestAt) && loadInAt >= latestAt) {
      errors.loadIn = `Load-in ${latestMessage}`;
    }
  }

  if (Number.isFinite(rehearsalAt)) {
    if (Number.isFinite(earliestAt) && rehearsalAt < earliestAt) {
      errors.rehearsal = `Rehearsal can be no more than ${PRODUCTION_ACCESS_LEAD_DAYS} days before the event.`;
    } else if (Number.isFinite(latestAt) && rehearsalAt >= latestAt) {
      errors.rehearsal = `Rehearsal ${latestMessage}`;
    } else if (Number.isFinite(loadInAt) && rehearsalAt < loadInAt) {
      errors.rehearsal = "Rehearsal must be on or after load-in.";
    }
  }

  return errors;
};

// ─── Single room form ─────────────────────────────────────────────────────────
const RoomForm = ({
  data,
  onChange,
  showErrors,
  roomIndex,
  eventTimeZone,
  eventStartDate,
  eventEndDate,
  onOpenScenicInspirations,
  mode,
}: {
  data: RoomByRoomData;
  onChange: (u: Partial<RoomByRoomData>) => void;
  showErrors: boolean;
  roomIndex: number;
  /** Schedule times are wall-clock at the venue, so they render in its zone. */
  eventTimeZone?: string | null;
  eventStartDate?: string;
  eventEndDate?: string;
  onOpenScenicInspirations?: () => void;
  mode: ProposalExperienceMode;
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
  const functionSchedules = schedulesForRoom(data);
  const productionAccessErrors = roomProductionAccessTimeErrors(
    data,
    eventStartDate,
    eventEndDate,
    eventTimeZone,
  );
  const productionWindowStartDate = eventStartDate
    ? shiftIsoDate(eventStartDate, -PRODUCTION_ACCESS_LEAD_DAYS)
    : "";
  const firstFunctionIso = earliestFunctionStart(data);
  const firstFunctionDisplay = toEventZoneDisplay(firstFunctionIso, eventTimeZone);
  const productionWindowEndDate = firstFunctionDisplay
    ? localDateToIsoDate(firstFunctionDisplay)
    : eventEndDate || eventStartDate || "";
  const loadInDisplay = toEventZoneDisplay(data.loadInDateTime, eventTimeZone);
  const rehearsalMinDate = loadInDisplay
    ? new Date(loadInDisplay.getFullYear(), loadInDisplay.getMonth(), loadInDisplay.getDate(), 12)
    : isoDateToLocalDate(productionWindowStartDate) ?? undefined;
  const productionWindowLabel = productionWindowStartDate && productionWindowEndDate
    ? firstFunctionDisplay
      ? `${formatScheduleDate(productionWindowStartDate)} until the first function on ${formatScheduleDate(productionWindowEndDate)}`
      : `${formatScheduleDate(productionWindowStartDate)} through ${formatScheduleDate(productionWindowEndDate)}`
    : "before the room’s first function";
  const activeLedWallCount = ledWallCount(data);
  const ledWalls = ensureLedWallSlots(normalizeLedWalls(data), activeLedWallCount);

  const updateLedWall = (wallIndex: number, updates: Partial<(typeof ledWalls)[number]>) => {
    const next = ensureLedWallSlots(ledWalls, wallIndex + 1);
    next[wallIndex] = { ...next[wallIndex], ...updates };
    onChange({ ledWalls: next });
  };

  const updateFunctionSchedules = (next: RoomFunctionSchedule[]) => {
    const schedules = next.length > 0 ? next : [defaultFunctionSchedule()];
    const primary = schedules[0];
    const peakAttendance = Math.max(
      0,
      ...schedules.map((entry) => Number(entry.estimatedAttendees) || 0),
    );
    onChange({
      functions: schedules,
      // Mirror the first schedule into the legacy fields so existing proposals,
      // recommendation rules, and exports remain backward-compatible.
      roomFunction: primary.functionName,
      roomSetup: primary.roomSetup,
      scheduleDate: primary.scheduleDate,
      scheduleDay: primary.scheduleDay,
      showStartDateTime: primary.showStartDateTime,
      showEndDateTime: primary.showEndDateTime,
      estimatedAttendeesInRoom: peakAttendance > 0 ? String(peakAttendance) : "",
    });
  };

  const updateFunction = (index: number, updates: Partial<RoomFunctionSchedule>) =>
    updateFunctionSchedules(
      functionSchedules.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...updates } : entry,
      ),
    );

  const [showManualTimes, setShowManualTimes] = useState(
    Boolean(
      data.loadInDateTime || data.rehearsalDateTime || data.showStartDateTime || data.showEndDateTime,
    ),
  );
  const [openTimePicker, setOpenTimePicker] = useState<string | null>(null);

  return (
    <div className="space-y-5 px-6 py-6">

      <div>
        <label className={labelClass}>
          Physical Room Name <span className="text-red-500">*</span>
          <InfoTooltip text="The venue room shared by every function listed below. Example: 'A-110-112'." />
        </label>
        <input
          maxLength={200}
          className={`${inputClass} ${errCls(data.roomLocation)}`}
          value={data.roomLocation}
          onChange={(e) => onChange({ roomLocation: e.target.value })}
          placeholder="e.g. A-110-112"
        />
      </div>

      <Group label="Functions & Schedule" />
      <div className="space-y-4">
        {functionSchedules.map((entry, functionIndex) => {
          const startTimeValue = venueTimeValue(entry.showStartDateTime, eventTimeZone);
          const endTimeValue = venueTimeValue(entry.showEndDateTime, eventTimeZone);
          const dateIsOutsideEvent = Boolean(
            entry.scheduleDate &&
            !functionScheduleDateIsWithinEventRange(entry.scheduleDate, eventStartDate, eventEndDate),
          );
          const dateError = dateIsOutsideEvent
            ? `Choose a date within the event dates (${formatScheduleDate(eventStartDate || "")} – ${formatScheduleDate(eventEndDate || "")}).`
            : showErrors && !entry.scheduleDate
              ? "Date is required."
              : undefined;
          const endTimeError = showErrors
            ? !entry.showEndDateTime
              ? "End time is required."
              : !functionScheduleEndIsAfterStart(entry)
                ? "End time must be later than the start time."
                : undefined
            : undefined;
          const minimumEndTime = addMinutesToTimeValue(startTimeValue, 15);

          return (
          <div key={`${uid}-function-${functionIndex}`} className="rounded-xl border border-[#e4e4e4] bg-[#f9f9f9] p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-[#222628]">Function {functionIndex + 1}</p>
              {functionSchedules.length > 1 && (
                <button
                  type="button"
                  onClick={() => updateFunctionSchedules(functionSchedules.filter((_, index) => index !== functionIndex))}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700"
                >
                  <Trash2 size={13} /> Remove function
                </button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Function Name <span className="text-red-500">*</span></label>
                <input
                  maxLength={200}
                  className={`${inputClass} ${errCls(entry.functionName)}`}
                  value={entry.functionName}
                  onChange={(event) => updateFunction(functionIndex, { functionName: event.target.value })}
                  placeholder="e.g. Opening Keynote"
                />
              </div>
              <div>
                <label className={labelClass}># of Attendees <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  max={50000}
                  className={`${inputClass} ${showErrors && !isPositiveIntegerText(entry.estimatedAttendees) ? "border-red-400 focus:border-red-400" : ""}`}
                  value={entry.estimatedAttendees}
                  onChange={(event) => updateFunction(functionIndex, { estimatedAttendees: event.target.value })}
                  placeholder="e.g. 160"
                />
                {showErrors && !isPositiveIntegerText(entry.estimatedAttendees) && (
                  <p className="mt-1 text-xs text-red-500">Enter a whole number greater than zero.</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Room Setup <span className="text-xs font-normal normal-case text-slate-400">(optional)</span></label>
                <GlobalSelect
                  className={inputClass}
                  value={entry.roomSetup}
                  onChange={(event) => updateFunction(functionIndex, { roomSetup: event.target.value })}
                >
                  <option value="">Select room setup…</option>
                  {ROOM_SETUP_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </GlobalSelect>
              </div>
              <fieldset className="md:col-span-2 rounded-xl border border-sky-100 bg-white p-4">
                <legend className="px-1 text-xs font-extrabold uppercase tracking-wide text-[#173744]">Function schedule</legend>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label htmlFor={`${uid}-function-${functionIndex}-date`} className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#3d4143]">Date <span className="text-red-500">*</span></label>
                    <GlobalDateInput
                      id={`${uid}-function-${functionIndex}-date`}
                      label={`Function ${functionIndex + 1} date`}
                      hideLabel
                      showFormatInLabel={false}
                      showErrorMessage={false}
                      format="MM/dd/yyyy"
                      localeAware
                      value={isoDateToLocalDate(entry.scheduleDate)}
                      minDate={isoDateToLocalDate(eventStartDate || "") || undefined}
                      maxDate={isoDateToLocalDate(eventEndDate || "") || undefined}
                      showTodayShortcut
                      onChange={(date) => {
                        const iso = localDateToIsoDate(date);
                        updateFunction(functionIndex, {
                          scheduleDate: iso,
                          scheduleDay: dayOfWeekFromDate(iso),
                          showStartDateTime: functionDateTimeValue(iso, startTimeValue, eventTimeZone),
                          showEndDateTime: functionDateTimeValue(iso, endTimeValue, eventTimeZone),
                        });
                      }}
                      error={dateError}
                      ariaInvalid={Boolean(dateError)}
                      ariaDescribedBy={`${uid}-function-${functionIndex}-date-help`}
                      inputClassName={`${inputClass} pr-12 ${dateError ? "border-red-400 focus:border-red-400" : ""}`}
                    />
                    <p id={`${uid}-function-${functionIndex}-date-help`} className={`mt-1 text-xs ${dateError ? "text-red-500" : "text-slate-500"}`}>
                      {dateError || eventDateWindowLabel(eventStartDate || "", eventEndDate || "")}
                    </p>
                  </div>
                  <GlobalTimeInput
                    id={`${uid}-function-${functionIndex}-start-time`}
                    label="Start time"
                    value={startTimeValue}
                    disabled={!entry.scheduleDate || dateIsOutsideEvent}
                    maxTime="23:30"
                    error={showErrors && !entry.showStartDateTime ? "Start time is required." : undefined}
                    ariaDescribedBy={`${uid}-function-${functionIndex}-start-error`}
                    open={openTimePicker === `${functionIndex}-start`}
                    onOpenChange={(open) => setOpenTimePicker(open ? `${functionIndex}-start` : null)}
                    onChange={(value) => {
                      const currentEndMinutes = timeValueToMinutes(endTimeValue);
                      const nextStartMinutes = timeValueToMinutes(value);
                      const suggestedEnd = addMinutesToTimeValue(value, 60) || addMinutesToTimeValue(value, 15);
                      const shouldReplaceEnd =
                        !value ||
                        currentEndMinutes === null ||
                        nextStartMinutes === null ||
                        currentEndMinutes <= nextStartMinutes;
                      updateFunction(functionIndex, {
                        showStartDateTime: functionDateTimeValue(entry.scheduleDate, value, eventTimeZone),
                        ...(shouldReplaceEnd
                          ? { showEndDateTime: functionDateTimeValue(entry.scheduleDate, suggestedEnd, eventTimeZone) }
                          : {}),
                      });
                    }}
                  />
                  <GlobalTimeInput
                    id={`${uid}-function-${functionIndex}-end-time`}
                    label="End time"
                    value={endTimeValue}
                    disabled={!entry.scheduleDate || dateIsOutsideEvent || !startTimeValue}
                    minTime={minimumEndTime || undefined}
                    maxTime="23:45"
                    error={endTimeError}
                    ariaDescribedBy={`${uid}-function-${functionIndex}-end-error`}
                    open={openTimePicker === `${functionIndex}-end`}
                    onOpenChange={(open) => setOpenTimePicker(open ? `${functionIndex}-end` : null)}
                    onChange={(value) => updateFunction(functionIndex, {
                      showEndDateTime: functionDateTimeValue(entry.scheduleDate, value, eventTimeZone),
                    })}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sky-100 pt-3">
                  <span className="mr-1 text-xs text-slate-500">Set duration:</span>
                  {FUNCTION_DURATION_OPTIONS.map((duration) => {
                    const nextEnd = addMinutesToTimeValue(startTimeValue, duration.minutes);
                    return (
                      <button
                        key={duration.minutes}
                        type="button"
                        disabled={!nextEnd || dateIsOutsideEvent}
                        onClick={() => updateFunction(functionIndex, {
                          showEndDateTime: functionDateTimeValue(entry.scheduleDate, nextEnd, eventTimeZone),
                        })}
                        className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 transition hover:border-sky-400 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {duration.label}
                      </button>
                    );
                  })}
                  <span className="ml-auto text-xs text-slate-500">15-minute increments · {eventTimeZone || "venue time"}</span>
                </div>
              </fieldset>
            </div>
          </div>
          );
        })}
        <button
          type="button"
          onClick={() => updateFunctionSchedules([...functionSchedules, defaultFunctionSchedule()])}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#1DBFD3] hover:text-[#0069a0] transition-colors"
        >
          <Plus size={14} /> Add another function
        </button>
      </div>

      {mode === "advanced" ? (
      <>
      {/* Room-wide production access times */}
      <div>
        <button
          type="button"
          onClick={() => setShowManualTimes((value) => !value)}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#1DBFD3] hover:text-[#0069a0]"
        >
          <Plus size={14} className={showManualTimes ? "rotate-45" : ""} />
          Add room load-in &amp; rehearsal times
        </button>
        {showManualTimes && (
          <fieldset className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-slate-700">
              Production access schedule
            </legend>
            <p id={`${uid}-production-access-guidance`} className="mb-4 text-xs leading-5 text-slate-600">
              Select a date and time in one control. Allowed window: {productionWindowLabel}; 15-minute increments · {eventTimeZone || "venue time"}.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label id={`${uid}-load-in-label`} htmlFor={`${uid}-load-in`} className={`${labelClass} mt-0`}>
                Load-In
                <span className="ml-1 text-xs font-normal normal-case text-slate-400">(optional)</span>
              </label>
              <GlobalDateTimeInput
                id={`${uid}-load-in`}
                label="Load-In"
                hideLabel
                showFormatInLabel={false}
                localeAware
                showTodayShortcut
                showTime
                use12Hours
                timeIntervals={15}
                value={loadInDisplay}
                onChange={(d) => onChange({ loadInDateTime: fromEventZoneDisplay(d, eventTimeZone) })}
                minDate={isoDateToLocalDate(productionWindowStartDate) ?? undefined}
                maxDate={isoDateToLocalDate(productionWindowEndDate) ?? undefined}
                error={productionAccessErrors.loadIn}
                ariaInvalid={Boolean(productionAccessErrors.loadIn)}
                ariaLabelledBy={`${uid}-load-in-label`}
                ariaDescribedBy={`${uid}-production-access-guidance${productionAccessErrors.loadIn ? ` ${uid}-load-in-error` : ""}`}
                inputClassName={`${inputClass} pr-12 ${productionAccessErrors.loadIn ? "border-red-400 focus:border-red-400 focus:ring-red-200" : ""}`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#1DBFD3] hover:text-[#0069a0]"
                placeholder="Select date & time"
                showErrorMessage={false}
              />
              {productionAccessErrors.loadIn && (
                <p id={`${uid}-load-in-error`} className="mt-1 text-xs text-red-500">
                  {productionAccessErrors.loadIn}
                </p>
              )}
            </div>
            <div>
              <label id={`${uid}-rehearsal-label`} htmlFor={`${uid}-rehearsal`} className={`${labelClass} mt-0`}>
                Rehearsal
                <span className="ml-1 text-xs font-normal normal-case text-slate-400">(optional)</span>
              </label>
              <GlobalDateTimeInput
                id={`${uid}-rehearsal`}
                label="Rehearsal"
                hideLabel
                showFormatInLabel={false}
                localeAware
                showTodayShortcut
                showTime
                use12Hours
                timeIntervals={15}
                value={toEventZoneDisplay(data.rehearsalDateTime, eventTimeZone)}
                onChange={(d) => onChange({ rehearsalDateTime: fromEventZoneDisplay(d, eventTimeZone) })}
                minDate={rehearsalMinDate}
                maxDate={isoDateToLocalDate(productionWindowEndDate) ?? undefined}
                error={productionAccessErrors.rehearsal}
                ariaInvalid={Boolean(productionAccessErrors.rehearsal)}
                ariaLabelledBy={`${uid}-rehearsal-label`}
                ariaDescribedBy={`${uid}-production-access-guidance${productionAccessErrors.rehearsal ? ` ${uid}-rehearsal-error` : ""}`}
                inputClassName={`${inputClass} pr-12 ${productionAccessErrors.rehearsal ? "border-red-400 focus:border-red-400 focus:ring-red-200" : ""}`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#1DBFD3] hover:text-[#0069a0]"
                placeholder="Select date & time (optional)"
                showErrorMessage={false}
              />
              {productionAccessErrors.rehearsal && (
                <p id={`${uid}-rehearsal-error`} className="mt-1 text-xs text-red-500">
                  {productionAccessErrors.rehearsal}
                </p>
              )}
            </div>
            </div>
          </fieldset>
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
                <GlobalSelect
                  className={inputClass}
                  value={data.audienceQa.audienceQaMethod}
                  onChange={(e) =>
                    onChange({
                      audienceQa: {
                        ...data.audienceQa,
                        audienceQaMethod: e.target.value,
                        // There is no separate Q&A yes/no control, so the method
                        // carries that answer too. Downstream consumers (save
                        // normalisation, room recommendations) read the flag.
                        audienceQa: e.target.value
                          ? /^No Q&A/i.test(e.target.value) ? "No" : "Yes"
                          : "",
                      },
                    })
                  }
                >
                  <option value="">Select Q&amp;A method…</option>
                  <option>No Q&A — Presentation only</option>
                  <option>Passed Handheld Mic — Staff walks mics to audience</option>
                  <option>Fixed Floor Mics — Stationary mics in aisles</option>
                  <option>Digital / App-Based (Slido, Mentimeter, etc.)</option>
                  <option>Combination — Multiple methods</option>
                </GlobalSelect>
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
                    <GlobalSelect
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
                    </GlobalSelect>
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
                ? { ledWallCount: "", ledWalls: [] }
                : activeLedWallCount > 0
                  ? {}
                  : { ledWallCount: "1", ledWalls: ensureLedWallSlots(normalizeLedWalls(data), 1) }),
            })
          }
        />
        {data.ledWall === "Yes" && (
          <div className={subPanelClass}>
            <p className={subPanelHeader}>LED Wall Specifications</p>
            <div className="mb-5 max-w-xs">
              <label className={labelClass}>Number of LED Walls <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={1}
                max={20}
                className={`${inputClass} ${showErrors && activeLedWallCount < 1 ? "border-red-400 focus:border-red-400" : ""}`}
                value={data.ledWallCount ?? ""}
                onChange={(event) => {
                  const rawCount = event.target.value;
                  const nextCount = Math.min(20, Math.max(0, Number(rawCount) || 0));
                  onChange({
                    ledWallCount: rawCount,
                    ledWalls: ensureLedWallSlots(ledWalls, nextCount),
                  });
                }}
              />
            </div>

            <div className="space-y-5">
              {ledWalls.slice(0, activeLedWallCount).map((wall, wallIndex) => (
                <div key={wallIndex} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-4 text-sm font-bold text-[#222628]">LED Wall {wallIndex + 1}</p>
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Width (ft) <span className="text-red-500">*</span></label>
                      <input type="number" min={0.1} step="any" className={`${inputClass} ${showErrors && !(Number(wall.width) > 0) ? "border-red-400" : ""}`} placeholder="e.g. 40" value={wall.width} onChange={(event) => updateLedWall(wallIndex, { width: event.target.value })} />
                    </div>
                    <div>
                      <label className={labelClass}>Height (ft) <span className="text-red-500">*</span></label>
                      <input type="number" min={0.1} step="any" className={`${inputClass} ${showErrors && !(Number(wall.height) > 0) ? "border-red-400" : ""}`} placeholder="e.g. 15" value={wall.height} onChange={(event) => updateLedWall(wallIndex, { height: event.target.value })} />
                    </div>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Shape <span className="text-red-500">*</span></label>
                      <GlobalSelect className={`${inputClass} ${showErrors && !wall.shape ? "border-red-400" : ""}`} value={wall.shape} onChange={(event) => updateLedWall(wallIndex, { shape: event.target.value })}>
                        <option value="">Select shape…</option>
                        <option>Flat / Straight</option><option>Curved</option><option>Multi-Panel / Segmented</option><option>Wraparound</option>
                      </GlobalSelect>
                    </div>
                    <div>
                      <label className={labelClass}>Pixel Pitch <span className="text-red-500">*</span></label>
                      <GlobalSelect className={`${inputClass} ${showErrors && !wall.pixelPitch ? "border-red-400" : ""}`} value={wall.pixelPitch} onChange={(event) => updateLedWall(wallIndex, { pixelPitch: event.target.value })}>
                        <option value="">Select preference…</option>
                        <option>1.9mm or finer (Premium)</option><option>2.6mm (Standard)</option><option>3.9mm (Acceptable for distance)</option><option>Vendor Recommendation</option>
                      </GlobalSelect>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className={labelClass}>Switcher / Processor <span className="text-red-500">*</span></label>
                    <GlobalSelect className={`${inputClass} ${showErrors && !wall.switcher ? "border-red-400" : ""}`} value={wall.switcher} onChange={(event) => updateLedWall(wallIndex, { switcher: event.target.value })}>
                      <option value="">Select preference…</option>
                      {LED_SWITCHER_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                    </GlobalSelect>
                  </div>
                  <div>
                    <label className={labelClass}>Additional Notes <span className="text-xs font-normal normal-case text-slate-400">(optional)</span></label>
                    <textarea rows={2} className="w-full resize-none rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm" value={wall.notes} onChange={(event) => updateLedWall(wallIndex, { notes: event.target.value })} />
                  </div>
                  {Number(wall.width) >= 60 && <p className="mt-3 text-xs text-amber-700">Large LED wall: walls ≥ 60ft may trigger a Producer Insight Call recommendation.</p>}
                </div>
              ))}
            </div>
            {showErrors && ledWallPlanMissingFields(data).length > 0 && (
              <p className="mt-3 text-xs text-red-500">Complete: {ledWallPlanMissingFields(data).join(", ")}.</p>
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
                monitorSizeOther: v !== "Yes" ? "" : data.largeMonitorsOrScreenProjector.monitorSizeOther,
                screenSize: v !== "Yes" ? "" : data.largeMonitorsOrScreenProjector.screenSize,
                screenSizeOther: v !== "Yes" ? "" : data.largeMonitorsOrScreenProjector.screenSizeOther,
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
                      monitorSizeOther: Number(e.target.value) > 0 ? data.largeMonitorsOrScreenProjector.monitorSizeOther : "",
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
                      screenSizeOther: Number(e.target.value) > 0 ? data.largeMonitorsOrScreenProjector.screenSizeOther : "",
                    },
                  })
                }
              />
            </div>
            {Number(data.largeMonitorsOrScreenProjector.numberOfMonitors) > 0 && (
              <div className="space-y-3">
                <div>
                  <label htmlFor={`${uid}-monitor-size`} className={`${labelClass} mt-0`}>Monitor Size</label>
                  <GlobalSelect
                    id={`${uid}-monitor-size`}
                    className={inputClass}
                    value={data.largeMonitorsOrScreenProjector.monitorSize}
                    onChange={(e) =>
                      onChange({
                        largeMonitorsOrScreenProjector: {
                          ...data.largeMonitorsOrScreenProjector,
                          ...selectMonitorSize(data.largeMonitorsOrScreenProjector, e.target.value),
                        },
                      })
                    }
                  >
                    <option value="">Select size…</option>
                    {MONITOR_SIZE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </GlobalSelect>
                </div>
                {data.largeMonitorsOrScreenProjector.monitorSize === SCREEN_SIZE_OTHER && (
                  <div>
                    <label htmlFor={`${uid}-monitor-size-other`} className={`${labelClass} mt-0`}>
                      Custom Monitor Size <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`${uid}-monitor-size-other`}
                      type="text"
                      required
                      aria-invalid={showErrors && customMonitorSizeIsMissing(data.largeMonitorsOrScreenProjector) ? true : undefined}
                      aria-describedby={showErrors && customMonitorSizeIsMissing(data.largeMonitorsOrScreenProjector) ? `${uid}-monitor-size-other-error` : undefined}
                      className={`${inputClass} ${showErrors && customMonitorSizeIsMissing(data.largeMonitorsOrScreenProjector) ? "border-red-400 focus:border-red-400" : ""}`}
                      placeholder={'e.g. 85" wall-mounted'}
                      value={data.largeMonitorsOrScreenProjector.monitorSizeOther}
                      onChange={(e) => onChange({
                        largeMonitorsOrScreenProjector: {
                          ...data.largeMonitorsOrScreenProjector,
                          monitorSizeOther: e.target.value,
                        },
                      })}
                    />
                    {showErrors && customMonitorSizeIsMissing(data.largeMonitorsOrScreenProjector) && (
                      <p id={`${uid}-monitor-size-other-error`} className="mt-1 text-xs text-red-500">
                        Enter the custom monitor size.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {Number(data.largeMonitorsOrScreenProjector.numberOfScreens) > 0 && (
              <div className="space-y-3">
                <div>
                  <label htmlFor={`${uid}-screen-size`} className={`${labelClass} mt-0`}>Screen Size</label>
                  <GlobalSelect
                    id={`${uid}-screen-size`}
                    className={inputClass}
                    value={data.largeMonitorsOrScreenProjector.screenSize}
                    onChange={(e) =>
                      onChange({
                        largeMonitorsOrScreenProjector: {
                          ...data.largeMonitorsOrScreenProjector,
                          ...selectScreenSize(data.largeMonitorsOrScreenProjector, e.target.value),
                        },
                      })
                    }
                  >
                    <option value="">Select size…</option>
                    {SCREEN_SIZE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </GlobalSelect>
                </div>
                {data.largeMonitorsOrScreenProjector.screenSize === SCREEN_SIZE_OTHER && (
                  <div>
                    <label htmlFor={`${uid}-screen-size-other`} className={`${labelClass} mt-0`}>
                      Custom Screen Size <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`${uid}-screen-size-other`}
                      type="text"
                      required
                      aria-invalid={showErrors && customScreenSizeIsMissing(data.largeMonitorsOrScreenProjector) ? true : undefined}
                      aria-describedby={showErrors && customScreenSizeIsMissing(data.largeMonitorsOrScreenProjector) ? `${uid}-screen-size-other-error` : undefined}
                      className={`${inputClass} ${showErrors && customScreenSizeIsMissing(data.largeMonitorsOrScreenProjector) ? "border-red-400 focus:border-red-400" : ""}`}
                      placeholder={'e.g. 22\' × 12\' rear projection'}
                      value={data.largeMonitorsOrScreenProjector.screenSizeOther}
                      onChange={(e) => onChange({
                        largeMonitorsOrScreenProjector: {
                          ...data.largeMonitorsOrScreenProjector,
                          screenSizeOther: e.target.value,
                        },
                      })}
                    />
                    {showErrors && customScreenSizeIsMissing(data.largeMonitorsOrScreenProjector) && (
                      <p id={`${uid}-screen-size-other-error`} className="mt-1 text-xs text-red-500">
                        Enter the custom screen size.
                      </p>
                    )}
                  </div>
                )}
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
              className="w-full resize-none rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1DBFD3] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20"
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
            <button
              type="button"
              onClick={onOpenScenicInspirations}
              className="mt-2 text-xs font-semibold text-[#1DBFD3] hover:underline"
            >
              Add scenic inspiration files in Reference Materials →
            </button>
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
          <InfoTooltip text="Camera coverage for IMAG or recording. Choose a specific typed plan, or ask the vendor to recommend the right plan for this room." />
        </label>
        <YesNo
          value={data.cameras.cameras}
          onChange={(v) =>
            onChange({
              cameras: {
                ...data.cameras,
                cameras: v,
                ...(v !== "Yes" ? {
                  camerasQty: "", cameraPlanMode: "", cameraType: "", ptzCameraQty: "",
                  studioCameraQty: "", otherCameraType: "", otherCameraQty: "",
                } : {}),
              },
            })
          }
        />
        {data.cameras.cameras === "Yes" && (
          <div className={subPanelClass}>
            <label className={labelClass}>Camera Planning Approach <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-3">
              {[CAMERA_PLAN_SPECIFIC, CAMERA_PLAN_VENDOR_RECOMMENDATION].map((option) => (
                <PillRadio
                  key={option}
                  name={`${uid}-camera-plan-mode`}
                  value={option}
                  checked={data.cameras.cameraPlanMode === option}
                  onChange={() => onChange({ cameras: {
                    ...data.cameras,
                    cameraPlanMode: option,
                    cameraType: option === CAMERA_PLAN_SPECIFIC ? data.cameras.cameraType : "",
                    ptzCameraQty: option === CAMERA_PLAN_SPECIFIC ? data.cameras.ptzCameraQty : "",
                    studioCameraQty: option === CAMERA_PLAN_SPECIFIC ? data.cameras.studioCameraQty : "",
                    otherCameraType: option === CAMERA_PLAN_SPECIFIC ? data.cameras.otherCameraType : "",
                    otherCameraQty: option === CAMERA_PLAN_SPECIFIC ? data.cameras.otherCameraQty : "",
                    camerasQty: option === CAMERA_PLAN_SPECIFIC ? data.cameras.camerasQty : "",
                  } })}
                />
              ))}
            </div>
            {data.cameras.cameraPlanMode === CAMERA_PLAN_SPECIFIC && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className={labelClass}>Camera Type <span className="text-red-500">*</span></label>
                  <GlobalSelect
                    className={inputClass}
                    value={data.cameras.cameraType}
                    onChange={(event) => onChange({ cameras: {
                      ...data.cameras,
                      cameraType: event.target.value,
                      ptzCameraQty: [CAMERA_TYPE_PTZ, CAMERA_TYPE_BOTH].includes(event.target.value) ? data.cameras.ptzCameraQty : "",
                      studioCameraQty: [CAMERA_TYPE_STUDIO, CAMERA_TYPE_BOTH].includes(event.target.value) ? data.cameras.studioCameraQty : "",
                      otherCameraType: event.target.value === CAMERA_TYPE_OTHER ? data.cameras.otherCameraType : "",
                      otherCameraQty: event.target.value === CAMERA_TYPE_OTHER ? data.cameras.otherCameraQty : "",
                    } })}
                  >
                    <option value="">Select camera type…</option>
                    {[CAMERA_TYPE_PTZ, CAMERA_TYPE_STUDIO, CAMERA_TYPE_BOTH, CAMERA_TYPE_OTHER].map((option) => <option key={option}>{option}</option>)}
                  </GlobalSelect>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[CAMERA_TYPE_PTZ, CAMERA_TYPE_BOTH].includes(data.cameras.cameraType) && (
                    <div><label className={labelClass}>PTZ Quantity <span className="text-red-500">*</span></label><input type="number" min={1} className={inputClass} value={data.cameras.ptzCameraQty} onChange={(event) => onChange({ cameras: { ...data.cameras, ptzCameraQty: event.target.value } })} /></div>
                  )}
                  {[CAMERA_TYPE_STUDIO, CAMERA_TYPE_BOTH].includes(data.cameras.cameraType) && (
                    <div><label className={labelClass}>Studio / Broadcast Quantity <span className="text-red-500">*</span></label><input type="number" min={1} className={inputClass} value={data.cameras.studioCameraQty} onChange={(event) => onChange({ cameras: { ...data.cameras, studioCameraQty: event.target.value } })} /></div>
                  )}
                  {data.cameras.cameraType === CAMERA_TYPE_OTHER && (
                    <><div><label className={labelClass}>Other Camera Type <span className="text-red-500">*</span></label><input className={inputClass} value={data.cameras.otherCameraType} onChange={(event) => onChange({ cameras: { ...data.cameras, otherCameraType: event.target.value } })} /></div><div><label className={labelClass}>Quantity <span className="text-red-500">*</span></label><input type="number" min={1} className={inputClass} value={data.cameras.otherCameraQty} onChange={(event) => onChange({ cameras: { ...data.cameras, otherCameraQty: event.target.value } })} /></div></>
                  )}
                </div>
                {cameraPlanTotal(data.cameras) > 0 && <p className="text-xs font-semibold text-[#0069a0]">Derived total: {cameraPlanTotal(data.cameras)} camera(s)</p>}
              </div>
            )}
            {showErrors && cameraPlanMissingFields(data.cameras).length > 0 && <p className="mt-2 text-xs text-red-500">Complete: {cameraPlanMissingFields(data.cameras).join(", ")}.</p>}
          </div>
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
            <span className="ml-1 text-[#1DBFD3] font-semibold">
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
        <div className="flex items-start gap-2 rounded-lg border border-[#1DBFD3]/30 bg-[#1DBFD3]/5 p-3 text-xs text-[#0069a0]">
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
                  className="rounded-full border border-[#1DBFD3]/30 bg-white px-2.5 py-0.5 text-xs font-semibold text-[#0069a0] hover:bg-[#1DBFD3]/10 transition-colors"
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
                  className="h-8 w-14 rounded-md border border-[#e4e4e4] bg-white text-center text-sm font-bold text-[#222628] outline-none focus:border-[#1DBFD3] focus:ring-1 focus:ring-[#1DBFD3]/20"
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
          className="w-full resize-none rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1DBFD3] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20"
          placeholder="Write here…"
          value={data.otherRolesNeeded}
          onChange={(e) => onChange({ otherRolesNeeded: e.target.value })}
        />
      </div>
      </>
      ) : (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-violet-950">
            <Sparkles size={16} aria-hidden="true" /> Vendor-recommended production scope
          </p>
          <p className="mt-1 text-xs leading-5 text-violet-800">
            Basic mode keeps the room schedule concise and asks vendors to recommend the right audio, video, lighting, and show crew. Open Advanced production to edit the technical specification directly.
          </p>
        </div>
      )}
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
  eventTimeZone,
  eventStartDate,
  eventEndDate,
  onOpenScenicInspirations,
  mode,
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
  eventTimeZone?: string | null;
  eventStartDate?: string;
  eventEndDate?: string;
  onOpenScenicInspirations?: () => void;
  mode: ProposalExperienceMode;
}) => {
  const roomLabel = room.roomLocation.trim() || room.roomFunction.trim() || `Room ${index + 1}`;
  const functionCount = schedulesForRoom(room).filter((entry) => entry.functionName.trim()).length;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e4e4e4] bg-white">
      <div
        className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-slate-50"
        style={{ borderBottom: isExpanded ? "1px solid #e4e4e4" : "none" }}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={`room-panel-${index}`}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0786cf]"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #1DBFD3 100%)" }}
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
            {!isExpanded && (
              <p className="text-xs text-[#969798]">
                {functionCount} function{functionCount === 1 ? "" : "s"}
                {room.estimatedAttendeesInRoom ? ` · peak ${room.estimatedAttendeesInRoom} attendees` : ""}
              </p>
            )}
          </div>
          <span className="ml-auto text-[#969798]" aria-hidden="true">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            title="Copy this room's details to start a new room"
            className="flex items-center gap-1.5 rounded-full border border-[#e4e4e4] bg-white px-3 py-1 text-xs font-semibold text-[#222628] hover:border-[#1DBFD3] hover:text-[#1DBFD3] transition-colors"
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
        </div>
      </div>

      {isExpanded && (
        <div id={`room-panel-${index}`}>
          <RoomForm
            data={room}
            onChange={onChange}
            showErrors={showErrors}
            roomIndex={index}
            eventTimeZone={eventTimeZone}
            eventStartDate={eventStartDate}
            eventEndDate={eventEndDate}
            onOpenScenicInspirations={onOpenScenicInspirations}
            mode={mode}
          />
        </div>
      )}
    </div>
  );
};

// ─── Step validation ──────────────────────────────────────────────────────────
/**
 * The required fields for one room, as a list of human labels. Kept here beside
 * the inputs so the wizard's blocking check and the on-screen errors can never
 * disagree about what "complete" means.
 */
export const missingRoomFields = (
  room: RoomByRoomData,
  mode: ProposalExperienceMode = "advanced",
  eventStartDate?: string,
  eventEndDate?: string,
  eventTimeZone?: string | null,
): string[] => {
  const missing: string[] = [];
  if (!room.roomLocation.trim()) missing.push("physical room name");
  const schedules = room.functions.length > 0 ? room.functions : [];
  if (schedules.length > 0) {
    if (schedules.some((entry) => !entry.functionName.trim())) missing.push("function name");
    if (schedules.some((entry) => !isPositiveIntegerText(entry.estimatedAttendees))) missing.push("number of attendees");
    if (schedules.some((entry) => !entry.scheduleDate.trim())) missing.push("date");
    if (schedules.some((entry) =>
      entry.scheduleDate.trim() &&
      !functionScheduleDateIsWithinEventRange(entry.scheduleDate, eventStartDate, eventEndDate)
    )) missing.push("date within event dates");
    if (schedules.some((entry) => !entry.showStartDateTime.trim())) missing.push("start time");
    if (schedules.some((entry) => !entry.showEndDateTime.trim())) missing.push("end time");
    if (schedules.some((entry) => !functionScheduleEndIsAfterStart(entry))) missing.push("end time after start time");
  } else {
    if (!room.roomFunction.trim()) missing.push("function name");
    if (!isPositiveIntegerText(room.estimatedAttendeesInRoom)) missing.push("number of attendees");
    if (!room.scheduleDate.trim()) missing.push("date");
    if (
      room.scheduleDate.trim() &&
      !functionScheduleDateIsWithinEventRange(room.scheduleDate, eventStartDate, eventEndDate)
    ) missing.push("date within event dates");
    if (!room.showStartDateTime.trim()) missing.push("start time");
    if (!room.showEndDateTime.trim()) missing.push("end time");
    if (!functionScheduleEndIsAfterStart({
      functionName: room.roomFunction,
      scheduleDate: room.scheduleDate,
      scheduleDay: room.scheduleDay,
      showStartDateTime: room.showStartDateTime,
      showEndDateTime: room.showEndDateTime,
      roomSetup: room.roomSetup,
      estimatedAttendees: room.estimatedAttendeesInRoom,
    })) missing.push("end time after start time");
  }
  if (mode === "advanced") {
    if (room.showCrewNeeded.length === 0) missing.push("show crew");
    missing.push(...cameraPlanMissingFields(room.cameras));
    missing.push(...ledWallPlanMissingFields(room));
    const productionAccessErrors = roomProductionAccessTimeErrors(
      room,
      eventStartDate,
      eventEndDate,
      eventTimeZone,
    );
    if (productionAccessErrors.loadIn) missing.push("valid load-in time");
    if (productionAccessErrors.rehearsal) missing.push("valid rehearsal time");
  }
  if (
    Number(room.largeMonitorsOrScreenProjector.numberOfScreens) > 0 &&
    customScreenSizeIsMissing(room.largeMonitorsOrScreenProjector)
  ) {
    missing.push("custom screen size");
  }
  if (
    Number(room.largeMonitorsOrScreenProjector.numberOfMonitors) > 0 &&
    customMonitorSizeIsMissing(room.largeMonitorsOrScreenProjector)
  ) {
    missing.push("custom monitor size");
  }
  return missing;
};

export const roomLabel = (room: RoomByRoomData, index: number): string =>
  room.roomLocation.trim() || room.roomFunction.trim() || `Room ${index + 1}`;

/** First room that still blocks the step, or null when every room is complete. */
export const firstIncompleteRoom = (
  rooms: RoomByRoomData[],
  mode: ProposalExperienceMode = "advanced",
  eventStartDate?: string,
  eventEndDate?: string,
  eventTimeZone?: string | null,
): { index: number; label: string; missing: string[] } | null => {
  for (const [index, room] of rooms.entries()) {
    const missing = missingRoomFields(room, mode, eventStartDate, eventEndDate, eventTimeZone);
    if (missing.length) return { index, label: roomLabel(room, index), missing };
  }
  return null;
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
  /** Saved proposal id; recommendations only exist against a saved draft. */
  proposalId?: string | null;
  /** Re-seeds the wizard's local rooms from the saved proposal after an apply. */
  onRecommendationsApplied?: () => void | Promise<void>;
  /**
   * Room the wizard wants brought into view because it blocked Continue.
   * Collapsed cards hide their own errors, so a blocked step is invisible
   * until the offending room is opened and scrolled to. `token` changes on
   * every blocked attempt so retrying the same room scrolls again.
   */
  focusRoom?: { index: number; token: number } | null;
  /** Venue & Schedule time-zone label; uploaded schedule times are wall-clock there. */
  eventTimeZone?: string | null;
  onOpenScenicInspirations?: () => void;
  eventStartDate?: string;
  eventEndDate?: string;
  eventAttendance?: string;
  onTemplateApplied?: (template: string, confidence: number, explanation: string) => void;
  mode?: ProposalExperienceMode;
}

export const ROOM_TEMPLATES = [
  { id: "general", label: "General Session", setup: "Theater", share: 1, description: "Main stage, screens, audio, cameras, lighting" },
  { id: "breakout", label: "Breakout", setup: "Classroom", share: 0.25, description: "Presentation, speech audio, flexible display" },
  { id: "workshop", label: "Workshop", setup: "Classroom", share: 0.15, description: "Facilitated learning with presentation support" },
  { id: "reception", label: "Reception", setup: "Round of 8", share: 0.5, description: "Background audio, announcements, ambient lighting" },
] as const;

type RoomTemplate = (typeof ROOM_TEMPLATES)[number];

export const roomFromTemplate = (
  template: RoomTemplate,
  eventStartDate: string,
  eventEndDate: string,
  eventAttendance: string,
  eventTimeZone?: string | null,
): RoomByRoomData => {
  const totalAttendance = Math.max(1, Number(eventAttendance) || 100);
  const attendees = String(Math.max(10, Math.round(totalAttendance * template.share)));
  const start = eventStartDate
    ? wallClockToIso(eventStartDate, { hours: 9, minutes: 0 }, eventTimeZone)
    : "";
  const endDate = eventEndDate || eventStartDate;
  const end = endDate
    ? wallClockToIso(endDate, { hours: 17, minutes: 0 }, eventTimeZone)
    : "";
  const isReception = template.id === "reception";
  const needsCamera = template.id === "general";

  return {
    ...defaultRoom(),
    roomLocation: template.label,
    roomFunction: template.label,
    roomSetup: template.setup,
    scheduleDate: eventStartDate,
    showStartDateTime: start,
    showEndDateTime: end,
    estimatedAttendeesInRoom: attendees,
    functions: [{
      functionName: template.label,
      scheduleDate: eventStartDate,
      scheduleDay: "",
      showStartDateTime: start,
      showEndDateTime: end,
      roomSetup: template.setup,
      estimatedAttendees: attendees,
    }],
    audioSystemRequired: "Yes",
    audioSystemForHowManyPpl: attendees,
    podiumMic: { podiumMic: isReception ? "No" : "Yes", podiumMicQty: isReception ? "" : "1" },
    cameras: {
      ...defaultRoom().cameras,
      cameras: needsCamera ? "Yes" : "No",
      cameraPlanMode: needsCamera ? CAMERA_PLAN_VENDOR_RECOMMENDATION : "",
    },
    largeMonitorsOrScreenProjector: {
      ...defaultRoom().largeMonitorsOrScreenProjector,
      largeMonitorsOrScreenProjector: "Yes",
      numberOfScreens: "1",
      screenSize: SCREEN_SIZE_VENDOR_RECOMMENDATION,
    },
    lightingRequirements: isReception
      ? ["None / Minimal — House lighting only"]
      : ["Stage Wash"],
    showCrewNeeded: ["Vendor Recommendation Requested"],
  };
};

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
  proposalId = null,
  onRecommendationsApplied,
  focusRoom = null,
  eventTimeZone = null,
  onOpenScenicInspirations,
  eventStartDate = "",
  eventEndDate = "",
  eventAttendance = "",
  onTemplateApplied,
  mode = "advanced",
}: Props) => {
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set([0]));
  const [isUploadingSchedule, setIsUploadingSchedule] = useState(false);
  const [roomPendingDeletion, setRoomPendingDeletion] = useState<{
    index: number;
    label: string;
    functionCount: number;
    peakAttendance: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roomCardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const roomCount = Math.max(1, Number(numberOfEventRooms) || 1);

  // Open and reveal the room that blocked Continue. Keyed on the parent's
  // token so repeated attempts on the same room scroll again.
  const focusIndex = focusRoom?.index ?? null;
  const focusToken = focusRoom?.token ?? null;
  useEffect(() => {
    if (focusIndex === null) return;
    setExpandedRooms((prev) => new Set(prev).add(focusIndex));
    // Let the newly expanded card lay out before scrolling to it.
    const timer = window.setTimeout(() => {
      roomCardRefs.current[focusIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusIndex, focusToken]);

  const toggleRoom = (i: number) =>
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const updateRoom = (i: number, updates: Partial<RoomByRoomData>) =>
    onRoomsChange(rooms.map((r, idx) => (idx === i ? { ...r, ...updates } : r)));

  const applyRoomTemplate = (template: RoomTemplate) => {
    const templatedRoom = roomFromTemplate(
      template,
      eventStartDate,
      eventEndDate,
      eventAttendance,
      eventTimeZone,
    );
    const firstRoomIsEmpty = rooms.length === 1 && !rooms[0]?.roomLocation.trim() && !rooms[0]?.roomFunction.trim();
    const nextRooms = firstRoomIsEmpty ? [templatedRoom] : [...rooms, templatedRoom];
    onRoomsChange(nextRooms);
    onNumberOfEventRoomsChange(String(nextRooms.length));
    setExpandedRooms(new Set([nextRooms.length - 1]));
    onTemplateApplied?.(
      template.label,
      eventStartDate && eventAttendance ? 0.86 : 0.68,
      `Based on ${eventAttendance ? "attendance" : "default attendance"}, event dates, and a typical ${template.label.toLowerCase()} AV profile.`,
    );
    toast.success(`${template.label} template added. Review the assumptions before publishing.`);
  };

  const duplicateRoom = (i: number) => {
    const source = rooms[i];
    if (!source) return;
    const copy: RoomByRoomData = {
      ...source,
      functions: schedulesForRoom(source).map((entry) => ({ ...entry })),
      roomLocation: source.roomLocation ? `${source.roomLocation} (Copy)` : "",
    };
    const nextRooms = [...rooms, copy];
    onRoomsChange(nextRooms);
    onNumberOfEventRoomsChange(String(nextRooms.length));
    setExpandedRooms(new Set([nextRooms.length - 1]));
  };

  const requestRoomDeletion = (i: number) => {
    if (rooms.length <= 1) return;
    const room = rooms[i];
    if (!room) return;
    setRoomPendingDeletion({
      index: i,
      label: roomLabel(room, i),
      functionCount: schedulesForRoom(room).filter((entry) => entry.functionName.trim()).length,
      peakAttendance: room.estimatedAttendeesInRoom,
    });
  };

  const confirmRoomDeletion = () => {
    if (!roomPendingDeletion || rooms.length <= 1) return;
    const { index, label } = roomPendingDeletion;
    const nextRooms = rooms.filter((_, idx) => idx !== index);
    setRoomPendingDeletion(null);
    onRoomsChange(nextRooms);
    onNumberOfEventRoomsChange(String(nextRooms.length));
    setExpandedRooms((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < index) next.add(idx);
        else if (idx > index) next.add(idx - 1);
      });
      return next;
    });
    toast.success(
      <ToastMessage
        title="Room removed"
        description={`“${label}” was removed. ${nextRooms.length} room${nextRooms.length === 1 ? " remains" : "s remain"}.`}
      />,
      { ariaLabel: `${label} removed` },
    );
  };

  const handleScheduleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const hasExistingData = rooms.some((r) => r.roomLocation.trim() || r.roomFunction.trim());
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
      }, eventTimeZone);
      if (parsedRooms.length === 0) {
        toast.error("No rooms could be read from that file. Check the column headers and try again.");
        return;
      }
      onRoomsChange(parsedRooms);
      onNumberOfEventRoomsChange(String(parsedRooms.length));
      setExpandedRooms(new Set([0]));
      const roomWord = `room${parsedRooms.length === 1 ? "" : "s"}`;
      toast.success(
        `Loaded ${parsedRooms.length} physical ${roomWord} with ${totalRows} scheduled function${totalRows === 1 ? "" : "s"}. AV specifications are shared within each room.`,
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
        <h2 className="text-[22px] font-bold text-[#222628]">Room Specifications &amp; Schedule</h2>
        <p className="mt-1 text-sm text-[#969798]">
          One module per room — each room generates its own section in the RFP.
        </p>
      </div>

      {/* Room recommendations — review-first suggestions for a saved draft */}
      {proposalId && process.env.NEXT_PUBLIC_ROOM_RECOMMENDATIONS_ENABLED === "true" && (
        <div className="px-6 pt-6">
          <RoomRecommendationsPanel proposalId={proposalId} onApplied={onRecommendationsApplied} />
        </div>
      )}

      <div className="px-6 pt-6">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-violet-700 shadow-sm"><Sparkles size={18} aria-hidden="true" /></span>
            <div>
              <p className="text-sm font-extrabold text-violet-950">Start with a reusable room template</p>
              <p className="mt-1 text-xs leading-5 text-violet-800">Templates generate a schedule and recommended AV starting point. Every applied assumption remains editable and appears in Final Review.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {ROOM_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyRoomTemplate(template)}
                className="min-h-20 rounded-xl border border-violet-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                aria-label={`Add ${template.label} room template`}
              >
                <span className="block text-sm font-extrabold text-slate-900">{template.label}</span>
                <span className="mt-1 block text-xs leading-4 text-slate-500">{template.description}</span>
              </button>
            ))}
          </div>
        </div>
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
              className="h-10 w-16 rounded-lg border border-[#e4e4e4] bg-white text-center text-sm font-bold text-[#222628] outline-none focus:border-[#1DBFD3] focus:ring-2 focus:ring-[#1DBFD3]/20"
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
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#1DBFD3]/30 bg-[#1DBFD3]/5 p-3 text-xs text-brand-dark">
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
            <InfoTooltip text="Upload an Excel (.xlsx) schedule to bulk-create room modules. Each schedule row becomes a separate module, so the same physical room can contain multiple functions on the same date. This replaces the current room list." />
          </label>
          <p className="mb-3 text-xs text-slate-500 normal-case">
            Rows with the same room name are grouped into one physical room. Each row remains a separate function schedule sharing that room&apos;s AV specifications.
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
              className="flex items-center gap-2 rounded-lg border border-[#e4e4e4] bg-white px-4 py-2 text-sm font-semibold text-[#222628] hover:border-[#1DBFD3] hover:text-[#1DBFD3] transition-colors disabled:opacity-50"
            >
              <Upload size={15} className="shrink-0" />
              {isUploadingSchedule ? "Reading file…" : "Upload Schedule (Excel)"}
            </button>
            <a
              href="/files/RFPilot%20schedule-example-sheet.xlsx"
              download
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-[#1DBFD3] hover:text-[#0069a0] transition-colors"
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
          <div
            key={i}
            ref={(node) => {
              roomCardRefs.current[i] = node;
            }}
          >
            <RoomCard
              room={room}
              index={i}
              total={rooms.length}
              isExpanded={expandedRooms.has(i)}
              onToggle={() => toggleRoom(i)}
              onChange={(u) => updateRoom(i, u)}
              onDuplicate={() => duplicateRoom(i)}
              onDelete={() => requestRoomDeletion(i)}
              canDelete={rooms.length > 1}
              showErrors={showErrors}
              eventTimeZone={eventTimeZone}
              eventStartDate={eventStartDate}
              eventEndDate={eventEndDate}
              onOpenScenicInspirations={onOpenScenicInspirations}
              mode={mode}
            />
          </div>
        ))}
      </div>

      {roomPendingDeletion && (
        <RoomDeletionDialog
          roomName={roomPendingDeletion.label}
          roomPosition={`Room ${roomPendingDeletion.index + 1} of ${rooms.length}`}
          functionCount={roomPendingDeletion.functionCount}
          peakAttendance={roomPendingDeletion.peakAttendance}
          onCancel={() => setRoomPendingDeletion(null)}
          onConfirm={confirmRoomDeletion}
        />
      )}

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
          style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #1DBFD3 100%)" }}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
          {mode === "basic"
            ? "Investment & timeline"
            : isInPersonOnly
              ? "Content & Creative"
              : "Hybrid & Virtual"}
          <ArrowRight size={15} className="shrink-0" />
        </button>
      </div>
    </section>
  );
};

export default RoomAndProductionStep;
