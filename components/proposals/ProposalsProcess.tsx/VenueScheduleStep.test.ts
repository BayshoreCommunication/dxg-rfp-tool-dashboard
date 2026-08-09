import {
  defaultVenueSchedule,
  venueScheduleEventRangeErrors,
  venueScheduleEventRangeWarnings,
  venueScheduleOrderErrors,
  venueScheduleValidationErrors,
  type VenueScheduleData,
} from "./VenueScheduleStep";

const schedule = (overrides: Partial<VenueScheduleData>): VenueScheduleData => ({
  ...defaultVenueSchedule(),
  ...overrides,
});

describe("venueScheduleOrderErrors", () => {
  it("accepts a fully ordered schedule", () => {
    const data = schedule({
      loadInDate: "2026-08-07",
      loadInTime: "08:00",
      rehearsalDate: "2026-08-08",
      rehearsalTime: "14:00",
      showStartDate: "2026-08-09",
      showStartTime: "09:00",
      showEndDate: "2026-08-09",
      showEndTime: "17:00",
      strikeDate: "2026-08-09",
      strikeTime: "23:00",
    });
    expect(venueScheduleOrderErrors(data)).toEqual({});
  });

  it("flags Show End before Rehearsal", () => {
    const data = schedule({
      loadInDate: "2026-08-07",
      rehearsalDate: "2026-08-10",
      rehearsalTime: "14:00",
      showEndDate: "2026-08-09",
      showEndTime: "17:00",
    });
    const errors = venueScheduleOrderErrors(data);
    expect(errors.showEndDate).toBe("Show End must be on or after Rehearsal.");
    expect(Object.keys(errors)).toEqual(["showEndDate"]);
  });

  it("flags a same-day time conflict", () => {
    const data = schedule({
      showStartDate: "2026-08-09",
      showStartTime: "17:00",
      showEndDate: "2026-08-09",
      showEndTime: "09:00",
    });
    expect(venueScheduleOrderErrors(data).showEndDate).toBe(
      "Show End must be on or after Show Start.",
    );
  });

  it("allows equal timestamps", () => {
    const data = schedule({
      showStartDate: "2026-08-09",
      showStartTime: "09:00",
      showEndDate: "2026-08-09",
      showEndTime: "09:00",
    });
    expect(venueScheduleOrderErrors(data)).toEqual({});
  });

  it("skips blank fields (optional rehearsal)", () => {
    const data = schedule({
      loadInDate: "2026-08-07",
      loadInTime: "08:00",
      showStartDate: "2026-08-09",
      showStartTime: "09:00",
    });
    expect(venueScheduleOrderErrors(data)).toEqual({});
  });

  it("compares later fields against the latest earlier field, not the invalid one", () => {
    const data = schedule({
      loadInDate: "2026-08-10",
      loadInTime: "08:00",
      rehearsalDate: "2026-08-08",
      rehearsalTime: "14:00",
      showStartDate: "2026-08-11",
      showStartTime: "09:00",
    });
    const errors = venueScheduleOrderErrors(data);
    expect(errors.rehearsalDate).toBe("Rehearsal must be on or after Load-In.");
    expect(errors.showStartDate).toBeUndefined();
  });

  it("flags Strike before Load-In", () => {
    const data = schedule({
      loadInDate: "2026-08-09",
      loadInTime: "08:00",
      strikeDate: "2026-08-08",
      strikeTime: "23:00",
    });
    expect(venueScheduleOrderErrors(data).strikeDate).toBe(
      "Strike must be on or after Load-In.",
    );
  });
});

describe("venueScheduleEventRangeErrors", () => {
  it("flags Show Start and Show End outside the event dates", () => {
    const data = schedule({
      showStartDate: "2026-10-14",
      showStartTime: "09:00",
      showEndDate: "2026-10-16",
      showEndTime: "17:00",
    });
    const errors = venueScheduleEventRangeErrors(data, "2026-10-15", "2026-10-15");
    expect(errors.showStartDate).toBe(
      "Show Start must fall on the event date (2026-10-15).",
    );
    expect(errors.showEndDate).toBe(
      "Show End must fall on the event date (2026-10-15).",
    );
  });

  it("accepts a show inside a multi-day event window", () => {
    const data = schedule({
      showStartDate: "2026-10-15",
      showStartTime: "09:00",
      showEndDate: "2026-10-16",
      showEndTime: "23:00",
    });
    expect(
      venueScheduleEventRangeErrors(data, "2026-10-15", "2026-10-17"),
    ).toEqual({});
  });

  it("does not restrict Load-In or Strike", () => {
    const data = schedule({
      loadInDate: "2026-10-12",
      strikeDate: "2026-10-16",
      strikeTime: "02:00",
    });
    expect(
      venueScheduleEventRangeErrors(data, "2026-10-15", "2026-10-15"),
    ).toEqual({});
  });

  it("is inert without event dates", () => {
    const data = schedule({ showStartDate: "2026-10-14" });
    expect(venueScheduleEventRangeErrors(data)).toEqual({});
  });
});

describe("venueScheduleEventRangeWarnings", () => {
  it("stays quiet within a week of the event window", () => {
    const data = schedule({
      loadInDate: "2026-10-12",
      rehearsalDate: "2026-10-14",
      strikeDate: "2026-10-16",
    });
    expect(
      venueScheduleEventRangeWarnings(data, "2026-10-15", "2026-10-15"),
    ).toEqual({});
  });

  it("warns when Load-In drifts more than a week out (typo catcher)", () => {
    const data = schedule({ loadInDate: "2026-11-12", loadInTime: "08:00" });
    const warnings = venueScheduleEventRangeWarnings(
      data,
      "2026-10-15",
      "2026-10-15",
    );
    expect(warnings.loadInDate).toContain("more than a week outside");
  });

  it("never warns about Show Start/Show End (hard-error territory)", () => {
    const data = schedule({ showStartDate: "2026-12-01" });
    expect(
      venueScheduleEventRangeWarnings(data, "2026-10-15", "2026-10-15"),
    ).toEqual({});
  });
});

describe("venueScheduleValidationErrors", () => {
  it("merges order and range errors", () => {
    const data = schedule({
      loadInDate: "2026-10-15",
      loadInTime: "12:00",
      showStartDate: "2026-10-15",
      showStartTime: "09:00", // before load-in → order error
      showEndDate: "2026-10-16", // outside single-day event → range error
      showEndTime: "01:00",
    });
    const errors = venueScheduleValidationErrors(
      data,
      "2026-10-15",
      "2026-10-15",
    );
    expect(errors.showStartDate).toBe(
      "Show Start must be on or after Load-In.",
    );
    expect(errors.showEndDate).toBe(
      "Show End must fall on the event date (2026-10-15).",
    );
  });
});
