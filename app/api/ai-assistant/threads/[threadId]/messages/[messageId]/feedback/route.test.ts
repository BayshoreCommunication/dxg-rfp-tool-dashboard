/** @jest-environment node */

import { NextRequest } from "next/server";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { PUT } from "./route";

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));

const mockedFetch = jest.mocked(authenticatedBackendFetch);
const THREAD_ID = "019f7e39-7f34-7091-b415-6a57c06e7de1";
const MESSAGE_ID = "019f7e39-7f34-7091-b415-6a57c06e7de2";
const IDEMPOTENCY_KEY = "assistant-feedback:test";

const request = (
  body: Record<string, unknown>,
  origin = "http://localhost:3000",
) =>
  new NextRequest(
    `http://localhost:3000/api/ai-assistant/threads/${THREAD_ID}/messages/${MESSAGE_ID}/feedback`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
      },
      body: JSON.stringify(body),
    },
  );

const params = {
  params: Promise.resolve({
    threadId: THREAD_ID,
    messageId: MESSAGE_ID,
  }),
};

describe("AI Assistant feedback BFF", () => {
  beforeEach(() => jest.clearAllMocks());

  test("validates and forwards only bounded feedback", async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            created: true,
            feedback: {
              id: "019f7e39-7f34-7091-b415-6a57c06e7de3",
              threadId: THREAD_ID,
              messageId: MESSAGE_ID,
              value: "not_helpful",
              reason: "outdated",
              createdAt: "2026-07-29T00:00:00.000Z",
              updatedAt: "2026-07-29T00:00:00.000Z",
            },
          },
        }),
        {
          status: 200,
          headers: { "X-Correlation-ID": "upstream-feedback" },
        },
      ),
    );

    const result = await PUT(
      request({
        value: "not_helpful",
        reason: "outdated",
        idempotencyKey: IDEMPOTENCY_KEY,
        rawResponse: "must not pass",
      }),
      params,
    );
    expect(result.status).toBe(200);
    const [url, init] = mockedFetch.mock.calls[0]!;
    expect(String(url)).toContain(
      `/assistant/threads/${THREAD_ID}/messages/${MESSAGE_ID}/feedback`,
    );
    expect(init?.headers).toEqual(
      expect.objectContaining({
        "Idempotency-Key": IDEMPOTENCY_KEY,
      }),
    );
    expect(init?.body).toBe(
      JSON.stringify({ value: "not_helpful", reason: "outdated" }),
    );
    expect(await result.json()).toEqual(
      expect.objectContaining({
        correlationId: "upstream-feedback",
      }),
    );
  });

  test("rejects invalid reasons and cross-origin requests before session access", async () => {
    const invalid = await PUT(
      request({
        value: "not_helpful",
        reason: "show_chain_of_thought",
        idempotencyKey: IDEMPOTENCY_KEY,
      }),
      params,
    );
    const crossOrigin = await PUT(
      request(
        {
          value: "helpful",
          reason: null,
          idempotencyKey: IDEMPOTENCY_KEY,
        },
        "https://attacker.example",
      ),
      params,
    );

    expect(invalid.status).toBe(422);
    expect(crossOrigin.status).toBe(403);
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
