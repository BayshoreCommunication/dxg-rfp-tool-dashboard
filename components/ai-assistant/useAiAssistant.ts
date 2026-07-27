"use client";

import {
  archiveAssistantThreadAction,
  createAssistantThreadAction,
  getAssistantThreadAction,
  listAssistantThreadsAction,
} from "@/app/actions/aiAssistant";
import { consumeAssistantStream } from "@/lib/aiAssistant/stream";
import {
  ASSISTANT_MESSAGE_MAX_LENGTH,
  isRecord,
  type AssistantDisplayMessage,
  type AssistantStreamEvent,
  type AssistantThread,
  type AssistantThreadDetail,
  type AssistantUiError,
} from "@/lib/aiAssistant/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

type ConversationStatus =
  | "empty"
  | "loading"
  | "ready"
  | "sending"
  | "streaming"
  | "error";

type PendingRequest = {
  content: string;
  userIdempotencyKey: string;
  responseIdempotencyKey: string;
  threadId: string | null;
  threadIdempotencyKey: string;
  optimisticId: string | null;
  accepted: boolean;
};

export type AssistantUiState = {
  threads: AssistantThread[];
  selectedThreadId: string | null;
  messages: AssistantDisplayMessage[];
  threadListStatus: "idle" | "loading" | "ready" | "error";
  conversationStatus: ConversationStatus;
  streamingAssistant: {
    messageId: string;
    content: string;
    receivedFirstDelta: boolean;
  } | null;
  error: AssistantUiError | null;
  isNearBottom: boolean;
  draft: string;
  pendingRequest: PendingRequest | null;
  retryAvailableAt: number | null;
};

type Action =
  | { type: "THREADS_LOADING" }
  | { type: "THREADS_LOADED"; threads: AssistantThread[] }
  | { type: "THREADS_FAILED" }
  | { type: "SELECT_LOADING"; threadId: string }
  | { type: "SELECT_LOADED"; detail: AssistantThreadDetail; draft: string }
  | { type: "SELECT_FAILED"; error: AssistantUiError }
  | { type: "NEW_CHAT"; draft: string }
  | { type: "SET_DRAFT"; draft: string }
  | { type: "SET_NEAR_BOTTOM"; value: boolean }
  | { type: "SEND_STARTED"; pending: PendingRequest }
  | {
      type: "THREAD_CREATED";
      thread: AssistantThread;
      pending: PendingRequest;
      optimistic: AssistantDisplayMessage;
    }
  | {
      type: "OPTIMISTIC_ADDED";
      pending: PendingRequest;
      optimistic: AssistantDisplayMessage;
    }
  | { type: "STREAM_EVENT"; event: AssistantStreamEvent }
  | { type: "REQUEST_FAILED"; error: AssistantUiError }
  | { type: "REQUEST_ABORTED"; showError: boolean }
  | { type: "ARCHIVED"; threadId: string; draft: string }
  | { type: "CLEAR_ERROR" };

const nowIso = () => new Date().toISOString();

const optimisticMessage = (
  threadId: string,
  content: string,
  id: string,
  ordinal: number,
): AssistantDisplayMessage => ({
  id,
  threadId,
  ordinal,
  role: "user",
  content,
  status: "complete",
  providerResponseId: null,
  model: null,
  inputTokens: null,
  outputTokens: null,
  safeErrorCode: null,
  citations: [],
  createdAt: nowIso(),
  updatedAt: nowIso(),
  completedAt: nowIso(),
  optimistic: true,
});

const failedStreamingMessage = (
  state: AssistantUiState,
  event: Extract<AssistantStreamEvent, { type: "response.failed" }>,
): AssistantDisplayMessage | null => {
  const streaming = state.streamingAssistant;
  if (!streaming?.content) return null;
  const stamp = nowIso();
  return {
    id: streaming.messageId,
    threadId: state.selectedThreadId || "",
    ordinal:
      state.messages.reduce(
        (maximum, message) => Math.max(maximum, message.ordinal),
        0,
      ) + 1,
    role: "assistant",
    content: streaming.content,
    status: event.code === "ASSISTANT_STREAM_ABORTED" ? "aborted" : "failed",
    providerResponseId: null,
    model: null,
    inputTokens: null,
    outputTokens: null,
    safeErrorCode: event.code,
    citations: [],
    createdAt: stamp,
    updatedAt: stamp,
    completedAt: stamp,
  };
};

const upsertMessage = (
  messages: AssistantDisplayMessage[],
  message: AssistantDisplayMessage,
) =>
  [...messages.filter((current) => current.id !== message.id), message].sort(
    (left, right) => left.ordinal - right.ordinal,
  );

