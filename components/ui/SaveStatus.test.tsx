import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SaveStatus, { type SaveState } from "./SaveStatus";

describe("SaveStatus", () => {
  test.each<[SaveState, string]>([
    ["idle", "Autosave on"],
    ["saving", "Saving…"],
    ["saved", "All changes saved"],
    ["error", "Save failed. Latest changes are not saved."],
  ])("says %s in words, in a polite live region", (state, text) => {
    render(<SaveStatus state={state} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(text);
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("data-state", state);
  });

  test("offers Retry only after a failure and calls back", async () => {
    const onRetry = jest.fn();
    const { rerender } = render(<SaveStatus state="saved" onRetry={onRetry} />);
    expect(screen.queryByRole("button", { name: "Retry save" })).not.toBeInTheDocument();
    rerender(<SaveStatus state="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry save" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("a failure without a retry handler shows no button", () => {
    render(<SaveStatus state="error" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("uses semantic tokens only", () => {
    const { container } = render(<SaveStatus state="error" onRetry={() => {}} />);
    const classes = Array.from(container.querySelectorAll("[class]")).map((el) => el.getAttribute("class") ?? "").join(" ");
    expect(classes).not.toMatch(/\[#[0-9a-f]{3,8}\]/i);
  });
});
