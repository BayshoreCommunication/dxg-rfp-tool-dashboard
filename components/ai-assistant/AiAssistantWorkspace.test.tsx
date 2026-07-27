import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AiAssistantWorkspace from "./AiAssistantWorkspace";
import {
  archiveAssistantThreadAction,
  createAssistantThreadAction,
  getAssistantThreadAction,
  listAssistantThreadsAction,
} from "@/app/actions/aiAssistant";

jest.mock("@/app/actions/aiAssistant", () => ({
  archiveAssistantThreadAction: jest.fn(),
  createAssistantThreadAction: jest.fn(),
  getAssistantThreadAction: jest.fn(),
  listAssistantThreadsAction: jest.fn(),
}));

const mockedCreateThread = jest.mocked(createAssistantThreadAction);
const mockedGetThread = jest.mocked(getAssistantThreadAction);
const mockedListThreads = jest.mocked(listAssistantThreadsAction);
const mockedArchiveThread = jest.mocked(archiveAssistantThreadAction);

const thread = {
  id: "01890b2e-58b1-7c7e-9b0a-1a2b3c4d5e6f",
  title: "Proposal workflow",
  status: "active" as const,
  messageCount: 0,
  lastMessageAt: null,
  createdAt: "2026-07-27T00:00:00.000Z",
  updatedAt: "2026-07-27T00:00:00.000Z",
};

const userMessage = {
  id: "01890b2e-58b1-7c7e-9b0a-1a2b3c4d5e70",
  threadId: thread.id,
  ordinal: 1,
  role: "user" as const,
  content: "How do proposals work?",
  status: "complete" as const,
  providerResponseId: null,
  model: null,
  inputTokens: null,
  outputTokens: null,
  safeErrorCode: null,
  citations: [],
  createdAt: "2026-07-27T00:00:00.000Z",
  updatedAt: "2026-07-27T00:00:00.000Z",
  completedAt: "2026-07-27T00:00:00.000Z",
};

const assistantMessage = {
  ...userMessage,
  id: "01890b2e-58b1-7c7e-9b0a-1a2b3c4d5e71",
  ordinal: 2,
  role: "assistant" as const,
  content: "Open [Proposals](/proposals) to start.",
  providerResponseId: "resp-safe",
  model: "assistant-model",
  inputTokens: 18,
  outputTokens: 8,
  citations: [
    {
      sourceId: "platform:navigation:proposals",
      title: "Proposals",
      href: "/proposals",
    },
  ],
};

