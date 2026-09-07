import { fireEvent, render, screen } from "@testing-library/react";
import DevThemeToggle from "./DevThemeToggle";

describe("DevThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "dark";
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
    delete document.documentElement.dataset.theme;
  });

  test("switches the local preview between dark and light", () => {
    render(<DevThemeToggle defaultDark />);

    const toggle = screen.getByRole("button", {
      name: "Disable local dark mode preview",
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggle);
    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});
