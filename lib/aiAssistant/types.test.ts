import {
  parseAssistantFeedbackResult,
  parseAssistantMessage,
} from "./types";

describe("assistant message parsing", () => {
  test("accepts bounded product intent metadata for structured handoffs", () => {
    expect(
      parseAssistantMessage({
        id: "message-1",
        threadId: "thread-1",
        ordinal: 2,
        role: "assistant",
        content: "Choose a proposal.",
        status: "complete",
        intent: "proposal_specific_request",
        intentVersion: "assistant-intent-router.v1",
        intentSource: "deterministic",
        intentConfidence: "high",
        citations: [],
      }),
    ).toEqual(
      expect.objectContaining({
        intent: "proposal_specific_request",
        intentVersion: "assistant-intent-router.v1",
        intentSource: "deterministic",
        intentConfidence: "high",
      }),
    );
  });

  test("drops unknown intent metadata instead of activating a handoff", () => {
    expect(
      parseAssistantMessage({
        id: "message-1",
        threadId: "thread-1",
        ordinal: 2,
        role: "assistant",
        content: "Unknown",
        status: "complete",
        intent: "open_arbitrary_url",
        intentVersion: "attacker",
        intentSource: "provider",
        intentConfidence: "certain",
        citations: [],
      }),
    ).toEqual(
      expect.objectContaining({
        intent: null,
        intentVersion: "attacker",
        intentSource: null,
        intentConfidence: null,
      }),
    );
  });

  test("accepts bounded response metadata and persisted feedback", () => {
    expect(
      parseAssistantMessage({
        id: "message-1",
        threadId: "thread-1",
        ordinal: 2,
        role: "assistant",
        content: "Use the proposal editor.",
        status: "complete",
        responseKind: "answer",
        promptVersion: "platform-assistant.v5",
        knowledgeVersion: "platform-map.v5",
        firstTokenMs: 125,
        completionLatencyMs: 640,
        feedback: {
          value: "not_helpful",
          reason: "missing_steps",
          updatedAt: "2026-07-29T08:00:00.000Z",
        },
        citations: [],
      }),
    ).toEqual(
      expect.objectContaining({
        responseKind: "answer",
        promptVersion: "platform-assistant.v5",
        knowledgeVersion: "platform-map.v5",
        firstTokenMs: 125,
        completionLatencyMs: 640,
        feedback: {
          value: "not_helpful",
          reason: "missing_steps",
          updatedAt: "2026-07-29T08:00:00.000Z",
        },
      }),
    );
  });

  test("drops malformed embedded feedback without dropping the message", () => {
    expect(
      parseAssistantMessage({
        id: "message-1",
        threadId: "thread-1",
        ordinal: 2,
        role: "assistant",
        content: "Use the proposal editor.",
        status: "complete",
        feedback: {
          value: "helpful",
          reason: "incorrect",
          updatedAt: "2026-07-29T08:00:00.000Z",
        },
        citations: [],
      }),
    ).toEqual(expect.objectContaining({ feedback: null }));
  });

  test("parses a feedback write result", () => {
    expect(
      parseAssistantFeedbackResult({
        created: true,
        feedback: {
          id: "feedback-1",
          threadId: "thread-1",
          messageId: "message-1",
          value: "helpful",
          reason: null,
          createdAt: "2026-07-29T08:00:00.000Z",
          updatedAt: "2026-07-29T08:00:00.000Z",
        },
      }),
    ).toEqual({
      created: true,
      feedback: {
        id: "feedback-1",
        threadId: "thread-1",
        messageId: "message-1",
        value: "helpful",
        reason: null,
        createdAt: "2026-07-29T08:00:00.000Z",
        updatedAt: "2026-07-29T08:00:00.000Z",
      },
    });
  });
});
