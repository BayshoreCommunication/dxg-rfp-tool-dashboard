import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "react-toastify";
import NotificationSettings from "./NotificationSettings";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/notifications/preferences";

const mockUpdateNotificationPreferences = jest.fn();

jest.mock("@/app/actions/notification", () => ({
  updateNotificationPreferencesAction: (...args: unknown[]) =>
    mockUpdateNotificationPreferences(...args),
}));

jest.mock("react-toastify", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateNotificationPreferences.mockImplementation(async (preferences) => ({
    success: true,
    data: preferences,
  }));
});

describe("NotificationSettings", () => {
  it("organizes notification types and only exposes suitable channels", () => {
    render(
      <NotificationSettings initialPreferences={DEFAULT_NOTIFICATION_PREFERENCES} />,
    );

    expect(screen.getByRole("heading", { name: "Proposal activity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vendor activity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account and product" })).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "In-app notifications for Proposal views" }),
    ).toBeChecked();
    expect(
      screen.queryByRole("switch", { name: "Email notifications for Proposal views" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Email notifications for Security alerts" }),
    ).toBeChecked();
    expect(
      screen.queryByRole("switch", { name: "In-app notifications for Security alerts" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Frequency for Proposal views" }),
    ).toHaveValue("immediate");
    expect(
      screen.getByRole("combobox", { name: "Frequency for Deadlines and expiry" }),
    ).toHaveValue("immediate");
    expect(
      screen.getByRole("combobox", { name: "Frequency for New vendor responses" }),
    ).toHaveValue("immediate");
  });

  it("marks channel changes as unsaved and confirms a successful save", async () => {
    render(
      <NotificationSettings initialPreferences={DEFAULT_NOTIFICATION_PREFERENCES} />,
    );

    fireEvent.click(
      screen.getByRole("switch", { name: "In-app notifications for Proposal views" }),
    );
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));

    await waitFor(() => {
      expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          proposalViews: expect.objectContaining({ inApp: false, email: false }),
          securityAlerts: expect.objectContaining({ inApp: false, email: true }),
        }),
      );
    });
    expect(await screen.findByText("Preferences saved")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("offers a temporary global mute without altering individual switches", () => {
    render(
      <NotificationSettings initialPreferences={DEFAULT_NOTIFICATION_PREFERENCES} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mute 1 hour" }));

    expect(
      screen.getByRole("heading", { name: "Notifications are muted" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume notifications" })).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "In-app notifications for Proposal views" }),
    ).toBeChecked();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("shows a non-blocking warning when saved preferences cannot be loaded", () => {
    render(
      <NotificationSettings
        initialPreferences={DEFAULT_NOTIFICATION_PREFERENCES}
        loadError="Could not load preferences"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Saved preferences could not be loaded",
    );
  });
});
