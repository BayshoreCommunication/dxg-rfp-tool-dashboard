import type { Day } from "date-fns";
import { useSyncExternalStore } from "react";

export type LocalizedNumericDateFormat = "yyyy-MM-dd" | "dd/MM/yyyy" | "MM/dd/yyyy";

const subscribeToBrowserLocale = () => () => undefined;
const browserLocaleSnapshot = () => navigator.language || "en-US";
const serverLocaleSnapshot = () => "en-US";

const localePresentationFor = (localeName: string): {
  format: LocalizedNumericDateFormat;
  calendarStartDay: Day;
} => {
  const parts = new Intl.DateTimeFormat(localeName, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(2006, 10, 22));
  const orderedFields = parts
    .filter((part) => part.type === "year" || part.type === "month" || part.type === "day")
    .map((part) => part.type);
  const format: LocalizedNumericDateFormat = orderedFields[0] === "year"
    ? "yyyy-MM-dd"
    : orderedFields[0] === "day"
      ? "dd/MM/yyyy"
      : "MM/dd/yyyy";
  const locale = new Intl.Locale(localeName) as Intl.Locale & {
    weekInfo?: { firstDay: number };
    getWeekInfo?: () => { firstDay: number };
  };
  const firstDay = locale.weekInfo?.firstDay ?? locale.getWeekInfo?.().firstDay ?? 7;
  return { format, calendarStartDay: (firstDay % 7) as Day };
};

export const useDatePickerLocalePresentation = () => {
  const browserLocale = useSyncExternalStore(
    subscribeToBrowserLocale,
    browserLocaleSnapshot,
    serverLocaleSnapshot,
  );
  return localePresentationFor(browserLocale);
};
