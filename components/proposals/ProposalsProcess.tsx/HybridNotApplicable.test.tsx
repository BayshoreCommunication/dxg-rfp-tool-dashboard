import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HybridNotApplicable from "./HybridNotApplicable";

const setup = () => {
  const handlers = { onBack: jest.fn(), onContinue: jest.fn(), onChangeFormat: jest.fn() };
  render(<HybridNotApplicable {...handlers} />);
  return handlers;
};

describe("HybridNotApplicable", () => {
  test("keeps the section name and explains why nothing is needed", () => {
    setup();
    expect(screen.getByRole("heading", { level: 2, name: "Hybrid & Virtual Production" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Not applicable to this event");
    expect(screen.getByRole("status")).toHaveTextContent(/nothing is required/);
  });

  test("offers a way to change the format, and Back and Continue", async () => {
    const handlers = setup();
    await userEvent.click(screen.getByRole("button", { name: "Change event format" }));
    await userEvent.click(screen.getByRole("button", { name: /Back/ }));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(handlers.onChangeFormat).toHaveBeenCalledTimes(1);
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
    expect(handlers.onContinue).toHaveBeenCalledTimes(1);
  });

  test("uses semantic tokens only", () => {
    const { container } = render(<HybridNotApplicable onBack={() => {}} onContinue={() => {}} onChangeFormat={() => {}} />);
    const classes = Array.from(container.querySelectorAll("[class]")).map((el) => el.getAttribute("class") ?? "").join(" ");
    expect(classes).not.toMatch(/\[#[0-9a-f]{3,8}\]/i);
  });
});
