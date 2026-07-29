import {
  parseAssistantStreamEvent,
  type AssistantStreamEvent,
} from "./types";

const productEvents = new Set([
  "message.accepted",
  "response.started",
  "response.delta",
  "response.completed",
  "response.failed",
]);

export class AssistantStreamProtocolError extends Error {
  readonly code = "INVALID_ASSISTANT_STREAM";
}

const parseBlock = (block: string): AssistantStreamEvent | null => {
  let eventName = "";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? "" : line.slice(separator + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") eventName = value;
    if (field === "data") data.push(value);
  }
  if (!eventName || !productEvents.has(eventName)) return null;
  if (data.length === 0) {
    throw new AssistantStreamProtocolError(
      `Assistant event ${eventName} did not contain data.`,
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(data.join("\n"));
  } catch {
    throw new AssistantStreamProtocolError(
      `Assistant event ${eventName} contained invalid JSON.`,
    );
  }
  const parsed = parseAssistantStreamEvent(eventName, value);
  if (!parsed) {
    throw new AssistantStreamProtocolError(
      `Assistant event ${eventName} did not match version 1.`,
    );
  }
  return parsed;
};

export async function consumeAssistantStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: AssistantStreamEvent) => void | Promise<void>,
): Promise<{ terminal: boolean }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let terminal = false;

  const consumeBlocks = async (flush = false) => {
    buffer = buffer.replace(/\r\n?/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = parseBlock(block);
      if (event) {
        await onEvent(event);
        terminal =
          terminal ||
          event.type === "response.completed" ||
          event.type === "response.failed";
      }
      boundary = buffer.indexOf("\n\n");
    }
    if (flush && buffer.trim()) {
      const event = parseBlock(buffer);
      buffer = "";
      if (event) {
        await onEvent(event);
        terminal =
          terminal ||
          event.type === "response.completed" ||
          event.type === "response.failed";
      }
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      await consumeBlocks();
    }
    buffer += decoder.decode();
    await consumeBlocks(true);
    return { terminal };
  } finally {
    reader.releaseLock();
  }
}
