import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { EventData } from "../AddNewProposal";
import EventForm from "./EventForm";

const settings = {
  branding: { linkPrefix: "", defaultFont: "Inter" },
  proposals: { dateFormat: "MM/DD/YYYY" },
} as never;

const emptyEvent: EventData = {
  eventName: "",
  startDate: "",
  endDate: "",
  attendees: "",
  eventFormat: "In-Person",
  eventType: { eventType: "", eventTypeOther: "" },
};

const renderForm = (props: { showErrors?: boolean; data?: Partial<EventData>; mode?: "basic" | "advanced" } = {}) => {
  const onChange = jest.fn();
  render(
    <EventForm
      data={{ ...emptyEvent, ...props.data }}
      onChange={onChange}
      onContinue={jest.fn()}
      onBack={jest.fn()}
      showErrors={props.showErrors}
      proposalSettings={settings}
      mode={props.mode ?? "advanced"}
    />,
  );
  return onChange;
};

describe("EventForm accessibility wiring", () => {
  test("every text control is reachable by its visible label", async () => {
    const onChange = renderForm();
    for (const name of [
      /^Event Name/, /^Edition \/ Year/, /^Event summary \/ Narrative/, /^Event Theme \/ Tagline/,
      /^Event Website/, /^Total Attendance/, /^Sacred Constraints/, /^About The Organization/,
      /^Event Profile/, /^Proposal Timeline/, /^Statement of Work/,
    ]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
    await userEvent.type(screen.getByLabelText(/^Event Name/), "A");
    expect(onChange).toHaveBeenCalledWith({ eventName: "A" });
  });

  test("required fields are announced as required", () => {
    renderForm();
    expect(screen.getByLabelText(/^Event Name/)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/^Total Attendance/)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/^Edition \/ Year/)).not.toHaveAttribute("aria-required");
  });

  test("errors are tied to their controls and announced", () => {
    renderForm({ showErrors: true });
    const name = screen.getByLabelText(/^Event Name/);
    expect(name).toHaveAttribute("aria-invalid", "true");
    const errorId = name.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId as string)).toHaveTextContent("Event name is required.");

    const attendees = screen.getByLabelText(/^Total Attendance/);
    expect(attendees).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(attendees.getAttribute("aria-describedby") as string)).toHaveTextContent("Required.");

    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(5);
  });

  test("valid fields carry no error attributes", () => {
    renderForm({ showErrors: true, data: { eventName: "Summit", attendees: "500" } });
    for (const label of [/^Event Name/, /^Total Attendance/]) {
      expect(screen.getByLabelText(label)).not.toHaveAttribute("aria-invalid");
      expect(screen.getByLabelText(label)).not.toHaveAttribute("aria-describedby");
    }
  });

  test("date fields, the event-type select and option groups have accessible names", () => {
    renderForm({ showErrors: true, data: { eventType: { eventType: "Other", eventTypeOther: "" } } });
    expect(screen.getAllByLabelText(/Start Date/).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/End Date/).length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox", { name: /Event Type/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Specify the other event type")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /Event Format/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Primary Audience/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Tone \/ Brand Direction/ })).toBeInTheDocument();
  });

  test("basic mode still renders its fields with labels", () => {
    renderForm({ mode: "basic" });
    expect(screen.getByLabelText(/^Event Name/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Edition \/ Year/)).not.toBeInTheDocument();
  });
});
