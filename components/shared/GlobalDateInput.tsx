"use client";

import { CalendarRangeIcon } from "lucide-react";
import React, { useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { APP_DATE_FORMAT, APP_DATE_FORMAT_LABEL } from "@/lib/dateFormat";
import { datePickerPopperModifiers, useDatePickerYearNavigation } from "./DatePickerHeader";

type DateFormatType =
  | "yyyy-dd-MM"
  | "dd-MM-yyyy"
  | "MM-dd-yyyy"
  | "yyyy-MM-dd"
  | "MM/dd/yyyy"
  | "dd/MM/yyyy";

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
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  /** Show a Today shortcut when today is inside the allowed date window. */
  showTodayShortcut?: boolean;
  /** @deprecated Every date field uses the app-wide format; ignored. */
  localeAware?: boolean;
}

const GlobalDateInput: React.FC<GlobalDatePickerProps> = ({
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
  ariaInvalid = false,
  ariaDescribedBy,
  showTodayShortcut = false,
}) => {
  const dateRef = useRef<DatePicker>(null);
  const yearNavigation = useDatePickerYearNavigation({ minDate, maxDate });
  // One format everywhere: callers cannot opt into another shape, so a date
  // reads the same in every step, list, and panel.
  const resolvedFormat = APP_DATE_FORMAT;
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
          {showFormatInLabel ? ` (${APP_DATE_FORMAT_LABEL})` : ""}
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
          placeholderText={placeholder || APP_DATE_FORMAT_LABEL}
          disabled={disabled}
          required={required}
          minDate={minDate}
          maxDate={maxDate}
          openToDate={value || minDate || undefined}
          todayButton={showTodayShortcut && todayIsSelectable ? "Today" : undefined}
                    popperPlacement="bottom-start"
          popperProps={{ strategy: "fixed" }}
          popperModifiers={datePickerPopperModifiers}
          className={resolvedInputClassName}
          wrapperClassName="w-full"
          popperClassName="dxg-datepicker-popper"
          showPopperArrow={false}
          calendarClassName={`dxg-datepicker${yearNavigation.yearViewClassName}`}
          renderCustomHeader={yearNavigation.renderCustomHeader}
          onCalendarClose={yearNavigation.onCalendarClose}
          ariaInvalid={ariaInvalid ? "true" : undefined}
          ariaDescribedBy={ariaDescribedBy}
        />

        <button
          type="button"
          aria-label={`Open ${label || "date"} calendar`}
          onClick={() => dateRef.current?.setFocus()}
          disabled={disabled}
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

export default GlobalDateInput;
