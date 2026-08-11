export type ProposalExperienceMode = "basic" | "advanced";

export type AnswerSource = "user" | "ai" | "assumed";

export type AnswerProvenance = {
  source: AnswerSource;
  confidence?: number;
  explanation?: string;
};

export type ProposalChecklistIssue = {
  id: string;
  stepId: number;
  section: string;
  label: string;
  fieldId?: string;
};

export type ProcurementTimelineData = {
  vendorQuestionsDueDate: string;
  responseToVendorQuestionsDate: string;
  proposalSubmissionDueDate: string;
  shortlistNotificationDate: string;
  vendorPresentationOpportunity: string;
  vendorPresentationDate: string;
  vendorSelectionDate: string;
  decisionDate?: string;
};

export type TimelineIssue = {
  field: keyof ProcurementTimelineData | "eventStartDate";
  message: string;
};

const BASIC_STEP_IDS = [1, 2, 3, 8, 10] as const;
const ADVANCED_STEP_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const proposalStepOrder = (
  mode: ProposalExperienceMode,
  eventFormat: string,
): number[] => {
  const source = mode === "basic" ? BASIC_STEP_IDS : ADVANCED_STEP_IDS;
  return source.filter((step) => !(step === 4 && eventFormat === "In-Person"));
};

const parseDate = (raw: string | undefined): number | null => {
  const value = raw?.trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  }
  const parts = value.split(/[/-]/).map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const [first, second, third] = parts;
  if (first > 999) return Date.UTC(first, second - 1, third);
  if (third > 999) return Date.UTC(third, first - 1, second);
  return null;
};

export const procurementTimelineIssues = (
  data: ProcurementTimelineData,
  eventStartDate?: string,
): TimelineIssue[] => {
  const issues: TimelineIssue[] = [];
  const sequence: Array<{
    field: keyof ProcurementTimelineData;
    label: string;
    value: string;
  }> = [
    { field: "vendorQuestionsDueDate", label: "Vendor questions due", value: data.vendorQuestionsDueDate },
    { field: "responseToVendorQuestionsDate", label: "Responses to vendor questions", value: data.responseToVendorQuestionsDate },
    { field: "proposalSubmissionDueDate", label: "Proposal submission", value: data.proposalSubmissionDueDate },
    { field: "shortlistNotificationDate", label: "Shortlist notification", value: data.shortlistNotificationDate },
    ...(data.vendorPresentationOpportunity === "YES"
      ? [{ field: "vendorPresentationDate" as const, label: "Vendor presentation", value: data.vendorPresentationDate }]
      : []),
    { field: "vendorSelectionDate", label: "Vendor selection", value: data.vendorSelectionDate },
  ];

  let previous: { label: string; at: number } | null = null;
  for (const entry of sequence) {
    const at = parseDate(entry.value);
    if (at === null) continue;
    if (previous && at < previous.at) {
      issues.push({
        field: entry.field,
        message: `${entry.label} must be on or after ${previous.label}.`,
      });
    }
    if (!previous || at >= previous.at) previous = { label: entry.label, at };
  }

  const selection = parseDate(data.vendorSelectionDate);
  const decision = parseDate(data.decisionDate);
  const eventStart = parseDate(eventStartDate);
  if (selection !== null && decision !== null && decision < selection) {
    issues.push({
      field: "decisionDate",
      message: "Target decision date must be on or after vendor selection.",
    });
  }
  if (selection !== null && eventStart !== null && selection >= eventStart) {
    issues.push({
      field: "vendorSelectionDate",
      message: "Vendor selection must happen before the event starts.",
    });
  }

  return issues;
};

const roundTo = (value: number, increment: number) =>
  Math.max(increment, Math.round(value / increment) * increment);

export type BudgetEstimate = {
  low: number;
  high: number;
  confidence: number;
  explanation: string;
};

export const estimateInitialBudget = ({
  attendees,
  rooms,
  eventFormat,
}: {
  attendees: string;
  rooms: string;
  eventFormat: string;
}): BudgetEstimate => {
  const attendeeCount = Math.max(0, Number(attendees) || 0);
  const roomCount = Math.max(1, Number(rooms) || 1);
  const formatMultiplier = eventFormat === "Hybrid" ? 1.35 : eventFormat === "Virtual" ? 1.2 : 1;
  const midpoint = (12_000 + attendeeCount * 55 + roomCount * 7_500) * formatMultiplier;
  const low = roundTo(midpoint * 0.8, 5_000);
  const high = roundTo(midpoint * 1.25, 5_000);
  const confidence = Math.min(
    90,
    40 + (attendeeCount > 0 ? 20 : 0) + (Number(rooms) > 0 ? 15 : 0) + (eventFormat ? 15 : 0),
  );

  return {
    low,
    high,
    confidence,
    explanation:
      "Planning estimate based on attendance, room count, and delivery format. Venue labor, union rules, scenic scope, and final equipment selections can materially change it.",
  };
};

export const buildVendorReadyStatementOfWork = ({
  eventName,
  eventType,
  eventFormat,
  attendees,
  roomCount,
  venueName,
  startDate,
  endDate,
}: {
  eventName: string;
  eventType: string;
  eventFormat: string;
  attendees: string;
  roomCount: string;
  venueName: string;
  startDate: string;
  endDate: string;
}) => {
  const name = eventName.trim() || "the event";
  const scope = eventType.trim() || "live event";
  const venue = venueName.trim() || "the selected venue";
  const attendance = attendees.trim() || "the anticipated audience";
  const rooms = roomCount.trim() || "the required";
  const dates = startDate && endDate ? ` from ${startDate} through ${endDate}` : "";
  return `Provide turnkey audiovisual production for ${name}, a ${eventFormat.toLowerCase()} ${scope} at ${venue}${dates}. Scope should support approximately ${attendance} attendees across ${rooms} room${rooms === "1" ? "" : "s"}, including equipment, qualified labor, installation, rehearsals, show operation, strike, and itemized pricing. Vendors should identify assumptions, exclusions, alternates, and value-added recommendations.`;
};

export const buildPersonalizedInvitation = ({
  eventName,
  proposalLink,
}: {
  eventName: string;
  proposalLink: string;
}) => ({
  subject: `Invitation to respond: ${eventName || "AV production RFP"}`,
  message: `Hello,\n\nYou are invited to review and respond to the AV production RFP for ${eventName || "our upcoming event"}. Please review the scope, timeline, and evaluation criteria at the link below. We welcome clarifying questions before the stated deadline.\n\n${proposalLink ? `Proposal link: ${proposalLink}\n\n` : ""}Best regards,\nDXG Team`,
});
