"use client";

import GlobalDateInput from "@/components/shared/GlobalDateInput";
import GlobalSelect from "@/components/shared/GlobalSelect";
import { useCallback, useRef } from "react";
import type { EventData, ProposalSettings } from "../AddNewProposal";
import { InfoTooltip, PillCheckbox, RadioIndicator, toggleItem, useClickOutside } from "./shared";
import { ArrowRight } from "lucide-react";
import {
  audienceOptions,
  eventOverviewFieldHelper,
  eventTypeOptions,
  formatOptions,
  maximumAudienceSelections,
  maximumToneSelections,
  toneGroups,
} from "@/lib/proposals/eventOverviewFieldUi";

/* ─── Shared style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-2 text-sm font-semibold text-[#263744]";
const inputClass =
  "h-12 w-full rounded-lg border border-[#dce3e8] bg-white px-4 text-sm text-[#263744] shadow-[0_1px_2px_rgba(15,42,67,0.03)] outline-none transition hover:border-[#c7d3da] focus:border-[#1DBFD3] focus:ring-4 focus:ring-[#1DBFD3]/15";
const groupLabelClass =
  "mb-6 text-base font-semibold text-[#222628]";

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
  onSaveDraft?: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
}

const EventForm = ({
  data,
  onChange,
  onContinue,
  onBack,
  onSaveDraft,
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
    <section className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <div className="border-t border-[#edf0f2] bg-[#fbfcfd] px-8 pb-6 pt-7">
        <h2 className="text-[30px] font-extrabold tracking-tight text-[#172b3a]">
          Event Overview &amp; Narrative
        </h2>
        <p className="mt-2 max-w-4xl text-[15px] leading-6 text-[#687782]">
          These fields power the auto-generated narrative on your RFP cover page
          and set the tone for every section that follows.
        </p>
      </div>

      {/* Form Body */}
      <div className="flex-1 space-y-12 px-8 py-8">

        {/* ── Group: Event Information ── */}
        <div>
          <p className={groupLabelClass}>Event Information</p>
          <div className="space-y-5">

            {/* Row 1: Event Name + Edition/Year */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div data-assistant-field-key="/content/event/name">
                <label className={labelClass}>
                  Event Name <span className="text-red-500">*</span>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/name")} />
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

              <div data-assistant-field-key="/content/event/edition">
                <label className={labelClass}>
                  Edition / Year
                  <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/edition")} />
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

            <div data-assistant-field-key="/content/event/objectives">
              <label className={labelClass}>
                Event summary / Narrative <span className="text-red-500">*</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/objectives")} />
              </label>
              <p className="mb-2 text-sm text-[#565859] normal-case">
                Provide a short summary of the event goals, audience, and key outcomes. This narrative will appear on your RFP cover page.
              </p>
              <textarea
                rows={4}
                maxLength={800}
                className="w-full resize-none rounded-lg border border-[#dce3e8] bg-white px-4 py-3 text-sm text-[#263744] shadow-[0_1px_2px_rgba(15,42,67,0.03)] outline-none transition hover:border-[#c7d3da] focus:border-[#1DBFD3] focus:ring-4 focus:ring-[#1DBFD3]/15"
                placeholder="Start typing or use Ask AI to generate..."
                value={objectives}
                onChange={(e) => onChange({ eventObjectives: e.target.value })}
              />
              <div className="mt-1 flex justify-end">
                <span className={`text-xs ${objLen > 720 ? "text-amber-600" : "text-[#969798]"}`}>{objLen}/800</span>
              </div>
            </div>

            {/* Row 2: Event Type + Theme/Tagline */}
            <div className="grid grid-cols-2 gap-5">
              <div data-assistant-field-key="/content/event/type">
                <label className={labelClass}>
                  Event Type <span className="text-red-500">*</span>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/type")} />
                </label>
                <div ref={typeRef}>
                  <GlobalSelect
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
                  </GlobalSelect>
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

              <div data-assistant-field-key="/content/event/theme">
                <label className={labelClass}>
                  Event Theme / Tagline
                  <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/theme")} />
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
              <div data-assistant-field-key="/content/event/website">
                <label className={labelClass}>
                  Event Website
                  <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/website")} />
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
            <div data-assistant-field-key="/content/event/format">
              <label className={labelClass}>
                Event Format <span className="text-red-500">*</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/format")} />
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
                      className="peer sr-only"
                    />
                    <RadioIndicator checked={data.eventFormat === fmt.value} />
                    {fmt.label}
                  </label>
                ))}
              </div>
              {(data.eventFormat === "Hybrid" || data.eventFormat === "Virtual") && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-[#1DBFD3]/30 bg-[#1DBFD3]/5 px-4 py-3 text-sm text-brand-dark">
                  <span className="font-bold">⚡</span>
                  <span>
                    <strong>Step 3 Unlocked:</strong> Hybrid &amp; Virtual Production fields are now active.
                  </span>
                </div>
              )}
            </div>

            {/* Primary Audience */}
            <div data-assistant-field-key="/content/event/primaryAudiences/*">
              <label className={labelClass}>
                Primary Audience <span className="text-red-500">*</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/primaryAudiences/*")} />
              </label>
              <p className="mb-3 text-xs text-slate-500 normal-case">
                Select up to {maximumAudienceSelections} audience types.
                {audienceSelected.length > 0 && ` ${audienceSelected.length}/${maximumAudienceSelections} selected.`}
              </p>
              <div className="flex flex-wrap gap-3">
                {audienceOptions.map((opt) => {
                  const checked = audienceSelected.includes(opt);
                  const maxReached =
                    audienceSelected.length >= maximumAudienceSelections && !checked;
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
              {audienceSelected.length >= maximumAudienceSelections && (
                <p className="mt-2 text-xs text-amber-600 normal-case">
                  Maximum {maximumAudienceSelections} audience types selected.
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
            <div data-assistant-field-key="/content/event/startDate">
              <label className={labelClass}>
                Start Date <span className="text-red-500">*</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/startDate")} />
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
            <div data-assistant-field-key="/content/event/endDate">
              <label className={labelClass}>
                End Date <span className="text-red-500">*</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/endDate")} />
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
              {/* A date before the start is discarded by the picker, which just
                  empties the field. State the rule so a date that vanishes is
                  explained rather than mysterious. */}
              {startDateValue && !data.endDate.trim() && (
                <p className="mt-1 text-xs text-slate-500 normal-case">
                  Must be on or after the start date ({startDateValue.toLocaleDateString()}).
                </p>
              )}
            </div>

            {/* Total Attendance */}
            <div data-assistant-field-key="/content/event/attendeeCount">
              <label className={labelClass}>
                Total Attendance <span className="text-red-500">*</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/attendeeCount")} />
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

            {/* Tone / Brand Direction */}
            <div data-assistant-field-key="/content/event/toneDirections/*">
              <label className={labelClass}>
                Tone / Brand Direction
                <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/toneDirections/*")} />
              </label>
              <p className="mb-3 text-xs text-slate-500 normal-case">
                Select up to {maximumToneSelections} tags.
                {toneSelected.length > 0 && ` ${toneSelected.length}/${maximumToneSelections} selected.`}
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
                        const maxReached =
                          toneSelected.length >= maximumToneSelections && !checked;
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
            <div data-assistant-field-key="/content/event/sacredConstraints">
              <label className={labelClass}>
                Sacred Constraints / Special Considerations
                <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/sacredConstraints")} />
              </label>
              <textarea
                rows={3}
                maxLength={500}
                className="w-full rounded-md border border-[#e4e4e4] bg-white px-4 py-3 text-sm text-[#222628] outline-none focus:border-[#1DBFD3] focus:ring-1 focus:ring-[#1DBFD3]/20 resize-none"
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
            <div data-assistant-field-key="/content/event/organizationBackground">
              <label className={labelClass}>
                About The Organization
                <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/organizationBackground")} />
              </label>
              <textarea
                rows={4}
                maxLength={1500}
                className="w-full rounded-md border border-[#e4e4e4] bg-white px-4 py-3 text-sm text-[#222628] outline-none focus:border-[#1DBFD3] focus:ring-1 focus:ring-[#1DBFD3]/20 resize-none"
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
            <div data-assistant-field-key="/content/event/statementOfWork">
              <label className={labelClass}>
                Statement of Work
                <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/statementOfWork")} />
              </label>
              <textarea
                rows={4}
                maxLength={1500}
                className="w-full rounded-md border border-[#e4e4e4] bg-white px-4 py-3 text-sm text-[#222628] outline-none focus:border-[#1DBFD3] focus:ring-1 focus:ring-[#1DBFD3]/20 resize-none"
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
            <div data-assistant-field-key="/content/event/eventProfile">
              <label className={labelClass}>
                Event Profile
                <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/eventProfile")} />
              </label>
              <textarea
                rows={4}
                maxLength={1500}
                className="w-full rounded-md border border-[#e4e4e4] bg-white px-4 py-3 text-sm text-[#222628] outline-none focus:border-[#1DBFD3] focus:ring-1 focus:ring-[#1DBFD3]/20 resize-none"
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
            <div data-assistant-field-key="/content/event/rfpTimelineNotes">
              <label className={labelClass}>
                RFP Timeline
                <span className="text-[#969798] text-xs font-normal normal-case tracking-normal ml-1">(optional)</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/rfpTimelineNotes")} />
              </label>
              <textarea
                rows={4}
                maxLength={1000}
                className="w-full rounded-md border border-[#e4e4e4] bg-white px-4 py-3 text-sm text-[#222628] outline-none focus:border-[#1DBFD3] focus:ring-1 focus:ring-[#1DBFD3]/20 resize-none"
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
      <div className="sticky bottom-0 flex items-center justify-between border-t border-[#e4e4e4] bg-white/95 px-8 py-4 backdrop-blur">
        <button type="button" onClick={onSaveDraft ?? onBack} className="text-sm font-semibold text-[#1DBFD3] hover:text-[#0069a0]">Save draft</button>
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
          className="group relative flex items-center gap-3 overflow-hidden rounded-md bg-[#1DBFD3] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#0069a0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1DBFD3]"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
          Save &amp; continue
          <ArrowRight size={15} className="shrink-0" />
        </button>
      </div>
    </section>
  );
};

export default EventForm;
