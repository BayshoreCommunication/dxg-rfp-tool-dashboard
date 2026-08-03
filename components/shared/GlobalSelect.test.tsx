import { fireEvent, render, screen } from "@testing-library/react";
import GlobalSelect from "./GlobalSelect";

describe("GlobalSelect", () => {
  it("opens a polished listbox and selects an option", () => {
    const onChange = jest.fn();
    render(
      <GlobalSelect value="" onChange={onChange} aria-label="Referral source">
        <option value="">Select a source</option>
        <option value="Referral">Referral</option>
        <option value="Venue">Venue</option>
      </GlobalSelect>,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Referral source" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Referral" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ value: "Referral" }) }),
    );
  });

  it("supports keyboard selection", () => {
    const onChange = jest.fn();
    render(
      <GlobalSelect value="" onChange={onChange} aria-label="Event type">
        <option value="">Select event type</option>
        <option value="Conference">Conference</option>
      </GlobalSelect>,
    );

    const trigger = screen.getByRole("combobox", { name: "Event type" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ value: "Conference" }) }),
    );
  });
});
