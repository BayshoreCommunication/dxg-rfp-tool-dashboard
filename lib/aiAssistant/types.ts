export const ASSISTANT_MESSAGE_MAX_LENGTH = 8_000;

export type AssistantThreadStatus = "active" | "archived";
export type AssistantMessageRole = "user" | "assistant" | "system_event";
export type AssistantMessageStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "failed"
  | "aborted";

export const ASSISTANT_INTENTS = [
  "greeting_or_thanks",
  "platform_navigation",
  "proposal_creation",
  "proposal_review",
  "pre_send_checklist",
  "event_planning",
  "form_field_help",
  "proposal_specific_request",
  "equipment_scope_review",
  "budget_estimation",
  "historical_reference_request",
  "action_request",
  "unsupported_or_off_topic",
  "ambiguous",
] as const;

export type AssistantIntent = (typeof ASSISTANT_INTENTS)[number];
export type AssistantIntentSource =
  | "deterministic"
  | "ui_context"
  | "follow_up"
  | "fallback";
export type AssistantIntentConfidence = "high" | "medium" | "low";
export type AssistantResponseKind =
  | "answer"
  | "clarification"
  | "refusal"
  | "abstention";
export const ASSISTANT_FEEDBACK_VALUES = [
  "helpful",
  "not_helpful",
] as const;
export const ASSISTANT_FEEDBACK_REASONS = [
  "incorrect",
  "outdated",
  "did_not_understand",
  "missing_steps",
  "irrelevant",
  "other",
] as const;
export type AssistantFeedbackValue =
  (typeof ASSISTANT_FEEDBACK_VALUES)[number];
export type AssistantFeedbackReason =
  (typeof ASSISTANT_FEEDBACK_REASONS)[number];
export type AssistantMessageFeedback = {
  value: AssistantFeedbackValue;
  reason: AssistantFeedbackReason | null;
  updatedAt: string;
};
export type AssistantFeedback = AssistantMessageFeedback & {
  id: string;
  threadId: string;
  messageId: string;
  createdAt: string;
};

export type AssistantCitation = {
  sourceId: string;
  title: string;
  href?: string;
  releaseId?: string;
  fragmentId?: string;
};

