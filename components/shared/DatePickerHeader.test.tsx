import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { getPickerYearRange } from "./DatePickerHeader";
import GlobalDateInput from "./GlobalDateInput";
import GlobalDateTimeInput from "./GlobalDateTimeInput";

beforeAll(() => {
  // jsdom has no layout observer; the real browser integration supplies it.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Exercise the actual react-datepicker integration, not a mocked text input.
function Picker({
  date = new Date(2027, 5, 10), minDate, maxDate, withTime = false, onChange = jest.fn(),
}: { date?: Date; minDate?: Date; maxDate?: Date; withTime?: boolean; onChange?: (date: Date | null) => void }) {
  const [value, setValue] = useState<Date | null>(date);
  const props = {
    id: "test-date", label: "Event date", value, minDate, maxDate,
    onChange: (next: Date | null) => { setValue(next); onChange(next); },
  };
  return withTime ? <GlobalDateTimeInput {...props} showTime /> : <GlobalDateInput {...props} />;
}

describe("shared date picker year navigation", () => {
  it("opens a scrollable year list focused on the current year; browsing alone never changes the form", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Picker onChange={onChange} />);
    await user.click(screen.getByLabelText("Event date (MM/DD/YYYY)"));
    await user.click(screen.getByRole("button", { name: "June 2027, choose year" }));
    expect(screen.getByRole("group", { name: "Choose a year" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose year 2027" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Choose year 2027" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Choose year 2082" }));
    expect(screen.queryByRole("group", { name: "Choose a year" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "June 2082, choose year" })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    const day = screen.getByRole("gridcell", { name: "Choose Monday, June 15th, 2082" });
    await user.click(day);
    expect(onChange).toHaveBeenLastCalledWith(new Date(2082, 5, 15));
    expect(screen.getByDisplayValue("06/15/2082")).toBeInTheDocument();
  });

  it("supports arrow/page/home/end keyboard navigation and Escape without committing a date", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Picker onChange={onChange} />);
    await user.click(screen.getByLabelText("Event date (MM/DD/YYYY)"));
    await user.click(screen.getByRole("button", { name: "June 2027, choose year" }));
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Choose year 2031" })).toHaveFocus();
    await user.keyboard("{ArrowRight}{PageDown}");
    expect(screen.getByRole("button", { name: "Choose year 2052" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("button", { name: "Choose year 1900" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("button", { name: "Choose year 2100" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "June 2027, choose year" })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("restricts the list and jumps to the first allowed month in a boundary year", async () => {
    const user = userEvent.setup();
    render(<Picker date={new Date(2027, 0, 10)} minDate={new Date(2026, 8, 10)} maxDate={new Date(2028, 3, 20)} />);
    await user.click(screen.getByLabelText("Event date (MM/DD/YYYY)"));
    await user.click(screen.getByRole("button", { name: "January 2027, choose year" }));
    expect(screen.queryByRole("button", { name: "Choose year 2025" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose year 2029" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose year 2026" }));
    expect(screen.getByRole("button", { name: "September 2026, choose year" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
    const earlyDay = screen.getAllByRole("gridcell").find((option) => option.textContent === "9" && !option.className.includes("outside-month"))!;
    expect(earlyDay).toHaveAttribute("aria-disabled", "true");
  });

  it("jumps to the last allowed month in a maximum year", async () => {
    const user = userEvent.setup();
    render(<Picker date={new Date(2027, 11, 10)} maxDate={new Date(2028, 3, 20)} />);
    await user.click(screen.getByLabelText("Event date (MM/DD/YYYY)"));
    await user.click(screen.getByRole("button", { name: "December 2027, choose year" }));
    await user.click(screen.getByRole("button", { name: "Choose year 2028" }));
    expect(screen.getByRole("button", { name: "April 2028, choose year" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  });

  it("preserves time when a year and day are chosen in a date/time field", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Picker withTime date={new Date(2028, 1, 29, 14, 30)} onChange={onChange} />);
    await user.click(screen.getByLabelText("Event date (MM/DD/YYYY hh:mm AM/PM)"));
    await user.click(screen.getByRole("button", { name: "February 2028, choose year" }));
    await user.click(screen.getByRole("button", { name: "Choose year 2029" }));
    expect(onChange).not.toHaveBeenCalled();
    const day = screen.getAllByRole("gridcell").find((option) => option.textContent === "28" && !option.className.includes("outside-month"))!;
    await user.click(day);
    expect(onChange).toHaveBeenLastCalledWith(new Date(2029, 1, 28, 14, 30));
    expect(screen.getByDisplayValue("02/28/2029 02:30 PM")).toBeInTheDocument();
  });

  it("resets to calendar view when a picker is closed and reopened", async () => {
    const user = userEvent.setup();
    render(<><Picker /><button type="button">Outside</button></>);
    await user.click(screen.getByLabelText("Event date (MM/DD/YYYY)"));
    await user.click(screen.getByRole("button", { name: "June 2027, choose year" }));
    await user.click(screen.getByRole("button", { name: "Outside" }));
    await waitFor(() => expect(screen.queryByRole("group", { name: "Choose a year" })).not.toBeInTheDocument());
    await user.click(screen.getByLabelText("Event date (MM/DD/YYYY)"));
    expect(screen.getByRole("button", { name: "June 2027, choose year" })).toHaveAttribute("aria-expanded", "false");
  });

  it("does not open a disabled date field via its calendar icon", () => {
    render(<GlobalDateInput value={null} onChange={jest.fn()} disabled />);
    const button = screen.getByRole("button", { name: "Open Select Date calendar" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(screen.queryByRole("button", { name: /choose year/ })).not.toBeInTheDocument();
  });

  it("keeps saved dates outside the default browsing window reachable", () => {
    expect(getPickerYearRange(2150, {})).toEqual({ firstYear: 1900, lastYear: 2150 });
    expect(getPickerYearRange(1880, {})).toEqual({ firstYear: 1880, lastYear: 2100 });
    expect(getPickerYearRange(2027, { minDate: new Date(2150, 0, 1) })).toEqual({ firstYear: 2150, lastYear: 2150 });
  });
});
