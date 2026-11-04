import type { OrganizationType } from "@/app/actions/organizationProfile";

/* Choices for the onboarding details form. The backend accepts any ISO 3166-1
   alpha-2 country and any IANA time zone; these lists are what the form offers. */

export const ORGANIZATION_TYPE_OPTIONS: { value: OrganizationType; label: string }[] = [
  { value: "corporate", label: "Corporate events team" },
  { value: "association", label: "Association" },
  { value: "agency", label: "Agency or event planner" },
  { value: "venue", label: "Venue or hotel" },
  { value: "government", label: "Government or public sector" },
  { value: "other", label: "Other" },
];

const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
  "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG " +
  "UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

export const countryOptions = (locale = "en"): { value: string; label: string }[] => {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    names = null;
  }
  return COUNTRY_CODES.map((code) => ({ value: code, label: names?.of(code) ?? code })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
};

export const timeZoneOptions = (): string[] => {
  const supported = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  try {
    if (supported) return supported("timeZone");
  } catch {
    // fall through
  }
  return ["UTC"];
};

export const browserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

/* "Pat's organization" from sign-up stands in for a company name nobody gave;
   the form starts empty rather than asking the Owner to edit it. */
export const isPlaceholderName = (name: string) => /'s organization$/.test(name);
