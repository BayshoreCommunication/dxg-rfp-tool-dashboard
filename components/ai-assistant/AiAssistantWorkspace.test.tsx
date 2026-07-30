import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import AiAssistantWorkspace from "./AiAssistantWorkspace";
import {
  archiveAssistantThreadAction,
  createAssistantThreadAction,
  deleteAssistantThreadAction,
  getAssistantThreadAction,
  listAssistantThreadsAction,
  restoreAssistantThreadAction,
} from "@/app/actions/aiAssistant";

jest.mock("@/lib/aiAssistant/analytics", () => ({
  assistantAnalyticsSessionId: () =>
    "00000000-0000-4000-8000-000000000001",
  trackAssistantProductEvent: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/app/actions/aiAssistant", () => ({
  archiveAssistantThreadAction: jest.fn(),
  createAssistantThreadAction: jest.fn(),
  deleteAssistantThreadAction: jest.fn(),
  getAssistantThreadAction: jest.fn(),
  listAssistantThreadsAction: jest.fn(),
  restoreAssistantThreadAction: jest.fn(),
}));

const mockedCreateThread = jest.mocked(createAssistantThreadAction);
const mockedGetThread = jest.mocked(getAssistantThreadAction);
const mockedListThreads = jest.mocked(listAssistantThreadsAction);
const mockedArchiveThread = jest.mocked(archiveAssistantThreadAction);
const mockedDeleteThread = jest.mocked(deleteAssistantThreadAction);
const mockedRestoreThread = jest.mocked(restoreAssistantThreadAction);

