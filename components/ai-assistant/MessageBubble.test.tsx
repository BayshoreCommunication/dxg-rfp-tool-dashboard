import { render, screen } from "@testing-library/react";
import MessageBubble from "./MessageBubble";
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
});
