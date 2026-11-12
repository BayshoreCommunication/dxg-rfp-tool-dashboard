"use client";

// One field for a range of calendar dates. Sourced from Untitled UI React (CLI:
// `untitledui add date-range-picker`, files date-range-picker.tsx, range-calendar.tsx and
// cell.tsx), cut down to what this app uses and restyled to its own tokens: the Untitled UI
// theme classes (bg-primary, text-secondary, bg-brand-solid) mean other colours here, so every
// class below is this app's slate / sky palette, which the dark theme in app/globals.css
// already remaps. Left out: the preset list, the typed date inputs, the Apply / Cancel footer
// (a finished range applies at once) and the Untitled UI Button, icons and animation plugin.
// Behaviour (keyboard grid navigation, focus handling, Escape, aria) is react-aria-components.

import { type CalendarDate, getLocalTimeZone, isToday, parseDate } from "@internationalized/date";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useContext, useId, useSyncExternalStore } from "react";
import {
  Button as AriaButton,
  CalendarCell as AriaCalendarCell,
  CalendarGrid as AriaCalendarGrid,
  CalendarGridBody as AriaCalendarGridBody,
  CalendarGridHeader as AriaCalendarGridHeader,
  CalendarHeaderCell as AriaCalendarHeaderCell,
  DateRangePicker as AriaDateRangePicker,
  Dialog as AriaDialog,
  Group as AriaGroup,
  Label as AriaLabel,
  Popover as AriaPopover,
  RangeCalendar as AriaRangeCalendar,
  RangeCalendarStateContext,
} from "react-aria-components";

// Calendar dates as written (YYYY-MM-DD): no time, no zone.
export type DateRange = { from: string; to: string };

export type DateRangePickerProps = {
  label: string;
  value: DateRange | null;
  // Called with a finished range, or null when the range is cleared.
  onChange: (range: DateRange | null) => void;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  // Whether "Clear dates" is offered. Defaults to having a range; set it when the placeholder
  // stands for a filter of its own (one end of a range).
  canClear?: boolean;
  // A sentence under the field saying what the range is matched against.
  description?: string;
  className?: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-11-11" -> "Nov 11, 2026"
export const formatRangeDay = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  return match && month ? `${month} ${Number(match[3])}, ${match[1]}` : value;
};

export const formatRange = (range: DateRange): string =>
  range.from === range.to ? formatRangeDay(range.from) : `${formatRangeDay(range.from)} – ${formatRangeDay(range.to)}`;

const toCalendarDate = (value: string): CalendarDate | null => {
  try {
    return parseDate(value);
  } catch {
    return null;
  }
};

const DESKTOP_QUERY = "(min-width: 768px)";

// Two months side by side from tablet width up, one below it. The server renders one month.
const useIsDesktop = () => {
  const subscribe = useCallback((onChange: () => void) => {
    if (typeof window.matchMedia !== "function") return () => {};
    const query = window.matchMedia(DESKTOP_QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => (typeof window.matchMedia === "function" ? window.matchMedia(DESKTOP_QUERY).matches : false),
    () => false,
  );
};

const focusRing = "outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-sky-500 data-[focus-visible]:ring-offset-2";
const navButtonClass = `inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 data-[disabled]:opacity-40 ${focusRing}`;

const MonthTitle = ({ offset }: { offset: number }) => {
  const state = useContext(RangeCalendarStateContext);
  if (!state) return null;
  const month = state.visibleRange.start.add({ months: offset });
  return (
    <p aria-hidden="true" className="text-sm font-semibold text-slate-900">
      {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(month.year, month.month - 1, 1)))}
    </p>
  );
};

const DayCell = ({ date }: { date: CalendarDate }) => (
  <AriaCalendarCell
    date={date}
    className={({ isSelected, isSelectionStart, isSelectionEnd, isOutsideMonth, isDisabled }) =>
      [
        "relative h-10 w-10 outline-none",
        isOutsideMonth ? "hidden" : "",
        isDisabled ? "pointer-events-none" : "cursor-pointer",
        // The band behind a selected range, rounded at its two ends.
        isSelected ? "bg-sky-50" : "",
        isSelectionStart ? "rounded-l-full" : "",
        isSelectionEnd ? "rounded-r-full" : "",
      ].join(" ")
    }
  >
    {({ formattedDate, isSelected, isSelectionStart, isSelectionEnd, isFocusVisible, isDisabled, isHovered }) => {
      const edge = isSelectionStart || isSelectionEnd;
      return (
        <span
          className={[
            "flex h-full w-full items-center justify-center rounded-full text-sm",
            edge ? "bg-sky-700 font-semibold text-white" : isSelected ? "font-semibold text-sky-900" : "text-slate-700",
            !edge && isHovered ? "bg-slate-100" : "",
            isDisabled ? "opacity-40" : "",
            !isSelected && isToday(date, getLocalTimeZone()) ? "font-bold text-sky-800 underline underline-offset-4" : "",
            isFocusVisible ? "ring-2 ring-sky-500 ring-offset-2" : "",
          ].join(" ")}
        >
          {formattedDate}
        </span>
      );
    }}
  </AriaCalendarCell>
);

