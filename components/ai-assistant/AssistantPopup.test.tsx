import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getAssistantBootstrapAction } from "@/app/actions/aiAssistant";
import AssistantPopup from "./AssistantPopup";

jest.mock("@/app/actions/aiAssistant", () => ({
  getAssistantBootstrapAction: jest.fn(),
}));

jest.mock("./AiAssistantWorkspace", () => ({
  __esModule: true,
  default: ({
    presentation,
    onClose,
  }: {
    presentation: string;
    onClose: () => void;
  }) => (
    <div>
      <span>Workspace presentation: {presentation}</span>
      <button type="button" onClick={onClose}>
        Close mocked workspace
      </button>
    </div>
  ),
}));

const mockedBootstrap = jest.mocked(getAssistantBootstrapAction);

describe("AssistantPopup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBootstrap.mockResolvedValue({
      success: true,
      data: { threads: [], detail: null },
      correlationId: "corr-popup",
    });
  });

  test("lazy-loads once opened and renders the dialog workspace", async () => {
    const onOpenChange = jest.fn();
    const { container, rerender } = render(
      <AssistantPopup open={false} onOpenChange={onOpenChange} />,
    );
    expect(mockedBootstrap).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')).toHaveAttribute(
      "data-state",
      "closed",
    );

    rerender(<AssistantPopup open onOpenChange={onOpenChange} />);
    expect(
      await screen.findByText("Workspace presentation: popup"),
    ).toBeInTheDocument();
    expect(mockedBootstrap).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveAttribute("data-state", "open");
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveAttribute("data-motion-origin", "launcher");
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveClass("assistant-popup-open");

    fireEvent.click(
      screen.getByRole("button", { name: "Close mocked workspace" }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("starts fully hidden without playing the close animation", () => {
    const { container } = render(
      <AssistantPopup open={false} onOpenChange={jest.fn()} />,
    );
    expect(container.querySelector('[role="dialog"]')).toHaveClass(
      "assistant-popup-closed",
    );
    expect(container.querySelector('[role="dialog"]')).not.toHaveAttribute(
      "data-ever-opened",
    );
  });

  test("keeps a safe empty workspace when bootstrap fails", async () => {
    mockedBootstrap.mockResolvedValue({
      success: false,
      code: "AI_ASSISTANT_DISABLED",
      message: "The AI Assistant is not available in this environment.",
      correlationId: "corr-disabled",
      retryable: false,
    });

    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await waitFor(() => expect(mockedBootstrap).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText("Workspace presentation: popup"),
    ).toBeInTheDocument();
  });

  test("closes with Escape", async () => {
    const onOpenChange = jest.fn();
    render(<AssistantPopup open onOpenChange={onOpenChange} />);
    await screen.findByText("Workspace presentation: popup");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
