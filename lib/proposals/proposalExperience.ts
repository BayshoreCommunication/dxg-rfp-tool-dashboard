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

export type ProcurementTimelineDateField = Exclude<
  keyof ProcurementTimelineData,
  "vendorPresentationOpportunity"
>;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const procurementTimelineFields = (
  data: ProcurementTimelineData,
): ProcurementTimelineDateField[] => [
  "vendorQuestionsDueDate",
  "responseToVendorQuestionsDate",
  "proposalSubmissionDueDate",
  "shortlistNotificationDate",
  ...(data.vendorPresentationOpportunity === "YES"
    ? (["vendorPresentationDate"] as ProcurementTimelineDateField[])
    : []),
  "vendorSelectionDate",
  "decisionDate",
];

const localDateFromDay = (day: number): Date => {
  const utc = new Date(day);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
};

/**
 * Calendar bounds for a procurement milestone. The latest populated earlier
 * milestone becomes the minimum, the earliest populated later milestone
 * becomes the maximum, and every procurement milestone must remain before the
 * event starts. Today is the fallback minimum so users cannot add new dates in
 * the past.
 */
export const procurementTimelineDateBounds = (
  data: ProcurementTimelineData,
  field: ProcurementTimelineDateField,
  eventStartDate?: string,
  today = new Date(),
): { minDate: Date; maxDate?: Date } => {
  const fields = procurementTimelineFields(data);
  const index = fields.indexOf(field);
  const todayAt = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const previousDates = (index < 0 ? [] : fields.slice(0, index))
    .map((candidate) => parseDate(data[candidate]))
    .filter((candidate): candidate is number => candidate !== null);
  const nextDates = (index < 0 ? [] : fields.slice(index + 1))
    .map((candidate) => parseDate(data[candidate]))
    .filter((candidate): candidate is number => candidate !== null);
  const eventStart = parseDate(eventStartDate);
  const maximumCandidates = [
    ...nextDates,
    ...(eventStart !== null ? [eventStart - ONE_DAY_MS] : []),
  ];
  const minimum = Math.max(todayAt, ...previousDates);
  const maximum = maximumCandidates.length
    ? Math.min(...maximumCandidates)
    : null;

  return {
    minDate: localDateFromDay(minimum),
    ...(maximum !== null ? { maxDate: localDateFromDay(maximum) } : {}),
  };
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
  eventFormat,
  eventType,
  startDate,
  endDate,
  proposalSubmissionDueDate,
  vendorQuestionsDueDate,
  organizationName,
}: {
  eventName: string;
  eventFormat?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  proposalSubmissionDueDate?: string;
  vendorQuestionsDueDate?: string;
  organizationName?: string;
}) => {
  const formatDate = (value?: string): string => {
    const trimmed = value?.trim() || "";
    const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!isoDate) return trimmed;

    const [, year, month, day] = isoDate;
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
  };
  const name = eventName.trim() || "our upcoming event";
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);
  const formattedSubmissionDate = formatDate(proposalSubmissionDueDate);
  const formattedQuestionsDate = formatDate(vendorQuestionsDueDate);
  const details = [
    `- Event: ${name}`,
    eventType?.trim() ? `- Event type: ${eventType.trim()}` : "",
    eventFormat?.trim() ? `- Format: ${eventFormat.trim()}` : "",
    formattedStartDate
      ? `- Event dates: ${formattedStartDate}${formattedEndDate ? ` to ${formattedEndDate}` : ""}`
      : "",
    formattedSubmissionDate
      ? `- Proposal due: ${formattedSubmissionDate}`
      : "",
  ].filter(Boolean);
  const organizationContext = organizationName?.trim()
    ? ` on behalf of ${organizationName.trim()}`
    : "";
  const questionGuidance = formattedQuestionsDate
    ? `If anything needs clarification, please send your questions by ${formattedQuestionsDate} so we can respond before the proposal deadline.`
    : "If anything needs clarification, we welcome your questions and will be happy to provide additional context.";

  return {
    subject: `Invitation to propose: ${name} AV production`,
    message: `Hello,\n\nWe are pleased to invite your team to review an audiovisual production opportunity for ${name}${organizationContext}. We are looking for a thoughtful production partner who can bring strong technical execution, proactive collaboration, and practical recommendations to the event.\n\nOpportunity at a glance:\n${details.join("\n")}\n\nThe RFP includes the production objectives, technical scope, schedule expectations, and evaluation criteria. Please review it carefully and call out any assumptions, alternatives, or value-added ideas that could strengthen the attendee experience.\n\nUse the secure View Proposal button in this email to open the complete RFP. When you are ready, the Submit Your Proposal button will take you to the response form.\n\n${questionGuidance}\n\nWe appreciate the time and expertise your team will bring to this process and look forward to reviewing your approach.\n\nWarm regards,\nDXG RFP Team`,
  };
};