const thread = {
  id: "01890b2e-58b1-7c7e-9b0a-1a2b3c4d5e6f",
  title: "Proposal workflow",
  status: "active" as const,
  messageCount: 0,
  lastMessageAt: null,
  deletedAt: null,
  purgeAfter: null,
  recoverable: false,
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

const controlledStreamResponse = () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const response = {
    ok: true,
    status: 200,
    body: new ReadableStream<Uint8Array>({
      start(streamController) {
        controller = streamController;
      },
    }),
    headers: { get: () => null },
  } as unknown as Response;
  return {
    response,
    push(source: string) {
      controller.enqueue(new TextEncoder().encode(source));
    },
    close() {
      controller.close();
    },
  };
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
    mockedDeleteThread.mockResolvedValue({
      success: true,
      data: { id: thread.id, deleted: true },
      correlationId: "corr-delete",
    });
    mockedRestoreThread.mockResolvedValue({
      success: true,
      data: thread,
      correlationId: "corr-restore",
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test("renders the premium empty state and sends a suggested prompt directly", async () => {
    jest.mocked(global.fetch).mockResolvedValue(completedStream());
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
    ).toHaveValue("");
    expect(
      screen.getByText("How do I create and send a proposal?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Assistant is responding" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedCreateThread).toHaveBeenCalledTimes(1),
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("submits field help once, preserves an existing draft, and returns focus", async () => {
    jest.mocked(global.fetch).mockResolvedValue(completedStream());
    const prompt =
      'What should I enter for the "Event Name" field?';
    const { rerender } = render(
      <AiAssistantWorkspace
        initialThreads={[thread]}
        initialDetail={{ thread, messages: [] }}
      />,
    );
    const composer = screen.getByLabelText("Message the AI Assistant");
    fireEvent.change(composer, {
      target: { value: "My unfinished manual question" },
    });

    rerender(
      <AiAssistantWorkspace
        initialThreads={[thread]}
        initialDetail={{ thread, messages: [] }}
        draftRequest={{
          id: "field-help-1",
          prompt,
        }}
      />,
    );

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledTimes(1),
    );
    expect(
      JSON.parse(
        String(
          jest.mocked(global.fetch).mock.calls[0]?.[1]?.body,
        ),
      ),
    ).toMatchObject({ content: prompt });
    const activeComposer = screen.getByLabelText(
      "Message the AI Assistant",
    );
    expect(activeComposer).toHaveValue(
      "My unfinished manual question",
    );
    expect(activeComposer).toHaveFocus();

    rerender(
      <AiAssistantWorkspace
        initialThreads={[thread]}
        initialDetail={{ thread, messages: [] }}
        draftRequest={{
          id: "field-help-1",
          prompt,
        }}
      />,
    );
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledTimes(1),
    );
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

    await waitFor(() =>
      expect(
        screen.getByText("How do proposals work?"),
      ).toBeInTheDocument(),
    );
    expect(
      await screen.findByRole("link", { name: "Proposals" }),
    ).toHaveAttribute(
      "href",
      "/proposals",
    );
    await waitFor(() => expect(mockedCreateThread).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("shows a new-thread message and typing state before thread creation resolves", async () => {
    let resolveThread!: (
      value: Awaited<ReturnType<typeof createAssistantThreadAction>>,
    ) => void;
    mockedCreateThread.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveThread = resolve;
      }),
    );
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
    fireEvent.keyDown(composer, { key: "Enter" });

    expect(screen.getByText("How do proposals work?")).toBeInTheDocument();
    const activeComposer = screen.getByLabelText(
      "Message the AI Assistant",
    );
    expect(activeComposer).toHaveValue("");
    expect(activeComposer).toHaveFocus();
    expect(activeComposer).not.toBeDisabled();
    expect(
      screen.getByRole("status", { name: "Assistant is responding" }),
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    await act(async () => {
      resolveThread({
        success: true,
        data: { created: true, thread },
        correlationId: "corr-thread",
      });
    });
    expect(
      await screen.findByRole("link", { name: "Proposals" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("How do proposals work?")).toHaveLength(1);
  });

  test("renders assistant deltas progressively and finalizes without duplication", async () => {
    const controlled = controlledStreamResponse();
    jest.mocked(global.fetch).mockResolvedValue(controlled.response);
    render(
      <AiAssistantWorkspace
        initialThreads={[thread]}
        initialDetail={{ thread, messages: [] }}
      />,
    );
    const composer = screen.getByLabelText("Message the AI Assistant");
    fireEvent.change(composer, {
      target: { value: "How do proposals work?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    const activeComposer = screen.getByLabelText(
      "Message the AI Assistant",
    );
    expect(activeComposer).toHaveValue("");
    expect(activeComposer).toHaveFocus();
    expect(
      screen.getByRole("status", { name: "Assistant is responding" }),
    ).toBeInTheDocument();

    await act(async () => {
      controlled.push(
        event("message.accepted", {
          version: 1,
          userMessage,
          assistantMessageId: assistantMessage.id,
          correlationId: "corr-stream",
        }) +
          event("response.started", {
            version: 1,
            assistantMessageId: assistantMessage.id,
          }),
      );
    });
    expect(
      screen.getByRole("status", { name: "Assistant is responding" }),
    ).toBeInTheDocument();

    await act(async () => {
      controlled.push(
        event("response.delta", {
          version: 1,
          assistantMessageId: assistantMessage.id,
          delta: "Open ",
        }),
      );
    });
    expect(await screen.findByText("Open")).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Assistant is responding" }),
    ).toBeNull();

    await act(async () => {
      controlled.push(
        event("response.delta", {
          version: 1,
          assistantMessageId: assistantMessage.id,
          delta: "[Proposals](/proposals) to start.",
        }),
      );
    });
    expect(
      await screen.findByText(/Open \[Proposals\]/),
    ).toBeInTheDocument();

    await act(async () => {
      controlled.push(
        event("response.completed", {
          version: 1,
          message: assistantMessage,
          correlationId: "corr-stream",
        }),
      );
      controlled.close();
    });
    await waitFor(() =>
      expect(
        screen.getAllByText(/Open \[Proposals\]/),
      ).toHaveLength(2),
    );
    expect(screen.getAllByText("How do proposals work?")).toHaveLength(1);
  });

  test("coalesces two Enter submits before React commits the sending state", async () => {
    const controlled = controlledStreamResponse();
    jest.mocked(global.fetch).mockResolvedValue(controlled.response);
    render(
      <AiAssistantWorkspace
        initialThreads={[thread]}
        initialDetail={{ thread, messages: [] }}
      />,
    );
    const composer = screen.getByLabelText("Message the AI Assistant");
    fireEvent.change(composer, {
      target: { value: "How do proposals work?" },
    });

    act(() => {
      composer.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
      composer.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await act(async () => {
      controlled.push(
        event("message.accepted", {
          version: 1,
          userMessage,
          assistantMessageId: assistantMessage.id,
          correlationId: "corr-stream",
        }) +
          event("response.delta", {
            version: 1,
            assistantMessageId: assistantMessage.id,
            delta: assistantMessage.content,
          }) +
          event("response.completed", {
            version: 1,
            message: assistantMessage,
            correlationId: "corr-stream",
          }),
      );
      controlled.close();
    });
    await waitFor(() =>
      expect(screen.getAllByText("How do proposals work?")).toHaveLength(1),
    );
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

  test("opens recent history with focus, closes on Escape, and restores focus", async () => {
    render(
      <AiAssistantWorkspace
        initialThreads={[thread]}
        initialDetail={{ thread, messages: [] }}
        presentation="popup"
        onClose={jest.fn()}
      />,
    );
    const options = screen.getByRole("button", {
      name: "Assistant options",
    });
    fireEvent.click(options);
    fireEvent.click(
      screen.getByRole("menuitem", {
        name: "Open conversation history",
      }),
    );
    expect(
      screen.getAllByRole("button", {
        name: "Close conversation history",
      }),
    ).toHaveLength(2);
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("button", {
            name: "Close conversation history",
          })
          .find((button) => button.dataset.historyClose === "true"),
      ).toHaveFocus(),
    );
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(options).toHaveFocus());
    expect(
      screen.queryByLabelText("Recent AI Assistant conversations"),
    ).not.toBeInTheDocument();
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
    expect(
      screen.getByRole("button", { name: "Start new conversation" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("AI Assistant")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Help me start a proposal" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("assistant-compact-empty-state")).toHaveClass(
      "h-full",
      "min-h-0",
      "py-2",
    );
    expect(
      screen.getByRole("button", { name: "Help me start a proposal" }),
    ).toHaveClass("min-h-[38px]", "py-1.5");
    expect(screen.getByTestId("assistant-composer-dock")).toHaveClass(
      "mt-auto",
      "shrink-0",
      "shadow-[0_-4px_12px_-12px_rgba(15,23,42,0.18)]",
    );
    expect(
      screen.getByTestId("assistant-control-scrim"),
    ).toHaveClass(
      "h-16",
      "backdrop-blur-md",
      "from-white/95",
      "via-white/80",
    );
    expect(
      screen.queryByTestId("assistant-popup-identity"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Message the AI Assistant"),
    ).toBeInTheDocument();
  });

  test("closes the popup when an internal Assistant link is followed", () => {
    const onClose = jest.fn();
    render(
      <AiAssistantWorkspace
        initialThreads={[thread]}
        initialDetail={{
          thread,
          messages: [userMessage, assistantMessage],
        }}
        presentation="popup"
        onClose={onClose}
      />,
    );

    expect(screen.getByTestId("assistant-popup-identity")).toHaveTextContent(
      "RFPilot",
    );
    expect(screen.getByTestId("assistant-popup-identity")).not.toHaveTextContent(
      "Active",
    );
    expect(screen.getByTestId("assistant-popup-identity")).toHaveClass(
      "left-[68px]",
      "top-3",
    );
    expect(screen.getByTestId("assistant-popup-identity")).not.toHaveClass(
      "left-1/2",
      "-translate-x-1/2",
    );
    expect(
      screen.getByTestId("assistant-popup-identity"),
    ).not.toHaveClass("border-b", "bg-white/95");
    expect(screen.getByTestId("assistant-active-dot")).toHaveClass(
      "assistant-active-dot",
    );
    expect(screen.getByTestId("assistant-active-dot")).toHaveStyle({
      animation: "assistant-active-pulse 1.4s ease-in-out infinite",
    });
    fireEvent.click(
      screen.getAllByRole("link", { name: "Proposals" })[0],
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
