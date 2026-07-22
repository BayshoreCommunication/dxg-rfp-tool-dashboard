"use server";

import { BACKEND_URL } from "@/lib/config";
import { getBackendAccessToken } from "@/lib/server/backendSession";

type ActionResult<T> = { success: true; data: T; correlationId: string } | { success: false; code: string; message: string; correlationId: string };

const safeMessages: Record<string, string> = {
  AUTHENTICATION_REQUIRED: "Your session has expired. Please sign in again.",
  AUTHORIZATION_DENIED: "You do not have permission to perform this action.",
  CONVERSATIONS_DISABLED: "The assisted workspace is not available in this environment.",
  PROPOSAL_CONTEXT_DISABLED: "Requirement extraction is not available in this environment.",
  LIVE_AI_SOURCE_DISABLED: "Live AI processing of uploaded sources is not available in this environment.",
  PROPOSAL_DRAFT_DISABLED: "Draft generation is not available in this environment.",
  INVALID_MESSAGE_CONTENT: "Enter a message before sending.",
  INVALID_MESSAGE_SOURCES: "Choose between one and five approved, ready sources for extraction.",
  INVALID_PROPOSAL_VERSION: "The proposal version is missing or outdated. Refresh the page and try again.",
  IDEMPOTENCY_KEY_REQUIRED: "The message could not be sent safely. Try again.",
  PROPOSAL_VERSION_CONFLICT: "The proposal changed since you last loaded it. Refresh before generating a draft.",
  QUESTION_NOT_FOUND: "This question is no longer available.",
  QUESTION_NOT_OPEN: "This question was already resolved.",
  SOURCE_NOT_FOUND: "This document is no longer available.",
  CONVERSATION_NOT_FOUND: "This conversation is no longer available.",
};

// Backend problem+json titles for these codes are safe, user-facing validation
// messages that vary by field, so they pass through instead of a generic text.
const detailMessageCodes = new Set(["INVALID_CANDIDATE_VALUE", "INVALID_QUESTION_ANSWER"]);

