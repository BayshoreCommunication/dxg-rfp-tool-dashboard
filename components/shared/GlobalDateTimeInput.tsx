"use client";

import { CalendarRangeIcon, X } from "lucide-react";
import React, { useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { APP_DATE_FORMAT, APP_DATE_FORMAT_LABEL, APP_DATE_TIME_FORMAT, APP_DATE_TIME_FORMAT_LABEL, APP_TIME_FORMAT } from "@/lib/dateFormat";
import { datePickerPopperModifiers, useDatePickerYearNavigation } from "./DatePickerHeader";

type DateFormatType =
  | "yyyy-dd-MM"
  | "dd-MM-yyyy"
  | "MM-dd-yyyy"
  | "yyyy-MM-dd"
  | "MM/dd/yyyy"
  | "dd/MM/yyyy"
  | "yyyy-dd-MM HH:mm"
  | "dd-MM-yyyy HH:mm"
  | "MM-dd-yyyy HH:mm"
  | "yyyy-MM-dd HH:mm"
  | "MM/dd/yyyy HH:mm"
  | "dd/MM/yyyy HH:mm"
  | "yyyy-dd-MM hh:mm aa"
  | "dd-MM-yyyy hh:mm aa"
  | "MM-dd-yyyy hh:mm aa"
  | "yyyy-MM-dd hh:mm aa"
  | "MM/dd/yyyy hh:mm aa"
  | "dd/MM/yyyy hh:mm aa";

interface GlobalDatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  /** @deprecated Every date field uses the app-wide format; ignored. */
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
  /** @deprecated Times always use the 12-hour app-wide format; ignored. */
  use12Hours?: boolean;
  /** Minute interval for the time dropdown. Default: 15 */
  timeIntervals?: number;
  /** Show an × button to clear the selected value. Default: true */
  clearable?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
  /** Show a Today shortcut when today is inside the allowed date window. */
  showTodayShortcut?: boolean;
  /** @deprecated Every date field uses the app-wide format; ignored. */
  localeAware?: boolean;
}


const GlobalDateTimeInput: React.FC<GlobalDatePickerProps> = ({
  label = "Select Date",
  value,
  onChange,
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
  buttonClassName = "absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-[#eafafd] text-[#1DBFD3] transition hover:bg-[#d8f6fa] hover:text-[#109aaf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBFD3]/35",
  showTime = false,
  timeIntervals = 15,
  clearable = true,
  ariaInvalid = false,
  ariaDescribedBy,
  ariaLabelledBy,
  showTodayShortcut = false,
}) => {
  const dateRef = useRef<DatePicker>(null);
  const yearNavigation = useDatePickerYearNavigation({ minDate, maxDate });

  // One format everywhere: date-only or date + 12-hour time, never a
  // per-field or per-locale variant.
  const resolvedFormat: DateFormatType = showTime ? APP_DATE_TIME_FORMAT : APP_DATE_FORMAT;
  const labelText = showTime ? APP_DATE_TIME_FORMAT_LABEL : APP_DATE_FORMAT_LABEL;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayIsSelectable =
    (!minDate || today >= minDate) && (!maxDate || today <= maxDate);

  const resolvedInputClassName =
    inputClassName ||
    `w-full rounded-lg border px-4 py-3 pr-12 outline-none transition ${
      error
        ? "border-red-500 focus:border-red-500"
        : "border-gray-300 hover:border-[#9adfe8] focus:border-[#1DBFD3] focus:ring-4 focus:ring-[#1DBFD3]/15"
    } ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`;


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
          openToDate={value || minDate || undefined}
          todayButton={showTodayShortcut && todayIsSelectable ? "Today" : undefined}
                    /* ── Time props ── */
          showTimeSelect={showTime}
          timeFormat={APP_TIME_FORMAT}
          timeIntervals={timeIntervals}
          timeCaption="Time"
          /* ── Layout ── */
          popperPlacement="bottom-start"
          popperProps={{ strategy: "fixed" }}
          popperModifiers={datePickerPopperModifiers}
          className={resolvedInputClassName}
          wrapperClassName="w-full"
          popperClassName="dxg-datepicker-popper"
          showPopperArrow={false}
          calendarClassName={`dxg-datepicker${showTime ? " dxg-datepicker--with-time" : ""}${yearNavigation.yearViewClassName}`}
          renderCustomHeader={yearNavigation.renderCustomHeader}
          onCalendarClose={yearNavigation.onCalendarClose}
          ariaInvalid={ariaInvalid ? "true" : undefined}
          ariaDescribedBy={ariaDescribedBy}
          ariaLabelledBy={ariaLabelledBy}
        />

        <button
          type="button"
          aria-label={`Open ${label || "date and time"} calendar`}
          onClick={() => dateRef.current?.setFocus()}
          disabled={disabled}
          className={buttonClassName}
        >
          <CalendarRangeIcon size={20} />
        </button>

        {clearable && value && !disabled && (
          <button
            type="button"
            aria-label={`Clear ${label || "date and time"}`}
            onMouseDown={(e) => {
              // Keep focus (and the calendar popper) from engaging on the
              // input while the user is clearing it.
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="absolute right-10 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 transition hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showErrorMessage && error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default GlobalDateTimeInput;
