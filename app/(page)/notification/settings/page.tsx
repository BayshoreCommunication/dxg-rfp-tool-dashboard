import { getNotificationPreferencesAction } from "@/app/actions/notification";
import NotificationSettings from "@/components/notification/NotificationSettings";
import { normalizeNotificationPreferences } from "@/lib/notifications/preferences";

export default async function NotificationSettingsPage() {
  const response = await getNotificationPreferencesAction();

  return (
    <NotificationSettings
      initialPreferences={normalizeNotificationPreferences(response.data)}
      loadError={response.success ? undefined : response.message}
    />
  );
}
