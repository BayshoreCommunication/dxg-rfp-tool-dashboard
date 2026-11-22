import { render, screen } from "@testing-library/react";
import InlineAlert, { type InlineAlertTone } from "./InlineAlert";
import Skeleton from "./Skeleton";

describe("InlineAlert", () => {
  test("danger interrupts assistive tech with role=alert", () => {
    render(<InlineAlert tone="danger" title="Save failed">Try again</InlineAlert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
  });

  test.each<InlineAlertTone>(["info", "success", "warning"])("%s is a polite status", (tone) => {
    render(<InlineAlert tone={tone} title="Heads up" />);
    expect(screen.getByRole("status")).toHaveAttribute("data-tone", tone);
  });

  test("live=off drops the role, and an action is rendered", () => {
    render(<InlineAlert tone="info" live="off" action={<button>Retry</button>}>Body</InlineAlert>);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("Skeleton", () => {
  test("is hidden from assistive tech and renders the requested lines", () => {
    const { container } = render(<Skeleton lines={3} />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild?.children).toHaveLength(3);
    expect(container.querySelector(".motion-reduce\\:animate-none")).not.toBeNull();
  });
});
