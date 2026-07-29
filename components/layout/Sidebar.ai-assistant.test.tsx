import { fireEvent, render, screen } from "@testing-library/react";
import Sidebar from "./Sidebar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));
jest.mock("@/app/actions/auth", () => ({
  signOutAction: jest.fn(),
}));
jest.mock("@/app/actions/settings", () => ({
  getSettingsAction: jest.fn().mockResolvedValue({ success: false }),
}));
jest.mock("@/app/actions/notification", () => ({
  getNotificationSocketConfigAction: jest
    .fn()
    .mockResolvedValue({ success: false }),
  getUnreadNotificationCountAction: jest
    .fn()
    .mockResolvedValue({ success: true, unreadCount: 0 }),
}));
jest.mock("@/app/actions/vendorResponse", () => ({
  getVendorUnreadCountAction: jest.fn().mockResolvedValue(0),
}));
jest.mock("@/config/navigation", () => ({
  navigationConfig: [
    {
      id: "proposals",
      title: "Proposals",
      href: "/proposals",
      icon: <span aria-hidden>P</span>,
    },
  ],
}));

describe("Sidebar AI Assistant launcher", () => {
  test("opens the dialog from above notifications without adding a route link", () => {
    const onOpenAssistant = jest.fn();
    render(
      <Sidebar
        assistantOpen
        onOpenAssistant={onOpenAssistant}
      />,
    );
    const launcher = screen.getByRole("button", {
      name: "Hide AI Assistant popup",
    });
    expect(launcher).toHaveAttribute("aria-haspopup", "dialog");
    expect(launcher).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.queryByRole("link", { name: /AI Assistant/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(launcher);
    expect(onOpenAssistant).toHaveBeenCalledTimes(1);

    const divider = screen.getByTestId("sidebar-footer-divider");
    expect(
      launcher.compareDocumentPosition(divider) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
