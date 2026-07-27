import { fireEvent, render, screen } from "@testing-library/react";
import AssistantFloatingControls from "./AssistantFloatingControls";

describe("AssistantFloatingControls", () => {
  test("opens the menu and runs the selected action", () => {
    const onNewChat = jest.fn();
    render(
      <AssistantFloatingControls
        hasHistory
        onOpenHistory={jest.fn()}
        onNewChat={onNewChat}
        onClose={jest.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Assistant options" }),
    );
    expect(
      screen.getByRole("menu", { name: "Assistant options" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("menuitem", {
        name: "Start new conversation",
      }),
    );
    expect(onNewChat).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("menu", { name: "Assistant options" }),
    ).not.toBeInTheDocument();
  });

  test("disables history when there are no conversations", () => {
    render(
      <AssistantFloatingControls
        hasHistory={false}
        onOpenHistory={jest.fn()}
        onNewChat={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Assistant options" }),
    );
    expect(
      screen.getByRole("menuitem", {
        name: "Open conversation history",
      }),
    ).toBeDisabled();
  });

  test("closes the menu with Escape without closing the Assistant", () => {
    const onClose = jest.fn();
    render(
      <AssistantFloatingControls
        hasHistory
        onOpenHistory={jest.fn()}
        onNewChat={jest.fn()}
        onClose={onClose}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Assistant options" }),
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("menu", { name: "Assistant options" }),
    ).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
