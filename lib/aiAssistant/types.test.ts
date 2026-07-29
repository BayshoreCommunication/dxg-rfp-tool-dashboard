import { parseAssistantMessage } from "./types";

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
});
