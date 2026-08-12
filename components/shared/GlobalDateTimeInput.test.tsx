import { render, screen } from "@testing-library/react";
import GlobalDateTimeInput from "./GlobalDateTimeInput";

jest.mock("react-datepicker", () => ({
  __esModule: true,
  default: ({
    dateFormat,
    calendarStartDay,
    minDate,
    maxDate,
    showTimeSelect,
    timeIntervals,
    todayButton,
    ariaInvalid,
    ariaDescribedBy,
    ariaLabelledBy,
    calendarClassName,
  }: {
    dateFormat?: string;
    calendarStartDay?: number;
    minDate?: Date;
    maxDate?: Date;
    showTimeSelect?: boolean;
    timeIntervals?: number;
    todayButton?: string;
    ariaInvalid?: "true";
    ariaDescribedBy?: string;
    ariaLabelledBy?: string;
    calendarClassName?: string;
  }) => (
    <input
      data-testid="date-time-picker"
      data-date-format={dateFormat}
      data-calendar-start-day={calendarStartDay}
      data-min-date={minDate?.toISOString()}
      data-max-date={maxDate?.toISOString()}
      data-show-time={showTimeSelect ? "true" : "false"}
      data-time-intervals={timeIntervals}
      data-today-button={todayButton}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      aria-labelledby={ariaLabelledBy}
      data-calendar-class={calendarClassName}
    />
  ),
}));

describe("GlobalDateTimeInput", () => {
  it("combines a locale-aware date with a 12-hour, 15-minute time picker", () => {
    render(
      <GlobalDateTimeInput
        value={null}
        onChange={jest.fn()}
        localeAware
        showTime
        use12Hours
        timeIntervals={15}
      />,
    );

    const picker = screen.getByTestId("date-time-picker");
    expect(picker).toHaveAttribute("data-date-format", "MM/dd/yyyy hh:mm aa");
    expect(picker).toHaveAttribute("data-calendar-start-day", "0");
    expect(picker).toHaveAttribute("data-show-time", "true");
    expect(picker).toHaveAttribute("data-time-intervals", "15");
    expect(picker).toHaveAttribute(
      "data-calendar-class",
      "dxg-datepicker dxg-datepicker--with-time",
    );
  });

  it("passes date bounds and accessible inline-error relationships", () => {
    const minDate = new Date(2026, 7, 3, 12);
    const maxDate = new Date(2026, 7, 10, 12);
    render(
      <GlobalDateTimeInput
        value={null}
        onChange={jest.fn()}
        minDate={minDate}
        maxDate={maxDate}
        ariaInvalid
        ariaDescribedBy="access-guidance load-in-error"
        ariaLabelledBy="load-in-label"
      />,
    );

    const picker = screen.getByTestId("date-time-picker");
    expect(picker).toHaveAttribute("data-min-date", minDate.toISOString());
    expect(picker).toHaveAttribute("data-max-date", maxDate.toISOString());
    expect(picker).toHaveAttribute("aria-invalid", "true");
    expect(picker).toHaveAttribute("aria-describedby", "access-guidance load-in-error");
    expect(picker).toHaveAttribute("aria-labelledby", "load-in-label");
  });

  it("offers Today only when today is inside the selectable window", () => {
    const today = new Date();
    const yesterday = new Date(today);
    const tomorrow = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    tomorrow.setDate(today.getDate() + 1);

    render(
      <GlobalDateTimeInput
        value={null}
        onChange={jest.fn()}
        minDate={yesterday}
        maxDate={tomorrow}
        showTodayShortcut
      />,
    );

    expect(screen.getByTestId("date-time-picker")).toHaveAttribute("data-today-button", "Today");
  });
});
