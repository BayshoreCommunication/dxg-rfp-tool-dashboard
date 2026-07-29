import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AssistantHandoffActions from "./AssistantHandoffActions";
import { takeProposalHandoffDraft } from "@/lib/aiAssistant/handoff";

const PROPOSAL_ID = "abc123abc123abc123abc123";

const message = {
  id: "assistant-1",
  threadId: "thread-1",
  ordinal: 2,
  role: "assistant" as const,
  content: "Choose a proposal to continue.",
  status: "complete" as const,
  providerResponseId: null,
  model: null,
  inputTokens: null,
  outputTokens: null,
  safeErrorCode: null,
  intent: "proposal_specific_request" as const,
  intentVersion: "assistant-intent-router.v1",
  intentSource: "deterministic" as const,
  intentConfidence: "high" as const,
  citations: [
    {
      sourceId: "platform:assistant:proposal-workspace",
      title: "Proposal workspace",
      href: "/proposals",
    },
  ],
  createdAt: "2026-07-29T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z",
  completedAt: "2026-07-29T00:00:00.000Z",
};

describe("AssistantHandoffActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    global.fetch = jest.fn().mockResolvedValue(
      {
        ok: true,
        json: async () => ({
          data: [
            {
              id: PROPOSAL_ID,
              label: "Annual Summit",
              canEmail: true,
            },
          ],
        }),
      } as Response,
    );
  });

  test("loads an owner-scoped selector and builds approved proposal actions", async () => {
    const onNavigate = jest.fn();
    render(
      <AssistantHandoffActions
        message={message}
        userDraft="What is missing from my proposal?"
        onNavigate={onNavigate}
        proposalAssistantEnabled
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue with one of your proposals",
      }),
    );
    expect(
      await screen.findByRole("option", { name: "Annual Summit" }),
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ai-assistant/proposals",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      }),
    );

    const assistant = screen.getByRole("link", {
      name: "Proposal assistant",
    });
    expect(assistant).toHaveAttribute(
      "href",
      `/proposals/${PROPOSAL_ID}/assistant`,
    );
    expect(screen.getByRole("link", { name: "Open editor" })).toHaveAttribute(
      "href",
      `/proposals/proposal-edit?proposalId=${PROPOSAL_ID}`,
    );
    expect(screen.getByRole("link", { name: "Prepare email" })).toHaveAttribute(
      "href",
      `/email/send-email?proposalId=${PROPOSAL_ID}`,
    );

    assistant.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    fireEvent.click(assistant);
    expect(onNavigate).toHaveBeenCalled();
    expect(takeProposalHandoffDraft(PROPOSAL_ID)).toBe(
      "What is missing from my proposal?",
    );
  });

  test("handles unavailable proposals without guessing a destination", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      {
        ok: true,
        json: async () => ({ data: [] }),
      } as Response,
    );
    render(<AssistantHandoffActions message={message} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue with one of your proposals",
      }),
    );
    expect(
      await screen.findByText(/No active proposal is available/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open editor" })).toBeNull();
    expect(screen.getByRole("link", { name: "Start a proposal" })).toHaveAttribute(
      "href",
      "/proposals/add-new-proposal",
    );
  });

  test("does not let a citation href control a structured CTA", async () => {
    render(
      <AssistantHandoffActions
        message={{
          ...message,
          intent: "platform_navigation",
          citations: [
            {
              sourceId: "platform:navigation:vendor-responses",
              title: "Untrusted title",
              href: "https://attacker.example/redirect",
            },
          ],
        }}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /Review vendor responses/ }),
      ).toHaveAttribute("href", "/vendor-responses"),
    );
  });
});