export type AssistantThread = {
  id: string;
  title: string;
  status: AssistantThreadStatus;
  messageCount: number;
  lastMessageAt: string | null;
  deletedAt: string | null;
  purgeAfter: string | null;
  recoverable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AssistantMessage = {
  id: string;
  threadId: string;
  ordinal: number;
  role: AssistantMessageRole;
  content: string;
  status: AssistantMessageStatus;
  providerResponseId: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  safeErrorCode: string | null;
  intent?: AssistantIntent | null;
  intentVersion?: string | null;
  intentSource?: AssistantIntentSource | null;
  intentConfidence?: AssistantIntentConfidence | null;
  responseKind?: AssistantResponseKind | null;
  promptVersion?: string | null;
  knowledgeVersion?: string | null;
  firstTokenMs?: number | null;
  completionLatencyMs?: number | null;
  citations: AssistantCitation[];
  feedback?: AssistantMessageFeedback | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type AssistantThreadDetail = {
  thread: AssistantThread;
  messages: AssistantMessage[];
};

export type AssistantActionResult<T> =
  | {
      success: true;
      data: T;
      correlationId: string;
    }
  | {
      success: false;
      code: string;
      message: string;
      correlationId: string;
      retryable: boolean;
      retryAfterSeconds?: number;
    };

export type AssistantUiError = {
  code: string;
  message: string;
  correlationId?: string;
  retryable: boolean;
  retryAfterSeconds?: number;
};

export type AssistantDisplayMessage = AssistantMessage & {
  optimistic?: boolean;
};

export type MessageAcceptedEvent = {
  type: "message.accepted";
  version: 1;
  userMessage: AssistantMessage;
  assistantMessageId: string;
  correlationId: string;
};

export type ResponseStartedEvent = {
  type: "response.started";
  version: 1;
  assistantMessageId: string;
};

export type ResponseDeltaEvent = {
  type: "response.delta";
  version: 1;
  assistantMessageId: string;
  delta: string;
};

export type ResponseCompletedEvent = {
  type: "response.completed";
  version: 1;
  message: AssistantMessage;
  correlationId: string;
};

export type ResponseFailedEvent = {
  type: "response.failed";
  version: 1;
  assistantMessageId: string;
  code: string;
  message: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  correlationId: string;
};

export type AssistantStreamEvent =
  | MessageAcceptedEvent
  | ResponseStartedEvent
  | ResponseDeltaEvent
  | ResponseCompletedEvent
  | ResponseFailedEvent;

export const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const nullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const finiteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const assistantIntent = (value: unknown): AssistantIntent | null =>
  typeof value === "string" &&
  ASSISTANT_INTENTS.includes(value as AssistantIntent)
    ? (value as AssistantIntent)
    : null;

const assistantIntentSource = (
  value: unknown,
): AssistantIntentSource | null =>
  value === "deterministic" ||
  value === "ui_context" ||
  value === "follow_up" ||
  value === "fallback"
    ? value
    : null;

const assistantIntentConfidence = (
  value: unknown,
): AssistantIntentConfidence | null =>
  value === "high" || value === "medium" || value === "low"
    ? value
    : null;

const assistantResponseKind = (
  value: unknown,
): AssistantResponseKind | null =>
  value === "answer" ||
  value === "clarification" ||
  value === "refusal" ||
  value === "abstention"
    ? value
    : null;

const assistantFeedbackValue = (
  value: unknown,
): AssistantFeedbackValue | null =>
  value === "helpful" || value === "not_helpful" ? value : null;

const assistantFeedbackReason = (
  value: unknown,
): AssistantFeedbackReason | null =>
  typeof value === "string" &&
  ASSISTANT_FEEDBACK_REASONS.includes(value as AssistantFeedbackReason)
    ? (value as AssistantFeedbackReason)
    : null;

const parseAssistantMessageFeedback = (
  value: unknown,
): AssistantMessageFeedback | null => {
  if (!isRecord(value)) return null;
  const feedbackValue = assistantFeedbackValue(value.value);
  if (!feedbackValue || typeof value.updatedAt !== "string") return null;
  const reason = assistantFeedbackReason(value.reason);
  if (
    value.reason !== null &&
    value.reason !== undefined &&
    reason === null
  ) {
    return null;
  }
  if (feedbackValue === "helpful" && reason !== null) return null;
  return {
    value: feedbackValue,
    reason,
    updatedAt: value.updatedAt,
  };
};

export const parseAssistantCitation = (
  value: unknown,
): AssistantCitation | null => {
  if (
    !isRecord(value) ||
    typeof value.sourceId !== "string" ||
    typeof value.title !== "string"
  ) {
    return null;
  }
  return {
    sourceId: value.sourceId,
    title: value.title,
    ...(optionalString(value.href) ? { href: value.href as string } : {}),
    ...(optionalString(value.releaseId)
      ? { releaseId: value.releaseId as string }
      : {}),
    ...(optionalString(value.fragmentId)
      ? { fragmentId: value.fragmentId as string }
      : {}),
  };
};

export const parseAssistantThread = (
  value: unknown,
): AssistantThread | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    (value.status !== "active" && value.status !== "archived")
  ) {
    return null;
  }
  return {
    id: value.id,
    title: value.title,
    status: value.status,
    messageCount: finiteNumber(value.messageCount) ?? 0,
    lastMessageAt: nullableString(value.lastMessageAt),
    deletedAt: nullableString(value.deletedAt),
    purgeAfter: nullableString(value.purgeAfter),
    recoverable: value.recoverable === true,
    createdAt: nullableString(value.createdAt) ?? "",
    updatedAt: nullableString(value.updatedAt) ?? "",
  };
};

export const parseAssistantMessage = (
  value: unknown,
): AssistantMessage | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.threadId !== "string" ||
    (value.role !== "user" &&
      value.role !== "assistant" &&
      value.role !== "system_event") ||
    (value.status !== "pending" &&
      value.status !== "streaming" &&
      value.status !== "complete" &&
      value.status !== "failed" &&
      value.status !== "aborted")
  ) {
    return null;
  }
  return {
    id: value.id,
    threadId: value.threadId,
    ordinal: finiteNumber(value.ordinal) ?? 0,
    role: value.role,
    content: typeof value.content === "string" ? value.content : "",
    status: value.status,
    providerResponseId: nullableString(value.providerResponseId),
    model: nullableString(value.model),
    inputTokens: finiteNumber(value.inputTokens),
    outputTokens: finiteNumber(value.outputTokens),
    safeErrorCode: nullableString(value.safeErrorCode),
    intent: assistantIntent(value.intent),
    intentVersion: nullableString(value.intentVersion),
    intentSource: assistantIntentSource(value.intentSource),
    intentConfidence: assistantIntentConfidence(value.intentConfidence),
    responseKind: assistantResponseKind(value.responseKind),
    promptVersion: nullableString(value.promptVersion),
    knowledgeVersion: nullableString(value.knowledgeVersion),
    firstTokenMs: finiteNumber(value.firstTokenMs),
    completionLatencyMs: finiteNumber(value.completionLatencyMs),
    citations: Array.isArray(value.citations)
      ? value.citations.flatMap((citation) => {
          const parsed = parseAssistantCitation(citation);
          return parsed ? [parsed] : [];
        })
      : [],
    feedback: parseAssistantMessageFeedback(value.feedback),
    createdAt: nullableString(value.createdAt) ?? "",
    updatedAt: nullableString(value.updatedAt) ?? "",
    completedAt: nullableString(value.completedAt),
  };
};

