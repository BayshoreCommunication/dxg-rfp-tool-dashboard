import { fireEvent, render, screen } from "@testing-library/react";
import MessageBubble, {
  assistantSpeechText,
  normalizeAssistantMarkdownLinks,
} from "./MessageBubble";
import { safeAssistantHref } from "./AssistantSources";

const message = {
  id: "message-1",
  threadId: "thread-1",
  ordinal: 1,
  role: "assistant" as const,
  content:
    "Use [Proposals](/proposals), not [unsafe](javascript:alert(1)).",
  status: "complete" as const,
  providerResponseId: null,
  model: null,
  inputTokens: null,
  outputTokens: null,
  safeErrorCode: null,
  citations: [
    {
      sourceId: "platform:navigation:proposals",
      title: "Proposals source",
      href: "/proposals",
    },
  ],
  createdAt: "2026-07-27T00:00:00.000Z",
  updatedAt: "2026-07-27T00:00:00.000Z",
  completedAt: "2026-07-27T00:00:00.000Z",
};

describe("MessageBubble", () => {
  test("renders Markdown but only activates safe routes", () => {
    render(
      <ol>
        <MessageBubble message={message} />
      </ol>,
    );
    expect(screen.getByRole("link", { name: "Proposals source" })).toHaveAttribute(
      "href",
      "/proposals",
    );
    expect(screen.queryByRole("link", { name: "unsafe" })).toBeNull();
    expect(
      screen.getByText(/javascript:alert/),
    ).toBeInTheDocument();
  });

  test("accepts internal paths and HTTPS only", () => {
    expect(safeAssistantHref("/settings")).toBe("/settings");
    expect(safeAssistantHref("https://example.com/help")).toBe(
      "https://example.com/help",
    );
    expect(safeAssistantHref("//example.com")).toBeNull();
    expect(safeAssistantHref("http://example.com")).toBeNull();
    expect(safeAssistantHref("javascript:alert(1)")).toBeNull();
  });

  test("turns cited bare routes into links and reports internal navigation", () => {
    const onNavigate = jest.fn();
    const createMessage = {
      ...message,
      content: "Start a new proposal at /proposals/add-new-proposal.",
      citations: [
        {
          sourceId: "platform:navigation:create-proposal",
          title: "Create a proposal",
          href: "/proposals/add-new-proposal",
        },
      ],
    };

    render(
      <ol>
        <MessageBubble
          message={createMessage}
          onNavigate={onNavigate}
        />
      </ol>,
    );

    const links = screen.getAllByRole("link", {
      name: "Create a proposal",
    });
    expect(
      normalizeAssistantMarkdownLinks(
        createMessage.content,
        createMessage.citations,
      ),
    ).toBe(
      "Start a new proposal at [Create a proposal](/proposals/add-new-proposal).",
    );
    // The Jest Markdown stub returns its children verbatim, so the rendered
    // link here is the citation link. Browser coverage verifies the inline
    // Markdown link separately.
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute(
      "href",
      "/proposals/add-new-proposal",
    );
    fireEvent.click(links[0]);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  test("does not rewrite a route that is already a Markdown link", () => {
    expect(
      normalizeAssistantMarkdownLinks(
        "Open [Create a proposal](/proposals/add-new-proposal).",
        [
          {
            sourceId: "platform:navigation:create-proposal",
            title: "Create a proposal",
            href: "/proposals/add-new-proposal",
          },
        ],
      ),
    ).toBe("Open [Create a proposal](/proposals/add-new-proposal).");
  });

  test("reads a completed response aloud and can stop playback", async () => {
    const speak = jest.fn();
    const cancel = jest.fn();
    class MockSpeechSynthesisUtterance {
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(readonly text: string) {}
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { speak, cancel },
    });

    render(
      <ol>
        <MessageBubble message={message} />
      </ol>,
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Read assistant response aloud",
      }),
    );

    expect(assistantSpeechText(message.content)).toBe(
      "Use Proposals, not unsafe.",
    );
    expect(speak).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Use Proposals, not unsafe.",
      }),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Stop reading assistant response",
      }),
    );
    expect(cancel).toHaveBeenCalled();
  });
});
