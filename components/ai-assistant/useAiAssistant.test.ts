import {
  aiAssistantReducer,
  type AssistantUiState,
} from "./useAiAssistant";

jest.mock("@/app/actions/aiAssistant", () => ({
  archiveAssistantThreadAction: jest.fn(),
  createAssistantThreadAction: jest.fn(),
  getAssistantThreadAction: jest.fn(),
  listAssistantThreadsAction: jest.fn(),
}));

const threadId = "01890b2e-58b1-7c7e-9b0a-1a2b3c4d5e6f";
const userMessage = {
  id: "user-1",
  threadId,
  ordinal: 1,
  role: "user" as const,
  content: "Where are proposals?",
  status: "complete" as const,
  providerResponseId: null,
  model: null,
  inputTokens: null,
  outputTokens: null,
  safeErrorCode: null,
  citations: [],
  createdAt: "2026-07-27T00:00:00.000Z",
  updatedAt: "2026-07-27T00:00:00.000Z",
  completedAt: "2026-07-27T00:00:00.000Z",
};

const state: AssistantUiState = {
  threads: [],
  selectedThreadId: threadId,
  messages: [
    {
      ...userMessage,
      id: "local:user-key",
      optimistic: true,
    },
  ],
  threadListStatus: "ready",
  conversationStatus: "sending",
  streamingAssistant: null,
  error: null,
  isNearBottom: true,
  draft: userMessage.content,
  pendingRequest: {
    content: userMessage.content,
    userIdempotencyKey: "user-key",
    responseIdempotencyKey: "response-key",
    threadId,
    threadIdempotencyKey: "thread-key",
    optimisticId: "local:user-key",
    accepted: false,
  },
  retryAvailableAt: null,
};

describe("aiAssistantReducer", () => {
  test("reconciles an optimistic user message with the accepted durable row", () => {
    const next = aiAssistantReducer(state, {
      type: "STREAM_EVENT",
      event: {
        type: "message.accepted",
        version: 1,
        userMessage,
        assistantMessageId: "assistant-1",
        correlationId: "corr",
      },
    });
    expect(next.messages).toEqual([userMessage]);
    expect(next.pendingRequest?.accepted).toBe(true);
    expect(next.draft).toBe("");
    expect(next.streamingAssistant).toEqual({
      messageId: "assistant-1",
      content: "",
      receivedFirstDelta: false,
    });
  });

  test("retains visible partial output when a stream fails", () => {
    const streaming = {
      ...state,
      messages: [userMessage],
      streamingAssistant: {
        messageId: "assistant-1",
        content: "Partial guidance",
        receivedFirstDelta: true,
      },
      pendingRequest: { ...state.pendingRequest!, accepted: true },
    };
    const next = aiAssistantReducer(streaming, {
      type: "STREAM_EVENT",
      event: {
        type: "response.failed",
        version: 1,
        assistantMessageId: "assistant-1",
        code: "ASSISTANT_STREAM_INTERRUPTED",
        message: "The response was interrupted.",
        retryable: true,
        correlationId: "corr",
      },
    });
    expect(next.messages.at(-1)).toMatchObject({
      id: "assistant-1",
      content: "Partial guidance",
      status: "failed",
      safeErrorCode: "ASSISTANT_STREAM_INTERRUPTED",
    });
    expect(next.error?.retryable).toBe(true);
  });
});
