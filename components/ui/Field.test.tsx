import { render, screen } from "@testing-library/react";
import Field from "./Field";
import Input from "./Input";
import Textarea from "./Textarea";

describe("Field", () => {
  test("labels the control and shows a visible Required marker", () => {
    render(<Field label="Event name" required>{(a) => <Input {...a} />}</Field>);
    const input = screen.getByLabelText(/Event name/);
    expect(input).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  test("chains hint and error ids, marks the control invalid and announces the error", () => {
    render(
      <Field label="Email" hint="Work address" error="Enter a valid email">
        {(a) => <Input {...a} />}
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(describedBy.split(" ")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email");
    expect(document.getElementById(describedBy.split(" ")[0])).toHaveTextContent("Work address");
    expect(document.getElementById(describedBy.split(" ")[1])).toBe(screen.getByRole("alert"));
  });

  test("shows Optional only when not required, and honours a supplied id", () => {
    render(<Field label="Notes" optional htmlFor="notes-id">{(a) => <Textarea {...a} />}</Field>);
    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/)).toHaveAttribute("id", "notes-id");
  });

  test("renders no describedby or alert when there is no hint or error", () => {
    render(<Field label="Name">{(a) => <Input {...a} />}</Field>);
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