const initialState = (
  threads: AssistantThread[],
  detail: AssistantThreadDetail | null,
  initialError: AssistantUiError | null,
): AssistantUiState => ({
  threads,
  selectedThreadId: detail?.thread.id ?? null,
  messages: detail?.messages ?? [],
  threadListStatus: initialError ? "error" : "ready",
  conversationStatus: initialError
    ? "error"
    : detail
      ? "ready"
      : "empty",
  streamingAssistant: null,
  error: initialError,
  isNearBottom: true,
  draft: "",
  pendingRequest: null,
  retryAvailableAt: null,
});

export const aiAssistantReducer = (
  state: AssistantUiState,
  action: Action,
): AssistantUiState => {
  switch (action.type) {
    case "THREADS_LOADING":
      return { ...state, threadListStatus: "loading" };
    case "THREADS_LOADED":
      return {
        ...state,
        threads: action.threads,
        threadListStatus: "ready",
        error: state.selectedThreadId ? state.error : null,
        conversationStatus: state.selectedThreadId
          ? state.conversationStatus
          : "empty",
      };
    case "THREADS_FAILED":
      return { ...state, threadListStatus: "error" };
    case "SELECT_LOADING":
      return {
        ...state,
        selectedThreadId: action.threadId,
        messages: [],
        streamingAssistant: null,
        conversationStatus: "loading",
        error: null,
        pendingRequest: null,
        retryAvailableAt: null,
      };
    case "SELECT_LOADED":
      return {
        ...state,
        selectedThreadId: action.detail.thread.id,
        messages: action.detail.messages,
        conversationStatus: "ready",
        error: null,
        draft: action.draft,
      };
    case "SELECT_FAILED":
      return {
        ...state,
        conversationStatus: "error",
        error: action.error,
      };
    case "NEW_CHAT":
      return {
        ...state,
        selectedThreadId: null,
        messages: [],
        streamingAssistant: null,
        conversationStatus: "empty",
        error: null,
        draft: action.draft,
        pendingRequest: null,
        retryAvailableAt: null,
      };
    case "SET_DRAFT":
      return { ...state, draft: action.draft };
    case "SET_NEAR_BOTTOM":
      return { ...state, isNearBottom: action.value };
    case "SEND_STARTED":
      return {
        ...state,
        conversationStatus: "sending",
        error: null,
        pendingRequest: action.pending,
        retryAvailableAt: null,
      };
    case "THREAD_CREATED":
      return {
        ...state,
        selectedThreadId: action.thread.id,
        threads: [
          action.thread,
          ...state.threads.filter((thread) => thread.id !== action.thread.id),
        ],
        messages: [action.optimistic],
        conversationStatus: "sending",
        pendingRequest: action.pending,
      };
    case "OPTIMISTIC_ADDED":
      return {
        ...state,
        messages: state.messages.some(
          (message) => message.id === action.optimistic.id,
        )
          ? state.messages
          : [...state.messages, action.optimistic],
        conversationStatus: "sending",
        pendingRequest: action.pending,
      };
    case "STREAM_EVENT": {
      const event = action.event;
      if (event.type === "message.accepted") {
        const optimisticId = state.pendingRequest?.optimisticId;
        const withoutOptimistic = optimisticId
          ? state.messages.filter((message) => message.id !== optimisticId)
          : state.messages;
        const messages = withoutOptimistic.some(
          (message) => message.id === event.userMessage.id,
        )
          ? withoutOptimistic
          : upsertMessage(withoutOptimistic, event.userMessage);
        return {
          ...state,
          messages,
          draft: "",
          pendingRequest: state.pendingRequest
            ? { ...state.pendingRequest, accepted: true }
            : null,
          streamingAssistant: {
            messageId: event.assistantMessageId,
            content: "",
            receivedFirstDelta: false,
          },
          conversationStatus: "sending",
          error: null,
        };
      }
      if (event.type === "response.started") {
        return {
          ...state,
          streamingAssistant:
            state.streamingAssistant ?? {
              messageId: event.assistantMessageId,
              content: "",
              receivedFirstDelta: false,
            },
          conversationStatus: "sending",
        };
      }
      if (event.type === "response.delta") {
        const current =
          state.streamingAssistant?.messageId === event.assistantMessageId
            ? state.streamingAssistant
            : {
                messageId: event.assistantMessageId,
                content: "",
                receivedFirstDelta: false,
              };
        return {
          ...state,
          streamingAssistant: {
            ...current,
            content: current.content + event.delta,
            receivedFirstDelta: true,
          },
          conversationStatus: "streaming",
        };
      }
      if (event.type === "response.completed") {
        return {
          ...state,
          messages: upsertMessage(state.messages, event.message),
          streamingAssistant: null,
          conversationStatus: "ready",
          error: null,
          pendingRequest: null,
          retryAvailableAt: null,
        };
      }
      const partial = failedStreamingMessage(state, event);
      const error: AssistantUiError = {
        code: event.code,
        message: event.message,
        correlationId: event.correlationId,
        retryable: event.retryable,
        ...(event.retryAfterSeconds
          ? { retryAfterSeconds: event.retryAfterSeconds }
          : {}),
      };
      return {
        ...state,
        messages: partial
          ? upsertMessage(state.messages, partial)
          : state.messages,
        streamingAssistant: null,
        conversationStatus: "error",
        error,
        retryAvailableAt: event.retryAfterSeconds
          ? Date.now() + event.retryAfterSeconds * 1_000
          : null,
      };
    }
    case "REQUEST_FAILED":
      {
        const partial = failedStreamingMessage(state, {
          type: "response.failed",
          version: 1,
          assistantMessageId:
            state.streamingAssistant?.messageId || "interrupted",
          code: action.error.code,
          message: action.error.message,
          retryable: action.error.retryable,
          ...(action.error.retryAfterSeconds
            ? { retryAfterSeconds: action.error.retryAfterSeconds }
            : {}),
          correlationId: action.error.correlationId || "",
        });
      return {
        ...state,
        messages: partial
          ? upsertMessage(state.messages, partial)
          : state.messages,
        streamingAssistant: null,
        conversationStatus: "error",
        error: action.error,
        retryAvailableAt: action.error.retryAfterSeconds
          ? Date.now() + action.error.retryAfterSeconds * 1_000
          : null,
      };
      }
    case "REQUEST_ABORTED":
      {
        const partial =
          action.showError && state.streamingAssistant?.content
            ? failedStreamingMessage(state, {
                type: "response.failed",
                version: 1,
                assistantMessageId: state.streamingAssistant.messageId,
                code: "ASSISTANT_STREAM_ABORTED",
                message: "The assistant response was stopped.",
                retryable: true,
                correlationId: "",
              })
            : null;
      return {
        ...state,
        messages: partial
          ? upsertMessage(state.messages, partial)
          : state.messages,
        streamingAssistant: null,
        conversationStatus: action.showError ? "error" : "ready",
        error: action.showError
          ? {
              code: "ASSISTANT_STREAM_ABORTED",
              message: "The assistant response was stopped.",
              retryable: true,
            }
          : null,
      };
      }
    case "ARCHIVED": {
      const threads = state.threads.filter(
        (thread) => thread.id !== action.threadId,
      );
      if (state.selectedThreadId !== action.threadId) {
        return { ...state, threads };
      }
      return {
        ...state,
        threads,
        selectedThreadId: null,
        messages: [],
        streamingAssistant: null,
        conversationStatus: "empty",
        error: null,
        draft: action.draft,
        pendingRequest: null,
      };
    }
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
        conversationStatus: state.selectedThreadId ? "ready" : "empty",
      };
  }
};

