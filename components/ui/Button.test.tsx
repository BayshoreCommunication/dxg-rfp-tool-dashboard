import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "./Button";

describe("Button", () => {
  test("defaults to a non-submitting primary button using semantic tokens", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-variant", "primary");
    expect(button).toHaveClass("bg-action", "text-on-action");
    expect(button.className).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  test.each(["secondary", "ghost", "danger"] as const)("renders the %s variant", (variant) => {
    render(<Button variant={variant}>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", variant);
  });

  test("loading disables the button, sets aria-busy and blocks clicks", async () => {
    const onClick = jest.fn();
    render(<Button loading onClick={onClick}>Saving</Button>);
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test("disabled and size classes apply, and the ref is forwarded", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref} size="lg" disabled className="ml-2">Go</Button>);
    expect(ref.current).toBe(screen.getByRole("button"));
    expect(ref.current).toHaveClass("min-h-11", "ml-2");
    expect(ref.current).toBeDisabled();
    expect(ref.current).not.toHaveAttribute("aria-busy");
  });

  test("keeps keyboard activation", async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
