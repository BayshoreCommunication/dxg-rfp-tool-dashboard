"use client";
import { InfoTooltip, PillCheckbox, toggleItem } from "./shared";

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
  loadInDate: string;
  loadInTime: string;
  rehearsalDate: string;
  rehearsalTime: string;
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
  loadInDate: "",
  loadInTime: "",
  rehearsalDate: "",
  rehearsalTime: "",
  strikeDate: "",
  strikeTime: "",
  numberOfEventRooms: "1",
  timeZone: "",
});

/* â”€â”€â”€ US states list â”€â”€â”€ */
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

/* â”€â”€â”€ State â†’ time zone auto-detect map â”€â”€â”€ */
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

/* â”€â”€â”€ Known union markets for auto-detection â”€â”€â”€ */
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

/* â”€â”€â”€ Tailwind-safe class helpers â”€â”€â”€ */
const unionVenueCls = (opt: "YES" | "NO" | "NOT_SURE", value: string): string => {
  const base =
    "flex h-10 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-semibold transition-all";
  if (value !== opt)
    return `${base} border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300`;
  if (opt === "YES") return `${base} border-emerald-400 bg-emerald-50 text-emerald-700`;
  if (opt === "NO") return `${base} border-rose-400 bg-rose-50 text-rose-700`;
  return `${base} border-amber-400 bg-amber-50 text-amber-700`;
};

