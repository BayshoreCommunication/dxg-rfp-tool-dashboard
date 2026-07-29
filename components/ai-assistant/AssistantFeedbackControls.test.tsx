import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AssistantFeedbackControls from "./AssistantFeedbackControls";

const THREAD_ID = "019f7e39-7f34-7091-b415-6a57c06e7de1";
const MESSAGE_ID = "019f7e39-7f34-7091-b415-6a57c06e7de2";

const message = {
  id: MESSAGE_ID,
  threadId: THREAD_ID,
  ordinal: 2,
  role: "assistant" as const,
  content: "Open Proposals to continue.",
  status: "complete" as const,
  providerResponseId: null,
  model: "gpt-test",
  inputTokens: 10,
  outputTokens: 5,
  safeErrorCode: null,
  citations: [],
  createdAt: "2026-07-29T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:01.000Z",
  completedAt: "2026-07-29T00:00:01.000Z",
};

const response = (
  value: "helpful" | "not_helpful",
  reason:
    | "incorrect"
    | "outdated"
    | "did_not_understand"
    | "missing_steps"
    | "irrelevant"
    | "other"
    | null,
) =>
  ({
    ok: true,
    json: async () => ({
      data: {
        created: true,
        feedback: {
          id: "019f7e39-7f34-7091-b415-6a57c06e7de3",
          threadId: THREAD_ID,
          messageId: MESSAGE_ID,
          value,
          reason,
          createdAt: "2026-07-29T00:00:02.000Z",
          updatedAt: "2026-07-29T00:00:02.000Z",
        },
      },
    }),
  }) as Response;

describe("AssistantFeedbackControls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: jest.fn(() => "00000000-0000-4000-8000-000000000001"),
    });
    global.fetch = jest.fn().mockResolvedValue(response("helpful", null));
  });

  test("submits helpful feedback and confirms the selected state", async () => {
    render(<AssistantFeedbackControls message={message} />);

    fireEvent.click(screen.getByRole("button", { name: "Helpful" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Helpful" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/ai-assistant/threads/${THREAD_ID}/messages/${MESSAGE_ID}/feedback`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          value: "helpful",
          reason: null,
          idempotencyKey: "00000000-0000-4000-8000-000000000001",
          analyticsSessionId: "00000000-0000-4000-8000-000000000001",
        }),
      }),
    );
  });

  test("offers optional bounded negative reasons", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      response("not_helpful", "missing_steps"),
    );
    render(<AssistantFeedbackControls message={message} />);

    fireEvent.click(screen.getByRole("button", { name: "Not helpful" }));
    expect(screen.getByText(/What could be better/)).toBeInTheDocument();
    expect(
      screen.getByText(/does not change rules or answers automatically/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Missing steps" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Not helpful" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          value: "not_helpful",
          reason: "missing_steps",
          idempotencyKey: "00000000-0000-4000-8000-000000000001",
          analyticsSessionId: "00000000-0000-4000-8000-000000000001",
        }),
      }),
    );
  });

  test("recovers from an error using the same idempotency key", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response("helpful", null));
    render(<AssistantFeedbackControls message={message} />);

    fireEvent.click(screen.getByRole("button", { name: "Helpful" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Retry" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Helpful" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    const keys = (global.fetch as jest.Mock).mock.calls.map((call) =>
      JSON.parse(String(call[1].body)).idempotencyKey,
    );
    expect(keys).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000001",
    ]);
  });
});
