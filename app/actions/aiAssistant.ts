"use server";

import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import {
  parseAssistantThread,
  parseAssistantThreadDetail,
  parseAssistantThreadList,
  parseCreateAssistantThreadResult,
  type AssistantActionResult,
  type AssistantThread,
  type AssistantThreadDetail,
} from "@/lib/aiAssistant/types";
import { isRecord } from "@/lib/aiAssistant/types";

const safeMessages: Record<string, string> = {
  AUTHENTICATION_REQUIRED: "Your session has expired. Please sign in again.",
  AUTHORIZATION_DENIED: "You do not have access to the AI Assistant.",
  AI_ASSISTANT_DISABLED: "The AI Assistant is not available in this environment.",
  AI_ASSISTANT_ORGANIZATION_NOT_ENABLED:
    "The AI Assistant is not enabled for this organization.",
  AI_ASSISTANT_KILLED: "The AI Assistant is temporarily unavailable.",
  ASSISTANT_THREAD_NOT_FOUND: "This conversation is no longer available.",
  ASSISTANT_THREAD_ARCHIVED: "This conversation is archived.",
  INVALID_ASSISTANT_PAGINATION: "The requested conversation page is invalid.",
  INVALID_ASSISTANT_THREAD_UPDATE: "This conversation could not be updated.",
  ASSISTANT_IDEMPOTENCY_CONFLICT:
    "This request conflicts with an earlier assistant action. Refresh and try again.",
};

const unknownFailureMessage = (correlationId: string) =>
  `We couldn't complete that request. Try again. Reference: ${correlationId}`;

const parseAssistantAccess = (
  value: unknown,
): { enabled: boolean } | null =>
  isRecord(value) && typeof value.enabled === "boolean"
    ? { enabled: value.enabled }
    : null;

const request = async <T>(
  path: string,
  init: RequestInit | undefined,
  parse: (value: unknown) => T | null,
): Promise<AssistantActionResult<T>> => {
  const correlationId = crypto.randomUUID();
  try {
    const response = await authenticatedBackendFetch(`${BACKEND_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "X-Correlation-ID": correlationId,
        ...(init?.headers ?? {}),
      },
    });
    const payload: unknown = await response.json().catch(() => null);
    const body = isRecord(payload) ? payload : {};
    const responseCorrelation =
      response.headers.get("x-correlation-id") ||
      (typeof body.correlationId === "string"
        ? body.correlationId
        : correlationId);
    if (!response.ok) {
      const code =
        typeof body.code === "string"
          ? body.code
          : `HTTP_${response.status}`;
      const bodyRetryAfter =
        typeof body.retryAfterSeconds === "number"
          ? body.retryAfterSeconds
          : Number(response.headers.get("retry-after"));
      const retryAfterSeconds =
        Number.isFinite(bodyRetryAfter) && bodyRetryAfter > 0
          ? Math.ceil(bodyRetryAfter)
          : undefined;
      return {
        success: false,
        code,
        message:
          safeMessages[code] ?? unknownFailureMessage(responseCorrelation),
        correlationId: responseCorrelation,
        retryable: body.retryable === true || response.status >= 500,
        ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
      };
    }
    const parsed = parse(body.data);
    if (parsed === null) {
      return {
        success: false,
        code: "INVALID_RESPONSE",
        message: "The assistant service returned an unexpected response.",
        correlationId: responseCorrelation,
        retryable: true,
      };
    }
    return {
      success: true,
      data: parsed,
      correlationId: responseCorrelation,
    };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      message: "The assistant service could not be reached. Try again shortly.",
      correlationId,
      retryable: true,
    };
  }
};

export const listAssistantThreadsAction = async (
  limit = 25,
): Promise<AssistantActionResult<AssistantThread[]>> =>
  request(
    `/api/v1/assistant/threads?limit=${encodeURIComponent(String(limit))}`,
    undefined,
    parseAssistantThreadList,
  );

export const getAssistantAccessAction = async (): Promise<
  AssistantActionResult<{ enabled: boolean }>
> =>
  request(
    "/api/v1/assistant/access",
    undefined,
    parseAssistantAccess,
  );

export const createAssistantThreadAction = async (
  title: string,
  idempotencyKey: string,
): Promise<
  AssistantActionResult<{ created: boolean; thread: AssistantThread }>
> =>
  request(
    "/api/v1/assistant/threads",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ title }),
    },
    parseCreateAssistantThreadResult,
  );

export const getAssistantThreadAction = async (
  threadId: string,
  options: { limit?: number; beforeOrdinal?: number } = {},
): Promise<AssistantActionResult<AssistantThreadDetail>> => {
  const query = new URLSearchParams({
    limit: String(options.limit ?? 100),
  });
  if (options.beforeOrdinal) {
    query.set("beforeOrdinal", String(options.beforeOrdinal));
  }
  return request(
    `/api/v1/assistant/threads/${encodeURIComponent(threadId)}?${query}`,
    undefined,
    parseAssistantThreadDetail,
  );
};

export const archiveAssistantThreadAction = async (
  threadId: string,
): Promise<AssistantActionResult<AssistantThread>> =>
  request(
    `/api/v1/assistant/threads/${encodeURIComponent(threadId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    },
    parseAssistantThread,
  );

export const getAssistantBootstrapAction = async (): Promise<
  AssistantActionResult<{
    threads: AssistantThread[];
    detail: AssistantThreadDetail | null;
  }>
> => {
  const threadsResult = await listAssistantThreadsAction();
  if (!threadsResult.success) return threadsResult;

  const activeThread = threadsResult.data.find(
    (thread) => thread.status === "active",
  );
  if (!activeThread) {
    return {
      success: true,
      data: { threads: threadsResult.data, detail: null },
      correlationId: threadsResult.correlationId,
    };
  }

  const detailResult = await getAssistantThreadAction(activeThread.id);
  if (!detailResult.success) return detailResult;
  return {
    success: true,
    data: {
      threads: threadsResult.data,
      detail: detailResult.data,
    },
    correlationId: detailResult.correlationId,
  };
};