const draftStorageKey = (threadId: string | null) =>
  `rfpilot:ai-assistant-draft:${threadId ?? "new"}`;

const readDraft = (threadId: string | null): string => {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(draftStorageKey(threadId)) || "";
};

const threadTitle = (content: string) => {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length <= 64
    ? normalized
    : `${normalized.slice(0, 61).trimEnd()}…`;
};

const safeHttpError = async (response: Response): Promise<AssistantUiError> => {
  const payload: unknown = await response.json().catch(() => null);
  const body = isRecord(payload) ? payload : {};
  const correlationId =
    response.headers.get("x-correlation-id") ||
    (typeof body.correlationId === "string" ? body.correlationId : undefined);
  const code =
    typeof body.code === "string" ? body.code : `HTTP_${response.status}`;
  const retryAfterHeader = Number(response.headers.get("retry-after"));
  const retryAfterBody =
    typeof body.retryAfterSeconds === "number"
      ? body.retryAfterSeconds
      : undefined;
  const retryAfterSeconds =
    retryAfterBody ||
    (Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? Math.ceil(retryAfterHeader)
      : undefined);
  const safeFallback =
    response.status === 401
      ? "Your session has expired. Please sign in again."
      : response.status === 403
        ? "You do not have access to the AI Assistant."
        : response.status === 429
          ? "Too many assistant requests. Please wait and try again."
          : "The assistant could not complete the request.";
  return {
    code,
    message:
      typeof body.title === "string" &&
      body.title.length > 0 &&
      body.title.length <= 300
        ? body.title
        : safeFallback,
    ...(correlationId ? { correlationId } : {}),
    retryable: body.retryable === true || response.status >= 500,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  };
};

