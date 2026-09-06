"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { ReactDatePickerCustomHeaderProps } from "react-datepicker";
import { shift } from "@floating-ui/react";

// Reuse react-datepicker's existing Floating UI dependency. Allow the popup to
// escape scrollable modals and keep it above the mobile bottom navigation.
export const datePickerPopperModifiers = [shift(({ elements }) => ({
  boundary: [],
  rootBoundary: "viewport",
  crossAxis: true,
  padding: (elements.floating.ownerDocument.defaultView?.innerWidth ?? 1024) < 768
    ? { top: 72, bottom: 88, left: 8, right: 8 }
    : 8,
}))];

type DateBounds = { minDate?: Date; maxDate?: Date };

/** Browsing defaults, not validation limits: include dates outside this window too. */
export function getPickerYearRange(year: number, { minDate, maxDate }: DateBounds) {
  const firstYear = minDate?.getFullYear() ?? Math.min(1900, year, maxDate?.getFullYear() ?? year);
  const lastYear = maxDate?.getFullYear() ?? Math.max(2100, year, firstYear);
  return { firstYear, lastYear };
}

function YearList({
  id, year, firstYear, lastYear, onSelect, onCancel,
}: {
  id: string;
  year: number;
  firstYear: number;
  lastYear: number;
  onSelect: (year: number) => void;
  onCancel: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [focusedYear, setFocusedYear] = useState(Math.max(firstYear, Math.min(lastYear, year)));

  useEffect(() => {
    const list = listRef.current;
    const option = list?.querySelector<HTMLButtonElement>('[tabindex="0"]');
    if (list && option) {
      option.focus({ preventScroll: true });
      // Scroll only this list, never the surrounding form or modal.
      list.scrollTop = option.offsetTop - (list.clientHeight - option.clientHeight) / 2;
    }
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }
    const nextYear = {
      ArrowLeft: focusedYear - 1,
      ArrowRight: focusedYear + 1,
      ArrowUp: focusedYear - 4,
      ArrowDown: focusedYear + 4,
      PageUp: focusedYear - 20,
      PageDown: focusedYear + 20,
      Home: firstYear,
      End: lastYear,
    }[event.key];
    if (nextYear === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const boundedYear = Math.max(firstYear, Math.min(lastYear, nextYear));
    setFocusedYear(boundedYear);
    listRef.current?.querySelector<HTMLButtonElement>(`[data-year="${boundedYear}"]`)?.focus();
  };

  return (
    <div id={id} ref={listRef} className="dxg-datepicker__years" role="group" aria-label="Choose a year" onKeyDown={handleKeyDown}>
      {Array.from({ length: Math.max(0, lastYear - firstYear + 1) }, (_, index) => firstYear + index).map((option) => (
        <button
          key={option}
          type="button"
          data-year={option}
          aria-label={`Choose year ${option}`}
          aria-pressed={option === year}
          tabIndex={option === focusedYear ? 0 : -1}
          className="dxg-datepicker__year-option"
          onFocus={() => setFocusedYear(option)}
          onClick={() => onSelect(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function DatePickerHeader({
  date, changeYear, changeMonth, decreaseMonth, increaseMonth,
  prevMonthButtonDisabled, nextMonthButtonDisabled,
  minDate, maxDate, choosingYear, onViewChange,
}: ReactDatePickerCustomHeaderProps & DateBounds & {
  choosingYear: boolean;
  onViewChange: (open: boolean) => void;
}) {
  const titleRef = useRef<HTMLButtonElement>(null);
  const yearListId = useId();
  const year = date.getFullYear();
  const monthTitle = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
  const { firstYear, lastYear } = getPickerYearRange(year, { minDate, maxDate });
  const returnToDays = () => {
    onViewChange(false);
    titleRef.current?.focus({ preventScroll: true });
  };
  const selectYear = (nextYear: number) => {
    changeYear(nextYear);
    // A boundary year may allow only some months. Start at an allowed month.
    const firstMonth = minDate?.getFullYear() === nextYear ? minDate.getMonth() : 0;
    const lastMonth = maxDate?.getFullYear() === nextYear ? maxDate.getMonth() : 11;
    const nextMonth = Math.max(firstMonth, Math.min(lastMonth, date.getMonth()));
    // Always restore the intended month: setYear on February 29 can roll into March.
    changeMonth(nextMonth);
    // Year navigation does not commit a form value; the user still chooses a day.
    returnToDays();
  };

  return (
    <>
      <div className="dxg-datepicker__toolbar">
        <button
          ref={titleRef}
          type="button"
          className="dxg-datepicker__view-toggle"
          aria-label={`${monthTitle}, ${choosingYear ? "return to calendar" : "choose year"}`}
          aria-expanded={choosingYear}
          aria-controls={choosingYear ? yearListId : undefined}
          onClick={() => onViewChange(!choosingYear)}
        >
          {monthTitle}
          {choosingYear ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
        {!choosingYear && (
          <div className="dxg-datepicker__month-navigation">
            <button type="button" aria-label="Previous month" className="dxg-datepicker__month-arrow" disabled={prevMonthButtonDisabled} onClick={decreaseMonth}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Next month" className="dxg-datepicker__month-arrow" disabled={nextMonthButtonDisabled} onClick={increaseMonth}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {choosingYear && (
        <YearList id={yearListId} year={year} firstYear={firstYear} lastYear={lastYear} onSelect={selectYear} onCancel={returnToDays} />
      )}
    </>
  );
}

/** Both date-only and date/time fields share the same year navigation. */
export function useDatePickerYearNavigation(bounds: DateBounds) {
  const [choosingYear, setChoosingYear] = useState(false);
  return {
    yearViewClassName: choosingYear ? " dxg-datepicker--choosing-year" : "",
    onCalendarClose: () => setChoosingYear(false),
    renderCustomHeader: (props: ReactDatePickerCustomHeaderProps) => (
      <DatePickerHeader {...props} {...bounds} choosingYear={choosingYear} onViewChange={setChoosingYear} />
    ),
  };
}
