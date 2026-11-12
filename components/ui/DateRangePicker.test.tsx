import { fireEvent, render, screen, within } from "@testing-library/react";
import DateRangePicker, { formatRange, formatRangeDay } from "./DateRangePicker";

describe("DateRangePicker", () => {
  test("dates read as Nov 11, 2026; a one-day range is that day", () => {
    expect(formatRangeDay("2026-11-11")).toBe("Nov 11, 2026");
    expect(formatRangeDay("2027-01-05")).toBe("Jan 5, 2027");
    expect(formatRangeDay("soon")).toBe("soon");
    expect(formatRange({ from: "2026-11-11", to: "2026-11-14" })).toBe("Nov 11, 2026 – Nov 14, 2026");
    expect(formatRange({ from: "2026-11-11", to: "2026-11-11" })).toBe("Nov 11, 2026");
  });

  test("one labelled field shows the range, or the placeholder when there is none", () => {
    const { rerender } = render(<DateRangePicker label="Event dates" value={null} onChange={jest.fn()} description="Events that start in this range." />);
    const field = screen.getByRole("button", { name: /Event dates/ });
    expect(field).toHaveTextContent("Any dates");
    expect(screen.getByText("Events that start in this range.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(<DateRangePicker label="Event dates" value={{ from: "2026-11-11", to: "2026-11-14" }} onChange={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Event dates/ })).toHaveTextContent("Nov 11, 2026 – Nov 14, 2026");
  });

  test("opens a calendar on the selected range; picking two days reports the range, Clear reports none", () => {
    const onChange = jest.fn();
    const onOpenChange = jest.fn();
    render(<DateRangePicker label="Event dates" value={{ from: "2026-11-11", to: "2026-11-14" }} onChange={onChange} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Event dates/ }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    const calendar = within(screen.getByRole("dialog", { name: "Event dates" }));
    expect(calendar.getByText("November 2026")).toBeInTheDocument();
    expect(calendar.getByRole("button", { name: "Previous month" })).toBeInTheDocument();
    expect(calendar.getByRole("button", { name: "Next month" })).toBeInTheDocument();
    expect(calendar.getByRole("button", { name: /Wednesday, November 11, 2026/ })).toBeInTheDocument();

    fireEvent.click(calendar.getByRole("button", { name: /Monday, November 16, 2026/ }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(calendar.getByRole("button", { name: /Friday, November 20, 2026/ }));
    expect(onChange).toHaveBeenCalledWith({ from: "2026-11-16", to: "2026-11-20" });
  });

  test("Clear dates reports no range and is off when there is none", () => {
    const onChange = jest.fn();
    const { unmount } = render(<DateRangePicker label="Event dates" value={{ from: "2026-11-11", to: "2026-11-14" }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Event dates/ }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Event dates" })).getByRole("button", { name: "Clear dates" }));
    expect(onChange).toHaveBeenCalledWith(null);
    unmount();

    render(<DateRangePicker label="Event dates" value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Event dates/ }));
    expect(within(screen.getByRole("dialog", { name: "Event dates" })).getByRole("button", { name: "Clear dates" })).toBeDisabled();
  });
});