const localFailure = (): AssistantUiError => ({
  code: "NETWORK_ERROR",
  message: "The assistant connection was interrupted. Try again.",
  retryable: true,
});

export function useAiAssistant({
  initialThreads,
  initialDetail,
  initialError = null,
}: {
  initialThreads: AssistantThread[];
  initialDetail: AssistantThreadDetail | null;
  initialError?: AssistantUiError | null;
}) {
  const [state, dispatch] = useReducer(
    aiAssistantReducer,
    initialState(initialThreads, initialDetail, initialError),
  );
  const stateRef = useRef(state);
  const abortRef = useRef<AbortController | null>(null);
  const abortReasonRef = useRef<"user" | "navigation" | null>(null);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const stored = readDraft(state.selectedThreadId);
    if (stored && !state.draft) dispatch({ type: "SET_DRAFT", draft: stored });
    // The selected-thread transition explicitly loads its own stored draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = draftStorageKey(state.selectedThreadId);
    if (state.draft) window.sessionStorage.setItem(key, state.draft);
    else window.sessionStorage.removeItem(key);
  }, [state.draft, state.selectedThreadId]);

  useEffect(() => {
    if (!state.retryAvailableAt) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [state.retryAvailableAt]);

  useEffect(
    () => () => {
      abortReasonRef.current = "navigation";
      abortRef.current?.abort();
    },
    [],
  );

  const retryAfterSeconds = state.retryAvailableAt
    ? Math.max(0, Math.ceil((state.retryAvailableAt - clock) / 1_000))
    : 0;

  const refreshThreads = useCallback(async () => {
    dispatch({ type: "THREADS_LOADING" });
    const result = await listAssistantThreadsAction();
    dispatch(
      result.success
        ? { type: "THREADS_LOADED", threads: result.data }
        : { type: "THREADS_FAILED" },
    );
  }, []);

  const selectThread = useCallback(async (threadId: string) => {
    if (
      stateRef.current.selectedThreadId === threadId &&
      stateRef.current.conversationStatus !== "error"
    ) {
      return;
    }
    abortReasonRef.current = "navigation";
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "SELECT_LOADING", threadId });
    const result = await getAssistantThreadAction(threadId);
    if (result.success) {
      dispatch({
        type: "SELECT_LOADED",
        detail: result.data,
        draft: readDraft(threadId),
      });
    } else {
      dispatch({
        type: "SELECT_FAILED",
        error: {
          code: result.code,
          message: result.message,
          correlationId: result.correlationId,
          retryable: result.retryable,
          ...(result.retryAfterSeconds
            ? { retryAfterSeconds: result.retryAfterSeconds }
            : {}),
        },
      });
    }
  }, []);

  const newChat = useCallback(() => {
    abortReasonRef.current = "navigation";
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "NEW_CHAT", draft: readDraft(null) });
  }, []);

  const archiveThread = useCallback(async (threadId: string) => {
    const result = await archiveAssistantThreadAction(threadId);
    if (!result.success) {
      dispatch({
        type: "REQUEST_FAILED",
        error: {
          code: result.code,
          message: result.message,
          correlationId: result.correlationId,
          retryable: result.retryable,
        },
      });
      return false;
    }
    dispatch({
      type: "ARCHIVED",
      threadId,
      draft: readDraft(null),
    });
    return true;
  }, []);

  const runRequest = useCallback(
    async (pendingInput: PendingRequest, explicitRetry = false) => {
      let pending = pendingInput;
      dispatch({ type: "SEND_STARTED", pending });
      let threadId =
        pending.threadId || stateRef.current.selectedThreadId;

      if (!threadId) {
        const created = await createAssistantThreadAction(
          threadTitle(pending.content),
          pending.threadIdempotencyKey,
        );
        if (!created.success) {
          dispatch({
            type: "REQUEST_FAILED",
            error: {
              code: created.code,
              message: created.message,
              correlationId: created.correlationId,
              retryable: created.retryable,
              ...(created.retryAfterSeconds
                ? { retryAfterSeconds: created.retryAfterSeconds }
                : {}),
            },
          });
          return;
        }
        threadId = created.data.thread.id;
        const optimisticId =
          pending.optimisticId || `local:${pending.userIdempotencyKey}`;
        pending = { ...pending, threadId, optimisticId };
        dispatch({
          type: "THREAD_CREATED",
          thread: created.data.thread,
          pending,
          optimistic: optimisticMessage(
            threadId,
            pending.content,
            optimisticId,
            1,
          ),
        });
      } else if (!explicitRetry && !pending.accepted) {
        const optimisticId =
          pending.optimisticId || `local:${pending.userIdempotencyKey}`;
        pending = { ...pending, threadId, optimisticId };
        dispatch({
          type: "OPTIMISTIC_ADDED",
          pending,
          optimistic: optimisticMessage(
            threadId,
            pending.content,
            optimisticId,
            stateRef.current.messages.reduce(
              (maximum, message) => Math.max(maximum, message.ordinal),
              0,
            ) + 1,
          ),
        });
      }

      const controller = new AbortController();
      abortReasonRef.current = null;
      abortRef.current = controller;
      try {
        const response = await fetch(
          `/api/ai-assistant/threads/${encodeURIComponent(threadId)}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: pending.content,
              idempotencyKey: pending.userIdempotencyKey,
              responseIdempotencyKey:
                pending.responseIdempotencyKey,
            }),
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok || !response.body) {
          dispatch({
            type: "REQUEST_FAILED",
            error: await safeHttpError(response),
          });
          return;
        }
        const result = await consumeAssistantStream(
          response.body,
          async (event) => {
            dispatch({ type: "STREAM_EVENT", event });
          },
        );
        if (!result.terminal) {
          dispatch({
            type: "REQUEST_FAILED",
            error: {
              code: "ASSISTANT_STREAM_INTERRUPTED",
              message: "The assistant response was interrupted.",
              retryable: true,
            },
          });
        } else {
          void refreshThreads();
        }
      } catch (error) {
        const aborted =
          error instanceof DOMException && error.name === "AbortError";
        if (aborted) {
          dispatch({
            type: "REQUEST_ABORTED",
            showError: abortReasonRef.current === "user",
          });
        } else {
          dispatch({ type: "REQUEST_FAILED", error: localFailure() });
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [refreshThreads],
  );

  const send = useCallback(async () => {
    const content = stateRef.current.draft.trim();
    if (
      !content ||
      content.length > ASSISTANT_MESSAGE_MAX_LENGTH ||
      retryAfterSeconds > 0 ||
      stateRef.current.conversationStatus === "sending" ||
      stateRef.current.conversationStatus === "streaming"
    ) {
      return;
    }
    const pending: PendingRequest = {
      content,
      userIdempotencyKey: `assistant-message:${crypto.randomUUID()}`,
      responseIdempotencyKey: `assistant-response:${crypto.randomUUID()}`,
      threadId: stateRef.current.selectedThreadId,
      threadIdempotencyKey: `assistant-thread:${crypto.randomUUID()}`,
      optimisticId: null,
      accepted: false,
    };
    await runRequest(pending);
  }, [retryAfterSeconds, runRequest]);

  const retry = useCallback(async () => {
    const current = stateRef.current.pendingRequest;
    if (!current || retryAfterSeconds > 0) return;
    const explicitRetry = current.accepted;
    const pending = explicitRetry
      ? {
          ...current,
          responseIdempotencyKey: `assistant-response:${crypto.randomUUID()}`,
          optimisticId: null,
        }
      : current;
    await runRequest(pending, explicitRetry);
  }, [retryAfterSeconds, runRequest]);

  const abort = useCallback(() => {
    abortReasonRef.current = "user";
    abortRef.current?.abort();
  }, []);

  const setDraft = useCallback(
    (draft: string) => dispatch({ type: "SET_DRAFT", draft }),
    [],
  );
  const setNearBottom = useCallback(
    (value: boolean) => dispatch({ type: "SET_NEAR_BOTTOM", value }),
    [],
  );
  const clearError = useCallback(
    () => dispatch({ type: "CLEAR_ERROR" }),
    [],
  );

  const busy =
    state.conversationStatus === "sending" ||
    state.conversationStatus === "streaming";
  const canSend =
    !busy &&
    retryAfterSeconds === 0 &&
    state.draft.trim().length > 0 &&
    state.draft.trim().length <= ASSISTANT_MESSAGE_MAX_LENGTH;

  return useMemo(
    () => ({
      state,
      busy,
      canSend,
      retryAfterSeconds,
      setDraft,
      setNearBottom,
      selectThread,
      newChat,
      archiveThread,
      send,
      retry,
      abort,
      clearError,
      refreshThreads,
    }),
    [
      state,
      busy,
      canSend,
      retryAfterSeconds,
      setDraft,
      setNearBottom,
      selectThread,
      newChat,
      archiveThread,
      send,
      retry,
      abort,
      clearError,
      refreshThreads,
    ],
  );
}
