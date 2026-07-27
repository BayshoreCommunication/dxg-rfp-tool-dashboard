import { fireEvent, render, screen } from "@testing-library/react";
import MessageList from "./MessageList";

describe("MessageList", () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn().mockReturnValue({ matches: false }),
    });
  });

  test("offers jump-to-latest when auto-scroll is paused", () => {
    const onNearBottomChange = jest.fn();
    render(
      <MessageList
        messages={[]}
        streamingAssistant={null}
        loading={false}
        isNearBottom={false}
        onNearBottomChange={onNearBottomChange}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Jump to latest" }),
    );
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(onNearBottomChange).toHaveBeenCalledWith(true);
  });

  test("announces one typing status before the first delta", () => {
    render(
      <MessageList
        messages={[]}
        streamingAssistant={{
          messageId: "assistant-1",
          content: "",
          receivedFirstDelta: false,
        }}
        loading={false}
        isNearBottom
        onNearBottomChange={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("status", { name: "Assistant is responding" }),
    ).toBeInTheDocument();
  });
});
