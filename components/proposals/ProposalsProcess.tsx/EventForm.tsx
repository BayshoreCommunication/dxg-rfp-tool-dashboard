"use client";

import GlobalDateInput from "@/components/shared/GlobalDateInput";
import { useCallback, useRef } from "react";
import type { EventData, ProposalSettings } from "../AddNewProposal";
import { InfoTooltip, PillCheckbox, toggleItem, useClickOutside } from "./shared";
import { ArrowRight } from "lucide-react";

/* ─── Shared style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#222628] uppercase tracking-wide";
const inputClass =
  "h-10 w-full rounded-md border border-[#e4e4e4] bg-white px-3 text-sm text-[#222628] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#969798] border-b border-[#e4e4e4] pb-2";

const eventTypeOptions = [
  "Corporate Conference",
  "User / Customer Summit",
  "Sales Kickoff (SKO)",
  "Annual Meeting / Shareholder Event",
  "Product Launch",
  "Awards Show / Gala",
  "Trade Show / Exhibition",
  "Internal Town Hall",
  "Training / Certification Event",
  "Association / Member Conference",
  "Industry Symposium",
  "Hybrid Broadcast / Studio Production",
  "Other",
];

const formatOptions = [
  { value: "In-Person", label: "In-Person Only" },
  { value: "Hybrid", label: "Hybrid (In-Person + Virtual)" },
  { value: "Virtual", label: "Virtual Only" },
] as const;

const audienceOptions = [
  "C-Suite Executives",
  "Senior Leadership / VPs",
  "Sales Team / Field Reps",
  "Customers / End Users",
  "Prospects / Leads",
  "Partners / Channel / Resellers",
  "Employees (All-Hands)",
  "Investors / Shareholders",
  "Press / Media / Analysts",
  "Industry Professionals",
  "Developers / Technical",
  "Members (Association)",
  "Students / Academic",
  "General Public",
];

const toneGroups = [
  {
    label: "Energy",
    options: ["High-Energy", "Polished & Refined", "Intimate", "Celebratory"],
  },
  {
    label: "Style",
    options: [
      "Bold & Cinematic",
      "Editorial & Minimal",
      "Tech-Forward",
      "Classic Corporate",
      "Premium Luxury",
    ],
  },
  {
    label: "Mood",
    options: [
      "Inspirational",
      "Authoritative",
      "Conversational",
      "Innovative",
      "Heritage / Legacy",
    ],
  },
  {
    label: "Color Direction",
    options: [
      "Dark / Cinematic",
      "Light / Bright",
      "Brand-Forward",
      "Neutral / Editorial",
    ],
  },
];

const normalizeDateFormat = (format: string) =>
  (format || "MM/DD/YYYY").replaceAll("_", "-").toUpperCase();

type DatePickerFormat = "dd-MM-yyyy" | "yyyy-MM-dd" | "MM-dd-yyyy";

const toPickerFormat = (displayFormat: string): DatePickerFormat => {
  const f = displayFormat.toUpperCase();
  if (f === "DD/MM/YYYY") return "dd-MM-yyyy";
  if (f === "YYYY-MM-DD") return "yyyy-MM-dd";
  return "MM-dd-yyyy";
};

const toIsoDateValue = (raw: string | undefined) => {
  if (!raw) return "";
  const value = raw.trim();
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const delimiter = value.includes("/") ? "/" : "-";
  const parts = value.split(delimiter);
  if (parts.length !== 3) return "";
  const [a, b, c] = parts;
  if (c.length === 4) return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
  return "";
};

const fromIsoToDate = (value?: string) => {
  const iso = toIsoDateValue(value);
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const fromDateToIso = (value: Date | null) => {
  if (!value) return "";
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface EventFormProps {
  data: EventData;
  onChange: (updates: Partial<EventData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
}

const EventForm = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
}: EventFormProps) => {
  const currentDateFormat = normalizeDateFormat(
    proposalSettings.proposals.dateFormat,
  );
  const pickerFormat = toPickerFormat(currentDateFormat);
  const normalizedEndDate = toIsoDateValue(data.endDate);
  const startDateValue = fromIsoToDate(data.startDate);
  const endDateValue = fromIsoToDate(data.endDate);

  const typeRef = useRef<HTMLDivElement>(null);
  useClickOutside(typeRef, useCallback(() => {}, []));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startIso = toIsoDateValue(data.startDate);
  const isStartInPast = startIso ? new Date(startIso) < today : false;

  const handleStartDateChange = (value: Date | null) => {
    const normalizedNextStart = fromDateToIso(value);
    const shouldAutoSetEndDate =
      !normalizedEndDate ||
      (normalizedNextStart && normalizedEndDate < normalizedNextStart);
    onChange({
      startDate: normalizedNextStart,
      ...(shouldAutoSetEndDate ? { endDate: normalizedNextStart } : {}),
    });
  };

  const objectives = data.eventObjectives ?? "";
  const objLen = objectives.length;
  const toneSelected = data.toneDirection ?? [];
  const audienceSelected = data.primaryAudience ?? [];
  const constraintsLen = (data.sacredConstraints ?? "").length;
  const aboutOrganizationLen = (data.aboutOrganization ?? "").length;
  const statementOfWorkLen = (data.statementOfWork ?? "").length;
  const eventProfileLen = (data.eventProfile ?? "").length;
  const rfpTimelineLen = (data.rfpTimeline ?? "").length;

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#e4e4e4] bg-white">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#e4e4e4]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#008ad2]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#008ad2]">
            Page 1 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#222628]">
          Event Overview &amp; Narrative
        </h2>
        <p className="mt-1 text-sm text-[#969798]">
          These fields power the auto-generated narrative on your RFP cover page
          and set the tone for every section that follows.
        </p>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-8 py-8 space-y-10">

        {/* ── Group: Event Information ── */}
        <div>
          <p className={groupLabelClass}>Event Information</p>
          <div className="space-y-5">

            {/* Row 1: Event Name + Edition/Year */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>
                  Event Name <span className="text-red-500">*</span>
                  <InfoTooltip text="Enter the full official name of your event as it should appear on all RFP documents. Appears on the cover headline and every interior running header." />
                </label>
                <input
                  className={`${inputClass} ${showErrors && !data.eventName.trim() ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
                  placeholder="e.g. Apex Dynamics Global Summit 2026"
                  maxLength={120}
                  value={data.eventName}
                  onChange={(e) => onChange({ eventName: e.target.value })}
                />
                <div className="mt-1 flex justify-between items-start">
                  {showErrors && !data.eventName.trim() ? (
                    <p className="text-sm text-red-500 normal-case">Event name is required.</p>
                  ) : <span />}
                  <span className="text-xs text-[#969798] shrink-0 ml-2">
                    {data.eventName.length}/120
                  </span>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Edition / Year
                  <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                  <InfoTooltip text="If this is a recurring event, indicate which edition (e.g. '12th Annual' or 'Year 5'). Leave blank if this is a one-time event. Helps contextualize event maturity in the AI-generated narrative." />
                </label>
                <input
                  className={inputClass}
                  placeholder="e.g. 12th Annual or Inaugural 2026"
                  maxLength={60}
                  value={data.editionYear ?? ""}
                  onChange={(e) => onChange({ editionYear: e.target.value })}
                />
              </div>
            </div>

            {/* Row 2: Event Type + Theme/Tagline */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>
                  Event Type <span className="text-red-500">*</span>
                  <InfoTooltip text="Choose the category that best describes your event. Helps vendors gauge scope and tone required and feeds the AI narrative paragraph 1 and Section 8 references." />
                </label>
                <div ref={typeRef}>
                  <select
                    className={`${inputClass} appearance-none ${
                      showErrors && !data.eventType.eventType
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }`}
                    value={data.eventType.eventType}
                    onChange={(e) =>
                      onChange({
                        eventType: {
                          eventType: e.target.value,
                          eventTypeOther:
                            e.target.value !== "Other"
                              ? ""
                              : data.eventType.eventTypeOther,
                        },
                      })
                    }
                  >
                    <option value="">Select event type...</option>
                    {eventTypeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                {data.eventType.eventType === "Other" && (
                  <input
                    className={`${inputClass} mt-2`}
                    placeholder="Please specify..."
                    value={data.eventType.eventTypeOther}
                    onChange={(e) =>
                      onChange({
                        eventType: {
                          ...data.eventType,
                          eventTypeOther: e.target.value,
                        },
                      })
                    }
                  />
                )}
                {showErrors && !data.eventType.eventType && (
                  <p className="mt-1 text-sm text-red-500 normal-case">
                    Event type is required.
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  Event Theme / Tagline
                  <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                  <InfoTooltip text="If your event has an official theme, tagline, or campaign line, enter it here. Leave blank if not yet finalized. Feeds AI narrative paragraph 2." />
                </label>
                <input
                  className={inputClass}
                  placeholder='e.g. "Velocity" or "Built for What&apos;s Next"'
                  maxLength={100}
                  value={data.eventTheme ?? ""}
                  onChange={(e) => onChange({ eventTheme: e.target.value })}
                />
              </div>
            </div>

            {/* Row 3: Event Website */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>
                  Event Website
                  <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                  <InfoTooltip text="Link to the event's official website, if one exists. Gives vendors quick access to branding, past editions, and public-facing details." />
                </label>
                <input
                  type="url"
                  className={inputClass}
                  placeholder="e.g. https://www.example.com/summit2026"
                  maxLength={200}
                  value={data.eventWebsite ?? ""}
                  onChange={(e) => onChange({ eventWebsite: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Group: Format & Audience ── */}
        <div>
          <p className={groupLabelClass}>Format &amp; Audience</p>
          <div className="space-y-6">

            {/* Event Format */}
            <div>
              <label className={labelClass}>
                Event Format <span className="text-red-500">*</span>
                <InfoTooltip text="Select your event delivery format. Hybrid and Virtual unlock additional streaming and platform specifications on Page 3." />
              </label>
              <p className="mb-3 text-xs text-slate-500 normal-case">
                Your selection unlocks Step 3 — Hybrid &amp; Virtual Production if applicable.
              </p>
              <div className="flex flex-col gap-3">
                {formatOptions.map((fmt) => (
                  <label
                    key={fmt.value}
                    className="flex items-center gap-3 cursor-pointer text-sm text-[#222628]"
                  >
                    <input
                      type="radio"
                      name="eventFormat"
                      checked={data.eventFormat === fmt.value}
                      onChange={() => onChange({ eventFormat: fmt.value })}
                      className="accent-[#008ad2] h-4 w-4"
                    />
                    {fmt.label}
                  </label>
                ))}
              </div>
              {(data.eventFormat === "Hybrid" || data.eventFormat === "Virtual") && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-[#008ad2]/30 bg-[#008ad2]/5 px-4 py-3 text-sm text-brand-dark">
                  <span className="font-bold">⚡</span>
                  <span>
                    <strong>Step 3 Unlocked:</strong> Hybrid &amp; Virtual Production fields are now active.
                  </span>
                </div>
              )}
            </div>

            {/* Primary Audience */}
            <div>
              <label className={labelClass}>
                Primary Audience <span className="text-red-500">*</span>
                <InfoTooltip text="Select up to 4 primary audience groups. Helps vendors understand the production tone and gravitas required, and feeds the AI narrative paragraph 1." />
              </label>
              <p className="mb-3 text-xs text-slate-500 normal-case">
                Select up to 4 audience types.
                {audienceSelected.length > 0 && ` ${audienceSelected.length}/4 selected.`}
              </p>
              <div className="flex flex-wrap gap-3">
                {audienceOptions.map((opt) => {
                  const checked = audienceSelected.includes(opt);
                  const maxReached = audienceSelected.length >= 4 && !checked;
                  return (
                    <PillCheckbox
                      key={opt}
                      label={opt}
                      checked={checked}
                      onChange={() => {
                        if (!maxReached) {
                          onChange({
                            primaryAudience: toggleItem(audienceSelected, opt),
                          });
                        }
                      }}
                    />
                  );
                })}
              </div>
              {audienceSelected.length >= 4 && (
                <p className="mt-2 text-xs text-amber-600 normal-case">
                  Maximum 4 audience types selected.
                </p>
              )}
              {showErrors && audienceSelected.length === 0 && (
                <p className="mt-2 text-sm text-red-500 normal-case">
                  Please select at least one audience type.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Group: Dates & Scale ── */}
        <div>
          <p className={groupLabelClass}>Dates &amp; Scale</p>
          <div className="grid grid-cols-3 gap-5">

            {/* Start Date */}
            <div>
              <label className={labelClass}>
                Start Date <span className="text-red-500">*</span>
                <InfoTooltip text="First day of the event (not load-in date). Populates the cover meta bar and is used to calculate total event days in the Scope Overview." />
              </label>
              <GlobalDateInput
                id="startDate"
                label="Start Date"
                hideLabel
                showFormatInLabel={false}
                showErrorMessage={false}
                value={startDateValue}
                onChange={handleStartDateChange}
                format={pickerFormat}
                inputClassName={`${inputClass} pr-10 ${
                  showErrors && !data.startDate.trim()
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#969798] hover:text-primary"
              />
              {isStartInPast && data.startDate && (
                <p className="mt-1 text-xs text-amber-600 normal-case">
                  Warning: Start date is in the past.
                </p>
              )}
              {showErrors && !data.startDate.trim() && (
                <p className="mt-1 text-sm text-red-500 normal-case">Required.</p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label className={labelClass}>
                End Date <span className="text-red-500">*</span>
                <InfoTooltip text="Last day of the event (not strike date). Used with Start Date to calculate event duration on the cover meta bar and the Event Days stat card." />
              </label>
              <GlobalDateInput
                id="endDate"
                label="End Date"
                hideLabel
                showFormatInLabel={false}
                showErrorMessage={false}
                value={endDateValue}
                onChange={(value) => onChange({ endDate: fromDateToIso(value) })}
                minDate={startDateValue || undefined}
                format={pickerFormat}
                inputClassName={`${inputClass} pr-10 ${
                  showErrors && !data.endDate.trim()
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#969798] hover:text-primary"
              />
              {showErrors && !data.endDate.trim() && (
                <p className="mt-1 text-sm text-red-500 normal-case">Required.</p>
              )}
            </div>

            {/* Total Attendance */}
            <div>
              <label className={labelClass}>
                Total Attendance <span className="text-red-500">*</span>
                <InfoTooltip text="Estimated total in-person headcount across all days. Drives the Attendees stat card on the cover and informs crew count, audio system size, and screen placement recommendations." />
              </label>
              <input
                type="number"
                min={1}
                max={100000}
                className={`${inputClass} ${
                  showErrors && !data.attendees.trim()
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }`}
                placeholder="e.g. 1500"
                value={data.attendees}
                onChange={(e) => onChange({ attendees: e.target.value })}
              />
              {showErrors && !data.attendees.trim() && (
                <p className="mt-1 text-sm text-red-500 normal-case">Required.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Group: Company Information ── */}
        <div>
          <p className={groupLabelClass}>Company Information</p>
          <div className="space-y-6">

            {/* Event Objectives */}
            <div>
              <label className={labelClass}>
                Event Objectives
                <InfoTooltip text="In 2–4 sentences, describe what you're trying to accomplish. This feeds the AI narrative — the more specific, the better. Used verbatim as context for AI narrative generation." />
              </label>
              <p className="mb-2 text-xs text-slate-500 normal-case">
                In 2–4 sentences: describe what success looks like. What outcomes are you driving?
              </p>
              <textarea
                rows={3}
                maxLength={800}
                className="w-full rounded-md border border-[#e4e4e4] bg-white px-4 py-3 text-sm text-[#222628] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                placeholder='Describe what success looks like for this event. Examples: "Drive pipeline through 30 customer meetings," "Launch our Q2 product to 1,200 partners," "Celebrate our 25th anniversary with brand-defining moments."'
                value={objectives}
                onChange={(e) => onChange({ eventObjectives: e.target.value })}
              />
              <div className="mt-1 flex justify-between items-start gap-2">
                {!objectives.trim() ? (
                  <p className="text-xs text-amber-600 normal-case">
                    Leaving this blank will limit the quality of your auto-generated Event Overview narrative.
                  </p>
                ) : <span />}
                <span className={`text-xs shrink-0 ${objLen > 720 ? "text-amber-600" : "text-[#969798]"}`}>
                  {objLen}/800
                </span>
              </div>
            </div>

            {/* Tone / Brand Direction */}
            <div>
              <label className={labelClass}>
                Tone / Brand Direction
                <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                <InfoTooltip text="Pick up to 5 tags that capture the feel of this event. Vendors will use this to gauge creative direction. Feeds AI narrative paragraph 2 (creative context)." />
              </label>
              <p className="mb-3 text-xs text-slate-500 normal-case">
                Select up to 5 tags.
                {toneSelected.length > 0 && ` ${toneSelected.length}/5 selected.`}
              </p>
              <div className="space-y-4">
                {toneGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#969798]">
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((opt) => {
                        const checked = toneSelected.includes(opt);
                        const maxReached = toneSelected.length >= 5 && !checked;
                        return (
                          <PillCheckbox
                            key={opt}
                            label={opt}
                            checked={checked}
                            onChange={() => {
                              if (!maxReached) {
                                onChange({
                                  toneDirection: toggleItem(toneSelected, opt),
                                });
                              }
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {toneSelected.length >= 5 && (
                <p className="mt-2 text-xs text-amber-600 normal-case">
                  Maximum 5 tone tags selected.
                </p>
              )}
            </div>

            {/* Sacred Constraints */}
            <div>
              <label className={labelClass}>
                Sacred Constraints / Special Considerations
                <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                <InfoTooltip text="List any non-negotiable requirements vendors absolutely must honor — timing rules, brand restrictions, cultural sensitivities, executive preferences, or anything that has caused friction at past events. Appears verbatim in the Scope Overview special notes row." />
              </label>
              <textarea
                rows={3}
                maxLength={500}
                className="w-full rounded-md border border-[#e4e4e4] bg-white px-4 py-3 text-sm text-[#222628] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                placeholder="e.g. CEO keynote must run exactly 22 minutes. No standing ovations during memorial segment. Sponsor logos cannot appear on main stage screens."
                value={data.sacredConstraints ?? ""}
                onChange={(e) => onChange({ sacredConstraints: e.target.value })}
              />
              <div className="mt-1 flex justify-end">
                <span className={`text-xs ${constraintsLen > 450 ? "text-amber-600" : "text-[#969798]"}`}>
                  {constraintsLen}/500
                </span>
              </div>
            </div>

            {/* About The Organization */}
            <div>
              <label className={labelClass}>
                About The Organization
                <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                <InfoTooltip text="Give vendors context on who the requesting organization is — mission, industry, size, and any background that helps them understand who they'd be working with." />
              </label>
              <textarea
                rows={4}
                maxLength={1500}
                className="w-full rounded-md border border-[#e4e4e4] bg-white px-4 py-3 text-sm text-[#222628] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                placeholder="Describe the organization: who you are, what you do, and any relevant background vendors should know."
                value={data.aboutOrganization ?? ""}
                onChange={(e) => onChange({ aboutOrganization: e.target.value })}
              />
              <div className="mt-1 flex justify-end">
                <span className={`text-xs ${aboutOrganizationLen > 1350 ? "text-amber-600" : "text-[#969798]"}`}>
                  {aboutOrganizationLen}/1500
                </span>
              </div>
            </div>

            {/* Statement of Work */}
            <div>
              <label className={labelClass}>
                Statement of Work
                <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                <InfoTooltip text="Summarize the scope of work being requested from vendors — deliverables, responsibilities, and any boundaries on what's in or out of scope." />
              </label>
              <textarea
                rows={4}
                maxLength={1500}
                className="w-full rounded-md border border-[#e4e4e4] bg-white px-4 py-3 text-sm text-[#222628] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                placeholder="Describe the scope of work: what deliverables and responsibilities vendors are being asked to provide."
                value={data.statementOfWork ?? ""}
                onChange={(e) => onChange({ statementOfWork: e.target.value })}
              />
              <div className="mt-1 flex justify-end">
                <span className={`text-xs ${statementOfWorkLen > 1350 ? "text-amber-600" : "text-[#969798]"}`}>
                  {statementOfWorkLen}/1500
                </span>
              </div>
            </div>

            {/* Event Profile */}
            <div>
              <label className={labelClass}>
                Event Profile
                <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                <InfoTooltip text="Describe the profile of the event itself — history, significance, past attendance, or anything that helps vendors understand its stature." />
              </label>
              <textarea
                rows={4}
                maxLength={1500}
                className="w-full rounded-md border border-[#e4e4e4] bg-white px-4 py-3 text-sm text-[#222628] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                placeholder="Describe the event's profile: history, significance, past editions, or stature."
                value={data.eventProfile ?? ""}
                onChange={(e) => onChange({ eventProfile: e.target.value })}
              />
              <div className="mt-1 flex justify-end">
                <span className={`text-xs ${eventProfileLen > 1350 ? "text-amber-600" : "text-[#969798]"}`}>
                  {eventProfileLen}/1500
                </span>
              </div>
            </div>

            {/* RFP Timeline */}
            <div>
              <label className={labelClass}>
                RFP Timeline
                <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                <InfoTooltip text="Outline the key dates in the RFP process — submission deadline, vendor selection date, and any other milestones vendors need to plan around." />
              </label>
              <textarea
                rows={4}
                maxLength={1000}
                className="w-full rounded-md border border-[#e4e4e4] bg-white px-4 py-3 text-sm text-[#222628] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                placeholder="e.g. RFP issued July 1, questions due July 10, proposals due July 24, vendor selected August 5."
                value={data.rfpTimeline ?? ""}
                onChange={(e) => onChange({ rfpTimeline: e.target.value })}
              />
              <div className="mt-1 flex justify-end">
                <span className={`text-xs ${rfpTimelineLen > 900 ? "text-amber-600" : "text-[#969798]"}`}>
                  {rfpTimelineLen}/1000
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Nav ── */}
      <div className="flex items-center justify-end px-8 py-5 border-t border-[#e4e4e4]">
        {/* <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-200"
        >
          <ArrowLeft size={15} className="shrink-0" />
          Back
        </button> */}
        <button
          type="button"
          onClick={onContinue}
          className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(14,165,233,0.6)] active:translate-y-0"
          style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
          Venue &amp; Schedule
          <ArrowRight size={15} className="shrink-0" />
        </button>
      </div>
    </section>
  );
};

export default EventForm;
