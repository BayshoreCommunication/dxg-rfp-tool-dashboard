import { render, screen } from "@testing-library/react";
import GlobalTimeInput from "./GlobalTimeInput";

jest.mock("react-datepicker", () => ({
  __esModule: true,
  default: ({ minTime, maxTime, ariaInvalid, ariaDescribedBy, placeholderText }: {
    minTime?: Date;
    maxTime?: Date;
    ariaInvalid?: "true";
    ariaDescribedBy?: string;
    placeholderText?: string;
  }) => (
    <input
      data-testid="time-picker"
      data-min-time={minTime ? `${String(minTime.getHours()).padStart(2, "0")}:${String(minTime.getMinutes()).padStart(2, "0")}` : undefined}
      data-max-time={maxTime ? `${String(maxTime.getHours()).padStart(2, "0")}:${String(maxTime.getMinutes()).padStart(2, "0")}` : undefined}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      placeholder={placeholderText}
    />
  ),
}));

describe("GlobalTimeInput", () => {
  it("supplies the required matching minimum when only a maximum is configured", () => {
    render(
      <GlobalTimeInput
        id="start-time"
        label="Start time"
        value="09:00"
        onChange={jest.fn()}
        maxTime="23:30"
      />,
    );

    expect(screen.getByTestId("time-picker")).toHaveAttribute("data-min-time", "00:00");
    expect(screen.getByTestId("time-picker")).toHaveAttribute("data-max-time", "23:30");
  });

  it("announces an inline error only when one is present", () => {
    const { rerender } = render(
      <GlobalTimeInput
        id="end-time"
        label="End time"
        value=""
        onChange={jest.fn()}
        ariaDescribedBy="end-time-error"
      />,
    );

    expect(screen.getByTestId("time-picker")).not.toHaveAttribute("aria-describedby");

    rerender(
      <GlobalTimeInput
        id="end-time"
        label="End time"
        value=""
        onChange={jest.fn()}
        error="End time is required."
        ariaDescribedBy="end-time-error"
      />,
    );

    expect(screen.getByTestId("time-picker")).toHaveAttribute("aria-describedby", "end-time-error");
    expect(screen.getByText("End time is required.")).toHaveAttribute("id", "end-time-error");
  });

  it("can hide its duplicate label and inline error in composed forms", () => {
    render(
      <GlobalTimeInput
        id="guided-time"
        label="Time"
        value="15:00"
        onChange={jest.fn()}
        hideLabel
        showErrorMessage={false}
        error="Choose a valid time."
        ariaInvalid
        ariaDescribedBy="guided-time-error"
      />,
    );

    expect(screen.queryByText("Time")).not.toBeInTheDocument();
    expect(screen.queryByText("Choose a valid time.")).not.toBeInTheDocument();
    expect(screen.getByTestId("time-picker")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("time-picker")).toHaveAttribute("aria-describedby", "guided-time-error");
    expect(screen.getByTestId("time-picker")).toHaveAttribute("placeholder", "Select time");
  });
});
