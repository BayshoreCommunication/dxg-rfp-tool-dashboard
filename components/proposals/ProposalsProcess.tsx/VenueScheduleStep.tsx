"use client";
import GlobalDateTimeInput from "@/components/shared/GlobalDateTimeInput";
import GlobalSelect from "@/components/shared/GlobalSelect";
import { InfoTooltip, PillCheckbox, toggleItem } from "./shared";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ProposalExperienceMode } from "@/lib/proposals/proposalExperience";

const toDateObj = (dateStr: string, timeStr: string): Date | null => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T${timeStr || "00:00"}`);
  return isNaN(d.getTime()) ? null : d;
};

const fromDateObj = (date: Date | null): { date: string; time: string } => {
  if (!date) return { date: "", time: "" };
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
};

type ProposalSettings = {
  branding: { linkPrefix: string; defaultFont: "Inter" | "Poppins" | "Roboto" };
  proposals: {
    proposalLanguage: string;
    defaultCurrency: string;
    expiryDate: string;
    priceSeparator: string;
    dateFormat: string;
    decimalPrecision: string;
  };
};

export type VenueScheduleData = {
  venueName: string;
  venueCity: string;
  venueState: string;
  venueAddress: string;
  venueType: string;
  venueConfirmedStatus: string;
  isUnionVenue: "YES" | "NO" | "NOT_SURE" | "";
  unionJurisdictions: string[];
  unionJurisdictionOther: string;
  unionLaborDetails: string;
  loadInDate: string;
  loadInTime: string;
  rehearsalDate: string;
  rehearsalTime: string;
  showStartDate: string;
  showStartTime: string;
  showEndDate: string;
  showEndTime: string;
  strikeDate: string;
  strikeTime: string;
  numberOfEventRooms: string;
  timeZone: string;
};

/* ─── Production schedule chronological order ───
   Load-In ≤ Rehearsal ≤ Show Start ≤ Show End ≤ Strike.
   Rehearsal is optional; blank entries are skipped. */
const SCHEDULE_SEQUENCE = [
  { dateKey: "loadInDate", timeKey: "loadInTime", label: "Load-In" },
  { dateKey: "rehearsalDate", timeKey: "rehearsalTime", label: "Rehearsal" },
  { dateKey: "showStartDate", timeKey: "showStartTime", label: "Show Start" },
  { dateKey: "showEndDate", timeKey: "showEndTime", label: "Show End" },
  { dateKey: "strikeDate", timeKey: "strikeTime", label: "Strike" },
] as const;

type ScheduleDateKey = (typeof SCHEDULE_SEQUENCE)[number]["dateKey"];

const scheduleInstant = (
  data: VenueScheduleData,
  entry: (typeof SCHEDULE_SEQUENCE)[number],
): number | null => {
  const date = toDateObj(data[entry.dateKey], data[entry.timeKey]);
  return date ? date.getTime() : null;
};

/** Returns a message per field that breaks the chronological sequence.
    Each filled field is compared against the latest filled field before it. */
export const venueScheduleOrderErrors = (
  data: VenueScheduleData,
): Partial<Record<ScheduleDateKey, string>> => {
  const errors: Partial<Record<ScheduleDateKey, string>> = {};
  let prev: { label: string; at: number } | null = null;
  for (const entry of SCHEDULE_SEQUENCE) {
    const at = scheduleInstant(data, entry);
    if (at === null) continue;
    if (prev && at < prev.at) {
      errors[entry.dateKey] = `${entry.label} must be on or after ${prev.label}.`;
    }
    if (!prev || at > prev.at) prev = { label: entry.label, at };
  }
  return errors;
};

/* ─── Event date range checks ───
   The show must happen during the event, so Show Start/Show End are hard
   errors outside [event start, event end]. Load-In, Rehearsal, and Strike
   legitimately fall outside the event window (load-in days before, strike
   the morning after), so they only get a soft typo-catcher warning when
   further out than EVENT_RANGE_WARN_DAYS. */
const EVENT_RANGE_WARN_DAYS = 7;

const HARD_RANGE_FIELDS: { dateKey: ScheduleDateKey; label: string }[] = [
  { dateKey: "showStartDate", label: "Show Start" },
  { dateKey: "showEndDate", label: "Show End" },
];

const SOFT_RANGE_FIELDS: { dateKey: ScheduleDateKey; label: string }[] = [
  { dateKey: "loadInDate", label: "Load-In" },
  { dateKey: "rehearsalDate", label: "Rehearsal" },
  { dateKey: "strikeDate", label: "Strike" },
];

const eventWindow = (
  eventStartDate?: string,
  eventEndDate?: string,
): { start: Date; end: Date } | null => {
  const start = toDateObj(eventStartDate ?? "", "00:00");
  const end = toDateObj(eventEndDate ?? "", "23:59");
  if (!start || !end) return null;
  return { start, end };
};

export const venueScheduleEventRangeErrors = (
  data: VenueScheduleData,
  eventStartDate?: string,
  eventEndDate?: string,
): Partial<Record<ScheduleDateKey, string>> => {
  const window = eventWindow(eventStartDate, eventEndDate);
  if (!window) return {};
  const sameDay = eventStartDate === eventEndDate;
  const rangeText = sameDay
    ? `on the event date (${eventStartDate})`
    : `within the event dates (${eventStartDate} – ${eventEndDate})`;
  const errors: Partial<Record<ScheduleDateKey, string>> = {};
  for (const field of HARD_RANGE_FIELDS) {
    const entry = SCHEDULE_SEQUENCE.find((e) => e.dateKey === field.dateKey)!;
    const at = scheduleInstant(data, entry);
    if (at === null) continue;
    if (at < window.start.getTime() || at > window.end.getTime()) {
      errors[field.dateKey] = `${field.label} must fall ${rangeText}.`;
    }
  }
  return errors;
};

export const venueScheduleEventRangeWarnings = (
  data: VenueScheduleData,
  eventStartDate?: string,
  eventEndDate?: string,
): Partial<Record<ScheduleDateKey, string>> => {
  const window = eventWindow(eventStartDate, eventEndDate);
  if (!window) return {};
  const marginMs = EVENT_RANGE_WARN_DAYS * 24 * 60 * 60 * 1000;
  const warnings: Partial<Record<ScheduleDateKey, string>> = {};
  for (const field of SOFT_RANGE_FIELDS) {
    const entry = SCHEDULE_SEQUENCE.find((e) => e.dateKey === field.dateKey)!;
    const at = scheduleInstant(data, entry);
    if (at === null) continue;
    if (
      at < window.start.getTime() - marginMs ||
      at > window.end.getTime() + marginMs
    ) {
      warnings[field.dateKey] =
        `${field.label} is more than a week outside the event dates (${eventStartDate} – ${eventEndDate}) — double-check it.`;
    }
  }
  return warnings;
};

/** Everything that should block leaving the step: chronological order
    violations plus Show Start/Show End outside the event date range. */
export const venueScheduleValidationErrors = (
  data: VenueScheduleData,
  eventStartDate?: string,
  eventEndDate?: string,
): Partial<Record<ScheduleDateKey, string>> => ({
  ...venueScheduleOrderErrors(data),
  ...venueScheduleEventRangeErrors(data, eventStartDate, eventEndDate),
});

/** Calendar bounds for one field: min = latest filled field before it,
    max = earliest filled field after it. Day-granularity (the picker
    constrains dates, not times — same-day time conflicts are caught by
    venueScheduleOrderErrors). */
const scheduleBounds = (
  data: VenueScheduleData,
  key: ScheduleDateKey,
): { minDate?: Date; maxDate?: Date } => {
  const index = SCHEDULE_SEQUENCE.findIndex((e) => e.dateKey === key);
  let min: number | null = null;
  let max: number | null = null;
  SCHEDULE_SEQUENCE.forEach((entry, i) => {
    const at = scheduleInstant(data, entry);
    if (at === null) return;
    if (i < index && (min === null || at > min)) min = at;
    if (i > index && (max === null || at < max)) max = at;
  });
  return {
    ...(min !== null ? { minDate: new Date(min) } : {}),
    ...(max !== null ? { maxDate: new Date(max) } : {}),
  };
};

export const defaultVenueSchedule = (): VenueScheduleData => ({
  venueName: "",
  venueCity: "",
  venueState: "",
  venueAddress: "",
  venueType: "",
  venueConfirmedStatus: "",
  isUnionVenue: "",
  unionJurisdictions: [],
  unionJurisdictionOther: "",
  unionLaborDetails: "",
  loadInDate: "",
  loadInTime: "",
  rehearsalDate: "",
  rehearsalTime: "",
  showStartDate: "",
  showStartTime: "",
  showEndDate: "",
  showEndTime: "",
  strikeDate: "",
  strikeTime: "",
  numberOfEventRooms: "1",
  timeZone: "",
});

/* ─── US states list ─── */
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "OTHER", label: "Other / International" },
];

/* ─── State → time zone auto-detect map ─── */
const STATE_TIMEZONES: Record<string, string> = {
  AK: "Alaska Time (AKT)",
  AL: "Central Time (CT)", AR: "Central Time (CT)",
  AZ: "Mountain Time (MT)",
  CA: "Pacific Time (PT)",
  CO: "Mountain Time (MT)",
  CT: "Eastern Time (ET)", DC: "Eastern Time (ET)", DE: "Eastern Time (ET)",
  FL: "Eastern Time (ET)", GA: "Eastern Time (ET)",
  HI: "Hawaii Time (HT)",
  ID: "Mountain Time (MT)", IL: "Central Time (CT)", IN: "Eastern Time (ET)",
  IA: "Central Time (CT)",
  KS: "Central Time (CT)", KY: "Eastern Time (ET)",
  LA: "Central Time (CT)",
  MA: "Eastern Time (ET)", MD: "Eastern Time (ET)", ME: "Eastern Time (ET)",
  MI: "Eastern Time (ET)", MN: "Central Time (CT)", MO: "Central Time (CT)",
  MS: "Central Time (CT)", MT: "Mountain Time (MT)",
  NC: "Eastern Time (ET)", ND: "Central Time (CT)", NE: "Central Time (CT)",
  NH: "Eastern Time (ET)", NJ: "Eastern Time (ET)", NM: "Mountain Time (MT)",
  NV: "Pacific Time (PT)", NY: "Eastern Time (ET)",
  OH: "Eastern Time (ET)", OK: "Central Time (CT)", OR: "Pacific Time (PT)",
  PA: "Eastern Time (ET)",
  RI: "Eastern Time (ET)",
  SC: "Eastern Time (ET)", SD: "Central Time (CT)",
  TN: "Central Time (CT)", TX: "Central Time (CT)",
  UT: "Mountain Time (MT)",
  VA: "Eastern Time (ET)", VT: "Eastern Time (ET)",
  WA: "Pacific Time (PT)", WI: "Central Time (CT)",
  WV: "Eastern Time (ET)", WY: "Mountain Time (MT)",
};

/* ─── Known union markets for auto-detection ─── */
const UNION_MARKETS = [
  "las vegas", "new york", "los angeles", "chicago", "san francisco",
  "boston", "washington dc", "washington d.c.", "miami", "atlanta",
  "seattle", "philadelphia", "new orleans", "detroit", "denver",
  "minneapolis", "st. louis", "kansas city", "pittsburgh", "cleveland",
];

const isUnionMarket = (cityState: string): boolean => {
  const lower = cityState.toLowerCase();
  return UNION_MARKETS.some((market) => lower.includes(market));
};

const UNION_OPTIONS = [
  "IATSE (Stage Labor)",
  "IBEW (Electrical)",
  "Teamsters (Freight)",
  "Carpenters Union",
  "Local Stagehands Union",
  "Other",
];

const VENUE_TYPE_OPTIONS = [
  "Convention Center",
  "Hotel Ballroom",
  "Resort / Conference Center",
  "Theater / Performing Arts Venue",
  "Arena / Stadium",
  "Corporate Campus / HQ",
  "Outdoor Venue / Tent",
  "Broadcast Studio",
  "Restaurant / Private Event Space",
  "Cruise Ship",
  "Other",
];

const TIME_ZONE_OPTIONS = [
  "Eastern Time (ET)",
  "Central Time (CT)",
  "Mountain Time (MT)",
  "Pacific Time (PT)",
  "Alaska Time (AKT)",
  "Hawaii Time (HT)",
  "Other / International",
];

/* ─── Tailwind-safe class helpers ─── */
const unionVenueCls = (opt: "YES" | "NO" | "NOT_SURE", value: string): string => {
  const base =
    "flex h-10 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-semibold transition-all";
  if (value !== opt)
    return `${base} border-[#e4e4e4] bg-white text-[#969798] hover:border-slate-300`;
  if (opt === "YES") return `${base} border-emerald-400 bg-emerald-50 text-emerald-700`;
  if (opt === "NO") return `${base} border-rose-400 bg-rose-50 text-rose-700`;
  return `${base} border-amber-400 bg-amber-50 text-amber-700`;
};

