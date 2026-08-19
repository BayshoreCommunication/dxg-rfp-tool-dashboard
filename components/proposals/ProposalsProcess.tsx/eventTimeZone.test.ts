import { ianaZoneForLabel, wallClockToIso } from "./eventTimeZone";

describe("event time zone", () => {
  it("accepts nested IANA identifiers used by city auto-selection", () => {
    expect(ianaZoneForLabel("America/Argentina/Buenos_Aires")).toBe(
      "America/Argentina/Buenos_Aires",
    );
  });

  test("maps the stored display labels to IANA zones", () => {
    expect(ianaZoneForLabel("Central Time (CT)")).toBe("America/Chicago");
    expect(ianaZoneForLabel("Pacific Time (PT)")).toBe("America/Los_Angeles");
    expect(ianaZoneForLabel("Hawaii Time (HT)")).toBe("Pacific/Honolulu");
    // "Other / International" carries no zone, and must not be guessed at.
    expect(ianaZoneForLabel("Other / International")).toBeNull();
    expect(ianaZoneForLabel("")).toBeNull();
    expect(ianaZoneForLabel(undefined)).toBeNull();
    // An IANA identifier stored directly still resolves.
    expect(ianaZoneForLabel("America/Denver")).toBe("America/Denver");
  });

  test("anchors a venue wall clock to the event zone, not the machine zone", () => {
    // 9:00 AM in Chicago on 10 Mar 2027 is still CST (UTC-6, DST starts the
    // 14th) => 15:00Z. This is the case that put "3:00 AM UTC" in a generated
    // RFP when the planner's machine was in another zone.
    expect(wallClockToIso("2027-03-10", { hours: 9, minutes: 0 }, "Central Time (CT)"))
      .toBe("2027-03-10T15:00:00.000Z");
    // Same wall clock, different venue zone.
    expect(wallClockToIso("2027-03-10", { hours: 9, minutes: 0 }, "Pacific Time (PT)"))
      .toBe("2027-03-10T17:00:00.000Z");
    // Hawaii has no DST.
    expect(wallClockToIso("2027-03-10", { hours: 9, minutes: 0 }, "Hawaii Time (HT)"))
      .toBe("2027-03-10T19:00:00.000Z");
  });

  test("resolves times either side of a daylight-saving change", () => {
    // US DST starts 14 Mar 2027. Before: CST (UTC-6). After: CDT (UTC-5).
    expect(wallClockToIso("2027-03-13", { hours: 9, minutes: 0 }, "Central Time (CT)"))
      .toBe("2027-03-13T15:00:00.000Z");
    expect(wallClockToIso("2027-03-15", { hours: 9, minutes: 0 }, "Central Time (CT)"))
      .toBe("2027-03-15T14:00:00.000Z");
  });

  test("falls back to the machine zone when the event zone is unknown", () => {
    const iso = wallClockToIso("2027-03-10", { hours: 9, minutes: 0 }, "Other / International");
    // Same wall clock the planner typed, read back in the machine's zone.
    const local = new Date(iso);
    expect(local.getHours()).toBe(9);
    expect(local.getMinutes()).toBe(0);
  });

  test("rejects an unusable date instead of inventing an instant", () => {
    expect(wallClockToIso("", { hours: 9, minutes: 0 }, "Central Time (CT)")).toBe("");
    expect(wallClockToIso("not-a-date", { hours: 9, minutes: 0 }, "Central Time (CT)")).toBe("");
  });
});
