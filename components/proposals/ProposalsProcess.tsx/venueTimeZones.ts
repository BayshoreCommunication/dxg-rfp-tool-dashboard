const LEGACY_LABEL_TO_IANA: Record<string, string> = {
  "Eastern Time (ET)": "America/New_York",
  "Central Time (CT)": "America/Chicago",
  "Mountain Time (MT)": "America/Denver",
  "Pacific Time (PT)": "America/Los_Angeles",
  "Alaska Time (AKT)": "America/Anchorage",
  "Hawaii Time (HT)": "Pacific/Honolulu",
};

const STATE_IANA_TIME_ZONES: Record<string, string> = {
  AK: "America/Anchorage",
  AL: "America/Chicago", AR: "America/Chicago", AZ: "America/Phoenix",
  CA: "America/Los_Angeles", CO: "America/Denver",
  CT: "America/New_York", DC: "America/New_York", DE: "America/New_York",
  FL: "America/New_York", GA: "America/New_York", HI: "Pacific/Honolulu",
  IA: "America/Chicago", ID: "America/Boise", IL: "America/Chicago",
  IN: "America/Indiana/Indianapolis", KS: "America/Chicago",
  KY: "America/Kentucky/Louisville", LA: "America/Chicago",
  MA: "America/New_York", MD: "America/New_York", ME: "America/New_York",
  MI: "America/Detroit", MN: "America/Chicago", MO: "America/Chicago",
  MS: "America/Chicago", MT: "America/Denver", NC: "America/New_York",
  ND: "America/Chicago", NE: "America/Chicago", NH: "America/New_York",
  NJ: "America/New_York", NM: "America/Denver", NV: "America/Los_Angeles",
  NY: "America/New_York", OH: "America/New_York", OK: "America/Chicago",
  OR: "America/Los_Angeles", PA: "America/New_York", RI: "America/New_York",
  SC: "America/New_York", SD: "America/Chicago", TN: "America/Chicago",
  TX: "America/Chicago", UT: "America/Denver", VA: "America/New_York",
  VT: "America/New_York", WA: "America/Los_Angeles", WI: "America/Chicago",
  WV: "America/New_York", WY: "America/Denver",
};

// City overrides cover common event markets in states that span more than one
// time zone, plus common international event destinations. Unknown cities
// deliberately fall back to their state default (or manual selection for
// Other / International) instead of guessing.
const CITY_IANA_TIME_ZONES: Record<string, string> = {
  "chicago|IL": "America/Chicago",
  "new york|NY": "America/New_York",
  "miami|FL": "America/New_York",
  "orlando|FL": "America/New_York",
  "tampa|FL": "America/New_York",
  "pensacola|FL": "America/Chicago",
  "panama city|FL": "America/Chicago",
  "nashville|TN": "America/Chicago",
  "memphis|TN": "America/Chicago",
  "knoxville|TN": "America/New_York",
  "chattanooga|TN": "America/New_York",
  "dallas|TX": "America/Chicago",
  "houston|TX": "America/Chicago",
  "austin|TX": "America/Chicago",
  "san antonio|TX": "America/Chicago",
  "el paso|TX": "America/Denver",
  "boise|ID": "America/Boise",
  "coeur dalene|ID": "America/Los_Angeles",
  "ontario|OR": "America/Boise",
  "portland|OR": "America/Los_Angeles",
  "anchorage|AK": "America/Anchorage",
  "adak|AK": "America/Adak",
  "honolulu|HI": "Pacific/Honolulu",
  "paris|OTHER": "Europe/Paris",
  "london|OTHER": "Europe/London",
  "berlin|OTHER": "Europe/Berlin",
  "amsterdam|OTHER": "Europe/Amsterdam",
  "madrid|OTHER": "Europe/Madrid",
  "rome|OTHER": "Europe/Rome",
  "toronto|OTHER": "America/Toronto",
  "montreal|OTHER": "America/Toronto",
  "vancouver|OTHER": "America/Vancouver",
  "calgary|OTHER": "America/Edmonton",
  "mexico city|OTHER": "America/Mexico_City",
  "sao paulo|OTHER": "America/Sao_Paulo",
  "buenos aires|OTHER": "America/Argentina/Buenos_Aires",
  "dubai|OTHER": "Asia/Dubai",
  "dhaka|OTHER": "Asia/Dhaka",
  "new delhi|OTHER": "Asia/Kolkata",
  "delhi|OTHER": "Asia/Kolkata",
  "mumbai|OTHER": "Asia/Kolkata",
  "singapore|OTHER": "Asia/Singapore",
  "tokyo|OTHER": "Asia/Tokyo",
  "sydney|OTHER": "Australia/Sydney",
  "melbourne|OTHER": "Australia/Melbourne",
};

