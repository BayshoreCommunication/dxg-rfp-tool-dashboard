import {
  assistantAnalyticsSessionId,
  completePendingAssistantHandoff,
  markAssistantHandoffPending,
  trackAssistantProductEvent,
} from "./analytics";

const THREAD_ID = "019f7e39-7f34-7091-b415-6a57c06e7de1";
const MESSAGE_ID = "019f7e39-7f34-7091-b415-6a57c06e7de2";

describe("assistant privacy-safe analytics", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    jest.restoreAllMocks();
  });

  test("uses a stable bounded 30-minute browser session", () => {
    jest.spyOn(Date, "now").mockReturnValue(1_000);
    const first = assistantAnalyticsSessionId();
    jest.spyOn(Date, "now").mockReturnValue(10_000);
    const second = assistantAnalyticsSessionId();
    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test("sends only allowlisted interaction metadata", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true } as Response);
    global.fetch = fetchMock;
    await expect(
      trackAssistantProductEvent({
        eventType: "citation_opened",
        threadId: THREAD_ID,
        messageId: MESSAGE_ID,
        routeCategory: "proposals",
      }),
    ).resolves.toBe(true);
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      eventType: "citation_opened",
      threadId: THREAD_ID,
      messageId: MESSAGE_ID,
      routeCategory: "proposals",
      sessionId: expect.any(String),
      idempotencyKey: expect.stringMatching(/^assistant-event:/),
    });
    expect(JSON.stringify(body)).not.toMatch(
      /prompt|response|email|phone|proposalText|clientIdentifier/i,
    );
    expect(init).toEqual(
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        keepalive: true,
      }),
    );
  });

  test("records handoff completion only on the intended destination", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true } as Response);
    global.fetch = fetchMock;
    markAssistantHandoffPending({
      threadId: THREAD_ID,
      messageId: MESSAGE_ID,
      routeCategory: "proposals",
      destinationPath: `/proposals/${THREAD_ID}/assistant`,
    });
    await expect(
      completePendingAssistantHandoff(
        `/proposals/${THREAD_ID}/assistant`,
      ),
    ).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain(
      "proposal_handoff_completed",
    );
    await expect(
      completePendingAssistantHandoff(
        `/proposals/${THREAD_ID}/assistant`,
      ),
    ).resolves.toBe(false);
  });
});
