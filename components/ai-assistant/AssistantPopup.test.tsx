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
    onResetPosition,
    positionModified,
  }: {
    presentation: string;
    onClose: () => void;
    onResetPosition: () => void;
    positionModified: boolean;
  }) => (
    <div>
      <span>Workspace presentation: {presentation}</span>
      <span>Position changed: {String(positionModified)}</span>
      <button type="button" onClick={onClose}>
        Close mocked workspace
      </button>
      <button type="button" onClick={onResetPosition}>
        Reset mocked position
      </button>
    </div>
  ),
}));

const mockedBootstrap = jest.mocked(getAssistantBootstrapAction);

describe("AssistantPopup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 768,
    });
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
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveClass("z-[60]");

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

  test("moves with the keyboard, remembers the position, and resets it", async () => {
    const { unmount } = render(
      <AssistantPopup open onOpenChange={jest.fn()} />,
    );
    await screen.findByText("Workspace presentation: popup");

    const dialog = screen.getByRole("dialog", { name: "AI Assistant" });
    const handle = screen.getByRole("button", {
      name: "Move AI Assistant",
    });
    await waitFor(() =>
      expect(dialog).toHaveStyle({ left: "102px", top: "213px" }),
    );
    expect(screen.getByText("Position changed: false")).toBeInTheDocument();

    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(dialog).toHaveStyle({ left: "114px", top: "213px" });
    expect(screen.getByText("Position changed: true")).toBeInTheDocument();
    expect(window.localStorage.getItem("rfpilot:ai-assistant-position:v1"))
      .toBe('{"x":114,"y":213}');

    unmount();
    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "AI Assistant" }),
      ).toHaveStyle({ left: "114px", top: "213px" }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Reset mocked position" }),
    );
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveStyle({ left: "102px", top: "213px" });
    expect(window.localStorage.getItem("rfpilot:ai-assistant-position:v1"))
      .toBeNull();
  });

  test("keeps a moved position inside the viewport", async () => {
    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");
    const dialog = screen.getByRole("dialog", { name: "AI Assistant" });
    const handle = screen.getByRole("button", {
      name: "Move AI Assistant",
    });
    await waitFor(() =>
      expect(dialog).toHaveStyle({ left: "102px", top: "213px" }),
    );
    for (let index = 0; index < 100; index += 1) {
      fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
      fireEvent.keyDown(handle, { key: "ArrowDown", shiftKey: true });
    }

    expect(dialog).toHaveStyle({ left: "652px", top: "336px" });
  });
});