/* ─── Shared style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#222628] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1DBFD3] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20";
const selectClass =
  "w-full rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1DBFD3] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20 appearance-none";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#969798]";

interface Props {
  data: VenueScheduleData;
  onChange: (updates: Partial<VenueScheduleData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors: boolean;
  proposalSettings: ProposalSettings;
  /** Event Overview dates (YYYY-MM-DD) bounding the show window */
  eventStartDate?: string;
  eventEndDate?: string;
  mode?: ProposalExperienceMode;
}

const VenueScheduleStep = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors,
  eventStartDate,
  eventEndDate,
  mode = "advanced",
}: Props) => {
  const safeData: VenueScheduleData = { ...defaultVenueSchedule(), ...data };

  const unionDetected = isUnionMarket(
    `${safeData.venueCity} ${safeData.venueState}`,
  );

  const err = (val: string) =>
    showErrors && !val.trim()
      ? "border-red-400 focus:border-red-400 focus:ring-red-200"
      : "";

  const fieldErrors = venueScheduleValidationErrors(
    safeData,
    eventStartDate,
    eventEndDate,
  );
  const rangeWarnings = venueScheduleEventRangeWarnings(
    safeData,
    eventStartDate,
    eventEndDate,
  );
  const orderErr = (key: ScheduleDateKey) =>
    fieldErrors[key]
      ? " border-red-400 focus:border-red-400 focus:ring-red-200"
      : "";

  /* Show Start/End calendars are additionally clamped to the event window */
  const showFieldBounds = (key: ScheduleDateKey) => {
    const bounds = scheduleBounds(safeData, key);
    const window = eventWindow(eventStartDate, eventEndDate);
    if (!window) return bounds;
    const minDate =
      bounds.minDate && bounds.minDate > window.start
        ? bounds.minDate
        : window.start;
    const maxDate =
      bounds.maxDate && bounds.maxDate < window.end
        ? bounds.maxDate
        : window.end;
    return { minDate, maxDate };
  };

  const handleStateChange = (state: string) => {
    const tz = STATE_TIMEZONES[state] ?? "";
    onChange({ venueState: state, ...(tz ? { timeZone: tz } : {}) });
  };

  const unionJurisdictions = Array.isArray(safeData.unionJurisdictions)
    ? safeData.unionJurisdictions
    : [];

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#e4e4e4] bg-white">
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-[#e4e4e4]">
        <h2 className="text-[22px] font-bold text-[#222628]">
          Venue and Overall Event Schedule
        </h2>
        <p className="mt-1 text-sm text-[#969798]">
          {mode === "basic"
            ? "Confirm the venue and location. Production timing can be added in Advanced mode."
            : "Venue details, union detection, and production timeline."}
        </p>
      </div>

      <div className="flex-1 px-8 py-8">

        {/* ── Group: Venue Details ── */}
        <section className="mb-10">
          <p className={groupLabelClass}>Venue Details</p>

          {/* Venue Name */}
          <div className="mb-5">
            <label className={labelClass}>
              Venue Name <span className="text-red-500">*</span>
              <InfoTooltip text="Full official name of the venue as it appears on the venue's website or contract. Appears on the cover subtitle, Section 1 Scope Overview, Section 6 Venue row, and the union note callout." />
            </label>
            <input
              type="text"
              maxLength={120}
              value={safeData.venueName}
              onChange={(e) => onChange({ venueName: e.target.value })}
              placeholder="e.g. Las Vegas Convention Center"
              className={`${inputClass} ${err(safeData.venueName)}`}
            />
            <div className="mt-1 flex justify-between items-start">
              {showErrors && !safeData.venueName.trim() ? (
                <p className="text-xs text-red-500 normal-case">Required</p>
              ) : <span />}
              <span className="text-xs text-[#969798] shrink-0 ml-2">
                {safeData.venueName.length}/120
              </span>
            </div>
          </div>

          {/* State first, then City: state establishes region/time-zone context
              before the planner enters a city. */}
          <div className="mb-5 grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                State <span className="text-red-500">*</span>
                <InfoTooltip text="State or region. Used for jurisdiction context, union market detection, and time zone auto-detection. Selecting a state automatically suggests the correct time zone below." />
              </label>
              <GlobalSelect
                value={safeData.venueState}
                onChange={(e) => handleStateChange(e.target.value)}
                className={`${selectClass} ${showErrors && !safeData.venueState ? "border-red-400 focus:border-red-400" : ""}`}
              >
                <option value="">Select state...</option>
                {US_STATES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </GlobalSelect>
              {showErrors && !safeData.venueState && (
                <p className="mt-1 text-xs text-red-500 normal-case">Required</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                City <span className="text-red-500">*</span>
                <InfoTooltip text="The city where the venue is located. Compared against 20 known union markets to trigger the union jurisdiction advisory banner." />
              </label>
              <input
                type="text"
                value={safeData.venueCity}
                onChange={(e) => onChange({ venueCity: e.target.value })}
                placeholder="e.g. Las Vegas"
                className={`${inputClass} ${err(safeData.venueCity)}`}
              />
              {showErrors && !safeData.venueCity.trim() && (
                <p className="mt-1 text-xs text-red-500 normal-case">Required</p>
              )}
            </div>
          </div>

          {/* Union market detection banner */}
          {unionDetected && (safeData.venueCity || safeData.venueState) && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              <span className="mt-0.5 shrink-0">⚠️</span>
              <span>
                <strong>Union Market Detected:</strong>{" "}
                {safeData.venueCity}
                {safeData.venueCity && safeData.venueState && ", "}
                {safeData.venueState} is typically an IATSE jurisdiction. Please confirm union labor status below.
              </span>
            </div>
          )}

          {/* Venue Type + Venue Confirmed Status */}
          <div className="mb-5 grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                Venue Type <span className="text-red-500">*</span>
                <InfoTooltip text="Convention centers and arenas typically have union labor requirements; hotels and resorts vary. Helps vendors gauge infrastructure and labor expectations." />
              </label>
              <GlobalSelect
                value={safeData.venueType}
                onChange={(e) => onChange({ venueType: e.target.value })}
                className={`${selectClass} ${showErrors && !safeData.venueType ? "border-red-400 focus:border-red-400" : ""}`}
              >
                <option value="">Select venue type...</option>
                {VENUE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </GlobalSelect>
              {showErrors && !safeData.venueType && (
                <p className="mt-1 text-xs text-red-500 normal-case">Required</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Venue Confirmed Status <span className="text-red-500">*</span>
                <InfoTooltip text="Is your venue locked in? Vendors use this to gauge how firmly location specs can be relied upon. Unconfirmed venues may surface as a flag chip on the cover." />
              </label>
              <GlobalSelect
                value={safeData.venueConfirmedStatus}
                onChange={(e) => onChange({ venueConfirmedStatus: e.target.value })}
                className={`${selectClass} ${showErrors && !safeData.venueConfirmedStatus ? "border-red-400 focus:border-red-400" : ""}`}
              >
                <option value="">Select status...</option>
                <option value="CONTRACT_SIGNED">Contract signed — fully confirmed</option>
                <option value="VERBAL_CONFIRM">Verbally confirmed — contract pending</option>
                <option value="STRONG_PREF">Strong preference — still finalizing</option>
                <option value="NOT_SELECTED">Not yet selected — vendor recommendations welcome</option>
              </GlobalSelect>
              {showErrors && !safeData.venueConfirmedStatus && (
                <p className="mt-1 text-xs text-red-500 normal-case">Required</p>
              )}
            </div>
          </div>

          {/* Venue Address + Time Zone */}
          <div className="mb-5 grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                Venue Address
                <span className="ml-1 text-[#969798] text-xs font-normal normal-case tracking-normal">(optional)</span>
                <InfoTooltip text="Full street address including ZIP code. Used for freight delivery coordination and vendor logistics planning." />
              </label>
              <input
                type="text"
                value={safeData.venueAddress}
                onChange={(e) => onChange({ venueAddress: e.target.value })}
                placeholder="e.g. 3150 Paradise Rd, Las Vegas, NV 89109"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Time Zone <span className="text-red-500">*</span>
                <InfoTooltip text="Time zone of the venue. Appended to all times in the Section 1 timeline, Section 9 proposal deadline, and venue section. Auto-detected when you select a state above." />
              </label>
              <GlobalSelect
                value={safeData.timeZone}
                onChange={(e) => onChange({ timeZone: e.target.value })}
                className={`${selectClass} ${showErrors && !safeData.timeZone ? "border-red-400 focus:border-red-400" : ""}`}
              >
                <option value="">Select time zone...</option>
                {TIME_ZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </GlobalSelect>
              {showErrors && !safeData.timeZone && (
                <p className="mt-1 text-xs text-red-500 normal-case">Required</p>
              )}
              {safeData.venueState && STATE_TIMEZONES[safeData.venueState] && safeData.timeZone === STATE_TIMEZONES[safeData.venueState] && (
                <p className="mt-1 text-xs text-[#1DBFD3] normal-case">
                  Auto-detected from {safeData.venueState}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Group: Union Status ── */}
        {mode === "advanced" && <section className="mb-10">
          <p className={groupLabelClass}>Union Status</p>

          <div className="mb-5">
            <label className={labelClass}>
              Does Your Contract With the Venue Require You to Use Union, Teamster, or In-House Labor?{" "}
              <span className="text-red-500">*</span>
              <InfoTooltip text="Some venue contracts mandate certified union AV technicians (IATSE, IBEW), Teamsters, or in-house labor for certain tasks. This triggers jurisdiction fields and adds a compliance note to Section 6, alerting vendors to budget union minimums and call times. If unsure, contact your venue's event services team." />
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                className={unionVenueCls("YES", safeData.isUnionVenue)}
                onClick={() => onChange({ isUnionVenue: "YES" })}
              >
                ✓ Yes — Union
              </button>
              <button
                type="button"
                className={unionVenueCls("NO", safeData.isUnionVenue)}
                onClick={() =>
                  onChange({ isUnionVenue: "NO", unionLaborDetails: "" })
                }
              >
                ✗ No — Non-union
              </button>
              <button
                type="button"
                className={unionVenueCls("NOT_SURE", safeData.isUnionVenue)}
                onClick={() =>
                  onChange({ isUnionVenue: "NOT_SURE", unionLaborDetails: "" })
                }
              >
                ? Not Sure
              </button>
            </div>
            {showErrors && !safeData.isUnionVenue && (
              <p className="mt-1 text-xs text-red-500 normal-case">Required</p>
            )}
            {safeData.isUnionVenue === "NOT_SURE" && (
              <p className="mt-2 text-xs text-amber-700 normal-case">
                Contact your venue&apos;s event services team — they will confirm jurisdiction before your RFP is sent.
              </p>
            )}

            {/* Union sub-panel */}
            {safeData.isUnionVenue === "YES" && (
              <div className="mt-4 rounded-xl border border-[#eeeeee] bg-[#f9f9f9] p-5">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#969798]">
                  Union Jurisdictions — Select All That Apply
                </p>

                <div className="mb-4">
                  <label className={labelClass}>
                    Active Unions at This Venue
                    <span className="ml-1 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                    <InfoTooltip text="Most large convention centers have multiple unions (e.g., IATSE for stage labor, IBEW for electrical, Teamsters for freight). Your venue coordinator can provide the complete list." />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {UNION_OPTIONS.map((opt) => (
                      <PillCheckbox
                        key={opt}
                        label={opt}
                        checked={unionJurisdictions.includes(opt)}
                        onChange={() =>
                          onChange({
                            unionJurisdictions: toggleItem(unionJurisdictions, opt),
                          })
                        }
                      />
                    ))}
                  </div>
                </div>

                {unionJurisdictions.includes("Other") && (
                  <div className="mb-4">
                    <label className={labelClass}>
                      Other Union — Specify
                    </label>
                    <input
                      type="text"
                      value={safeData.unionJurisdictionOther}
                      onChange={(e) =>
                        onChange({ unionJurisdictionOther: e.target.value })
                      }
                      placeholder="e.g. UFCW Local 711"
                      className={inputClass}
                    />
                  </div>
                )}

                <div>
                  <label className={`${labelClass} mt-0`}>
                    Details or Contract Language
                    <span className="ml-1 text-xs font-normal normal-case text-slate-400">(optional)</span>
                    <InfoTooltip text="Add any specific details, jurisdictions, or contract language vendors should be aware of." />
                  </label>
                  <textarea
                    rows={3}
                    value={safeData.unionLaborDetails}
                    onChange={(e) => onChange({ unionLaborDetails: e.target.value })}
                    placeholder="e.g. IATSE Local 720 required for all rigging and electrical work per venue contract."
                    className="w-full resize-none rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1DBFD3] focus:ring-2 focus:ring-[#1DBFD3]/20"
                  />
                </div>
              </div>
            )}
          </div>
        </section>}

        {/* ── Group: Production Schedule ── */}
        {mode === "advanced" && <section className="mb-8">
          <p className={groupLabelClass}>Production Schedule</p>

          {/* Load-In + Rehearsal */}
          <div className="mb-5 grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                Load-In Date &amp; Time <span className="text-red-500">*</span>
                <InfoTooltip text="When does your AV team have access to begin load-in? Confirm with the venue — this is the earliest you can start setup, not the show start. Typical load-in is 1–3 days before show day for large events." />
              </label>
              <GlobalDateTimeInput
                label="Load-In date and time"
                hideLabel
                showFormatInLabel={false}
                localeAware
                showTodayShortcut
                showTime
                use12Hours
                timeIntervals={15}
                value={toDateObj(safeData.loadInDate, safeData.loadInTime)}
                onChange={(d) => {
                  const { date, time } = fromDateObj(d);
                  onChange({ loadInDate: date, loadInTime: time });
                }}
                {...scheduleBounds(safeData, "loadInDate")}
                inputClassName={`${inputClass} pr-12${safeData.loadInDate === "" && showErrors ? " border-red-400 focus:border-red-400 focus:ring-red-200" : ""}${orderErr("loadInDate")}`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#1DBFD3] hover:text-[#0069a0]"
                placeholder="Select date & time"
              />
              {fieldErrors.loadInDate && (
                <p className="mt-1 text-xs text-red-500 normal-case">
                  {fieldErrors.loadInDate}
                </p>
              )}
              {!fieldErrors.loadInDate && rangeWarnings.loadInDate && (
                <p className="mt-1 text-xs text-amber-600 normal-case">
                  {rangeWarnings.loadInDate}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Rehearsal Date &amp; Time
                <InfoTooltip text="When is your speaker/tech rehearsal scheduled? Most productions run a full tech rehearsal the day before show day. Leave blank if no formal rehearsal is planned — timeline column will display 'TBD'." />
              </label>
              <GlobalDateTimeInput
                label="Rehearsal date and time"
                hideLabel
                showFormatInLabel={false}
                localeAware
                showTodayShortcut
                showTime
                use12Hours
                timeIntervals={15}
                value={toDateObj(safeData.rehearsalDate, safeData.rehearsalTime)}
                onChange={(d) => {
                  const { date, time } = fromDateObj(d);
                  onChange({ rehearsalDate: date, rehearsalTime: time });
                }}
                {...scheduleBounds(safeData, "rehearsalDate")}
                inputClassName={`${inputClass} pr-12${orderErr("rehearsalDate")}`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#1DBFD3] hover:text-[#0069a0]"
                placeholder="Select date & time (optional)"
              />
              {fieldErrors.rehearsalDate && (
                <p className="mt-1 text-xs text-red-500 normal-case">
                  {fieldErrors.rehearsalDate}
                </p>
              )}
              {!fieldErrors.rehearsalDate && rangeWarnings.rehearsalDate && (
                <p className="mt-1 text-xs text-amber-600 normal-case">
                  {rangeWarnings.rehearsalDate}
                </p>
              )}
              {!safeData.rehearsalDate && (
                <p className="mt-1 text-xs text-amber-600 normal-case">
                  Leave blank if no formal rehearsal — timeline will show &quot;TBD&quot;.
                </p>
              )}
            </div>
          </div>

          {/* Show Start + Show End */}
          <div className="mb-5 grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                Show Start Date &amp; Time <span className="text-red-500">*</span>
                <InfoTooltip text="When does the show/general session officially begin? Populates the Section 1 timeline and is used to calculate overall production runtime alongside Show End." />
              </label>
              <GlobalDateTimeInput
                hideLabel
                showFormatInLabel={false}
                showTime
                use12Hours
                timeIntervals={15}
                value={toDateObj(safeData.showStartDate, safeData.showStartTime)}
                onChange={(d) => {
                  const { date, time } = fromDateObj(d);
                  onChange({ showStartDate: date, showStartTime: time });
                }}
                {...showFieldBounds("showStartDate")}
                inputClassName={`${inputClass} pr-12${safeData.showStartDate === "" && showErrors ? " border-red-400 focus:border-red-400 focus:ring-red-200" : ""}${orderErr("showStartDate")}`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#1DBFD3] hover:text-[#0069a0]"
                placeholder="Select date & time"
              />
              {fieldErrors.showStartDate && (
                <p className="mt-1 text-xs text-red-500 normal-case">
                  {fieldErrors.showStartDate}
                </p>
              )}
              {showErrors && !safeData.showStartDate.trim() && (
                <p className="mt-1 text-xs text-red-500 normal-case">Required</p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Show End Date &amp; Time <span className="text-red-500">*</span>
                <InfoTooltip text="When does the show/general session officially end? Must be on or after Show Start. Populates the Section 1 timeline and marks the end of live production." />
              </label>
              <GlobalDateTimeInput
                hideLabel
                showFormatInLabel={false}
                showTime
                use12Hours
                timeIntervals={15}
                value={toDateObj(safeData.showEndDate, safeData.showEndTime)}
                onChange={(d) => {
                  const { date, time } = fromDateObj(d);
                  onChange({ showEndDate: date, showEndTime: time });
                }}
                {...showFieldBounds("showEndDate")}
                inputClassName={`${inputClass} pr-12${safeData.showEndDate === "" && showErrors ? " border-red-400 focus:border-red-400 focus:ring-red-200" : ""}${orderErr("showEndDate")}`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#1DBFD3] hover:text-[#0069a0]"
                placeholder="Select date & time"
              />
              {fieldErrors.showEndDate && (
                <p className="mt-1 text-xs text-red-500 normal-case">
                  {fieldErrors.showEndDate}
                </p>
              )}
              {showErrors && !safeData.showEndDate.trim() && (
                <p className="mt-1 text-xs text-red-500 normal-case">Required</p>
              )}
            </div>
          </div>

          {/* Strike */}
          <div className="mb-5 grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                Strike Date &amp; Time <span className="text-red-500">*</span>
                <InfoTooltip text="When must all equipment be fully removed from the venue? This is your final load-out deadline per the venue contract — typically the same evening as final show day or early next morning. Union venues may have strict overtime rules after the contracted strike window." />
              </label>
              <GlobalDateTimeInput
                hideLabel
                showFormatInLabel={false}
                showTime
                use12Hours
                timeIntervals={15}
                value={toDateObj(safeData.strikeDate, safeData.strikeTime)}
                onChange={(d) => {
                  const { date, time } = fromDateObj(d);
                  onChange({ strikeDate: date, strikeTime: time });
                }}
                {...scheduleBounds(safeData, "strikeDate")}
                inputClassName={`${inputClass} pr-12${safeData.strikeDate === "" && showErrors ? " border-red-400 focus:border-red-400 focus:ring-red-200" : ""}${orderErr("strikeDate")}`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#1DBFD3] hover:text-[#0069a0]"
                placeholder="Select date & time"
              />
              {fieldErrors.strikeDate && (
                <p className="mt-1 text-xs text-red-500 normal-case">
                  {fieldErrors.strikeDate}
                </p>
              )}
              {!fieldErrors.strikeDate && rangeWarnings.strikeDate && (
                <p className="mt-1 text-xs text-amber-600 normal-case">
                  {rangeWarnings.strikeDate}
                </p>
              )}
            </div>
          </div>
        </section>}
      </div>

      {/* ── Footer Nav ── */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#e4e4e4]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-200"
        >
          <ArrowLeft size={15} className="shrink-0" />
          Event Overview
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(14,165,233,0.6)] active:translate-y-0"
          style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #1DBFD3 100%)" }}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
          Room Specifications
          <ArrowRight size={15} className="shrink-0" />
        </button>
      </div>
    </section>
  );
};

export default VenueScheduleStep;
