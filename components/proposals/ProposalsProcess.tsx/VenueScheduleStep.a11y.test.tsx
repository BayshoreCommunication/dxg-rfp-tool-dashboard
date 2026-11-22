import { render, screen } from "@testing-library/react";

import { buttonsInsideLabels, danglingReferences, duplicateIds } from "./a11yHelpers";
import VenueScheduleStep, { defaultVenueSchedule } from "./VenueScheduleStep";

const settings = { branding: { linkPrefix: "", defaultFont: "Inter" }, proposals: { dateFormat: "MM/DD/YYYY" } } as never;

const renderStep = (props: { mode?: "basic" | "advanced"; showErrors?: boolean; isUnionVenue?: string } = {}) =>
  render(
    <VenueScheduleStep
      data={{ ...defaultVenueSchedule(), ...(props.isUnionVenue ? { isUnionVenue: props.isUnionVenue as never } : {}) }}
      onChange={jest.fn()}
      onContinue={jest.fn()}
      onBack={jest.fn()}
      showErrors={props.showErrors ?? false}
      proposalSettings={settings}
      eventStartDate="2026-08-09"
      eventEndDate="2026-08-10"
      mode={props.mode ?? "advanced"}
    />,
  );

describe("VenueScheduleStep accessibility wiring", () => {
  test("every text control and select is reachable by its visible label", () => {
    renderStep();
    for (const name of [/^Venue Name/, /^City/, /^Venue Address/]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
    // State and Time Zone keep their original aria-label names ("Venue state", "Venue time zone").
    for (const name of [/Venue state/i, /^Venue Type/, /^Venue Confirmed Status/, /Venue time zone/i]) {
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
    }
  });

  test("date-and-time fields and the union choice have accessible names", () => {
    renderStep({ isUnionVenue: "YES" });
    for (const name of [/Show Start Date/, /Show End Date/, /Strike Date/]) {
      expect(screen.getAllByLabelText(name).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("group", { name: /Union, Teamster, or In-House Labor/ })).toBeInTheDocument();
  });

  test.each([
    ["advanced", false],
    ["advanced", true],
    ["basic", true],
  ] as const)("no dangling references, duplicate ids or buttons inside labels (%s, errors=%s)", (mode, showErrors) => {
    renderStep({ mode, showErrors });
    expect(danglingReferences()).toEqual([]);
    expect(duplicateIds()).toEqual([]);
    expect(buttonsInsideLabels()).toBe(0);
  });

  test("validation errors are announced", () => {
    renderStep({ showErrors: true });
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });
});
