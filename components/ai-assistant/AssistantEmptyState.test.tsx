import { fireEvent, render, screen } from "@testing-library/react";
import AssistantEmptyState from "./AssistantEmptyState";

describe("AssistantEmptyState", () => {
  test("runs a compact suggestion once for a mobile pointer and its synthetic click", () => {
    const onSuggestion = jest.fn();
    render(
      <AssistantEmptyState compact onSuggestion={onSuggestion} />,
    );

    const suggestion = screen.getByRole("button", {
      name: "Help me start a proposal",
    });
    fireEvent.pointerUp(suggestion, { pointerType: "touch" });
    fireEvent.click(suggestion);

    expect(onSuggestion).toHaveBeenCalledTimes(1);
    expect(onSuggestion).toHaveBeenCalledWith(
      "How do I create a new proposal? Give me the exact navigation steps.",
    );
    expect(suggestion).toHaveClass("touch-manipulation");
  });

  test("keeps mouse and keyboard click activation available", () => {
    const onSuggestion = jest.fn();
    render(
      <AssistantEmptyState compact onSuggestion={onSuggestion} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Explain this page" }),
    );

    expect(onSuggestion).toHaveBeenCalledWith(
      "Explain what I can do on this page.",
    );
  });
});
