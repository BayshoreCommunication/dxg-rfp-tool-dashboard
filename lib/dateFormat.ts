import { format, isValid } from "date-fns";

/* One numeric date presentation for the whole dashboard. Inputs and read-only
   displays both use it, so a date never changes shape between the form, the
   proposal list, the assistant, and the vendor views. Prose dates ("Sunday,
   September 6") and time-only labels are deliberately not covered. */
export const APP_DATE_FORMAT = "MM/dd/yyyy";
export const APP_TIME_FORMAT = "hh:mm aa";
export const APP_DATE_TIME_FORMAT = `${APP_DATE_FORMAT} ${APP_TIME_FORMAT}`;
export const APP_DATE_FORMAT_LABEL = "MM/DD/YYYY";
export const APP_DATE_TIME_FORMAT_LABEL = "MM/DD/YYYY hh:mm AM/PM";

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/* A bare ISO day ("2026-09-14") is a calendar date, not an instant, so it is
   read as a local day; anything else goes through Date and keeps its zone. */
export const toAppDate = (value: unknown): Date | null => {
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === "number") {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const day = trimmed.match(ISO_DAY);
  const date = day
    ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]))
    : new Date(trimmed);
  return isValid(date) ? date : null;
};

export const formatAppDate = (value: unknown, fallback = "-"): string => {
  const date = toAppDate(value);
  return date ? format(date, APP_DATE_FORMAT) : fallback;
};

export const formatAppDateTime = (value: unknown, fallback = "-"): string => {
  const date = toAppDate(value);
  return date ? format(date, APP_DATE_TIME_FORMAT) : fallback;
};
