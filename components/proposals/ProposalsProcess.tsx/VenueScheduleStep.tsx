"use client";
import GlobalDateTimeInput from "@/components/shared/GlobalDateTimeInput";
import { InfoTooltip, PillCheckbox, toggleItem } from "./shared";
import { ArrowLeft, ArrowRight } from "lucide-react";

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
  "w-full rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#008ad2] focus:outline-none focus:ring-2 focus:ring-[#008ad2]/20";
const selectClass =
  "w-full rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#008ad2] focus:outline-none focus:ring-2 focus:ring-[#008ad2]/20 appearance-none";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#969798]";

interface Props {
  data: VenueScheduleData;
  onChange: (updates: Partial<VenueScheduleData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors: boolean;
  proposalSettings: ProposalSettings;
}

const VenueScheduleStep = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors,
}: Props) => {
  const safeData: VenueScheduleData = { ...defaultVenueSchedule(), ...data };

  const unionDetected = isUnionMarket(
    `${safeData.venueCity} ${safeData.venueState}`,
  );

  const err = (val: string) =>
    showErrors && !val.trim()
      ? "border-red-400 focus:border-red-400 focus:ring-red-200"
      : "";

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
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#008ad2]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#008ad2]">
            Page 2 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#222628]">
          Venue and Overall Event Schedule
        </h2>
        <p className="mt-1 text-sm text-[#969798]">
          Venue details, union detection, and production timeline.
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
              <select
                value={safeData.venueState}
                onChange={(e) => handleStateChange(e.target.value)}
                className={`${selectClass} ${showErrors && !safeData.venueState ? "border-red-400 focus:border-red-400" : ""}`}
              >
                <option value="">Select state...</option>
                {US_STATES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
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
              <select
                value={safeData.venueType}
                onChange={(e) => onChange({ venueType: e.target.value })}
                className={`${selectClass} ${showErrors && !safeData.venueType ? "border-red-400 focus:border-red-400" : ""}`}
              >
                <option value="">Select venue type...</option>
                {VENUE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {showErrors && !safeData.venueType && (
                <p className="mt-1 text-xs text-red-500 normal-case">Required</p>
              )}
            </div>
            <div>
              <label className={labelClass}>
                Venue Confirmed Status <span className="text-red-500">*</span>
                <InfoTooltip text="Is your venue locked in? Vendors use this to gauge how firmly location specs can be relied upon. Unconfirmed venues may surface as a flag chip on the cover." />
              </label>
              <select
                value={safeData.venueConfirmedStatus}
                onChange={(e) => onChange({ venueConfirmedStatus: e.target.value })}
                className={`${selectClass} ${showErrors && !safeData.venueConfirmedStatus ? "border-red-400 focus:border-red-400" : ""}`}
              >
                <option value="">Select status...</option>
                <option value="CONTRACT_SIGNED">Contract signed — fully confirmed</option>
                <option value="VERBAL_CONFIRM">Verbally confirmed — contract pending</option>
                <option value="STRONG_PREF">Strong preference — still finalizing</option>
                <option value="NOT_SELECTED">Not yet selected — vendor recommendations welcome</option>
              </select>
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
              <select
                value={safeData.timeZone}
                onChange={(e) => onChange({ timeZone: e.target.value })}
                className={`${selectClass} ${showErrors && !safeData.timeZone ? "border-red-400 focus:border-red-400" : ""}`}
              >
                <option value="">Select time zone...</option>
                {TIME_ZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              {showErrors && !safeData.timeZone && (
                <p className="mt-1 text-xs text-red-500 normal-case">Required</p>
              )}
              {safeData.venueState && STATE_TIMEZONES[safeData.venueState] && safeData.timeZone === STATE_TIMEZONES[safeData.venueState] && (
                <p className="mt-1 text-xs text-[#008ad2] normal-case">
                  Auto-detected from {safeData.venueState}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Group: Union Status ── */}
        <section className="mb-10">
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
                    className="w-full resize-none rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#008ad2] focus:ring-2 focus:ring-[#008ad2]/20"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Group: Production Schedule ── */}
        <section className="mb-8">
          <p className={groupLabelClass}>Production Schedule</p>

          {/* Load-In + Rehearsal */}
          <div className="mb-5 grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                Load-In Date &amp; Time <span className="text-red-500">*</span>
                <InfoTooltip text="When does your AV team have access to begin load-in? Confirm with the venue — this is the earliest you can start setup, not the show start. Typical load-in is 1–3 days before show day for large events." />
              </label>
              <GlobalDateTimeInput
                hideLabel
                showFormatInLabel={false}
                showTime
                use12Hours
                timeIntervals={15}
                value={toDateObj(safeData.loadInDate, safeData.loadInTime)}
                onChange={(d) => {
                  const { date, time } = fromDateObj(d);
                  onChange({ loadInDate: date, loadInTime: time });
                }}
                inputClassName={`${inputClass} pr-12${safeData.loadInDate === "" && showErrors ? " border-red-400 focus:border-red-400 focus:ring-red-200" : ""}`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#008ad2] hover:text-[#0069a0]"
                placeholder="Select date & time"
              />
            </div>

            <div>
              <label className={labelClass}>
                Rehearsal Date &amp; Time
                <InfoTooltip text="When is your speaker/tech rehearsal scheduled? Most productions run a full tech rehearsal the day before show day. Leave blank if no formal rehearsal is planned — timeline column will display 'TBD'." />
              </label>
              <GlobalDateTimeInput
                hideLabel
                showFormatInLabel={false}
                showTime
                use12Hours
                timeIntervals={15}
                value={toDateObj(safeData.rehearsalDate, safeData.rehearsalTime)}
                onChange={(d) => {
                  const { date, time } = fromDateObj(d);
                  onChange({ rehearsalDate: date, rehearsalTime: time });
                }}
                inputClassName={`${inputClass} pr-12`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#008ad2] hover:text-[#0069a0]"
                placeholder="Select date & time (optional)"
              />
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
                inputClassName={`${inputClass} pr-12${safeData.showStartDate === "" && showErrors ? " border-red-400 focus:border-red-400 focus:ring-red-200" : ""}`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#008ad2] hover:text-[#0069a0]"
                placeholder="Select date & time"
              />
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
                inputClassName={`${inputClass} pr-12${safeData.showEndDate === "" && showErrors ? " border-red-400 focus:border-red-400 focus:ring-red-200" : ""}`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#008ad2] hover:text-[#0069a0]"
                placeholder="Select date & time"
              />
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
                inputClassName={`${inputClass} pr-12${safeData.strikeDate === "" && showErrors ? " border-red-400 focus:border-red-400 focus:ring-red-200" : ""}`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#008ad2] hover:text-[#0069a0]"
                placeholder="Select date & time"
              />
            </div>
          </div>
        </section>
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
          style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}
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
