import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getAssistantBootstrapAction } from "@/app/actions/aiAssistant";
import AssistantPopup from "./AssistantPopup";

jest.mock("@/app/actions/aiAssistant", () => ({
  getAssistantBootstrapAction: jest.fn(),
}));

jest.mock("./AiAssistantWorkspace", () => ({
  __esModule: true,
  default: function MockAiAssistantWorkspace(props: {
    presentation: string;
    onClose: () => void;
    onResetPosition: () => void;
    onResetSize: () => void;
    positionModified: boolean;
    sizeModified: boolean;
    uiContext: { fieldKey?: string; sectionId?: string };
    draftRequest?: { id: string; prompt: string };
  }) {
    const React = jest.requireActual<typeof import("react")>("react");
    const [workspaceState, setWorkspaceState] = React.useState("clean");
    return (
      <div>
        <span>Workspace presentation: {props.presentation}</span>
        <span>Position changed: {String(props.positionModified)}</span>
        <span>Size changed: {String(props.sizeModified)}</span>
        <span>Workspace field: {props.uiContext.fieldKey ?? "none"}</span>
        <span>Workspace section: {props.uiContext.sectionId ?? "none"}</span>
        <span>Workspace draft: {props.draftRequest?.prompt ?? "none"}</span>
        <span>Workspace state: {workspaceState}</span>
        <button type="button" onClick={() => setWorkspaceState("old chat")}>
          Simulate old conversation
        </button>
        <button type="button" onClick={props.onClose}>
          Close mocked workspace
        </button>
        <button type="button" onClick={props.onResetPosition}>
          Reset mocked position
        </button>
        <button type="button" onClick={props.onResetSize}>
          Reset mocked size
        </button>
      </div>
    );
  },
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
    ).toHaveClass("assistant-popup-shell");
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveClass(
      "max-sm:!top-[calc(4rem+env(safe-area-inset-top)+0.5rem)]",
      "max-sm:!bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.5rem)]",
      "max-sm:!h-auto",
      "max-sm:!w-auto",
    );
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveClass("z-[60]");
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveClass("w-[min(420px,calc(100vw-24px))]");
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveClass("h-[min(540px,calc(100dvh-24px))]");
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).not.toHaveClass("will-change-[transform,opacity]");

    fireEvent.click(
      screen.getByRole("button", { name: "Close mocked workspace" }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("pins field context and passes a field-help submission request", async () => {
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

  test("starts a clean workspace whenever a new popup session begins", async () => {
    const { rerender } = render(
      <AssistantPopup
        open
        onOpenChange={jest.fn()}
        sessionId={1}
      />,
    );
    await screen.findByText("Workspace state: clean");
    fireEvent.click(
      screen.getByRole("button", { name: "Simulate old conversation" }),
    );
    expect(screen.getByText("Workspace state: old chat")).toBeInTheDocument();

    rerender(
      <AssistantPopup
        open
        onOpenChange={jest.fn()}
        sessionId={2}
      />,
    );
    expect(screen.getByText("Workspace state: clean")).toBeInTheDocument();
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

  test("returns focus to the visible mobile launcher after closing", async () => {
    const onOpenChange = jest.fn();
    const desktopLauncher = document.createElement("button");
    desktopLauncher.id = "ai-assistant-launcher";
    Object.defineProperty(desktopLauncher, "getClientRects", {
      configurable: true,
      value: () => [],
    });
    const mobileLauncher = document.createElement("button");
    mobileLauncher.id = "ai-assistant-mobile-launcher";
    Object.defineProperty(mobileLauncher, "getClientRects", {
      configurable: true,
      value: () => [{ width: 40, height: 40 }],
    });
    document.body.append(desktopLauncher, mobileLauncher);

    render(<AssistantPopup open onOpenChange={onOpenChange} />);
    await screen.findByText("Workspace presentation: popup");
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(mobileLauncher).toHaveFocus(), {
      timeout: 700,
    });
    desktopLauncher.remove();
    mobileLauncher.remove();
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
    expect(
      screen.getByRole("button", { name: "Move AI Assistant" }),
    ).toHaveClass("max-sm:hidden");
    expect(
      screen.getByRole("button", {
        name: "Resize AI Assistant from lower right",
      }),
    ).toHaveClass("max-sm:hidden");
  });

  test("restores the default popup size after leaving a narrow viewport", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 640,
    });

    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");
    const dialog = screen.getByRole("dialog", { name: "AI Assistant" });
    await waitFor(() =>
      expect(dialog).toHaveStyle({ width: "296px", height: "540px" }),
    );

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 768,
    });
    fireEvent(window, new Event("resize"));

    await waitFor(() =>
      expect(dialog).toHaveStyle({ width: "420px", height: "540px" }),
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
      expect(dialog).toHaveStyle({ left: "102px", top: "93px" }),
    );
    expect(screen.getByText("Position changed: false")).toBeInTheDocument();

    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(dialog).toHaveStyle({ left: "114px", top: "93px" });
    expect(screen.getByText("Position changed: true")).toBeInTheDocument();
    expect(window.localStorage.getItem("rfpilot:ai-assistant-position:v1"))
      .toBe('{"x":114,"y":93}');

    unmount();
    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "AI Assistant" }),
      ).toHaveStyle({ left: "114px", top: "93px" }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Reset mocked position" }),
    );
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveStyle({ left: "102px", top: "93px" });
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
      expect(dialog).toHaveStyle({ left: "102px", top: "93px" }),
    );
    for (let index = 0; index < 100; index += 1) {
      fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
      fireEvent.keyDown(handle, { key: "ArrowDown", shiftKey: true });
    }

    expect(dialog).toHaveStyle({ left: "592px", top: "216px" });
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
      expect(dialog).toHaveStyle({ width: "420px", height: "540px" }),
    );
    expect(screen.getByText("Size changed: false")).toBeInTheDocument();

    fireEvent.keyDown(resize, { key: "ArrowRight" });
    fireEvent.keyDown(resize, { key: "ArrowDown" });
    expect(dialog).toHaveStyle({ width: "436px", height: "556px" });
    expect(screen.getByText("Size changed: true")).toBeInTheDocument();
    expect(window.localStorage.getItem("rfpilot:ai-assistant-size:v1"))
      .toBe('{"width":436,"height":556}');

    unmount();
    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "AI Assistant" }),
      ).toHaveStyle({ width: "436px", height: "556px" }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Reset mocked size" }),
    );
    expect(
      screen.getByRole("dialog", { name: "AI Assistant" }),
    ).toHaveStyle({ width: "420px", height: "540px" });
    expect(window.localStorage.getItem("rfpilot:ai-assistant-size:v1"))
      .toBeNull();
  });

  test("keeps the lower-right resize affordance compact and discoverable", async () => {
    render(<AssistantPopup open onOpenChange={jest.fn()} />);
    await screen.findByText("Workspace presentation: popup");

    const resize = screen.getByRole("button", {
      name: "Resize AI Assistant from lower right",
    });

    expect(
      screen.queryByRole("button", {
        name: "Resize AI Assistant from upper right",
      }),
    ).not.toBeInTheDocument();
    expect(resize).not.toHaveAttribute("title");
    expect(resize).toHaveClass("h-9", "w-9");
    expect(resize).not.toHaveClass("opacity-0");
    expect(screen.getByTestId("assistant-resize-grip-art")).toHaveAttribute(
      "src",
      "/assets/ai-assistant/resize-grip-3-line.png",
    );
    expect(screen.getByTestId("assistant-resize-grip-art")).toHaveClass(
      "bottom-[6px]",
      "right-[6px]",
      "h-[18px]",
      "w-[18px]",
    );
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
      name: "Resize AI Assistant from lower right",
    });
    await waitFor(() => expect(dialog).toHaveStyle({ width: "420px", height: "540px", top: "525px" }));
    for (let index = 0; index < 100; index += 1) {
      fireEvent.keyDown(resize, {
        key: "ArrowRight",
        shiftKey: true,
      });
      fireEvent.keyDown(resize, {
        key: "ArrowDown",
        shiftKey: true,
      });
    }

    expect(dialog).toHaveStyle({ width: "840px", height: "663px" });
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
        y: 93,
        left: 102,
        top: 93,
        right: 522,
        bottom: 633,
        width: 420,
        height: 540,
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

    dispatchPointer("pointerdown", 522, 633);
    dispatchPointer("pointermove", 586, 681);
    dispatchPointer("pointerup", 586, 681);

    expect(dialog).toHaveStyle({ width: "484px", height: "588px" });
    expect(window.localStorage.getItem("rfpilot:ai-assistant-size:v1"))
      .toBe('{"width":484,"height":588}');
  });
});
