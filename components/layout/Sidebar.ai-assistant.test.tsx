import { signOutAction } from "@/app/actions/auth";
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
jest.mock("@/app/actions/supportDesk", () => ({
  getSupportUnreadCountAction: jest.fn().mockResolvedValue(0),
}));
jest.mock("@/app/actions/vendorList", () => ({
  getVendorListAccessAction: jest.fn().mockResolvedValue({ canRead: true }),
}));
jest.mock("@/app/actions/proposalTemplates", () => ({
  getTemplateAccessAction: jest.fn().mockResolvedValue({ canUse: false }),
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
      id: "support",
      title: "Support",
      href: "/support",
      icon: <span aria-hidden>S</span>,
    },
  ],
}));

describe("Sidebar AI Assistant launcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("opens the dialog from the fixed footer without adding a route link", () => {
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

  test("shows the signed-in user and account actions in the profile menu", async () => {
    const mockedSignOutAction = jest.mocked(signOutAction);
    mockedSignOutAction.mockResolvedValue({
      success: true,
      message: "Signed out successfully",
    });

    render(
      <Sidebar
        currentUser={{
          name: "Akib Rahman",
          email: "akib.swop@gmail.com",
        }}
      />,
    );

    const accountButton = screen.getByRole("button", {
      name: "Open account menu for Akib Rahman",
    });
    expect(accountButton).toHaveTextContent("AR");
    // The card shows who is signed in before it is opened.
    expect(accountButton).toHaveTextContent("Akib Rahman");
    expect(accountButton).toHaveTextContent("akib.swop@gmail.com");

    fireEvent.click(accountButton);

    expect(screen.queryByText("Administrator")).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Notifications" })).toHaveAttribute(
      "href",
      "/notification",
    );
    expect(await screen.findByRole("menuitem", { name: "Users" })).toHaveAttribute(
      "href",
      "/settings/users",
    );
    expect(await screen.findByRole("menuitem", { name: "Vendors" })).toBeInTheDocument();
    // The member cannot use templates in this fixture, so the item is absent.
    expect(screen.queryByRole("menuitem", { name: "Templates" })).not.toBeInTheDocument();

    const signOutButton = screen.getByRole("menuitem", { name: "Sign out" });
    expect(signOutButton).toHaveTextContent("Sign out");

    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockedSignOutAction).toHaveBeenCalledTimes(1);
      expect(signOutButton).toBeDisabled();
      expect(signOutButton).toHaveTextContent("Signing out");
    });
  });

  test("pins Support and Settings in the footer and collapses to icons", () => {
    const onToggleCollapsed = jest.fn();
    const { rerender } = render(
      <Sidebar onToggleCollapsed={onToggleCollapsed} />,
    );

    const footerLinks = ["Support", "Settings"].map((name) =>
      screen.getAllByRole("link", { name }).find((link) =>
        link.closest("aside"),
      ),
    );
    expect(footerLinks[0]).toHaveAttribute("href", "/support");
    expect(footerLinks[1]).toHaveAttribute("href", "/settings");
    // Support is not part of the main navigation list.
    const primary = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(primary).not.toHaveTextContent("Support");

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);

    rerender(<Sidebar collapsed onToggleCollapsed={onToggleCollapsed} />);
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });

  test("provides compact navigation controls for small screens", () => {
    render(<Sidebar onOpenAssistant={jest.fn()} />);

    expect(
      screen.getByRole("navigation", { name: "Mobile primary navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Open AI Assistant from mobile navigation",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Open mobile account menu for Your account",
      }),
    ).toBeInTheDocument();
  });

  test("keeps the existing mobile header and bottom navigation", () => {
    render(<Sidebar onOpenAssistant={jest.fn()} />);

    expect(
      screen.getByRole("navigation", { name: "Mobile primary navigation" }),
    ).not.toHaveClass("hidden");
    expect(
      screen.getAllByRole("link", { name: "Go to dashboard" }),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Open navigation menu" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Start a new proposal conversation" }),
    ).not.toBeInTheDocument();
  });
});
