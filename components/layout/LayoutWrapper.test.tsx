import { fireEvent, render, screen } from "@testing-library/react";
import { useAssistantLauncher } from "@/components/ai-assistant/AssistantLauncherContext";
import LayoutWrapper from "./LayoutWrapper";

jest.mock("@/components/layout/Sidebar", () => ({
  __esModule: true,
  default: ({
    assistantOpen,
    onOpenAssistant,
  }: {
    assistantOpen: boolean;
    onOpenAssistant?: () => void;
  }) => (
    <button
      type="button"
      data-testid="assistant-launcher"
      data-open={String(assistantOpen)}
      disabled={!onOpenAssistant}
      onClick={onOpenAssistant}
    >
      Assistant
    </button>
  ),
}));

jest.mock("@/components/ai-assistant/AssistantPopup", () => ({
  __esModule: true,
  default: ({
    open,
    fieldHelpRequest,
    sessionId,
  }: {
    open: boolean;
    fieldHelpRequest?: {
      prompt: string;
      context: { fieldKey?: string };
    } | null;
    sessionId?: number;
  }) => (
    <div
      data-testid="assistant-popup"
      data-open={String(open)}
      data-prompt={fieldHelpRequest?.prompt}
      data-field-key={fieldHelpRequest?.context.fieldKey}
      data-session-id={sessionId}
    />
  ),
}));

const FieldHelpTrigger = () => {
  const assistant = useAssistantLauncher();
  return (
    <button
      type="button"
      onClick={() =>
        assistant.requestFieldHelp({
          fieldLabel: "Event Name",
          fieldKey: "/content/event/name",
          sectionId: "event_overview",
        })
      }
    >
      Help with Event Name
    </button>
  );
};

describe("LayoutWrapper", () => {
  test("omits assistant controls when organization access is disabled", () => {
    render(
      <LayoutWrapper assistantEnabled={false}>
        <div>Dashboard</div>
      </LayoutWrapper>,
    );

    expect(screen.getByTestId("assistant-launcher")).toBeDisabled();
    expect(screen.queryByTestId("assistant-popup")).not.toBeInTheDocument();
  });

  test("opens the assistant when both feature and organization access are enabled", () => {
    render(
      <LayoutWrapper assistantEnabled>
        <div>Dashboard</div>
      </LayoutWrapper>,
    );

    const launcher = screen.getByTestId("assistant-launcher");
    expect(launcher).toBeEnabled();
    expect(screen.getByTestId("assistant-popup")).toHaveAttribute(
      "data-open",
      "false",
    );

    fireEvent.click(launcher);

    expect(screen.getByTestId("assistant-popup")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByTestId("assistant-popup")).toHaveAttribute(
      "data-session-id",
      "1",
    );

    fireEvent.click(launcher);
    fireEvent.click(launcher);
    expect(screen.getByTestId("assistant-popup")).toHaveAttribute(
      "data-session-id",
      "2",
    );
  });

  test("opens the assistant with a pinned field-help submission request", () => {
    render(
      <LayoutWrapper assistantEnabled>
        <FieldHelpTrigger />
      </LayoutWrapper>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Help with Event Name" }),
    );

    expect(screen.getByTestId("assistant-popup")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByTestId("assistant-popup")).toHaveAttribute(
      "data-field-key",
      "/content/event/name",
    );
    expect(screen.getByTestId("assistant-popup")).toHaveAttribute(
      "data-prompt",
      'What should I enter for the "Event Name" field? Explain it simply and give me one short example.',
    );
    expect(screen.getByTestId("assistant-popup")).toHaveAttribute(
      "data-session-id",
      "1",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Help with Event Name" }),
    );
    expect(screen.getByTestId("assistant-popup")).toHaveAttribute(
      "data-session-id",
      "2",
    );
  });
});
