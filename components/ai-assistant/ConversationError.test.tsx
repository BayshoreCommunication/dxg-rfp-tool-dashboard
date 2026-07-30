import { render, screen } from "@testing-library/react";
import ConversationError from "./ConversationError";

const props = {
  retryAfterSeconds: 0,
  onRetry: jest.fn(),
  onDismiss: jest.fn(),
  compact: true,
};

describe("ConversationError", () => {
  test("explains concurrency waits without claiming the assistant is unavailable", () => {
    render(
      <ConversationError
        {...props}
        error={{
          code: "ASSISTANT_CONCURRENCY_LIMITED",
          message: "Another assistant response is still active.",
          retryable: true,
        }}
      />,
    );

    expect(
      screen.getByText("Finishing another response"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Assistant is unavailable"),
    ).not.toBeInTheDocument();
  });

  test("uses a busy message for product rate limits", () => {
    render(
      <ConversationError
        {...props}
        error={{
          code: "ASSISTANT_RATE_LIMITED",
          message: "Too many assistant requests.",
          retryable: true,
        }}
      />,
    );

    expect(
      screen.getByText("Assistant is busy right now"),
    ).toBeInTheDocument();
  });
});
