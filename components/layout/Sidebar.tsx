"use client";

import { signOutAction } from "@/app/actions/auth";
import {
  getNotificationSocketConfigAction,
  getUnreadNotificationCountAction,
} from "@/app/actions/notification";
import { getSettingsAction } from "@/app/actions/settings";
import { navigationConfig, NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { BellDot, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type SidebarSettings = {
  branding?: {
    brandName?: string;
    logoFile?: string | null;
  };
};

type NotificationSocketPayload = {
  event: "connected" | "notification:new" | "notification:unread-count";
  data?: {
    title?: string;
    message?: string;
    count?: number;
  };
};

const Sidebar = () => {
  const pathname = usePathname();
  const [userData, setUserData] = useState<SidebarSettings | null>(null);
  const [showSignOut, setShowSignOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socketUrl, setSocketUrl] = useState("");

  const isItemActive = (item: NavItem) => pathname === item.href;

  const signOutHandler = async () => {
    try {
      await signOutAction();
    } catch (error) {
      console.error("Backend logout failed:", error);
    }
    await signOut({ callbackUrl: "/sign-in" });
  };

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const res = await getSettingsAction();
      if (!mounted) return;

      const nextData =
        res?.success && res.data && typeof res.data === "object"
          ? (res.data as SidebarSettings)
          : null;

      setUserData(nextData);
    };

    void loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadUnreadCount = async () => {
      const res = await getUnreadNotificationCountAction();
      if (!mounted || !res.success) return;
      setUnreadCount(typeof res.unreadCount === "number" ? res.unreadCount : 0);
    };

    void loadUnreadCount();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSocketUrl = async () => {
      const res = await getNotificationSocketConfigAction();
      if (!mounted || !res.success || !res.socketUrl) return;
      setSocketUrl(res.socketUrl);
    };

    void loadSocketUrl();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!socketUrl) return;

    const socket = new WebSocket(socketUrl);

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as NotificationSocketPayload;

        if (payload.event === "notification:unread-count") {
          setUnreadCount(
            typeof payload.data?.count === "number" ? payload.data.count : 0,
          );
          return;
        }

        if (payload.event === "notification:new") {
          setUnreadCount((current) => current + 1);
          if (pathname !== "/notification") {
            toast.info(
              <div>
                <p className="font-semibold">
                  {payload.data?.title || "New notification"}
                </p>
                <p className="mt-1 text-sm">{payload.data?.message || ""}</p>
              </div>,
            );
          }
        }
      } catch (error) {
        console.error("Notification socket parse error:", error);
      }
    };

    socket.onerror = () => {
      console.warn("Notification WebSocket connection error.");
    };

    return () => {
      socket.close();
    };
  }, [pathname, socketUrl]);

  const avatarUrl = userData?.branding?.logoFile?.trim() || "";
  const brandInitial =
    userData?.branding?.brandName?.charAt(0)?.toUpperCase() || "U";

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[90px] flex-col border-r border-gray-200 bg-white">
      <div className="flex h-[68px] shrink-0 items-center justify-center border-b border-gray-200">
        <Link
          href="/dashboard"
          aria-label="Go to dashboard"
          className="group flex h-12 w-12 items-center justify-center overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={userData?.branding?.brandName || "Logo"}
              width={64}
              height={64}
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              Logo
            </div>
          )}
        </Link>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto px-3 py-4">
        {navigationConfig.map((item) => {
          const isActive = isItemActive(item);

          return (
            <Link key={item.id} href={item.href} className="block w-full">
              <div
                className={cn(
                  "group relative flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-3 transition-all duration-200",
                  isActive
                    ? "bg-linear-to-b from-primary/10 to-primary/5"
                    : "hover:bg-primary/5",
                )}
              >
                {isActive && (
                  <div className="absolute -left-3 top-1/2 h-7 w-[4px] -translate-y-1/2 rounded-r-full bg-primary shadow-[2px_0_8px_rgba(45,198,245,0.4)]" />
                )}

                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-gray-400 group-hover:bg-primary/10 group-hover:text-primary",
                  )}
                >
                  {item.icon}
                </div>

                <span
                  className={cn(
                    "text-[9.5px] font-bold leading-none tracking-wide",
                    isActive
                      ? "text-primary"
                      : "text-gray-400 group-hover:text-primary",
                  )}
                >
                  {item.title}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mx-4 h-px bg-linear-to-r from-transparent via-gray-200 to-transparent" />

      <div className="flex shrink-0 flex-col items-center gap-2 px-2.5 py-3">
        <Link
          href="/notification"
          title="Notifications"
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-200",
            pathname === "/notification"
              ? "border-primary/20 bg-primary/10 text-primary shadow-[0_10px_25px_-18px_rgba(45,198,245,0.95)]"
              : "border-slate-200 bg-white text-slate-500 hover:border-primary/10 hover:bg-primary/5 hover:text-primary",
          )}
        >
          <BellDot size={19} strokeWidth={2.1} />
          {unreadCount > 0 && (
            <span className="pointer-events-none absolute right-0 top-0 inline-flex h-4 min-w-[20px] translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black leading-none text-white ring-2 ring-white shadow-[0_8px_18px_-8px_rgba(244,63,94,0.95)]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <div
          className="relative mb-4 mt-2"
          onMouseEnter={() => setShowSignOut(true)}
          onMouseLeave={() => setShowSignOut(false)}
        >
          <button
            type="button"
            onClick={() => setShowSignOut((prev) => !prev)}
            className="block cursor-pointer"
          >
            <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-primary/20 transition-all duration-200 hover:scale-105 hover:ring-primary/40">
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary to-blue-500 text-sm font-black text-white">
                {brandInitial}
              </div>
            </div>
          </button>

          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          <div className="pointer-events-none absolute left-full top-1/2 h-12 w-2 -translate-y-1/2" />

          <div
            className={cn(
              "absolute left-full top-1/2 z-10 -translate-y-1/2 pl-2 transition-all duration-200 ease-out",
              showSignOut
                ? "pointer-events-auto translate-x-0 opacity-100"
                : "pointer-events-none -translate-x-1 opacity-0",
            )}
          >
            <button
              type="button"
              onClick={() => void signOutHandler()}
              className="relative flex w-24 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-3 text-[12px] font-semibold text-gray-700 shadow-md hover:bg-gray-50"
            >
              <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-gray-200 bg-white" />
              <LogOut size={12} className="text-gray-500" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
