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
    onResetSize,
    positionModified,
    sizeModified,
    uiContext,
    draftRequest,
  }: {
    presentation: string;
    onClose: () => void;
    onResetPosition: () => void;
    onResetSize: () => void;
    positionModified: boolean;
    sizeModified: boolean;
    uiContext: { fieldKey?: string; sectionId?: string };
    draftRequest?: { id: string; prompt: string };
  }) => (
    <div>
      <span>Workspace presentation: {presentation}</span>
      <span>Position changed: {String(positionModified)}</span>
      <span>Size changed: {String(sizeModified)}</span>
      <span>Workspace field: {uiContext.fieldKey ?? "none"}</span>
      <span>Workspace section: {uiContext.sectionId ?? "none"}</span>
      <span>Workspace draft: {draftRequest?.prompt ?? "none"}</span>
      <button type="button" onClick={onClose}>
        Close mocked workspace
      </button>
      <button type="button" onClick={onResetPosition}>
        Reset mocked position
      </button>
      <button type="button" onClick={onResetSize}>
        Reset mocked size
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
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
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
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveClass("w-[min(384px,calc(100vw-24px))]");
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveClass("h-[min(460px,calc(100dvh-24px))]");
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).not.toHaveClass("will-change-[transform,opacity]");

    fireEvent.click(
      screen.getByRole("button", { name: "Close mocked workspace" }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("pins field context and passes an editable field-help draft", async () => {
    render(
      <AssistantPopup
        open
        onOpenChange={jest.fn()}
        fieldHelpRequest={{
          id: "field-help-1",
          prompt:
            'What should I enter for the "Event Name" field? Explain it simply and give me one short example.',
          context: {
            fieldKey: "/content/event/name",
            sectionId: "event_overview",
          },
        }}
      />,
    );

    expect(
      await screen.findByText(
        "Workspace field: /content/event/name",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Workspace section: event_overview"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Workspace draft: What should I enter for the "Event Name" field? Explain it simply and give me one short example.',
      ),
    ).toBeInTheDocument();
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
    const launcher = document.createElement("button");
    launcher.id = "ai-assistant-launcher";
    document.body.append(launcher);
    render(<AssistantPopup open onOpenChange={onOpenChange} />);
    await screen.findByText("Workspace presentation: popup");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(launcher).toHaveFocus(), {
      timeout: 700,
    });
    launcher.remove();
  });

  test("fits within a 320px viewport and a reduced visual viewport", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 640,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        width: 320,
        height: 480,
        offsetLeft: 0,
        offsetTop: 40,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
    });

    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "AI Assistant" }),
      ).toHaveStyle({
        left: "12px",
        top: "52px",
        width: "296px",
        height: "456px",
      }),
    );
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
      expect(dialog).toHaveStyle({ left: "102px", top: "173px" }),
    );
    expect(screen.getByText("Position changed: false")).toBeInTheDocument();

    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(dialog).toHaveStyle({ left: "114px", top: "173px" });
    expect(screen.getByText("Position changed: true")).toBeInTheDocument();
    expect(window.localStorage.getItem("rfpilot:ai-assistant-position:v1"))
      .toBe('{"x":114,"y":173}');

    unmount();
    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "AI Assistant" }),
      ).toHaveStyle({ left: "114px", top: "173px" }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Reset mocked position" }),
    );
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveStyle({ left: "102px", top: "173px" });
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
      expect(dialog).toHaveStyle({ left: "102px", top: "173px" }),
    );
    for (let index = 0; index < 100; index += 1) {
      fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
      fireEvent.keyDown(handle, { key: "ArrowDown", shiftKey: true });
    }

    expect(dialog).toHaveStyle({ left: "628px", top: "296px" });
  });

  test("resizes from the lower right, remembers size, and resets it", async () => {
    const { unmount } = render(
      <AssistantPopup open onOpenChange={jest.fn()} />,
    );
    await screen.findByText("Workspace presentation: popup");

    const dialog = screen.getByRole("dialog", {
      name: "AI Assistant",
    });
    const resize = screen.getByRole("button", {
      name: "Resize AI Assistant from lower right",
    });
    await waitFor(() =>
      expect(dialog).toHaveStyle({ width: "384px", height: "460px" }),
    );
    expect(screen.getByText("Size changed: false")).toBeInTheDocument();

    fireEvent.keyDown(resize, { key: "ArrowRight" });
    fireEvent.keyDown(resize, { key: "ArrowDown" });
    expect(dialog).toHaveStyle({ width: "400px", height: "476px" });
    expect(screen.getByText("Size changed: true")).toBeInTheDocument();
    expect(window.localStorage.getItem("rfpilot:ai-assistant-size:v1"))
      .toBe('{"width":400,"height":476}');

    unmount();
    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "AI Assistant" }),
      ).toHaveStyle({ width: "400px", height: "476px" }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Reset mocked size" }),
    );
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveStyle({ width: "384px", height: "460px" });
    expect(window.localStorage.getItem("rfpilot:ai-assistant-size:v1"))
      .toBeNull();
  });

  test("keeps the lower-right resize affordance compact and discoverable", async () => {
    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");

    const resize = screen.getByRole("button", {
      name: "Resize AI Assistant from lower right",
    });

    expect(resize).not.toHaveAttribute("title");
    expect(resize).toHaveClass("h-8", "w-8", "opacity-70");
    expect(resize).not.toHaveClass("opacity-0");
    expect(resize.querySelector(".lucide-scaling")).toBeInTheDocument();
  });

  test("limits resizing to twice the default size and the viewport", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1400,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 1200,
    });
    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");

    const dialog = screen.getByRole("dialog", {
      name: "AI Assistant",
    });
    const resize = screen.getByRole("button", {
      name: "Resize AI Assistant from upper right",
    });
    for (let index = 0; index < 100; index += 1) {
      fireEvent.keyDown(resize, {
        key: "ArrowRight",
        shiftKey: true,
      });
      fireEvent.keyDown(resize, {
        key: "ArrowUp",
        shiftKey: true,
      });
    }

    expect(dialog).toHaveStyle({ width: "768px", height: "920px" });
  });

  test("resizes upward from the upper-right handle", async () => {
    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");

    const dialog = screen.getByRole("dialog", {
      name: "AI Assistant",
    });
    const resize = screen.getByRole("button", {
      name: "Resize AI Assistant from upper right",
    });
    await waitFor(() =>
      expect(dialog).toHaveStyle({ top: "173px", height: "460px" }),
    );
    fireEvent.keyDown(resize, { key: "ArrowUp" });

    expect(dialog).toHaveStyle({ top: "157px", height: "476px" });
  });

  test("resizes with a pointer drag from the lower-right handle", async () => {
    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");

    const dialog = screen.getByRole("dialog", {
      name: "AI Assistant",
    });
    Object.defineProperty(dialog, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 102,
        y: 173,
        left: 102,
        top: 173,
        right: 486,
        bottom: 633,
        width: 384,
        height: 460,
        toJSON: () => ({}),
      }),
    });
    const resize = screen.getByRole("button", {
      name: "Resize AI Assistant from lower right",
    });
    Object.defineProperty(resize, "setPointerCapture", {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(resize, "hasPointerCapture", {
      configurable: true,
      value: jest.fn().mockReturnValue(false),
    });

    const dispatchPointer = (
      type: "pointerdown" | "pointermove" | "pointerup",
      clientX: number,
      clientY: number,
    ) => {
      const event = new Event(type, {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperties(event, {
        button: { value: 0 },
        pointerId: { value: 7 },
        clientX: { value: clientX },
        clientY: { value: clientY },
      });
      fireEvent(resize, event);
    };

    dispatchPointer("pointerdown", 486, 633);
    dispatchPointer("pointermove", 550, 681);
    dispatchPointer("pointerup", 550, 681);

    expect(dialog).toHaveStyle({ width: "448px", height: "508px" });
    expect(window.localStorage.getItem("rfpilot:ai-assistant-size:v1"))
      .toBe('{"width":448,"height":508}');
  });
});
