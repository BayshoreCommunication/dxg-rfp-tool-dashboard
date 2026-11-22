"use client";

import GlobalDateInput from "@/components/shared/GlobalDateInput";
import GlobalSelect from "@/components/shared/GlobalSelect";
import { useCallback, useId, useRef } from "react";
import type { EventData, ProposalSettings } from "../AddNewProposal";
import { InfoTooltip, PillCheckbox, RadioIndicator, toggleItem, useClickOutside } from "./shared";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  audienceOptions,
  eventOverviewFieldHelper,
  eventTypeOptions,
  formatOptions,
  maximumAudienceSelections,
  maximumToneSelections,
  toneGroups,
} from "@/lib/proposals/eventOverviewFieldUi";
import type { ProposalExperienceMode } from "@/lib/proposals/proposalExperience";
import { formatAppDate } from "@/lib/dateFormat";

/* ─── Shared style constants ─── */
const labelClass =
  "mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-heading";
const inputClass =
  "h-11 w-full rounded-lg border border-control bg-surface px-3.5 text-sm text-heading placeholder:text-muted shadow-[0_1px_2px_rgba(15,42,67,0.025)] outline-none transition hover:border-line-strong focus:border-action focus:ring-4 focus:ring-focus/15";
const textareaClass =
  "w-full resize-none rounded-lg border border-control bg-surface px-3.5 py-2.5 text-sm leading-5 text-heading placeholder:text-muted shadow-[0_1px_2px_rgba(15,42,67,0.025)] outline-none transition hover:border-line-strong focus:border-action focus:ring-4 focus:ring-focus/15";
const groupLabelClass =
  "mb-4 text-[15px] font-bold text-heading";

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
  mode?: ProposalExperienceMode;
  /** Drafts a vendor-ready statement of work from the confirmed event details. */
  onGenerateStatementOfWork?: () => void;
}

