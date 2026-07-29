/** @jest-environment node */

import { NextRequest } from "next/server";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { POST } from "./route";

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));

const mockedFetch = jest.mocked(authenticatedBackendFetch);
const SESSION_ID = "019f7e39-7f34-7091-b415-6a57c06e7de0";
const THREAD_ID = "019f7e39-7f34-7091-b415-6a57c06e7de1";
const MESSAGE_ID = "019f7e39-7f34-7091-b415-6a57c06e7de2";

const request = (
  body: Record<string, unknown>,
  origin = "http://localhost:3000",
) =>
  new NextRequest("http://localhost:3000/api/ai-assistant/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify(body),
  });

describe("AI Assistant product analytics BFF", () => {
  beforeEach(() => jest.clearAllMocks());

  test("forwards only allowlisted pseudonymous event metadata", async () => {
    mockedFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: { created: true } }), {
        status: 201,
      }),
    );
    const response = await POST(
      request({
        eventType: "citation_opened",
        sessionId: SESSION_ID,
        threadId: THREAD_ID,
        messageId: MESSAGE_ID,
        routeCategory: "proposals",
        idempotencyKey: "assistant-event:test",
        prompt: "private question",
        response: "private answer",
        email: "person@example.test",
      }),
    );
    expect(response.status).toBe(200);
    const [, init] = mockedFetch.mock.calls[0]!;
    expect(init?.headers).toEqual(
      expect.objectContaining({
        "Idempotency-Key": "assistant-event:test",
        "Assistant-Analytics-Session-ID": SESSION_ID,
      }),
    );
    expect(init?.body).toBe(
      JSON.stringify({
        eventType: "citation_opened",
        sessionId: SESSION_ID,
        threadId: THREAD_ID,
        messageId: MESSAGE_ID,
        routeCategory: "proposals",
        findingCategory: null,
      }),
    );
    expect(JSON.stringify(init)).not.toMatch(
      /private question|private answer|person@example\.test/,
    );
  });

  test("rejects server-authoritative and malformed events", async () => {
    const serverEvent = await POST(
      request({
        eventType: "message_submitted",
        sessionId: SESSION_ID,
        idempotencyKey: "assistant-event:test",
      }),
    );
    const missingThread = await POST(
      request({
        eventType: "citation_opened",
        sessionId: SESSION_ID,
        messageId: MESSAGE_ID,
        idempotencyKey: "assistant-event:test-2",
      }),
    );
    const crossOrigin = await POST(
      request(
        {
          eventType: "assistant_opened",
          sessionId: SESSION_ID,
          idempotencyKey: "assistant-event:test-3",
        },
        "https://attacker.example",
      ),
    );
    expect(serverEvent.status).toBe(422);
    expect(missingThread.status).toBe(422);
    expect(crossOrigin.status).toBe(403);
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