export const parseAssistantFeedback = (
  value: unknown,
): AssistantFeedback | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.threadId !== "string" ||
    typeof value.messageId !== "string" ||
    typeof value.createdAt !== "string"
  ) {
    return null;
  }
  const feedback = parseAssistantMessageFeedback(value);
  return feedback
    ? {
        id: value.id,
        threadId: value.threadId,
        messageId: value.messageId,
        createdAt: value.createdAt,
        ...feedback,
      }
    : null;
};

export const parseAssistantFeedbackResult = (
  value: unknown,
): { created: boolean; feedback: AssistantFeedback } | null => {
  if (!isRecord(value)) return null;
  const feedback = parseAssistantFeedback(value.feedback);
  return feedback
    ? { created: value.created === true, feedback }
    : null;
};

export const parseAssistantThreadList = (
  value: unknown,
): AssistantThread[] | null => {
  if (!Array.isArray(value)) return null;
  const parsed = value.flatMap((item) => {
    const thread = parseAssistantThread(item);
    return thread ? [thread] : [];
  });
  return parsed.length === value.length ? parsed : null;
};

export const parseAssistantThreadDetail = (
  value: unknown,
): AssistantThreadDetail | null => {
  if (!isRecord(value)) return null;
  const thread = parseAssistantThread(value.thread);
  if (!thread || !Array.isArray(value.messages)) return null;
  const messages = value.messages.flatMap((item) => {
    const message = parseAssistantMessage(item);
    return message ? [message] : [];
  });
  return messages.length === value.messages.length
    ? { thread, messages }
    : null;
};

export const parseCreateAssistantThreadResult = (
  value: unknown,
): { created: boolean; thread: AssistantThread } | null => {
  if (!isRecord(value)) return null;
  const thread = parseAssistantThread(value.thread);
  return thread
    ? { created: value.created !== false, thread }
    : null;
};

const eventBase = (
  value: unknown,
): Record<string, unknown> | null =>
  isRecord(value) && value.version === 1 ? value : null;

export const parseAssistantStreamEvent = (
  eventName: string,
  value: unknown,
): AssistantStreamEvent | null => {
  const event = eventBase(value);
  if (!event) return null;
  if (
    eventName === "message.accepted" &&
    typeof event.assistantMessageId === "string" &&
    typeof event.correlationId === "string"
  ) {
    const userMessage = parseAssistantMessage(event.userMessage);
    return userMessage
      ? {
          type: eventName,
          version: 1,
          userMessage,
          assistantMessageId: event.assistantMessageId,
          correlationId: event.correlationId,
        }
      : null;
  }
  if (
    eventName === "response.started" &&
    typeof event.assistantMessageId === "string"
  ) {
    return {
      type: eventName,
      version: 1,
      assistantMessageId: event.assistantMessageId,
    };
  }
  if (
    eventName === "response.delta" &&
    typeof event.assistantMessageId === "string" &&
    typeof event.delta === "string" &&
    event.delta.length <= 2_000
  ) {
    return {
      type: eventName,
      version: 1,
      assistantMessageId: event.assistantMessageId,
      delta: event.delta,
    };
  }
  if (
    eventName === "response.completed" &&
    typeof event.correlationId === "string"
  ) {
    const message = parseAssistantMessage(event.message);
    return message
      ? {
          type: eventName,
          version: 1,
          message,
          correlationId: event.correlationId,
        }
      : null;
  }
  if (
    eventName === "response.failed" &&
    typeof event.assistantMessageId === "string" &&
    typeof event.code === "string" &&
    typeof event.message === "string" &&
    typeof event.retryable === "boolean" &&
    typeof event.correlationId === "string"
  ) {
    const retryAfterSeconds = finiteNumber(event.retryAfterSeconds);
    return {
      type: eventName,
      version: 1,
      assistantMessageId: event.assistantMessageId,
      code: event.code,
      message: event.message,
      retryable: event.retryable,
      ...(retryAfterSeconds && retryAfterSeconds > 0
        ? { retryAfterSeconds }
        : {}),
      correlationId: event.correlationId,
    };
  }
  return null;
};
