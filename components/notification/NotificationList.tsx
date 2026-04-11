"use client";

import {
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
  NotificationItem,
} from "@/app/actions/notification";
import {
  BellDot,
  CheckCheck,
  Clock3,
  Eye,
  Siren,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

type NotificationListProps = {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const getNotificationIcon = (type: NotificationItem["type"]) => {
  switch (type) {
    case "proposal_view":
      return <Eye size={16} />;
    case "proposal_expiring_soon":
      return <Clock3 size={16} />;
    case "proposal_expired":
      return <TriangleAlert size={16} />;
    default:
      return <BellDot size={16} />;
  }
};

const getNotificationIconStyle = (type: NotificationItem["type"]) => {
  switch (type) {
    case "proposal_view":
      return "bg-cyan-50 text-cyan-600";
    case "proposal_expiring_soon":
      return "bg-amber-50 text-amber-600";
    case "proposal_expired":
      return "bg-rose-50 text-rose-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

export default function NotificationList({
  initialNotifications,
  initialUnreadCount,
}: NotificationListProps) {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const hasNotifications = notifications.length > 0;

  const unreadItems = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  useEffect(() => {
    if (initialUnreadCount <= 0) return;
    void markAllAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markOneAsRead = async (notificationId: string) => {
    if (markingId) return;

    setMarkingId(notificationId);
    const previous = notifications;
    setNotifications((current) =>
      current.map((item) =>
        item._id === notificationId
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    const res = await markNotificationAsReadAction(notificationId);
    if (!res.success) {
      setNotifications(previous);
      setUnreadCount(unreadItems);
      toast.error(res.message || "Failed to mark notification as read.");
    }

    setMarkingId(null);
  };

  const markAllAsRead = async () => {
    if (markingAll || unreadItems === 0) return;

    setMarkingAll(true);
    const previous = notifications;
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt || new Date().toISOString(),
      })),
    );
    setUnreadCount(0);

    const res = await markAllNotificationsAsReadAction();
    if (!res.success) {
      setNotifications(previous);
      setUnreadCount(unreadItems);
      toast.error(res.message || "Failed to update notifications.");
    }

    setMarkingAll(false);
  };

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime
    ? currentTime.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  const greeting = () => {
    if (!currentTime) return "Welcome back";
    const h = currentTime.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <section className="space-y-6 px-6">
      <div className="relative">
        {/* Ambient glow behind header */}
        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 rounded-3xl blur-2xl pointer-events-none flex items-center justify-center" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Title block */}
          <div className="flex flex-col gap-1">
            {/* Pill badge */}
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-cyan-500 mb-1">
              <Sparkles size={10} className="fill-cyan-400" />
              Overview
            </span>

            <h1 className="text-[30px] font-black tracking-tight leading-none">
              <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
                Notifications
              </span>
            </h1>

            <p className="mt-1 text-[13px] text-slate-400 font-medium flex items-center gap-2 min-h-[20px]">
              {mounted && (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {greeting()}
                  {formattedDate ? ` · ${formattedDate}` : ""}
                </>
              )}
              {!mounted && <span className="opacity-0">Loading date...</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:ml-auto lg:justify-end">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              <Siren size={15} className="text-cyan-600" />
              {unreadCount} unread
            </div>
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={markingAll || unreadItems === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCheck size={16} />
              Mark all read
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {!hasNotifications ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl bg-slate-50 px-6 text-center">
            <BellDot size={42} className="text-slate-300" />
            <h2 className="mt-4 text-xl font-bold text-slate-800">
              No notifications yet
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              When your proposals get views or approach expiry, they will show
              up here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <button
                key={notification._id}
                type="button"
                onClick={() => void markOneAsRead(notification._id)}
                disabled={notification.isRead || markingId === notification._id}
                className={`flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition-colors ${
                  notification.isRead
                    ? "border-slate-200 bg-white"
                    : "border-cyan-200 bg-cyan-50/40"
                } disabled:cursor-default`}
              >
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getNotificationIconStyle(notification.type)}`}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-bold text-slate-900">
                      {notification.title}
                    </p>
                    <span className="text-xs font-medium text-slate-500">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {notification.message}
                  </p>
                </div>

                {!notification.isRead && (
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
