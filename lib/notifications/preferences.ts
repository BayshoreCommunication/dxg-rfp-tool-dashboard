export type NotificationPreferenceKey =
  | "proposalViews"
  | "proposalDeadlines"
  | "vendorResponses"
  | "productUpdates"
  | "securityAlerts";

export type NotificationFrequency = "immediate" | "daily" | "weekly";

export type NotificationDeliveryPreference = {
  inApp: boolean;
  email: boolean;
  frequency: NotificationFrequency;
};

export type NotificationPreferences = {
  mutedUntil: string | null;
} & Record<NotificationPreferenceKey, NotificationDeliveryPreference>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  mutedUntil: null,
  proposalViews: { inApp: true, email: false, frequency: "immediate" },
  proposalDeadlines: { inApp: true, email: true, frequency: "immediate" },
  vendorResponses: { inApp: true, email: true, frequency: "immediate" },
  productUpdates: { inApp: true, email: false, frequency: "weekly" },
  securityAlerts: { inApp: false, email: true, frequency: "immediate" },
};

const PREFERENCE_KEYS: NotificationPreferenceKey[] = [
  "proposalViews",
  "proposalDeadlines",
  "vendorResponses",
  "productUpdates",
  "securityAlerts",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isFrequency = (value: unknown): value is NotificationFrequency =>
  value === "immediate" || value === "daily" || value === "weekly";

export const normalizeNotificationPreferences = (value: unknown): NotificationPreferences => {
  const source = isRecord(value) ? value : {};
  const mutedUntil = typeof source.mutedUntil === "string" && !Number.isNaN(Date.parse(source.mutedUntil))
    ? source.mutedUntil
    : source.mutedUntil instanceof Date && !Number.isNaN(source.mutedUntil.getTime())
      ? source.mutedUntil.toISOString()
      : null;
  const normalized = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    mutedUntil,
  };

  for (const key of PREFERENCE_KEYS) {
    const preference = isRecord(source[key]) ? source[key] : {};
    const fallback = DEFAULT_NOTIFICATION_PREFERENCES[key];
    normalized[key] = {
      inApp: typeof preference.inApp === "boolean" ? preference.inApp : fallback.inApp,
      email: typeof preference.email === "boolean" ? preference.email : fallback.email,
      frequency: isFrequency(preference.frequency) ? preference.frequency : fallback.frequency,
    };
  }

  return normalized;
};
