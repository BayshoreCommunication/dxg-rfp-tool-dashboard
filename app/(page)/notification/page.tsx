import {
  getNotificationsAction,
  NotificationItem,
} from "@/app/actions/notification";
import NotificationList from "@/components/notification/NotificationList";

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default async function NotificationPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));
  const res = await getNotificationsAction({ page, limit: 10 });
  const pagination = res.pagination as Pagination | undefined;

  return (
    <NotificationList
      initialNotifications={
        res.success && Array.isArray(res.data)
          ? (res.data as NotificationItem[])
          : []
      }
      initialUnreadCount={typeof res.unreadCount === "number" ? res.unreadCount : 0}
      currentPage={page}
      totalPages={pagination?.totalPages ?? 1}
      totalCount={pagination?.total ?? 0}
    />
  );
}
