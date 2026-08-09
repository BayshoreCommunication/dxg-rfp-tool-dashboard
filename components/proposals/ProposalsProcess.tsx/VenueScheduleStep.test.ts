import {
  defaultVenueSchedule,
  venueScheduleOrderErrors,
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
