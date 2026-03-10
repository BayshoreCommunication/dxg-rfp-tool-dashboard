"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ProposalData } from "../AddNewProposal";

/* ─── Shared style constants (same pattern as ProposalsSettings) ─── */
const labelClass = "mb-2 block text-sm font-semibold text-[#8f98bf]";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";
const selectClass = inputClass + " appearance-none pr-8";

/* ─── Reusable mini-components ─── */
const SelectCaret = () => (
  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary">
    <ChevronDown size={16} />
  </span>
);

const attendeesOptions = ["< 100", "100 - 150", "200 - 500", "500 - 1,000", "1,000+"];
const eventTypeOptions = ["Conference", "Meeting", "Gala", "Trade Show", "Awards Show", "Other"];
const formatOptions = ["In-Person", "Hybrid", "Virtual"] as const;

interface EventFormProps {
  data: ProposalData;
  onChange: (updates: Partial<ProposalData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

const EventForm = ({ data, onChange, onContinue, onBack }: EventFormProps) => {
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

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

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#d7dce3]">
        <h2 className="text-[20px] font-semibold text-[#0f1b57]">Event Overview</h2>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-6 py-6 space-y-6">

        {/* Event Name */}
        <div>
          <label htmlFor="eventName" className={labelClass}>EVENT</label>
          <input
            id="eventName"
            className={inputClass}
            placeholder="What's the official name or internal title for this event?"
            value={data.eventName}
            onChange={(e) => onChange({ eventName: e.target.value })}
          />
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className={labelClass}>EVENT START DATE</label>
          <input
            id="startDate"
            type="date"
            className={inputClass}
            value={data.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
          />
        </div>

        {/* End Date */}
        <div>
          <label htmlFor="endDate" className={labelClass}>EVENT END DATE</label>
          <input
            id="endDate"
            type="date"
            className={inputClass}
            value={data.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
          />
        </div>

        {/* Venue */}
        <div>
          <label htmlFor="venue" className={labelClass}>EVENT VENUE / HOTEL NAME</label>
          <input
            id="venue"
            className={inputClass}
            placeholder="Where will this take place?"
            value={data.venue}
            onChange={(e) => onChange({ venue: e.target.value })}
          />
        </div>

        {/* Number of Attendees */}
        <div>
          <label className={labelClass}>NUMBER OF ATTENDEES</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAttendeesOpen((p) => !p)}
              className={selectClass + " flex items-center justify-between cursor-pointer"}
            >
              <span className={data.attendees ? "text-[#1f2d5d]" : "text-gray-400"}>
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
                      className="accent-[#373798]"
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
              <label key={fmt} className="flex items-center gap-2 cursor-pointer text-sm text-[#1f2d5d]">
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setTypeOpen((p) => !p)}
              className={selectClass + " flex items-center justify-between cursor-pointer"}
            >
              <span className={data.eventType ? "text-[#1f2d5d]" : "text-gray-400"}>
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
                      className="accent-[#373798]"
                    />
                  </label>
                ))}

                {data.eventType === "Other" && (
                  <div className="px-4 pb-3">
                    <textarea
                      rows={2}
                      value={data.eventTypeOther}
                      onChange={(e) => onChange({ eventTypeOther: e.target.value })}
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