const EventForm = ({
  data,
  onChange,
  onContinue,
  onBack,
  onSaveDraft,
  showErrors = false,
  proposalSettings,
  mode = "advanced",
  onGenerateStatementOfWork,
}: EventFormProps) => {
  const currentDateFormat = normalizeDateFormat(
    proposalSettings.proposals.dateFormat,
  );
  const pickerFormat = toPickerFormat(currentDateFormat);
  const normalizedEndDate = toIsoDateValue(data.endDate);
  const startDateValue = fromIsoToDate(data.startDate);
  const endDateValue = fromIsoToDate(data.endDate);

  // Stable, unique ids so every label, error and hint is programmatically tied to its control.
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

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
    <section id="event-overview-section" tabIndex={-1} className="flex scroll-mt-6 flex-col bg-surface focus:outline-none">
      {/* Header */}
      <div className="border-t border-line bg-surface-muted px-5 pb-4 pt-5 sm:px-6 lg:px-7">
        <h2 className="text-2xl font-extrabold tracking-tight text-heading">
          {mode === "basic" ? "Event Essentials" : "Event Overview & Narrative"}
        </h2>
        <p className="mt-1.5 max-w-4xl text-[13px] leading-5 text-body">
          {mode === "basic"
            ? "Capture the event, format, dates, and attendance. You can add narrative and audience strategy in Advanced production."
            : "These fields power the auto-generated narrative on your proposal cover page and set the tone for every section that follows."}
        </p>
      </div>

      {/* Form Body */}
      <div className="flex-1 space-y-9 px-5 py-6 sm:px-6 lg:px-7">

        {/* ── Group: Event Information ── */}
        <div>
          <p className={groupLabelClass}>Event Information</p>
          <div className="space-y-4">

            {/* Row 1: Event Name + Edition/Year */}
            <div className={`grid grid-cols-1 gap-5 ${mode === "advanced" ? "lg:grid-cols-2" : ""}`}>
              <div data-assistant-field-key="/content/event/name">
                <div className={labelClass}>
                  <label htmlFor={fid("name")} className="flex items-center gap-[inherit]">
                  Event Name <span className="text-danger-strong">*</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/name")} />
                </div>
                <input id={fid("name")} aria-required="true" aria-invalid={showErrors && !data.eventName.trim() ? true : undefined} aria-describedby={showErrors && !data.eventName.trim() ? fid("name-error") : undefined}
                  className={`${inputClass} ${showErrors && !data.eventName.trim() ? "border-danger-strong focus:border-danger-strong focus:ring-red-500/20" : ""}`}
                  placeholder="e.g. Apex Dynamics Global Summit 2026"
                  maxLength={120}
                  value={data.eventName}
                  onChange={(e) => onChange({ eventName: e.target.value })}
                />
                <div className="mt-0.5 flex items-start justify-between">
                  {showErrors && !data.eventName.trim() ? (
                    <p id={fid("name-error")} role="alert" className="text-sm text-danger-strong normal-case">Event name is required.</p>
                  ) : <span />}
                  <span className="ml-2 shrink-0 text-[11px] text-muted">
                    {data.eventName.length}/120
                  </span>
                </div>
              </div>

              {mode === "advanced" && <div data-assistant-field-key="/content/event/edition">
                <div className={labelClass}>
                  <label htmlFor={fid("edition")} className="flex items-center gap-[inherit]">
                  Edition / Year
                  <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted">(optional)</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/edition")} />
                </div>
                <input id={fid("edition")}
                  className={inputClass}
                  placeholder="e.g. 12th Annual or Inaugural 2026"
                  maxLength={60}
                  value={data.editionYear ?? ""}
                  onChange={(e) => onChange({ editionYear: e.target.value })}
                />
              </div>}
            </div>

            {mode === "advanced" && <div data-assistant-field-key="/content/event/objectives">
              <div className={labelClass}>
                  <label htmlFor={fid("objectives")} className="flex items-center gap-[inherit]">
                Event summary / Narrative <span className="text-danger-strong">*</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/objectives")} />
                </div>
              <p className="mb-1.5 text-[13px] leading-5 text-body normal-case">
                Provide a short summary of the event goals, audience, and key outcomes. This narrative will appear on your proposal cover page.
              </p>
              <textarea id={fid("objectives")} aria-required="true"
                rows={3}
                maxLength={800}
                className={textareaClass}
                placeholder="Start typing or use Ask AI to generate..."
                value={objectives}
                onChange={(e) => onChange({ eventObjectives: e.target.value })}
              />
              <div className="mt-0.5 flex justify-end">
                <span className={`text-[11px] ${objLen > 720 ? "text-warning-strong" : "text-muted"}`}>{objLen}/800</span>
              </div>
            </div>}

            {/* Row 2: Event Type + Theme/Tagline */}
            <div className={`grid grid-cols-1 gap-4 ${mode === "advanced" ? "sm:grid-cols-2" : ""}`}>
              <div data-assistant-field-key="/content/event/type">
                <div className={labelClass}>
                  <label id={fid("type-label")} className="flex items-center gap-[inherit]">
                  Event Type <span className="text-danger-strong">*</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/type")} />
                </div>
                <div ref={typeRef}>
                  <GlobalSelect
                    id={fid("type")}
                    aria-labelledby={fid("type-label")}
                    className={`${inputClass} appearance-none ${
                      showErrors && !data.eventType.eventType
                        ? "border-danger-strong focus:border-danger-strong"
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
                    {data.eventType.eventType === "Annual Meeting / Shareholder Event" && (
                      <option value="Annual Meeting / Shareholder Event">Annual Meeting / Shareholder Event (previous selection)</option>
                    )}
                    {eventTypeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </GlobalSelect>
                </div>
                {data.eventType.eventType === "Other" && (
                  <input
                    aria-label="Specify the other event type"
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
                  <p id={fid("type-error")} role="alert" className="mt-1 text-sm text-danger-strong normal-case">
                    Event type is required.
                  </p>
                )}
              </div>

              {mode === "advanced" && <div data-assistant-field-key="/content/event/theme">
                <div className={labelClass}>
                  <label htmlFor={fid("theme")} className="flex items-center gap-[inherit]">
                  Event Theme / Tagline
                  <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted">(optional)</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/theme")} />
                </div>
                <input id={fid("theme")}
                  className={inputClass}
                  placeholder='e.g. "Velocity" or "Built for What&apos;s Next"'
                  maxLength={100}
                  value={data.eventTheme ?? ""}
                  onChange={(e) => onChange({ eventTheme: e.target.value })}
                />
              </div>}
            </div>

            {/* Row 3: Event Website */}
            {mode === "advanced" && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div data-assistant-field-key="/content/event/website">
                <div className={labelClass}>
                  <label htmlFor={fid("website")} className="flex items-center gap-[inherit]">
                  Event Website
                  <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted">(optional)</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/website")} />
                </div>
                <input id={fid("website")}
                  type="url"
                  className={inputClass}
                  placeholder="e.g. https://www.example.com/summit2026"
                  maxLength={200}
                  value={data.eventWebsite ?? ""}
                  onChange={(e) => onChange({ eventWebsite: e.target.value })}
                />
              </div>
            </div>}
          </div>
        </div>

        {/* ── Group: Format & Audience ── */}
        <div>
          <p className={groupLabelClass}>Format &amp; Audience</p>
          <div className="space-y-5">

            {/* Event Format */}
            <div data-assistant-field-key="/content/event/format">
              <p id={fid("format-label")} className={labelClass}>
                Event Format <span className="text-danger-strong">*</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/format")} />
              </p>
              <p className="mb-2 text-xs text-body normal-case">
                Your selection adds Hybrid &amp; Virtual Production when applicable.
              </p>
              <div role="radiogroup" aria-labelledby={fid("format-label")} className="flex flex-col gap-2">
                {formatOptions.map((fmt) => (
                  <label
                    key={fmt.value}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-heading"
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
                <div className="mt-2.5 flex items-start gap-2 rounded-md border border-action/30 bg-action/5 px-3.5 py-2.5 text-[13px] leading-5 text-brand-dark">
                  <span className="font-bold">⚡</span>
                  <span>
                    <strong>Hybrid scope added:</strong> Hybrid &amp; Virtual Production fields are now active in Advanced production.
                  </span>
                </div>
              )}
            </div>

            {/* Primary Audience */}
            {mode === "advanced" && <div data-assistant-field-key="/content/event/primaryAudiences/*">
              <p id={fid("audience-label")} className={labelClass}>
                Primary Audience <span className="text-danger-strong">*</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/primaryAudiences/*")} />
              </p>
              <p className="mb-2 text-xs text-body normal-case">
                Select up to {maximumAudienceSelections} audience types.
                {audienceSelected.length > 0 && ` ${audienceSelected.length}/${maximumAudienceSelections} selected.`}
              </p>
              <div role="group" aria-labelledby={fid("audience-label")} className="flex flex-wrap gap-2">
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
                <p className="mt-2 text-xs text-warning-strong normal-case">
                  Maximum {maximumAudienceSelections} audience types selected.
                </p>
              )}
              {showErrors && audienceSelected.length === 0 && (
                <p role="alert" className="mt-2 text-sm text-danger-strong normal-case">
                  Please select at least one audience type.
                </p>
              )}
            </div>}
          </div>
        </div>

        {/* ── Group: Dates & Scale ── */}
        <div>
          <p className={groupLabelClass}>Dates &amp; Scale</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

            {/* Start Date */}
            <div data-assistant-field-key="/content/event/startDate">
              <div className={labelClass}>
                  <label htmlFor="startDate" className="flex items-center gap-[inherit]">
                Start Date <span className="text-danger-strong">*</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/startDate")} />
                </div>
              <GlobalDateInput
                id="startDate"
                ariaInvalid={showErrors && !data.startDate.trim()}
                label="Start Date"
                hideLabel
                showFormatInLabel={false}
                showErrorMessage={false}
                value={startDateValue}
                onChange={handleStartDateChange}
                format={pickerFormat}
                inputClassName={`${inputClass} pr-10 ${
                  showErrors && !data.startDate.trim()
                    ? "border-danger-strong focus:border-danger-strong"
                    : ""
                }`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              />
              {isStartInPast && data.startDate && (
                <p className="mt-1 text-xs text-warning-strong normal-case">
                  Warning: Start date is in the past.
                </p>
              )}
              {showErrors && !data.startDate.trim() && (
                <p id={fid("startDate-error")} role="alert" className="mt-1 text-sm text-danger-strong normal-case">Required.</p>
              )}
            </div>

            {/* End Date */}
            <div data-assistant-field-key="/content/event/endDate">
              <div className={labelClass}>
                  <label htmlFor="endDate" className="flex items-center gap-[inherit]">
                End Date <span className="text-danger-strong">*</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/endDate")} />
                </div>
              <GlobalDateInput
                id="endDate"
                ariaInvalid={showErrors && !data.endDate.trim()}
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
                    ? "border-danger-strong focus:border-danger-strong"
                    : ""
                }`}
                buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              />
              {showErrors && !data.endDate.trim() && (
                <p id={fid("endDate-error")} role="alert" className="mt-1 text-sm text-danger-strong normal-case">Required.</p>
              )}
              {/* A date before the start is discarded by the picker, which just
                  empties the field. State the rule so a date that vanishes is
                  explained rather than mysterious. */}
              {startDateValue && !data.endDate.trim() && (
                <p className="mt-1 text-xs text-body normal-case">
                  Must be on or after the start date ({formatAppDate(startDateValue)}).
                </p>
              )}
            </div>

            {/* Total Attendance */}
            <div data-assistant-field-key="/content/event/attendeeCount">
              <div className={labelClass}>
                  <label htmlFor={fid("attendees")} className="flex items-center gap-[inherit]">
                Total Attendance <span className="text-danger-strong">*</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/attendeeCount")} />
                </div>
              <input id={fid("attendees")} aria-required="true" aria-invalid={showErrors && !data.attendees.trim() ? true : undefined} aria-describedby={showErrors && !data.attendees.trim() ? fid("attendees-error") : undefined}
                type="number"
                min={1}
                max={100000}
                className={`${inputClass} ${
                  showErrors && !data.attendees.trim()
                    ? "border-danger-strong focus:border-danger-strong"
                    : ""
                }`}
                placeholder="e.g. 1500"
                value={data.attendees}
                onChange={(e) => onChange({ attendees: e.target.value })}
              />
              {showErrors && !data.attendees.trim() && (
                <p id={fid("attendees-error")} role="alert" className="mt-1 text-sm text-danger-strong normal-case">Required.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Group: Company Information ── */}
        {mode === "advanced" && <div>
          <p className={groupLabelClass}>Company Information</p>
          <div className="space-y-5">

            {/* Tone / Brand Direction */}
            <div data-assistant-field-key="/content/event/toneDirections/*">
              <p id={fid("tone-label")} className={labelClass}>
                Tone / Brand Direction
                <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted">(optional)</span>
                <InfoTooltip text={eventOverviewFieldHelper("/content/event/toneDirections/*")} />
              </p>
              <p className="mb-2 text-xs text-body normal-case">
                Select up to {maximumToneSelections} tags.
                {toneSelected.length > 0 && ` ${toneSelected.length}/${maximumToneSelections} selected.`}
              </p>
              <div role="group" aria-labelledby={fid("tone-label")} className="space-y-3">
                {toneGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
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
                <p className="mt-2 text-xs text-warning-strong normal-case">
                  Maximum 5 tone tags selected.
                </p>
              )}
            </div>

            {/* Sacred Constraints */}
            <div data-assistant-field-key="/content/event/sacredConstraints">
              <div className={labelClass}>
                  <label htmlFor={fid("sacred")} className="flex items-center gap-[inherit]">
                Sacred Constraints / Special Considerations
                <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted">(optional)</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/sacredConstraints")} />
                </div>
              <textarea id={fid("sacred")}
                rows={3}
                maxLength={500}
                className={textareaClass}
                placeholder="e.g. CEO keynote must run exactly 22 minutes. No standing ovations during memorial segment. Sponsor logos cannot appear on main stage screens."
                value={data.sacredConstraints ?? ""}
                onChange={(e) => onChange({ sacredConstraints: e.target.value })}
              />
              <div className="mt-0.5 flex justify-end">
                <span className={`text-[11px] ${constraintsLen > 450 ? "text-warning-strong" : "text-muted"}`}>
                  {constraintsLen}/500
                </span>
              </div>
            </div>

            {/* About The Organization */}
            <div data-assistant-field-key="/content/event/organizationBackground">
              <div className={labelClass}>
                  <label htmlFor={fid("about")} className="flex items-center gap-[inherit]">
                About The Organization
                <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted">(optional)</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/organizationBackground")} />
                </div>
              <textarea id={fid("about")}
                rows={3}
                maxLength={1500}
                className={textareaClass}
                placeholder="Describe the organization: who you are, what you do, and any relevant background vendors should know."
                value={data.aboutOrganization ?? ""}
                onChange={(e) => onChange({ aboutOrganization: e.target.value })}
              />
              <div className="mt-0.5 flex justify-end">
                <span className={`text-[11px] ${aboutOrganizationLen > 1350 ? "text-warning-strong" : "text-muted"}`}>
                  {aboutOrganizationLen}/1500
                </span>
              </div>
            </div>

            {/* Statement of Work */}
            <div id="statement-of-work-section" tabIndex={-1} className="scroll-mt-6" data-assistant-field-key="/content/event/statementOfWork">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className={labelClass}>
                  <label htmlFor="statement-of-work" className="flex items-center gap-[inherit]">
                  Statement of Work
                  <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted">(optional)</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/statementOfWork")} />
                </div>
                {onGenerateStatementOfWork && (
                  <button
                    type="button"
                    onClick={onGenerateStatementOfWork}
                    className="mb-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                  >
                    <Sparkles size={13} aria-hidden="true" />
                    {(data.statementOfWork ?? "").trim() ? "Regenerate draft" : "Generate draft"}
                  </button>
                )}
              </div>
              <textarea
                id="statement-of-work"
                rows={3}
                maxLength={1500}
                className={textareaClass}
                placeholder="Describe the scope of work: what deliverables and responsibilities vendors are being asked to provide."
                value={data.statementOfWork ?? ""}
                onChange={(e) => onChange({ statementOfWork: e.target.value })}
              />
              <div className="mt-0.5 flex justify-end">
                <span className={`text-[11px] ${statementOfWorkLen > 1350 ? "text-warning-strong" : "text-muted"}`}>
                  {statementOfWorkLen}/1500
                </span>
              </div>
            </div>

            {/* Event Profile */}
            <div data-assistant-field-key="/content/event/eventProfile">
              <div className={labelClass}>
                  <label htmlFor={fid("profile")} className="flex items-center gap-[inherit]">
                Event Profile
                <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted">(optional)</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/eventProfile")} />
                </div>
              <textarea id={fid("profile")}
                rows={3}
                maxLength={1500}
                className={textareaClass}
                placeholder="Describe the event's profile: history, significance, past editions, or stature."
                value={data.eventProfile ?? ""}
                onChange={(e) => onChange({ eventProfile: e.target.value })}
              />
              <div className="mt-0.5 flex justify-end">
                <span className={`text-[11px] ${eventProfileLen > 1350 ? "text-warning-strong" : "text-muted"}`}>
                  {eventProfileLen}/1500
                </span>
              </div>
            </div>

            {/* RFP Timeline */}
            <div data-assistant-field-key="/content/event/rfpTimelineNotes">
              <div className={labelClass}>
                  <label htmlFor={fid("timeline")} className="flex items-center gap-[inherit]">
                Proposal Timeline
                <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted">(optional)</span></label>
                  <InfoTooltip text={eventOverviewFieldHelper("/content/event/rfpTimelineNotes")} />
                </div>
              <textarea id={fid("timeline")}
                rows={3}
                maxLength={1000}
                className={textareaClass}
                placeholder="e.g. Proposal issued July 1, questions due July 10, vendor responses due July 24, vendor selected August 5."
                value={data.rfpTimeline ?? ""}
                onChange={(e) => onChange({ rfpTimeline: e.target.value })}
              />
              <div className="mt-0.5 flex justify-end">
                <span className={`text-[11px] ${rfpTimelineLen > 900 ? "text-warning-strong" : "text-muted"}`}>
                  {rfpTimelineLen}/1000
                </span>
              </div>
            </div>
          </div>
        </div>}
      </div>

      {/* ── Footer Nav ── */}
      <div className="sticky bottom-0 flex items-center justify-between border-t border-line bg-white/95 px-5 py-3 backdrop-blur sm:px-6 lg:px-7">
        <button type="button" onClick={onSaveDraft ?? onBack} className="text-sm font-semibold text-action hover:text-heading">Save draft</button>
        {/* <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-body shadow-sm hover:bg-surface-muted hover:-translate-y-0.5 transition-all duration-200"
        >
          <ArrowLeft size={15} className="shrink-0" />
          Back
        </button> */}
        <button
          type="button"
          onClick={onContinue}
          className="group relative flex min-h-10 items-center gap-2.5 overflow-hidden rounded-md bg-action px-5 py-2 text-sm font-semibold text-on-action transition hover:bg-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
