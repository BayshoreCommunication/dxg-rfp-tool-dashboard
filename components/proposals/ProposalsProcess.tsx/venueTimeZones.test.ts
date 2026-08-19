import {
  automaticVenueTimeZone,
  normalizeTimeZoneValue,
  timeZoneDisplayLabel,
  venueTimeZoneFor,
} from "./venueTimeZones";

describe("venue time-zone selection", () => {
  it("selects an IANA zone from a US state and city", () => {
    expect(venueTimeZoneFor("Chicago", "IL")).toBe("America/Chicago");
    expect(venueTimeZoneFor("Miami", "FL")).toBe("America/New_York");
  });

  it("uses city overrides for states spanning multiple time zones", () => {
    expect(venueTimeZoneFor("Pensacola", "FL")).toBe("America/Chicago");
    expect(venueTimeZoneFor("El Paso", "TX")).toBe("America/Denver");
    expect(venueTimeZoneFor("Coeur d'Alene", "ID")).toBe("America/Los_Angeles");
  });

  it("recognizes common international event destinations", () => {
    expect(venueTimeZoneFor("Dhaka", "OTHER")).toBe("Asia/Dhaka");
    expect(venueTimeZoneFor("Buenos Aires", "OTHER")).toBe(
      "America/Argentina/Buenos_Aires",
    );
  });

  it("keeps a manual choice instead of replacing it", () => {
    expect(automaticVenueTimeZone({
      city: "Miami",
      state: "FL",
      currentTimeZone: "America/Chicago",
      lastAutomaticTimeZone: null,
    })).toBeNull();
  });

  it("updates a previous automatic choice as the city becomes specific", () => {
    expect(automaticVenueTimeZone({
      city: "Pensacola",
      state: "FL",
      currentTimeZone: "America/New_York",
      lastAutomaticTimeZone: "America/New_York",
    })).toBe("America/Chicago");
  });

  it("normalizes legacy labels while showing a friendly IANA label", () => {
    expect(normalizeTimeZoneValue("Central Time (CT)")).toBe("America/Chicago");
    expect(timeZoneDisplayLabel("America/Chicago")).toBe(
      "Central Time (CT) — America/Chicago",
    );
  });
});
