"use client";

import { Clock3 } from "lucide-react";
import React, { useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface GlobalTimeInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  interval?: number;
  minTime?: string;
  maxTime?: string;
  inputClassName?: string;
  ariaDescribedBy?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const timeValueToDate = (value?: string): Date | null => {
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return new Date(2000, 0, 1, hours, minutes, 0, 0);
};

const dateToTimeValue = (date: Date | null): string =>
  date
    ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
    : "";

const GlobalTimeInput = ({
  id,
  label,
  value,
  onChange,
  disabled = false,
  error,
  interval = 15,
  minTime,
  maxTime,
  inputClassName,
  ariaDescribedBy,
  open,
  onOpenChange,
}: GlobalTimeInputProps) => {
  const pickerRef = useRef<DatePicker>(null);
  // react-datepicker requires time bounds as a pair, even when callers only
  // need to constrain one side of the selectable window.
  const resolvedMinTime = minTime || (maxTime ? "00:00" : undefined);
  const resolvedMaxTime = maxTime || (minTime ? "23:45" : undefined);
  const resolvedInputClassName =
    inputClassName ||
    `w-full rounded-lg border px-4 py-3 pr-12 outline-none transition ${
      error
        ? "border-red-500 focus:border-red-500"
        : "border-gray-300 hover:border-[#9adfe8] focus:border-[#1DBFD3] focus:ring-4 focus:ring-[#1DBFD3]/15"
    } ${disabled ? "cursor-not-allowed bg-gray-100" : "bg-white"}`;

  return (
    <div className="w-full">
      <label htmlFor={id} className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#3d4143]">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <DatePicker
          ref={pickerRef}
          id={id}
          selected={timeValueToDate(value)}
          onChange={(date: Date | null) => {
            onChange(dateToTimeValue(date));
            onOpenChange?.(false);
          }}
          open={open}
          onFocus={() => onOpenChange?.(true)}
          onInputClick={() => onOpenChange?.(true)}
          onClickOutside={() => onOpenChange?.(false)}
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={interval}
          timeCaption="Time"
          dateFormat="h:mm aa"
          placeholderText="Select time"
          minTime={timeValueToDate(resolvedMinTime) || undefined}
          maxTime={timeValueToDate(resolvedMaxTime) || undefined}
          disabled={disabled}
          className={resolvedInputClassName}
          wrapperClassName="w-full"
          popperClassName="dxg-datepicker-popper"
          calendarClassName="dxg-datepicker dxg-timepicker"
          showPopperArrow={false}
          ariaInvalid={error ? "true" : undefined}
          ariaDescribedBy={error ? ariaDescribedBy : undefined}
        />
        <button
          type="button"
          aria-label={`Open ${label.toLowerCase()} picker`}
          disabled={disabled}
          onClick={() => {
            onOpenChange?.(true);
            pickerRef.current?.setFocus();
          }}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-[#eafafd] text-[#1DBFD3] transition hover:bg-[#d8f6fa] hover:text-[#109aaf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBFD3]/35 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Clock3 size={18} aria-hidden="true" />
        </button>
      </div>
      {error && <p id={ariaDescribedBy} className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default GlobalTimeInput;
