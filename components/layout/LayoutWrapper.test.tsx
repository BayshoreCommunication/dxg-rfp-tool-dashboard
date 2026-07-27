import { fireEvent, render, screen } from "@testing-library/react";
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
  default: ({ open }: { open: boolean }) => (
    <div data-testid="assistant-popup" data-open={String(open)} />
  ),
}));

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
  });
});
