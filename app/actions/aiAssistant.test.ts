/** @jest-environment node */

import {
  createAssistantThreadAction,
  getAssistantThreadAction,
  listAssistantThreadsAction,
} from "./aiAssistant";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));

const mockedFetch = jest.mocked(authenticatedBackendFetch);
const thread = {
  id: "01890b2e-58b1-7c7e-9b0a-1a2b3c4d5e6f",
  title: "Proposal workflow",
  status: "active",
  messageCount: 0,
  lastMessageAt: null,
  createdAt: "2026-07-27T00:00:00.000Z",
  updatedAt: "2026-07-27T00:00:00.000Z",
};

describe("AI Assistant server actions", () => {
  beforeEach(() => jest.clearAllMocks());

  test("lists and validates assistant thread summaries", async () => {
    mockedFetch.mockResolvedValue(
      Response.json(
        { data: [thread] },
        { headers: { "X-Correlation-ID": "corr-list" } },
      ),
    );
    const result = await listAssistantThreadsAction();
    expect(result).toEqual({
      success: true,
      data: [thread],
      correlationId: "corr-list",
    });
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/assistant/threads?limit=25"),
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  test("creates a thread with JSON and the caller's idempotency key", async () => {
    mockedFetch.mockResolvedValue(
      Response.json({ data: { created: true, thread } }),
    );
    const result = await createAssistantThreadAction(
      "Proposal workflow",
      "assistant-thread:test",
    );
    expect(result.success).toBe(true);
    const request = mockedFetch.mock.calls[0]?.[1];
    expect(request?.method).toBe("POST");
    expect(request?.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        "Idempotency-Key": "assistant-thread:test",
      }),
    );
    expect(request?.body).toBe(
      JSON.stringify({ title: "Proposal workflow" }),
    );
  });

  test("rejects an invalid thread detail payload", async () => {
    mockedFetch.mockResolvedValue(
      Response.json({ data: { thread, messages: [{ id: "broken" }] } }),
    );
    const result = await getAssistantThreadAction(thread.id);
    expect(result).toMatchObject({
      success: false,
      code: "INVALID_RESPONSE",
      retryable: true,
    });
  });

  test("maps rate limits without exposing arbitrary backend details", async () => {
    mockedFetch.mockResolvedValue(
      Response.json(
        {
          code: "ASSISTANT_RATE_LIMITED",
          title: "private upstream text",
          retryable: true,
          retryAfterSeconds: 17,
          correlationId: "corr-rate",
        },
        { status: 429, headers: { "Retry-After": "17" } },
      ),
    );
    const result = await listAssistantThreadsAction();
    expect(result).toEqual({
      success: false,
      code: "ASSISTANT_RATE_LIMITED",
      message:
        "We couldn't complete that request. Try again. Reference: corr-rate",
      correlationId: "corr-rate",
      retryable: true,
      retryAfterSeconds: 17,
    });
  });
});
