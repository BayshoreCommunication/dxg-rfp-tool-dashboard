import { fireEvent, render, screen } from "@testing-library/react";
import ChatComposer from "./ChatComposer";

const renderComposer = (
  overrides: Partial<React.ComponentProps<typeof ChatComposer>> = {},
) => {
  const props: React.ComponentProps<typeof ChatComposer> = {
    value: "How do proposals work?",
    busy: false,
    canSend: true,
    retryAfterSeconds: 0,
    onChange: jest.fn(),
    onSend: jest.fn(),
    onAbort: jest.fn(),
    ...overrides,
  };
  render(<ChatComposer {...props} />);
  return props;
};

describe("ChatComposer", () => {
  test("Enter sends while Shift+Enter inserts a newline", () => {
    const props = renderComposer();
    const input = screen.getByLabelText("Message the AI Assistant");
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(props.onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  test("IME composition never submits accidentally", () => {
    const props = renderComposer();
    const input = screen.getByLabelText("Message the AI Assistant");
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(props.onSend).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  test("busy state replaces send with an accessible stop control", () => {
    const props = renderComposer({ busy: true, canSend: false });
    expect(screen.queryByRole("button", { name: "Send message" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Stop assistant response" }),
    );
    expect(props.onAbort).toHaveBeenCalledTimes(1);
  });

  test("shows a retry countdown and prevents submit", () => {
    const props = renderComposer({
      retryAfterSeconds: 12,
      canSend: false,
    });
    expect(screen.getByText("You can send again in 12s.")).toBeInTheDocument();
    fireEvent.submit(screen.getByRole("button", { name: "Send message" }).closest("form")!);
    expect(props.onSend).not.toHaveBeenCalled();
  });
});
