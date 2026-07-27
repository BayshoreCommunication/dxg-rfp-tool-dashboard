import { render, screen } from "@testing-library/react";
import Sidebar from "./Sidebar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/ai-assistant",
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
    {
      id: "ai-assistant",
      title: "AI Assistant",
      href: "/ai-assistant",
      icon: <span aria-hidden>AI</span>,
    },
  ],
}));

describe("Sidebar AI Assistant item", () => {
  test("uses the existing navigation pattern and marks the route active", () => {
    render(<Sidebar />);
    const link = screen.getByRole("link", { name: /AI Assistant/ });
    expect(link).toHaveAttribute("href", "/ai-assistant");
    expect(link).toHaveAttribute("aria-current", "page");
  });
});
