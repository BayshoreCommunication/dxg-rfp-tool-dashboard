"use client";

import { signOutAction } from "@/app/actions/auth";
import {
  getNotificationSocketConfigAction,
  getUnreadNotificationCountAction,
} from "@/app/actions/notification";
import { getVendorUnreadCountAction } from "@/app/actions/vendorResponse";
import { navigationConfig, NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { BellDot, Bot, LoaderCircle, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type NotificationSocketPayload = {
  event: "connected" | "notification:new" | "notification:unread-count";
  data?: {
    title?: string;
    message?: string;
    count?: number;
  };
};

const Sidebar = ({
  assistantOpen = false,
  onOpenAssistant,
}: {
  assistantOpen?: boolean;
  onOpenAssistant?: () => void;
}) => {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [vendorUnreadCount, setVendorUnreadCount] = useState(0);
  const [socketUrl, setSocketUrl] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const isItemActive = (item: NavItem) => pathname === item.href;

  const signOutHandler = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOutAction();
    } catch (error) {
      console.error("Sign out failed:", error);
      setSigningOut(false);
    }
  };

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
    const load = async () => {
      const count = await getVendorUnreadCountAction();
      if (mounted) setVendorUnreadCount(count);
    };
    void load();
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

    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
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
          // Refresh vendor response unread count on any new notification
          void getVendorUnreadCountAction().then(setVendorUnreadCount);
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

    socket.onclose = () => {
      if (disposed) return;
      reconnectTimer = setTimeout(() => {
        void getNotificationSocketConfigAction().then((result) => {
          if (!disposed && result.success && result.socketUrl) {
            setSocketUrl(result.socketUrl);
          }
        });
      }, 2_000);
    };

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket.onclose = null;
      socket.close();
    };
  }, [pathname, socketUrl]);

  const avatarUrl = "/assets/logo/rfpilot-primary-logo.png"; // Replace with your actual logo URL or logic to fetch it

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
              alt={"Logo"}
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
          const badge =
            item.id === "vendor-responses" && vendorUnreadCount > 0
              ? vendorUnreadCount
              : null;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className="block w-full"
            >
              <div
                className={cn(
                  "group relative flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-3 transition-all duration-200",
                  isActive
                    ? "bg-linear-to-b from-primary/10 to-primary/5"
                    : "hover:bg-primary/5",
                )}
              >
                {isActive && (
                  <div className="absolute -left-3 top-1/2 h-7 w-[4px] -translate-y-1/2 rounded-r-full bg-primary shadow-[2px_0_8px_rgba(0,138,210,0.4)]" />
                )}

                <div
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-gray-400 group-hover:bg-primary/10 group-hover:text-primary",
                  )}
                >
                  {item.icon}
                  {badge !== null && (
                    <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#008ad2] px-1 text-[9px] font-black leading-none text-white ring-2 ring-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>

                <span
                  className={cn(
                    "text-[9.5px] font-bold leading-none tracking-wide",
                    isActive
                      ? "text-primary"
                      : "text-gray-500 group-hover:text-primary",
                  )}
                >
                  {item.title}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {onOpenAssistant && (
        <div className="flex shrink-0 justify-center px-2.5 pb-3">
          <button
            id="ai-assistant-launcher"
            type="button"
            aria-label={
              assistantOpen
                ? "Hide AI Assistant popup"
                : "Open AI Assistant"
            }
            aria-haspopup="dialog"
            aria-expanded={assistantOpen}
            title="AI Assistant"
            onClick={onOpenAssistant}
            className={cn(
              "group relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-[background-color,border-color,color,box-shadow] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              assistantOpen
                ? "border-[#0e1b2b] bg-[#0e1b2b] text-white shadow-[0_14px_30px_-16px_rgba(14,27,43,0.9)]"
                : "border-primary/25 bg-primary/10 text-[#009da4] shadow-[0_14px_30px_-18px_rgba(0,194,201,0.9)] hover:border-primary/45 hover:bg-primary/15",
            )}
          >
            <span
              className={cn(
                "flex transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transform-none",
                !assistantOpen &&
                  "motion-safe:animate-[assistant-float_3.8s_ease-in-out_infinite]",
              )}
            >
              <Bot size={21} strokeWidth={2.2} aria-hidden />
            </span>
          </button>
        </div>
      )}

      <div
        data-testid="sidebar-footer-divider"
        className="mx-4 h-px bg-linear-to-r from-transparent via-gray-200 to-transparent"
      />

      <div className="flex shrink-0 flex-col items-center gap-2 px-2.5 py-3">
        <Link
          href="/notification"
          title="Notifications"
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-200",
            pathname === "/notification"
              ? "border-primary/20 bg-primary/10 text-primary shadow-[0_10px_25px_-18px_rgba(0,138,210,0.95)]"
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

        <button
          type="button"
          onClick={() => void signOutHandler()}
          disabled={signingOut}
          aria-label="Sign out of your account"
          title="Sign out"
          className="group flex w-full flex-col items-center gap-1 rounded-2xl px-1 py-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:cursor-wait disabled:opacity-60"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white transition group-hover:border-rose-200 group-hover:bg-rose-50">
            {signingOut ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden />
            )}
          </span>
          <span className="text-[9.5px] font-bold leading-none tracking-wide">
            {signingOut ? "Signing out" : "Sign out"}
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
