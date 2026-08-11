import { render, screen } from "@testing-library/react";
import ToastMessage from "./ToastMessage";

describe("ToastMessage", () => {
  it("separates the outcome from supporting detail", () => {
    render(<ToastMessage title="Room removed" description="Three rooms remain." />);

    expect(screen.getByText("Room removed")).toHaveClass("dxg-toast-message-title");
    expect(screen.getByText("Three rooms remain.")).toHaveClass("dxg-toast-message-description");
  });

  it("does not render an empty description", () => {
    const { container } = render(<ToastMessage title="Draft saved" />);

    expect(container.querySelector(".dxg-toast-message-description")).toBeNull();
  });
});
