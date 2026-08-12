import { signOutAction } from "@/app/actions/auth";
import { getVendorUnreadCountAction } from "@/app/actions/vendorResponse";
import { VENDOR_UNREAD_COUNT_CHANGED_EVENT } from "@/lib/vendorResponses/unreadEvents";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Sidebar from "./Sidebar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));
jest.mock("@/app/actions/auth", () => ({
  signOutAction: jest.fn(),
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
      id: "vendor-responses",
      title: "Vendor Response",
      href: "/vendor-responses",
      icon: <span aria-hidden>V</span>,
    },
  ],
}));

describe("Sidebar AI Assistant launcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("opens the dialog in the fixed footer without adding a route link", () => {
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
      divider.compareDocumentPosition(launcher) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("shows a direct, meaningful sign-out control and its progress state", async () => {
    const mockedSignOutAction = jest.mocked(signOutAction);
    mockedSignOutAction.mockResolvedValue({
      success: true,
      message: "Signed out successfully",
    });

    render(<Sidebar />);

    const signOutButton = screen.getByRole("button", {
      name: "Sign out of your account",
    });
    expect(signOutButton).toHaveTextContent("Sign out");

    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockedSignOutAction).toHaveBeenCalledTimes(1);
      expect(signOutButton).toBeDisabled();
      expect(signOutButton).toHaveTextContent("Signing out");
    });
  });

  test("updates the vendor response badge without a reload", async () => {
    jest.mocked(getVendorUnreadCountAction).mockResolvedValueOnce(1);
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    window.dispatchEvent(
      new CustomEvent(VENDOR_UNREAD_COUNT_CHANGED_EVENT, {
        detail: { count: 0 },
      }),
    );

    await waitFor(() => {
      expect(screen.queryByText("1")).not.toBeInTheDocument();
    });
  });
});
