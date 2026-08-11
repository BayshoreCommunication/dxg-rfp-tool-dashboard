"use client";

import { CalendarRangeIcon } from "lucide-react";
import React, { useRef, useSyncExternalStore } from "react";
import DatePicker from "react-datepicker";
import type { Day } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";

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
  /** Match numeric field order and the first weekday to the browser locale. */
  localeAware?: boolean;
}

const formatLabelMap: Record<DateFormatType, string> = {
  "yyyy-dd-MM": "YYYY-DD-MM",
  "dd-MM-yyyy": "DD-MM-YYYY",
  "MM-dd-yyyy": "MM-DD-YYYY",
  "yyyy-MM-dd": "YYYY-MM-DD",
  "MM/dd/yyyy": "MM/DD/YYYY",
  "dd/MM/yyyy": "DD/MM/YYYY",
};

const subscribeToBrowserLocale = () => () => undefined;
const browserLocaleSnapshot = () => navigator.language || "en-US";
const serverLocaleSnapshot = () => "en-US";

const localePresentationFor = (localeName: string): {
  format: DateFormatType;
  calendarStartDay: Day;
} => {
  const parts = new Intl.DateTimeFormat(localeName, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(2006, 10, 22));
  const orderedFields = parts
    .filter((part) => part.type === "year" || part.type === "month" || part.type === "day")
    .map((part) => part.type);
  const format: DateFormatType = orderedFields[0] === "year"
    ? "yyyy-MM-dd"
    : orderedFields[0] === "day"
      ? "dd/MM/yyyy"
      : "MM/dd/yyyy";
  const locale = new Intl.Locale(localeName) as Intl.Locale & {
    weekInfo?: { firstDay: number };
    getWeekInfo?: () => { firstDay: number };
  };
  const firstDay = locale.weekInfo?.firstDay ?? locale.getWeekInfo?.().firstDay ?? 7;
  return { format, calendarStartDay: (firstDay % 7) as Day };
};

const GlobalDateInput: React.FC<GlobalDatePickerProps> = ({
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
  buttonClassName = "absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-[#eafafd] text-[#1DBFD3] transition hover:bg-[#d8f6fa] hover:text-[#109aaf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1DBFD3]/35",
  ariaInvalid = false,
  ariaDescribedBy,
  showTodayShortcut = false,
  localeAware = false,
}) => {
  const dateRef = useRef<DatePicker>(null);
  const browserLocale = useSyncExternalStore(
    subscribeToBrowserLocale,
    browserLocaleSnapshot,
    serverLocaleSnapshot,
  );
  const localePresentation = localePresentationFor(browserLocale);
  const resolvedFormat = localeAware ? localePresentation.format : format;
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
          {showFormatInLabel ? ` (${formatLabelMap[resolvedFormat]})` : ""}
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
          placeholderText={placeholder || formatLabelMap[resolvedFormat]}
          disabled={disabled}
          required={required}
          minDate={minDate}
          maxDate={maxDate}
          openToDate={value || minDate || undefined}
          todayButton={showTodayShortcut && todayIsSelectable ? "Today" : undefined}
          calendarStartDay={localeAware ? localePresentation.calendarStartDay : undefined}
          popperPlacement="bottom-start"
          className={resolvedInputClassName}
          wrapperClassName="w-full"
          popperClassName="dxg-datepicker-popper"
          showPopperArrow={false}
          calendarClassName="dxg-datepicker"
          ariaInvalid={ariaInvalid ? "true" : undefined}
          ariaDescribedBy={ariaDescribedBy}
        />

        <button
          type="button"
          aria-label={`Open ${label || "date"} calendar`}
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

export default GlobalDateInput;
