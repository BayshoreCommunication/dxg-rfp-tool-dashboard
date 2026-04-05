"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { EventData, ProposalSettings } from "../AddNewProposal";
import { useClickOutside } from "./shared";
import GlobalDateInput from "@/components/shared/GlobalDateInput";

/* ─── Shared style constants ─── */
const labelClass = "mb-2 block text-sm font-semibold text-[#8f98bf]";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";
const selectClass = inputClass + " appearance-none pr-8";

const attendeesOptions = [
  "< 100",
  "100 - 150",
  "200 - 500",
  "500 - 1,000",
  "1,000+",
];
const eventTypeOptions = [
  "Conference",
  "Meeting",
  "Gala",
  "Trade Show",
  "Awards Show",
  "Other",
];
const formatOptions = ["In-Person", "Hybrid", "Virtual"] as const;

const normalizeDateFormat = (format: string) =>
  (format || "MM/DD/YYYY").replaceAll("_", "-").toUpperCase();

const toIsoDateValue = (raw: string | undefined) => {
  if (!raw) return "";
  const value = raw.trim();
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const delimiter = value.includes("/") ? "/" : "-";
  const parts = value.split(delimiter);
  if (parts.length !== 3) {
    return "";
  }

  const [a, b, c] = parts;
  if (c.length === 4) {
    const day = a.padStart(2, "0");
    const month = b.padStart(2, "0");
    return `${c}-${month}-${day}`;
  }

  if (a.length === 4) {
    const month = b.padStart(2, "0");
    const day = c.padStart(2, "0");
    return `${a}-${month}-${day}`;
  }

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
  const normalizedEndDate = toIsoDateValue(data.endDate);
  const startDateValue = fromIsoToDate(data.startDate);
  const endDateValue = fromIsoToDate(data.endDate);
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const attendeesRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);

  useClickOutside(
    attendeesRef,
    useCallback(() => setAttendeesOpen(false), []),
  );
  useClickOutside(
    typeRef,
    useCallback(() => setTypeOpen(false), []),
  );

  const handleClear = () => {
    onChange({
      eventName: "",
      startDate: "",
      endDate: "",
      venue: "",
      attendees: "",
      eventFormat: "In-Person",
      eventType: "",
      eventTypeOther: "",
    });
  };

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

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#d7dce3]">
        <h2 className="text-[20px] font-semibold text-[#0f1b57]">
          Event Overview
        </h2>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-6 py-6 space-y-6">
        {/* Event Name */}
        <div>
          <label htmlFor="eventName" className={labelClass}>
            EVENT <span className="text-red-500">*</span>
          </label>
          <input
            id="eventName"
            className={`${inputClass} ${showErrors && !data.eventName.trim() ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            placeholder="What's the official name or internal title for this event?"
            value={data.eventName}
            onChange={(e) => onChange({ eventName: e.target.value })}
          />
          {showErrors && !data.eventName.trim() && (
            <p className="mt-1 text-sm text-red-500">Event name is required.</p>
          )}
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className={labelClass}>
            EVENT START DATE <span className="text-red-500">*</span>
          </label>
          <GlobalDateInput
            id="startDate"
            label="Start Date"
            hideLabel
            showFormatInLabel={false}
            showErrorMessage={false}
            value={startDateValue}
            onChange={handleStartDateChange}
            format="yyyy-MM-dd"
            inputClassName={`${inputClass} pr-10 ${
              showErrors && !data.startDate.trim()
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : ""
            }`}
            buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#8f98bf] hover:text-primary"
          />
          <p className="mt-1 text-xs text-[#8f98bf] normal-case">
            Date format preference: {currentDateFormat}
          </p>
          {showErrors && !data.startDate.trim() && (
            <p className="mt-1 text-sm text-red-500">Start date is required.</p>
          )}
        </div>

        {/* End Date */}
        <div>
          <label htmlFor="endDate" className={labelClass}>
            EVENT END DATE <span className="text-red-500">*</span>
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
            format="yyyy-MM-dd"
            inputClassName={`${inputClass} pr-10 ${
              showErrors && !data.endDate.trim()
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : ""
            }`}
            buttonClassName="absolute right-3 top-1/2 -translate-y-1/2 text-[#8f98bf] hover:text-primary"
          />
          <p className="mt-1 text-xs text-[#8f98bf] normal-case">
            Date format preference: {currentDateFormat}
          </p>
          {showErrors && !data.endDate.trim() && (
            <p className="mt-1 text-sm text-red-500">End date is required.</p>
          )}
        </div>

        {/* Venue */}
        <div>
          <label htmlFor="venue" className={labelClass}>
            EVENT VENUE / HOTEL NAME <span className="text-red-500">*</span>
          </label>
          <input
            id="venue"
            className={`${inputClass} ${showErrors && !data.venue.trim() ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}`}
            placeholder="Where will this take place?"
            value={data.venue}
            onChange={(e) => onChange({ venue: e.target.value })}
          />
          {showErrors && !data.venue.trim() && (
            <p className="mt-1 text-sm text-red-500">Venue is required.</p>
          )}
        </div>

        {/* Number of Attendees */}
        <div>
          <label className={labelClass}>NUMBER OF ATTENDEES</label>
          <div className="relative" ref={attendeesRef}>
            <button
              type="button"
              onClick={() => setAttendeesOpen((p) => !p)}
              className={
                selectClass +
                " flex items-center justify-between cursor-pointer"
              }
            >
              <span
                className={data.attendees ? "text-[#1f2d5d]" : "text-gray-400"}
              >
                {data.attendees || "Select number of Attendees"}
              </span>
              <ChevronDown size={16} className="text-primary flex-shrink-0" />
            </button>

            {attendeesOpen && (
              <div className="absolute z-10 w-full mt-1 rounded-md border border-[#d7dce3] bg-white shadow-md overflow-hidden">
                {attendeesOptions.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center justify-between px-4 py-2.5 text-sm text-[#1f2d5d] hover:bg-sky-50 cursor-pointer"
                  >
                    <span>{opt}</span>
                    <input
                      type="radio"
                      name="attendees"
                      checked={data.attendees === opt}
                      onChange={() => {
                        onChange({ attendees: opt });
                        setAttendeesOpen(false);
                      }}
                      className="accent-[#6366f1]"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Event Format */}
        <div>
          <label className={labelClass}>EVENT FORMAT</label>
          <div className="flex items-center gap-6">
            {formatOptions.map((fmt) => (
              <label
                key={fmt}
                className="flex items-center gap-2 cursor-pointer text-sm text-[#1f2d5d]"
              >
                <input
                  type="radio"
                  name="eventFormat"
                  checked={data.eventFormat === fmt}
                  onChange={() => onChange({ eventFormat: fmt })}
                  className="accent-[#35bdf2] h-4 w-4"
                />
                {fmt}
              </label>
            ))}
          </div>
        </div>

        {/* Type of Event */}
        <div>
          <label className={labelClass}>TYPE OF EVENT</label>
          <div className="relative" ref={typeRef}>
            <button
              type="button"
              onClick={() => setTypeOpen((p) => !p)}
              className={
                selectClass +
                " flex items-center justify-between cursor-pointer"
              }
            >
              <span
                className={data.eventType ? "text-[#1f2d5d]" : "text-gray-400"}
              >
                {data.eventType || "Select type of event"}
              </span>
              <ChevronDown size={16} className="text-primary flex-shrink-0" />
            </button>

            {typeOpen && (
              <div className="absolute z-10 w-full mt-1 rounded-md border border-[#d7dce3] bg-white shadow-md overflow-hidden">
                {eventTypeOptions.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center justify-between px-4 py-2.5 text-sm text-[#1f2d5d] hover:bg-sky-50 cursor-pointer"
                  >
                    <span>{opt}</span>
                    <input
                      type="radio"
                      name="eventType"
                      checked={data.eventType === opt}
                      onChange={() => {
                        onChange({ eventType: opt });
                        if (opt !== "Other") setTypeOpen(false);
                      }}
                      className="accent-[#6366f1]"
                    />
                  </label>
                ))}

                {data.eventType === "Other" && (
                  <div className="px-4 pb-3">
                    <textarea
                      rows={2}
                      value={data.eventTypeOther}
                      onChange={(e) =>
                        onChange({ eventTypeOther: e.target.value })
                      }
                      placeholder="Write here..."
                      className="w-full rounded-md border border-[#d7dce3] px-3 py-2 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-2 text-sm font-semibold text-[#8f98bf] hover:text-red-400 transition-colors"
        >
          <RotateCcw size={15} />
          CLEAR
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-10 px-6 rounded-md border border-[#d7dce3] text-sm font-semibold text-[#1f2d5d] hover:bg-gray-50 transition-colors"
          >
            BACK
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="h-10 px-8 rounded-md bg-[#35bdf2] hover:bg-[#20A4D5] text-white text-sm font-bold shadow-[0_4px_14px_0_rgba(56,189,248,0.39)] transition-transform active:scale-95"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </section>
  );
};

export default EventForm;
