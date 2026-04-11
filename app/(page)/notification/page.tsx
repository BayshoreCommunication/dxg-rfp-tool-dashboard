import {
  getNotificationsAction,
  NotificationItem,
} from "@/app/actions/notification";
import NotificationList from "@/components/notification/NotificationList";

export default async function NotificationPage() {
  const res = await getNotificationsAction({ page: 1, limit: 50 });

  return (
    <NotificationList
      initialNotifications={
        res.success && Array.isArray(res.data)
          ? (res.data as NotificationItem[])
          : []
      }
      initialUnreadCount={typeof res.unreadCount === "number" ? res.unreadCount : 0}
    />
  );
}
