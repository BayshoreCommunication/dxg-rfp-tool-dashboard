import type { OrganizationType } from "@/app/actions/organizationProfile";

/* Choices for the onboarding details form. RFPilot serves US organizations
   only, so the form offers the United States and its time zones. The backend
   still accepts any ISO 3166-1 alpha-2 country and IANA time zone. */

export const ORGANIZATION_TYPE_OPTIONS: { value: OrganizationType; label: string }[] = [
  { value: "corporate", label: "Corporate events team" },
  { value: "association", label: "Association" },
  { value: "agency", label: "Agency or event planner" },
  { value: "venue", label: "Venue or hotel" },
  { value: "government", label: "Government or public sector" },
  { value: "other", label: "Other" },
];

export const COUNTRY_OPTIONS: { value: string; label: string }[] = [{ value: "US", label: "United States" }];
export const DEFAULT_COUNTRY = "US";

export const US_TIME_ZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time (Chicago)" },
  { value: "America/Denver", label: "Mountain Time (Denver)" },
  { value: "America/Phoenix", label: "Mountain Time, no DST (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska Time (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (Honolulu)" },
];
export const DEFAULT_TIME_ZONE = "America/New_York";

const isUsTimeZone = (zone: string | null | undefined): zone is string =>
  US_TIME_ZONE_OPTIONS.some((option) => option.value === zone);

const browserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

/* The saved zone if it is a US one, else the browser's if it is, else Eastern. */
export const initialTimeZone = (saved: string | null): string => {
  if (isUsTimeZone(saved)) return saved;
  const browser = browserTimeZone();
  return isUsTimeZone(browser) ? browser : DEFAULT_TIME_ZONE;
};

/* "Pat's organization" from sign-up stands in for a company name nobody gave;
   the form starts empty rather than asking the Owner to edit it. */
export const isPlaceholderName = (name: string) => /'s organization$/.test(name);

/* What each refused field means, for the onboarding form and Settings. */
export const ORGANIZATION_FIELD_ERRORS: Record<string, string> = {
  name: "Enter a company name of up to 200 characters.",
  type: "Choose an organization type from the list.",
  industry: "Keep the industry to 120 characters.",
  country: "Choose a country from the list.",
  timeZone: "Choose a time zone from the list.",
  eventsPerYear: "Enter a whole number of events between 0 and 100,000.",
};

export const PLAN_LABELS: Record<string, string> = { free_trial: "Free trial" };