const MonthGrid = ({ offset }: { offset: number }) => (
  <AriaCalendarGrid weekdayStyle="short" offset={{ months: offset }} className="w-max border-separate border-spacing-y-1">
    <AriaCalendarGridHeader>
      {(day) => (
        <AriaCalendarHeaderCell className="h-8 w-10 p-0 text-center text-xs font-semibold text-slate-500">{day.slice(0, 2)}</AriaCalendarHeaderCell>
      )}
    </AriaCalendarGridHeader>
    <AriaCalendarGridBody className="[&_td]:p-0">{(date) => <DayCell date={date} />}</AriaCalendarGridBody>
  </AriaCalendarGrid>
);

export default function DateRangePicker({
  label, value, onChange, onOpenChange, placeholder = "Any dates", canClear, description, className = "",
}: DateRangePickerProps) {
  const id = useId();
  const isDesktop = useIsDesktop();
  const start = value ? toCalendarDate(value.from) : null;
  const end = value ? toCalendarDate(value.to) : null;
  const selected = start && end ? { start, end } : null;
  const months = isDesktop ? 2 : 1;

  return (
    <AriaDateRangePicker
      value={selected}
      onChange={(range) => onChange(range ? { from: range.start.toString(), to: range.end.toString() } : null)}
      onOpenChange={onOpenChange}
      className={`flex flex-col ${className}`.trim()}
    >
      <AriaLabel id={`${id}-label`} className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</AriaLabel>
      <AriaGroup className="flex">
        <AriaButton
          // Named by the label and the value it shows ("Event dates Nov 11, 2026 – Nov 14, 2026").
          aria-labelledby={`${id}-label ${id}-value`}
          aria-describedby={description ? `${id}-description` : undefined}
          className={`flex h-10 w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-left text-sm hover:border-slate-300 ${focusRing}`}
        >
          <CalendarIcon size={15} aria-hidden="true" className="shrink-0 text-slate-500" />
          <span id={`${id}-value`} className={`min-w-0 truncate ${value ? "text-slate-900" : "text-slate-500"}`}>{value ? formatRange(value) : placeholder}</span>
        </AriaButton>
      </AriaGroup>
      {description && <p id={`${id}-description`} className="mt-1 text-xs text-slate-500">{description}</p>}
      <AriaPopover placement="bottom end" offset={8} className="z-50 max-w-[calc(100vw-1rem)] outline-none">
        <AriaDialog aria-label={label} className="rounded-2xl border border-slate-200 bg-white shadow-xl outline-none">
          {({ close }) => (
            <>
              <AriaRangeCalendar visibleDuration={{ months }} className="p-4">
                <header className="mb-2 flex items-center justify-between gap-2">
                  <AriaButton slot="previous" aria-label="Previous month" className={navButtonClass}>
                    <ChevronLeft size={16} aria-hidden="true" />
                  </AriaButton>
                  <div className="flex flex-1 items-center justify-around">
                    <MonthTitle offset={0} />
                    {months > 1 && <MonthTitle offset={1} />}
                  </div>
                  <AriaButton slot="next" aria-label="Next month" className={navButtonClass}>
                    <ChevronRight size={16} aria-hidden="true" />
                  </AriaButton>
                </header>
                <div className="flex gap-6">
                  <MonthGrid offset={0} />
                  {months > 1 && <MonthGrid offset={1} />}
                </div>
              </AriaRangeCalendar>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500">Pick the first day, then the last.</p>
                <AriaButton
                  isDisabled={!(canClear ?? Boolean(value))}
                  onPress={() => {
                    onChange(null);
                    close();
                  }}
                  className={`inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 data-[disabled]:opacity-50 ${focusRing}`}
                >
                  Clear dates
                </AriaButton>
              </div>
            </>
          )}
        </AriaDialog>
      </AriaPopover>
    </AriaDateRangePicker>
  );
}