const event = (name: string, data: unknown) =>
  `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;

const streamResponse = (source: string): Response => {
  const encoded = new TextEncoder().encode(source);
  return {
    ok: true,
    status: 200,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded);
        controller.close();
      },
    }),
    headers: { get: () => null },
  } as unknown as Response;
};

const completedStream = () =>
  streamResponse(
    [
      event("message.accepted", {
        version: 1,
        userMessage,
        assistantMessageId: assistantMessage.id,
        correlationId: "corr-stream",
      }),
      event("response.started", {
        version: 1,
        assistantMessageId: assistantMessage.id,
      }),
      event("response.delta", {
        version: 1,
        assistantMessageId: assistantMessage.id,
        delta: assistantMessage.content,
      }),
      event("response.completed", {
        version: 1,
        message: assistantMessage,
        correlationId: "corr-stream",
      }),
    ].join(""),
  );

const failedStream = () =>
  streamResponse(
    [
      event("message.accepted", {
        version: 1,
        userMessage,
        assistantMessageId: assistantMessage.id,
        correlationId: "corr-stream",
      }),
      event("response.failed", {
        version: 1,
        assistantMessageId: assistantMessage.id,
        code: "ASSISTANT_PROVIDER_TEMPORARY",
        message: "The assistant provider is temporarily unavailable.",
        retryable: true,
        correlationId: "corr-stream",
      }),
    ].join(""),
  );

describe("AiAssistantWorkspace", () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    global.fetch = jest.fn();
    mockedCreateThread.mockResolvedValue({
      success: true,
      data: { created: true, thread },
      correlationId: "corr-thread",
    });
    mockedListThreads.mockResolvedValue({
      success: true,
      data: [thread],
      correlationId: "corr-list",
    });
    mockedGetThread.mockResolvedValue({
      success: true,
      data: { thread, messages: [] },
      correlationId: "corr-get",
    });
    mockedArchiveThread.mockResolvedValue({
      success: true,
      data: { ...thread, status: "archived" },
      correlationId: "corr-archive",
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test("renders the premium empty state and fills a suggested prompt", () => {
    render(
      <AiAssistantWorkspace
        initialThreads={[]}
        initialDetail={null}
      />,
    );
    expect(screen.getByText("How can I help?")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "How do I create and send a proposal?",
      }),
    );
    expect(
      screen.getByLabelText("Message the AI Assistant"),
    ).toHaveValue("How do I create and send a proposal?");
  });

  test("creates a thread, consumes product SSE, and renders safe Markdown", async () => {
    jest.mocked(global.fetch).mockResolvedValue(completedStream());
    render(
      <AiAssistantWorkspace
        initialThreads={[]}
        initialDetail={null}
      />,
    );
    const composer = screen.getByLabelText("Message the AI Assistant");
    fireEvent.change(composer, {
      target: { value: "How do proposals work?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("How do proposals work?")).toBeInTheDocument();
    expect(
      await screen.findAllByText(/Open \[Proposals\]/),
    ).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Proposals" })).toHaveAttribute(
      "href",
      "/proposals",
    );
    await waitFor(() => expect(mockedCreateThread).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("network retry reuses both keys before message acceptance", async () => {
    jest
      .mocked(global.fetch)
      .mockRejectedValueOnce(new TypeError("network failed"))
      .mockResolvedValueOnce(completedStream());
    render(
      <AiAssistantWorkspace
        initialThreads={[]}
        initialDetail={null}
      />,
    );
    fireEvent.change(screen.getByLabelText("Message the AI Assistant"), {
      target: { value: "How do proposals work?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const first = JSON.parse(
      String(jest.mocked(global.fetch).mock.calls[0]?.[1]?.body),
    );
    const second = JSON.parse(
      String(jest.mocked(global.fetch).mock.calls[1]?.[1]?.body),
    );
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(second.responseIdempotencyKey).toBe(
      first.responseIdempotencyKey,
    );
  });

  test("explicit retry keeps the user key but creates a new response key", async () => {
    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(failedStream())
      .mockResolvedValueOnce(completedStream());
    render(
      <AiAssistantWorkspace
        initialThreads={[thread]}
        initialDetail={{ thread, messages: [] }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Message the AI Assistant"), {
      target: { value: "How do proposals work?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const first = JSON.parse(
      String(jest.mocked(global.fetch).mock.calls[0]?.[1]?.body),
    );
    const second = JSON.parse(
      String(jest.mocked(global.fetch).mock.calls[1]?.[1]?.body),
    );
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(second.responseIdempotencyKey).not.toBe(
      first.responseIdempotencyKey,
    );
    expect(
      await screen.findAllByText("How do proposals work?"),
    ).toHaveLength(1);
  });

  test("opens recent history as a mobile sheet", () => {
    render(
      <AiAssistantWorkspace
        initialThreads={[thread]}
        initialDetail={{ thread, messages: [] }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Open conversation history" }),
    );
    expect(
      screen.getAllByRole("button", {
        name: "Close conversation history",
      }),
    ).toHaveLength(2);
  });

  test("keeps the popup minimal and docks the composer at the bottom", () => {
    render(
      <AiAssistantWorkspace
        initialThreads={[]}
        initialDetail={null}
        presentation="popup"
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Assistant options" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("AI Assistant")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create a proposal" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("assistant-composer-dock")).toHaveClass(
      "mt-auto",
      "shrink-0",
    );
    expect(
      screen.getByTestId("assistant-control-scrim"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Message the AI Assistant"),
    ).toBeInTheDocument();
  });
});