/* â”€â”€â”€ Shared style constants â”€â”€â”€ */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#00c2c9] focus:outline-none focus:ring-2 focus:ring-[#00c2c9]/20";
const selectClass =
  "w-full rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#00c2c9] focus:outline-none focus:ring-2 focus:ring-[#00c2c9]/20 appearance-none";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#8f98bf]";

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

  const roomCount = Math.min(20, Math.max(1, Number(safeData.numberOfEventRooms) || 1));
  const unionJurisdictions = Array.isArray(safeData.unionJurisdictions)
    ? safeData.unionJurisdictions
    : [];

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#00c2c9]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#00c2c9]">
            Page 2 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">
          Venue &amp; Schedule
        </h2>
        <p className="mt-1 text-sm text-[#8f98bf]">
          Venue details, union detection, production timeline, and room count.
        </p>
      </div>

      <div className="flex-1 px-8 py-8">

        {/* â”€â”€ Group: Venue Details â”€â”€ */}
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
              <span className="text-xs text-[#8f98bf] shrink-0 ml-2">
                {safeData.venueName.length}/120
              </span>
            </div>
          </div>

          {/* City + State */}
          <div className="mb-5 grid grid-cols-2 gap-5">
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
          </div>

          {/* Union market detection banner */}
          {unionDetected && (safeData.venueCity || safeData.venueState) && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              <span className="mt-0.5 shrink-0">âš ï¸</span>
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
                <option value="CONTRACT_SIGNED">Contract signed â€” fully confirmed</option>
                <option value="VERBAL_CONFIRM">Verbally confirmed â€” contract pending</option>
                <option value="STRONG_PREF">Strong preference â€” still finalizing</option>
                <option value="NOT_SELECTED">Not yet selected â€” vendor recommendations welcome</option>
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
                <span className="ml-1 text-[#8f98bf] text-xs font-normal normal-case tracking-normal">(optional)</span>
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
                <p className="mt-1 text-xs text-[#00c2c9] normal-case">
                  Auto-detected from {safeData.venueState}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* â”€â”€ Group: Union Status â”€â”€ */}
        <section className="mb-10">
          <p className={groupLabelClass}>Union Status</p>

          <div className="mb-5">
            <label className={labelClass}>
              Is This a Union Venue? <span className="text-red-500">*</span>
              <InfoTooltip text="Union venues (IATSE, IBEW) require certified union labor for certain tasks. This triggers jurisdiction fields and adds a compliance note to Section 6, alerting vendors to budget union minimums and call times. If unsure, contact your venue's event services team." />
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                className={unionVenueCls("YES", safeData.isUnionVenue)}
                onClick={() => onChange({ isUnionVenue: "YES" })}
              >
                âœ“ Yes â€” Union
              </button>
              <button
                type="button"
                className={unionVenueCls("NO", safeData.isUnionVenue)}
                onClick={() => onChange({ isUnionVenue: "NO" })}
              >
                âœ— No â€” Non-union
              </button>
              <button
                type="button"
                className={unionVenueCls("NOT_SURE", safeData.isUnionVenue)}
                onClick={() => onChange({ isUnionVenue: "NOT_SURE" })}
              >
                ? Not Sure
              </button>
            </div>
            {showErrors && !safeData.isUnionVenue && (
              <p className="mt-1 text-xs text-red-500 normal-case">Required</p>
            )}
            {safeData.isUnionVenue === "NOT_SURE" && (
              <p className="mt-2 text-xs text-amber-700 normal-case">
                Contact your venue&apos;s event services team â€” they will confirm jurisdiction before your RFP is sent.
              </p>
            )}

            {/* Union sub-panel */}
            {safeData.isUnionVenue === "YES" && (
              <div className="mt-4 rounded-xl border border-[#e0e7ff] bg-[#f5f7ff] p-5">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8f98bf]">
                  Union Jurisdictions â€” Select All That Apply
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
                  <div>
                    <label className={labelClass}>
                      Other Union â€” Specify
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
              </div>
            )}
          </div>
        </section>

        {/* â”€â”€ Group: Production Schedule â”€â”€ */}
        <section className="mb-8">
          <p className={groupLabelClass}>Production Schedule</p>

          {/* Number of Event Rooms â€” stepper */}
          <div className="mb-6">
            <label className={labelClass}>
              Number of Event Rooms <span className="text-red-500">*</span>
              <InfoTooltip text="How many separate rooms require AV production? Each room gets its own specification module on the next page. Example: 1 General Session + 1 Breakout + 1 VIP Lounge = 3 rooms." />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onChange({ numberOfEventRooms: String(Math.max(1, roomCount - 1)) })
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d7dce3] bg-white text-lg font-bold text-[#1f2d5d] hover:bg-[#f5f7ff] transition-colors select-none"
              >
                âˆ’
              </button>
              <input
                type="number"
                min={1}
                max={20}
                value={safeData.numberOfEventRooms}
                onChange={(e) =>
                  onChange({
                    numberOfEventRooms: String(
                      Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                    ),
                  })
                }
                className="h-10 w-16 rounded-lg border border-[#d7dce3] bg-white text-center text-sm font-bold text-[#1f2d5d] outline-none focus:border-[#00c2c9] focus:ring-2 focus:ring-[#00c2c9]/20"
              />
              <button
                type="button"
                onClick={() =>
                  onChange({ numberOfEventRooms: String(Math.min(20, roomCount + 1)) })
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d7dce3] bg-white text-lg font-bold text-[#1f2d5d] hover:bg-[#f5f7ff] transition-colors select-none"
              >
                +
              </button>
              <span className="text-sm text-[#8f98bf] normal-case">rooms (max 20)</span>
            </div>
            {safeData.numberOfEventRooms && Number(safeData.numberOfEventRooms) > 0 && (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#00c2c9]/30 bg-[#00c2c9]/5 p-3 text-xs text-brand-dark">
                <span className="mt-0.5 shrink-0">âš™ï¸</span>
                <span>
                  <strong>System:</strong> This generates{" "}
                  <strong>{safeData.numberOfEventRooms}</strong> Room Specification module(s) on Page 2B.
                  {Number(safeData.numberOfEventRooms) > 3 && (
                    <> Events with 4+ rooms may trigger a Producer Insight consultation recommendation.</>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Load-In + Rehearsal */}
          <div className="mb-5 grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                Load-In Date &amp; Time <span className="text-red-500">*</span>
                <InfoTooltip text="When does your AV team have access to begin load-in? Confirm with the venue â€” this is the earliest you can start setup, not the show start. Typical load-in is 1â€“3 days before show day for large events." />
              </label>
              <input
                type="date"
                value={safeData.loadInDate}
                onChange={(e) => onChange({ loadInDate: e.target.value })}
                className={`${inputClass} ${err(safeData.loadInDate)}`}
              />
              <input
                type="time"
                value={safeData.loadInTime}
                onChange={(e) => onChange({ loadInTime: e.target.value })}
                className={`${inputClass} mt-2`}
              />
            </div>

            <div>
              <label className={labelClass}>
                Rehearsal Date &amp; Time
                <InfoTooltip text="When is your speaker/tech rehearsal scheduled? Most productions run a full tech rehearsal the day before show day. Leave blank if no formal rehearsal is planned â€” timeline column will display 'TBD'." />
              </label>
              <input
                type="date"
                value={safeData.rehearsalDate}
                onChange={(e) => onChange({ rehearsalDate: e.target.value })}
                className={inputClass}
              />
              <input
                type="time"
                value={safeData.rehearsalTime}
                onChange={(e) => onChange({ rehearsalTime: e.target.value })}
                className={`${inputClass} mt-2`}
              />
              {!safeData.rehearsalDate && (
                <p className="mt-1 text-xs text-amber-600 normal-case">
                  Leave blank if no formal rehearsal â€” timeline will show &quot;TBD&quot;.
                </p>
              )}
            </div>
          </div>

          {/* Strike */}
          <div className="mb-5 grid grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                Strike Date &amp; Time <span className="text-red-500">*</span>
                <InfoTooltip text="When must all equipment be fully removed from the venue? This is your final load-out deadline per the venue contract â€” typically the same evening as final show day or early next morning. Union venues may have strict overtime rules after the contracted strike window." />
              </label>
              <input
                type="date"
                value={safeData.strikeDate}
                onChange={(e) => onChange({ strikeDate: e.target.value })}
                className={`${inputClass} ${err(safeData.strikeDate)}`}
              />
              <input
                type="time"
                value={safeData.strikeTime}
                onChange={(e) => onChange({ strikeTime: e.target.value })}
                className={`${inputClass} mt-2`}
              />
            </div>
          </div>
        </section>
      </div>

      {/* â”€â”€ Footer Nav â”€â”€ */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-[#d7dce3] px-5 py-2.5 text-sm font-semibold text-[#1f2d5d] hover:bg-[#f5f7ff] transition-colors"
        >
          â† Event Overview
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 rounded-lg bg-[#00c2c9]! px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(0,194,201,0.35)] hover:bg-[#009198] transition-colors active:scale-95"
        >
          Room Specifications â†’
        </button>
      </div>
    </section>
  );
};

export default VenueScheduleStep;
