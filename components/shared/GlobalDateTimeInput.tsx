"use client";

import { CalendarRangeIcon } from "lucide-react";
import React, { useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type DateFormatType =
  | "yyyy-dd-MM"
  | "dd-MM-yyyy"
  | "MM-dd-yyyy"
  | "yyyy-MM-dd"
  | "yyyy-dd-MM HH:mm"
  | "dd-MM-yyyy HH:mm"
  | "MM-dd-yyyy HH:mm"
  | "yyyy-MM-dd HH:mm"
  | "yyyy-dd-MM hh:mm aa"
  | "dd-MM-yyyy hh:mm aa"
  | "MM-dd-yyyy hh:mm aa"
  | "yyyy-MM-dd hh:mm aa";

interface GlobalDatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  format?: DateFormatType;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  hideLabel?: boolean;
  showFormatInLabel?: boolean;
  showErrorMessage?: boolean;
  labelClassName?: string;
  inputClassName?: string;
  buttonClassName?: string;
  /** Show the time picker alongside the date picker */
  showTime?: boolean;
  /** Use 12-hour clock (AM/PM). Default: false (24-hour) */
  use12Hours?: boolean;
  /** Minute interval for the time dropdown. Default: 15 */
  timeIntervals?: number;
}

const formatLabelMap: Record<DateFormatType, string> = {
  "yyyy-dd-MM": "YYYY-DD-MM",
  "dd-MM-yyyy": "DD-MM-YYYY",
  "MM-dd-yyyy": "MM-DD-YYYY",
  "yyyy-MM-dd": "YYYY-MM-DD",
  "yyyy-dd-MM HH:mm": "YYYY-DD-MM HH:MM",
  "dd-MM-yyyy HH:mm": "DD-MM-YYYY HH:MM",
  "MM-dd-yyyy HH:mm": "MM-DD-YYYY HH:MM",
  "yyyy-MM-dd HH:mm": "YYYY-MM-DD HH:MM",
  "yyyy-dd-MM hh:mm aa": "YYYY-DD-MM hh:MM AM/PM",
  "dd-MM-yyyy hh:mm aa": "DD-MM-YYYY hh:MM AM/PM",
  "MM-dd-yyyy hh:mm aa": "MM-DD-YYYY hh:MM AM/PM",
  "yyyy-MM-dd hh:mm aa": "YYYY-MM-DD hh:MM AM/PM",
};

const GlobalDateTimeInput: React.FC<GlobalDatePickerProps> = ({
  label = "Select Date",
  value,
  onChange,
  format = "yyyy-MM-dd",
  placeholder,
  id,
  name,
  required = false,
  disabled = false,
  error,
  className = "",
  minDate,
  maxDate,
  hideLabel = false,
  showFormatInLabel = true,
  showErrorMessage = true,
  labelClassName = "mb-2 block text-sm font-medium text-gray-700",
  inputClassName,
  buttonClassName = "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black",
  showTime = false,
  use12Hours = false,
  timeIntervals = 15,
}) => {
  const dateRef = useRef<DatePicker>(null);

  /* Auto-resolve format when showTime is true but a date-only format is given */
  const resolvedFormat: DateFormatType = (() => {
    if (!showTime) return format;
    if (format.includes(":")) return format; // already has time part
    const timeToken = use12Hours ? "hh:mm aa" : "HH:mm";
    return `${format} ${timeToken}` as DateFormatType;
  })();

  const resolvedInputClassName =
    inputClassName ||
    `w-full rounded-lg border px-4 py-3 pr-12 outline-none transition ${
      error
        ? "border-red-500 focus:border-red-500"
        : "border-gray-300 focus:border-black"
    } ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`;

  const labelText = formatLabelMap[resolvedFormat] ?? resolvedFormat.toUpperCase();

  return (
    <div className={`w-full ${className}`}>
      {!hideLabel && (
        <label htmlFor={id} className={labelClassName}>
          {label}
          {showFormatInLabel ? ` (${labelText})` : ""}
        </label>
      )}

      <div className="relative w-full">
        <DatePicker
          ref={dateRef}
          id={id}
          name={name}
          selected={value}
          onChange={onChange}
          dateFormat={resolvedFormat}
          placeholderText={placeholder || labelText}
          disabled={disabled}
          required={required}
          minDate={minDate}
          maxDate={maxDate}
          /* ── Time props ── */
          showTimeSelect={showTime}
          timeFormat={use12Hours ? "hh:mm aa" : "HH:mm"}
          timeIntervals={timeIntervals}
          timeCaption="Time"
          /* ── Layout ── */
          popperPlacement="bottom-start"
          className={resolvedInputClassName}
          wrapperClassName="w-full"
          showPopperArrow={false}
        />

        <button
          type="button"
          onClick={() => dateRef.current?.setFocus()}
          className={buttonClassName}
        >
          <CalendarRangeIcon size={20} />
        </button>
      </div>

      {showErrorMessage && error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default GlobalDateTimeInput;
