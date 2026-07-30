/** @jest-environment node */

import {
  createAssistantThreadAction,
  deleteAssistantThreadAction,
  getAssistantAccessAction,
  getAssistantBootstrapAction,
  getAssistantThreadAction,
  listAssistantThreadsAction,
  restoreAssistantThreadAction,
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
  deletedAt: null,
  purgeAfter: null,
  recoverable: false,
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
      expect.stringContaining(
        "/api/v1/assistant/threads?limit=25&view=available",
      ),
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  test("loads organization-scoped assistant access", async () => {
    mockedFetch.mockResolvedValue(
      Response.json(
        { data: { enabled: true } },
        { headers: { "X-Correlation-ID": "corr-access" } },
      ),
    );
    const result = await getAssistantAccessAction();
    expect(result).toEqual({
      success: true,
      data: { enabled: true },
      correlationId: "corr-access",
    });
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/assistant/access"),
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  test("rejects an invalid assistant access payload", async () => {
    mockedFetch.mockResolvedValue(
      Response.json({ data: { enabled: "yes" } }),
    );
    const result = await getAssistantAccessAction();
    expect(result).toMatchObject({
      success: false,
      code: "INVALID_RESPONSE",
    });
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

  test("requests permanent deletion and restore through explicit methods", async () => {
    mockedFetch
      .mockResolvedValueOnce(
        Response.json({ data: { id: thread.id, deleted: true } }),
      )
      .mockResolvedValueOnce(Response.json({ data: thread }));

    expect(await deleteAssistantThreadAction(thread.id)).toMatchObject({
      success: true,
      data: { id: thread.id, deleted: true },
    });
    expect(mockedFetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(
      String(mockedFetch.mock.calls[0]?.[0]),
    ).toContain(`/assistant/threads/${thread.id}`);

    expect((await restoreAssistantThreadAction(thread.id)).success).toBe(true);
    expect(mockedFetch.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(
      String(mockedFetch.mock.calls[1]?.[0]),
    ).toContain(`/assistant/threads/${thread.id}/restore`);
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

  test("bootstraps the most recent active conversation for the popup", async () => {
    mockedFetch
      .mockResolvedValueOnce(
        Response.json(
          { data: [thread] },
          { headers: { "X-Correlation-ID": "corr-list" } },
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          { data: { thread, messages: [] } },
          { headers: { "X-Correlation-ID": "corr-detail" } },
        ),
      );

    const result = await getAssistantBootstrapAction();
    expect(result).toEqual({
      success: true,
      data: { threads: [thread], detail: { thread, messages: [] } },
      correlationId: "corr-detail",
    });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});
