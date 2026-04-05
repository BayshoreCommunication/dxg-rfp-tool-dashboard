"use client";

import { CalendarRangeIcon } from "lucide-react";
import React, { useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type DateFormatType = "yyyy-dd-MM" | "dd-MM-yyyy" | "MM-dd-yyyy" | "yyyy-MM-dd";

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
}

const formatLabelMap: Record<DateFormatType, string> = {
  "yyyy-dd-MM": "YYYY-DD-MM",
  "dd-MM-yyyy": "DD-MM-YYYY",
  "MM-dd-yyyy": "MM-DD-YYYY",
  "yyyy-MM-dd": "YYYY-MM-DD",
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
  buttonClassName = "absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black",
}) => {
  const dateRef = useRef<DatePicker>(null);

  const resolvedInputClassName =
    inputClassName ||
    `w-full rounded-lg border px-4 py-3 pr-12 outline-none transition ${
      error
        ? "border-red-500 focus:border-red-500"
        : "border-gray-300 focus:border-black"
    } ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`;

  return (
    <div className={`w-full ${className}`}>
      {!hideLabel && (
        <label htmlFor={id} className={labelClassName}>
          {label}
          {showFormatInLabel ? ` (${formatLabelMap[format]})` : ""}
        </label>
      )}

      <div className="relative w-full">
        <DatePicker
          ref={dateRef}
          id={id}
          name={name}
          selected={value}
          onChange={onChange}
          dateFormat={format}
          placeholderText={placeholder || formatLabelMap[format]}
          disabled={disabled}
          required={required}
          minDate={minDate}
          maxDate={maxDate}
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

export default GlobalDateInput;
