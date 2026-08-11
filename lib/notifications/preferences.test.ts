import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
} from "./preferences";

describe("normalizeNotificationPreferences", () => {
  it("provides complete defaults for users without saved preferences", () => {
    expect(normalizeNotificationPreferences(undefined)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it("merges valid saved values without trusting malformed fields", () => {
    expect(normalizeNotificationPreferences({
      mutedUntil: "2026-08-12T10:00:00.000Z",
      proposalViews: { inApp: false, email: "yes", frequency: "daily" },
      securityAlerts: { inApp: true, email: false, frequency: "sometimes" },
    })).toEqual({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      mutedUntil: "2026-08-12T10:00:00.000Z",
      proposalViews: { inApp: false, email: false, frequency: "daily" },
      securityAlerts: { inApp: true, email: false, frequency: "immediate" },
    });
  });
});
