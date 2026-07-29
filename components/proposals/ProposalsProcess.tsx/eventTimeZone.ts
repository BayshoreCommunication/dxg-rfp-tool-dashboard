/**
 * Schedule cells carry venue wall-clock times ("9:00 AM" means 9am at the
 * venue). Building a Date from those parts anchors them to whatever zone the
 * planner's machine happens to be in, so a schedule uploaded from outside the
 * venue's zone stored the wrong instant and the generated RFP quoted the wrong
 * times to vendors. Anchor to the event's own zone instead.
 */

/** Venue & Schedule stores display labels, not IANA identifiers. */
const IANA_BY_LABEL: Record<string, string> = {
  "Eastern Time (ET)": "America/New_York",
  "Central Time (CT)": "America/Chicago",
  "Mountain Time (MT)": "America/Denver",
  "Pacific Time (PT)": "America/Los_Angeles",
  "Alaska Time (AKT)": "America/Anchorage",
  "Hawaii Time (HT)": "Pacific/Honolulu",
};

/** IANA zone for a stored label, or null when unknown ("Other / International"). */
export const ianaZoneForLabel = (label: string | undefined | null): string | null => {
  if (!label) return null;
  const zone = IANA_BY_LABEL[label.trim()];
  if (zone) return zone;
  // Tolerate an IANA identifier stored directly.
  return /^[A-Za-z]+\/[A-Za-z_+-]+$/.test(label.trim()) ? label.trim() : null;
};

/** Milliseconds a zone is offset from UTC at a given instant, DST included. */
const zoneOffsetAt = (instantMs: number, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instantMs));
  const at = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  // formatToParts renders hour 24 for midnight under hour12:false in some engines.
  const hour = at("hour") % 24;
  const asIfUtc = Date.UTC(at("year"), at("month") - 1, at("day"), hour, at("minute"), at("second"));
  return asIfUtc - instantMs;
};

/** Wall-clock fields of an instant as read in a given zone. */
const wallClockPartsIn = (instantMs: number, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(instantMs));
  const at = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return { year: at("year"), month: at("month"), day: at("day"), hours: at("hour") % 24, minutes: at("minute") };
};

/**
 * A Date whose *local* fields read as the venue wall clock, for date pickers
 * that can only render in the machine's zone. Without this a planner outside
 * the venue zone uploads "9:15 AM" and the form shows 9:15 PM.
 */
export const toEventZoneDisplay = (iso: string, timeZoneLabel?: string | null): Date | null => {
  if (!iso) return null;
  const instant = new Date(iso);
  if (isNaN(instant.getTime())) return null;
  const zone = ianaZoneForLabel(timeZoneLabel);
  if (!zone) return instant;
  const p = wallClockPartsIn(instant.getTime(), zone);
  return new Date(p.year, p.month - 1, p.day, p.hours, p.minutes);
};

/** Inverse of toEventZoneDisplay: the instant a displayed wall clock names. */
export const fromEventZoneDisplay = (displayed: Date | null, timeZoneLabel?: string | null): string => {
  if (!displayed || isNaN(displayed.getTime())) return "";
  const zone = ianaZoneForLabel(timeZoneLabel);
  if (!zone) return displayed.toISOString();
  const isoDate = `${displayed.getFullYear()}-${String(displayed.getMonth() + 1).padStart(2, "0")}-${String(displayed.getDate()).padStart(2, "0")}`;
  return wallClockToIso(isoDate, { hours: displayed.getHours(), minutes: displayed.getMinutes() }, timeZoneLabel);
};

/**
 * Turn a venue wall-clock date and time into the ISO instant it names.
 * Falls back to the machine's local zone when the event zone is unknown, which
 * is the historical behaviour and correct for a planner working on site.
 */
export const wallClockToIso = (
  isoDate: string,
  time: { hours: number; minutes: number },
  timeZoneLabel?: string | null,
): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return "";
  const zone = ianaZoneForLabel(timeZoneLabel);
  if (!zone) {
    const local = new Date(year, month - 1, day, time.hours, time.minutes);
    return isNaN(local.getTime()) ? "" : local.toISOString();
  }
  const naiveUtc = Date.UTC(year, month - 1, day, time.hours, time.minutes);
  // One correction, then a second pass so times that sit near a DST boundary
  // resolve against the offset actually in force at the resulting instant.
  let instant = naiveUtc - zoneOffsetAt(naiveUtc, zone);
  instant = naiveUtc - zoneOffsetAt(instant, zone);
  return isNaN(instant) ? "" : new Date(instant).toISOString();
};
