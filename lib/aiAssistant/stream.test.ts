/** @jest-environment node */

import {
  AssistantStreamProtocolError,
  consumeAssistantStream,
} from "./stream";

const message = {
  id: "01890b2e-58b1-7c7e-9b0a-1a2b3c4d5e71",
  threadId: "01890b2e-58b1-7c7e-9b0a-1a2b3c4d5e6f",
  ordinal: 2,
  role: "assistant",
  content: "Complete ✓",
  status: "complete",
  providerResponseId: "resp_safe",
  model: "model",
  inputTokens: 12,
  outputTokens: 4,
  safeErrorCode: null,
  citations: [],
  createdAt: "2026-07-27T00:00:00.000Z",
  updatedAt: "2026-07-27T00:00:01.000Z",
  completedAt: "2026-07-27T00:00:01.000Z",
};

const streamFromBytes = (parts: Uint8Array[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });

describe("consumeAssistantStream", () => {
  test("handles comments, split UTF-8 chunks, and multiple events per chunk", async () => {
    const source = [
      ": ping\n\n",
      "event: response.started\n",
      'data: {"version":1,"assistantMessageId":"assistant-1"}\n\n',
      "event: response.delta\n",
      'data: {"version":1,"assistantMessageId":"assistant-1","delta":"Hi 🌊"}\n\n',
      "event: response.completed\n",
      `data: ${JSON.stringify({ version: 1, message, correlationId: "corr" })}\n\n`,
    ].join("");
    const encoded = new TextEncoder().encode(source);
    const events: string[] = [];
    const result = await consumeAssistantStream(
      streamFromBytes([
        encoded.slice(0, 19),
        encoded.slice(19, 103),
        encoded.slice(103, 141),
        encoded.slice(141),
      ]),
      (event) => {
        events.push(event.type);
      },
    );
    expect(events).toEqual([
      "response.started",
      "response.delta",
      "response.completed",
    ]);
    expect(result.terminal).toBe(true);
  });

  test("ignores provider or unknown event names", async () => {
    const source =
      'event: response.output_text.delta\ndata: {"delta":"private"}\n\n' +
      'event: response.delta\ndata: {"version":1,"assistantMessageId":"safe","delta":"Visible"}\n\n';
    const events: string[] = [];
    const result = await consumeAssistantStream(
      streamFromBytes([new TextEncoder().encode(source)]),
      (event) => {
        events.push(event.type);
      },
    );
    expect(events).toEqual(["response.delta"]);
    expect(result.terminal).toBe(false);
  });

  test("rejects malformed known product events", async () => {
    const body = streamFromBytes([
      new TextEncoder().encode(
        "event: response.delta\ndata: not-json\n\n",
      ),
    ]);
    await expect(consumeAssistantStream(body, () => undefined)).rejects.toBeInstanceOf(
      AssistantStreamProtocolError,
    );
  });
});
