import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
        onResetPosition={jest.fn()}
        positionModified
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Assistant options" }),
    );
    expect(
      screen.getByRole("menu", { name: "Assistant options" }),
    ).toBeInTheDocument();

    const newConversation = screen.getByRole("menuitem", {
      name: "Start new conversation",
    });
    expect(newConversation).toHaveClass("whitespace-nowrap");
    fireEvent.click(newConversation);
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
        onResetPosition={jest.fn()}
        onResetSize={jest.fn()}
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
    expect(
      screen.getByRole("menuitem", {
        name: "Reset popup position",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("menuitem", {
        name: "Reset popup size",
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
        onResetPosition={jest.fn()}
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

  test("moves focus through menu items and restores it on Escape", async () => {
    render(
      <AssistantFloatingControls
        hasHistory
        onOpenHistory={jest.fn()}
        onNewChat={jest.fn()}
        onClose={jest.fn()}
        onResetPosition={jest.fn()}
        onResetSize={jest.fn()}
        positionModified
        sizeModified
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Assistant options",
    });
    fireEvent.click(trigger);
    const first = screen.getByRole("menuitem", {
      name: "Start new conversation",
    });
    await waitFor(() => expect(first).toHaveFocus());
    fireEvent.keyDown(first.closest('[role="menu"]') as HTMLElement, {
      key: "ArrowDown",
    });
    expect(
      screen.getByRole("menuitem", {
        name: "Open conversation history",
      }),
    ).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  test("resets a moved popup from the options menu", () => {
    const onResetPosition = jest.fn();
    render(
      <AssistantFloatingControls
        hasHistory
        onOpenHistory={jest.fn()}
        onNewChat={jest.fn()}
        onClose={jest.fn()}
        onResetPosition={onResetPosition}
        positionModified
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Assistant options" }),
    );
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Reset popup position" }),
    );
    expect(onResetPosition).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("menu", { name: "Assistant options" }),
    ).not.toBeInTheDocument();
  });

  test("resets a resized popup from the options menu", () => {
    const onResetSize = jest.fn();
    render(
      <AssistantFloatingControls
        hasHistory
        onOpenHistory={jest.fn()}
        onNewChat={jest.fn()}
        onClose={jest.fn()}
        onResetSize={onResetSize}
        sizeModified
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Assistant options" }),
    );
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Reset popup size" }),
    );
    expect(onResetSize).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("menu", { name: "Assistant options" }),
    ).not.toBeInTheDocument();
  });
});
