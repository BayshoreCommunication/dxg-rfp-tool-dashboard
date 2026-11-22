import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "./Input";
import Textarea from "./Textarea";

describe("Input", () => {
  test("uses control tokens, is invalid on request and forwards its ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="Name" invalid />);
    const input = screen.getByLabelText("Name");
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("border-danger-strong", "bg-surface", "text-heading");
  });

  test("valid state uses the control border, and disabled is honoured", () => {
    render(<Input aria-label="Name" disabled />);
    const input = screen.getByLabelText("Name");
    expect(input).toHaveClass("border-control");
    expect(input).toBeDisabled();
    expect(input).not.toHaveAttribute("aria-invalid");
  });
});

describe("Textarea", () => {
  test("counts characters when showCount and maxLength are set", async () => {
    render(<Textarea aria-label="Notes" maxLength={20} showCount />);
    expect(screen.getByTestId("textarea-count")).toHaveTextContent("0 / 20");
    await userEvent.type(screen.getByLabelText("Notes"), "hello");
    expect(screen.getByTestId("textarea-count")).toHaveTextContent("5 / 20");
  });

  test("controlled value drives the count, and invalid sets aria-invalid", () => {
    render(<Textarea aria-label="Notes" maxLength={10} showCount value="abc" onChange={() => {}} invalid />);
    expect(screen.getByTestId("textarea-count")).toHaveTextContent("3 / 10");
    expect(screen.getByLabelText("Notes")).toHaveAttribute("aria-invalid", "true");
  });

  test("shows no counter without showCount", () => {
    render(<Textarea aria-label="Notes" maxLength={10} />);
    expect(screen.queryByTestId("textarea-count")).not.toBeInTheDocument();
  });
});
