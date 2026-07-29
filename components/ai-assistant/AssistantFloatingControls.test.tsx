import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import AssistantFloatingControls from "./AssistantFloatingControls";

describe("AssistantFloatingControls", () => {
  test("starts a new conversation directly without opening the options menu", () => {
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
      screen.getByRole("button", { name: "Start new conversation" }),
    );

    expect(onNewChat).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("menu", { name: "Assistant options" }),
    ).not.toBeInTheDocument();

    const controls = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));
    expect(controls).toEqual([
      "Start new conversation",
      "Assistant options",
      "Close AI Assistant",
    ]);
  });

  test("keeps new conversation out of the menu and opens history", () => {
    const onOpenHistory = jest.fn();
    render(
      <AssistantFloatingControls
        hasHistory
        onOpenHistory={onOpenHistory}
        onNewChat={jest.fn()}
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

    expect(
      screen.queryByRole("menuitem", {
        name: "Start new conversation",
      }),
    ).not.toBeInTheDocument();
    const conversationHistory = screen.getByRole("menuitem", {
      name: "Open conversation history",
    });
    fireEvent.click(conversationHistory);
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
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
      name: "Open conversation history",
    });
    await waitFor(() => expect(first).toHaveFocus());
    fireEvent.keyDown(first.closest('[role="menu"]') as HTMLElement, {
      key: "ArrowDown",
    });
    expect(
      screen.getByRole("menuitem", {
        name: "Reset popup position",
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
