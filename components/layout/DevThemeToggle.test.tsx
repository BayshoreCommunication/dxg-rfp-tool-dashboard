import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  test("switches the local preview between dark and light", async () => {
    render(<DevThemeToggle />);

    const toggle = screen.getByRole("button", {
      name: "Disable local dark mode preview",
    });
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(toggle);
    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    await waitFor(() => expect(toggle).toHaveAttribute("aria-pressed", "false"));

    fireEvent.click(toggle);
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    await waitFor(() => expect(toggle).toHaveAttribute("aria-pressed", "true"));
  });

  test("follows a theme change made elsewhere, such as the account menu", async () => {
    render(<DevThemeToggle />);
    document.documentElement.classList.remove("dark");
    expect(
      await screen.findByRole("button", { name: "Enable local dark mode preview" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