const request = async <T>(path: string, init?: RequestInit, parse?: (value: unknown) => T | null): Promise<ActionResult<T>> => {
  const correlationId = crypto.randomUUID();
  const token = await getBackendAccessToken();
  if (!token) return { success: false, code: "AUTHENTICATION_REQUIRED", message: safeMessages.AUTHENTICATION_REQUIRED, correlationId };
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, "X-Correlation-ID": correlationId, ...(init?.headers ?? {}) },
    });
    const payload: unknown = await response.json().catch(() => null);
    const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const responseCorrelation = response.headers.get("x-correlation-id") || correlationId;
    if (!response.ok) {
      const code = typeof body.code === "string" ? body.code : `HTTP_${response.status}`;
      // Field-validation problems carry a friendly, user-facing title from the
      // backend (e.g. "Candidate date must use the YYYY-MM-DD format.") that
      // the guided question flow shows verbatim so it can re-ask.
      const detail = detailMessageCodes.has(code) && typeof body.title === "string" && body.title.length > 0 && body.title.length <= 300 ? body.title : null;
      return { success: false, code, message: safeMessages[code] ?? detail ?? "The operation could not be completed safely.", correlationId: responseCorrelation };
    }
    const value = parse ? parse(body.data) : body.data as T;
    if (value === null || value === undefined) return { success: false, code: "INVALID_RESPONSE", message: "The service returned an unexpected response.", correlationId: responseCorrelation };
    return { success: true, data: value, correlationId: responseCorrelation };
  } catch {
    return { success: false, code: "NETWORK_ERROR", message: "The service could not be reached. Try again shortly.", correlationId };
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export type ConversationAttachment = { sourceId: string; role: string; filename: string; sourceStatus: string };
export type ConversationRunType = "proposal_context" | "proposal_draft";
export type ConversationMessage = {
  id: string;
  ordinal: number;
  role: "user" | "assistant" | "system_event";
  kind: "note" | "instruction" | "action_request" | "run_result" | "status" | "question_answer";
  content: string;
  intent: string | null;
  runType: ConversationRunType | null;
  runId: string | null;
  jobId: string | null;
  status: "complete" | "pending" | "failed";
  createdAt: string;
  attachments: ConversationAttachment[];
};
export type ConversationQuestionImpact = "schedule" | "cost" | "production" | "scope";
export type ConversationQuestion = {
  id: string;
  code: string;
  severity: "info" | "question" | "blocking";
  paths: string[];
  prompt: string;
  status: "open" | "answered" | "dismissed";
  impact?: ConversationQuestionImpact | null;
  contextRunId: string | null;
  createdAt: string;
};
export type ConversationSummary = { id: string; title: string; status: string; messageCount: number; updatedAt: string };
export type ConversationData = { conversation: ConversationSummary | null; messages: ConversationMessage[]; questions: ConversationQuestion[] };
export type ConversationRunRef = { runType: ConversationRunType; runId: string; jobId: string };
export type PostConversationMessageResult = { created: boolean; message: ConversationMessage | null; assistantMessageId: string | null; run: ConversationRunRef | null };
export type ConversationIntent = "chat" | "extract_requirements" | "generate_draft";
export type NotesSource = { id: string; status: string };

const parseAttachment = (value: unknown): ConversationAttachment | null => {
  if (!isRecord(value) || typeof value.sourceId !== "string") return null;
  return {
    sourceId: value.sourceId,
    role: typeof value.role === "string" ? value.role : "",
    filename: typeof value.filename === "string" ? value.filename : "",
    sourceStatus: typeof value.sourceStatus === "string" ? value.sourceStatus : "",
  };
};

const parseMessage = (value: unknown): ConversationMessage | null => {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const role = value.role === "user" || value.role === "assistant" || value.role === "system_event" ? value.role : "system_event";
  const kinds = ["note", "instruction", "action_request", "run_result", "status", "question_answer"] as const;
  const kind = kinds.includes(value.kind as (typeof kinds)[number]) ? value.kind as ConversationMessage["kind"] : "note";
  const status = value.status === "pending" || value.status === "failed" ? value.status : "complete";
  const runType = value.runType === "proposal_context" || value.runType === "proposal_draft" ? value.runType : null;
  return {
    id: value.id,
    ordinal: typeof value.ordinal === "number" ? value.ordinal : 0,
    role,
    kind,
    content: typeof value.content === "string" ? value.content : "",
    intent: typeof value.intent === "string" ? value.intent : null,
    runType,
    runId: typeof value.runId === "string" ? value.runId : null,
    jobId: typeof value.jobId === "string" ? value.jobId : null,
    status,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    attachments: Array.isArray(value.attachments) ? value.attachments.flatMap(item => { const parsed = parseAttachment(item); return parsed ? [parsed] : []; }) : [],
  };
};

const parseQuestion = (value: unknown): ConversationQuestion | null => {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  return {
    id: value.id,
    code: typeof value.code === "string" ? value.code : "",
    severity: value.severity === "blocking" || value.severity === "info" ? value.severity : "question",
    paths: Array.isArray(value.paths) ? value.paths.filter((item): item is string => typeof item === "string") : [],
    prompt: typeof value.prompt === "string" ? value.prompt : "",
    status: value.status === "answered" || value.status === "dismissed" ? value.status : "open",
    impact: value.impact === "schedule" || value.impact === "cost" || value.impact === "production" || value.impact === "scope" ? value.impact : null,
    contextRunId: typeof value.contextRunId === "string" ? value.contextRunId : null,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
  };
};

const parseConversationData = (value: unknown): ConversationData | null => {
  if (!isRecord(value)) return null;
  const conversation = isRecord(value.conversation) && typeof value.conversation.id === "string"
    ? {
      id: value.conversation.id,
      title: typeof value.conversation.title === "string" ? value.conversation.title : "",
      status: typeof value.conversation.status === "string" ? value.conversation.status : "",
      messageCount: typeof value.conversation.messageCount === "number" ? value.conversation.messageCount : 0,
      updatedAt: typeof value.conversation.updatedAt === "string" ? value.conversation.updatedAt : "",
    }
    : null;
  return {
    conversation,
    messages: Array.isArray(value.messages) ? value.messages.flatMap(item => { const parsed = parseMessage(item); return parsed ? [parsed] : []; }) : [],
    questions: Array.isArray(value.questions) ? value.questions.flatMap(item => { const parsed = parseQuestion(item); return parsed ? [parsed] : []; }) : [],
  };
};

export const getConversationAction = async (proposalId: string): Promise<ActionResult<ConversationData>> =>
  request(`/api/v1/proposals/${encodeURIComponent(proposalId)}/conversation`, undefined, parseConversationData);

export const postConversationMessageAction = async (
  proposalId: string,
  input: { content: string; intent: ConversationIntent; sourceIds?: string[]; expectedProposalVersion?: number },
  idempotencyKey: string,
): Promise<ActionResult<PostConversationMessageResult>> =>
  request(`/api/v1/proposals/${encodeURIComponent(proposalId)}/conversation/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      content: input.content,
      intent: input.intent,
      ...(input.sourceIds ? { sourceIds: input.sourceIds } : {}),
      ...(typeof input.expectedProposalVersion === "number" ? { expectedProposalVersion: input.expectedProposalVersion } : {}),
    }),
  }, value => {
    if (!isRecord(value)) return null;
    let run: ConversationRunRef | null = null;
    if (isRecord(value.run) && typeof value.run.runId === "string" && (value.run.runType === "proposal_context" || value.run.runType === "proposal_draft")) {
      run = { runType: value.run.runType as ConversationRunType, runId: value.run.runId, jobId: typeof value.run.jobId === "string" ? value.run.jobId : "" };
    }
    return {
      created: value.created !== false,
      message: parseMessage(value.message),
      assistantMessageId: typeof value.assistantMessageId === "string" ? value.assistantMessageId : null,
      run,
    };
  });

export const patchConversationQuestionAction = async (
  proposalId: string,
  questionId: string,
  input: { status: "answered" | "dismissed"; answer?: string },
): Promise<ActionResult<{ id: string; status: string; answeredMessageId: string | null; appliedField: { path: string; mongoPath: string; value: unknown } | null }>> =>
  request(`/api/v1/proposals/${encodeURIComponent(proposalId)}/conversation/questions/${encodeURIComponent(questionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }, value => {
    if (!isRecord(value) || typeof value.id !== "string") return null;
    // appliedField reports when the answer was also written into the proposal
    // (single whitelisted-field questions), so the UI can confirm the value.
    const appliedField = isRecord(value.appliedField) && typeof value.appliedField.path === "string"
      ? { path: value.appliedField.path, mongoPath: typeof value.appliedField.mongoPath === "string" ? value.appliedField.mongoPath : "", value: value.appliedField.value }
      : null;
    return {
      id: value.id,
      status: typeof value.status === "string" ? value.status : "",
      answeredMessageId: typeof value.answeredMessageId === "string" ? value.answeredMessageId : null,
      appliedField,
    };
  });

export const createProposalNotesAction = async (
  proposalId: string,
  input: { title?: string; text: string; classification?: "non_confidential" | "confidential" },
  idempotencyKey: string,
): Promise<ActionResult<{ source: NotesSource; created: boolean }>> =>
  request(`/api/v1/proposals/${encodeURIComponent(proposalId)}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  }, value => {
    if (!isRecord(value) || !isRecord(value.source) || typeof value.source.id !== "string") return null;
    return {
      source: { id: value.source.id, status: typeof value.source.status === "string" ? value.source.status : "" },
      created: value.created !== false,
    };
  });