const IANA_LABELS: Record<string, string> = {
  "America/New_York": "Eastern Time (ET)",
  "America/Chicago": "Central Time (CT)",
  "America/Denver": "Mountain Time (MT)",
  "America/Phoenix": "Arizona Time (MST)",
  "America/Los_Angeles": "Pacific Time (PT)",
  "America/Anchorage": "Alaska Time",
  "America/Adak": "Hawaii–Aleutian Time",
  "Pacific/Honolulu": "Hawaii Time",
  "America/Boise": "Mountain Time — Boise",
  "America/Detroit": "Eastern Time — Detroit",
  "America/Indiana/Indianapolis": "Eastern Time — Indiana",
  "America/Kentucky/Louisville": "Eastern Time — Kentucky",
  "Europe/Paris": "Central European Time — Paris",
  "Europe/London": "United Kingdom Time — London",
  "Europe/Berlin": "Central European Time — Berlin",
  "Europe/Amsterdam": "Central European Time — Amsterdam",
  "Europe/Madrid": "Central European Time — Madrid",
  "Europe/Rome": "Central European Time — Rome",
  "America/Toronto": "Eastern Time — Toronto",
  "America/Vancouver": "Pacific Time — Vancouver",
  "America/Edmonton": "Mountain Time — Calgary",
  "America/Mexico_City": "Central Time — Mexico City",
  "America/Sao_Paulo": "Brasilia Time — São Paulo",
  "America/Argentina/Buenos_Aires": "Argentina Time — Buenos Aires",
  "Asia/Dubai": "Gulf Standard Time — Dubai",
  "Asia/Dhaka": "Bangladesh Time — Dhaka",
  "Asia/Kolkata": "India Standard Time",
  "Asia/Singapore": "Singapore Time",
  "Asia/Tokyo": "Japan Standard Time — Tokyo",
  "Australia/Sydney": "Australian Eastern Time — Sydney",
  "Australia/Melbourne": "Australian Eastern Time — Melbourne",
};

const normalizeCity = (city: string): string =>
  city
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ");

export const normalizeTimeZoneValue = (value: string): string =>
  LEGACY_LABEL_TO_IANA[value.trim()] ?? value.trim();

export const venueTimeZoneFor = (city: string, state: string): string | null => {
  const normalizedState = state.trim().toUpperCase();
  if (!normalizedState) return null;
  const cityZone = CITY_IANA_TIME_ZONES[`${normalizeCity(city)}|${normalizedState}`];
  return cityZone ?? STATE_IANA_TIME_ZONES[normalizedState] ?? null;
};

export const automaticVenueTimeZone = (input: {
  city: string;
  state: string;
  currentTimeZone: string;
  lastAutomaticTimeZone: string | null;
}): string | null => {
  const suggestion = venueTimeZoneFor(input.city, input.state);
  if (!suggestion) return null;
  if (!input.currentTimeZone.trim()) return suggestion;
  return input.lastAutomaticTimeZone &&
    normalizeTimeZoneValue(input.currentTimeZone) === input.lastAutomaticTimeZone
    ? suggestion
    : null;
};

export const timeZoneDisplayLabel = (value: string): string => {
  const normalized = normalizeTimeZoneValue(value);
  if (normalized === "Other / International") {
    return "Other / International — exact timezone not specified";
  }
  return IANA_LABELS[normalized]
    ? `${IANA_LABELS[normalized]} — ${normalized}`
    : value;
};

const optionValues = Array.from(new Set([
  ...Object.values(STATE_IANA_TIME_ZONES),
  ...Object.values(CITY_IANA_TIME_ZONES),
  "Other / International",
]));

export const IANA_TIME_ZONE_OPTIONS = optionValues
  .map((value) => ({ value, label: timeZoneDisplayLabel(value) }))
  .sort((left, right) => left.label.localeCompare(right.label));

export const isLegacyTimeZoneLabel = (value: string): boolean =>
  Boolean(LEGACY_LABEL_TO_IANA[value.trim()]);
