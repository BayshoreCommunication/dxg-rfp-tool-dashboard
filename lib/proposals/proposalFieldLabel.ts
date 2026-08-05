import proposalFormUi from "@/contracts/proposal/v1/proposal-form-ui.v1.json";

type FieldUi = { label?: string };

const configuredLabels = Object.fromEntries(
  Object.entries(proposalFormUi.fields as Record<string, FieldUi>).flatMap(
    ([path, field]) => (field.label ? [[path, field.label]] : []),
  ),
) as Record<string, string>;

// The extraction service still returns a few compatibility paths that differ
// from the form contract. Keep their planner-facing names here so the UI never
// has to expose an implementation path.
const compatibilityLabels: Record<string, string> = {
  "/content/event/attendees": "Total Attendance",
  "/content/event/eventFormat": "Event Format",
  "/content/event/eventName": "Event Name",
  "/content/event/eventType": "Event Type",
  "/content/venueSchedule/city": "Venue City",
  "/content/venueSchedule/loadIn/date": "Load-in Date",
  "/content/venueSchedule/numberOfEventRooms": "Number of Event Rooms",
  "/content/venueSchedule/region": "State / Region",
  "/content/venueSchedule/roomCount": "Number of Event Rooms",
  "/content/venueSchedule/strike/date": "Strike Date",
  "/content/venueSchedule/venueCity": "Venue City",
  "/content/venueSchedule/venueConfirmedStatus": "Venue Status",
  "/content/venueSchedule/venueName": "Venue Name",
  "/content/venueSchedule/venueState": "Venue State",
  "/content/venueSchedule/venueType": "Venue Type",
};

const titleCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const acronym = word.toLowerCase();
      if (["av", "coi", "id", "qa", "rfp", "url"].includes(acronym)) {
        return acronym.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

export const proposalFieldLabel = (path: string | undefined): string => {
  if (!path) return "Proposal Detail";
  if (compatibilityLabels[path]) return compatibilityLabels[path];
  if (configuredLabels[path]) return configuredLabels[path];

  const segments = path.split("/").filter(Boolean);
  const leaf = segments.at(-1) === "*" ? segments.at(-2) : segments.at(-1);
  return leaf ? titleCase(leaf) : "Proposal Detail";
};
