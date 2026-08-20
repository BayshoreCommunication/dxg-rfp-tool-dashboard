"use client";

import { signOutAction } from "@/app/actions/auth";
import {
  getNotificationSocketConfigAction,
  getUnreadNotificationCountAction,
} from "@/app/actions/notification";
import { getVendorUnreadCountAction } from "@/app/actions/vendorResponse";
import { navigationConfig, NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import {
  BellDot,
  Bot,
  LoaderCircle,
  LogOut,
} from "lucide-react";
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

  const isItemActive = (item: NavItem) =>
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

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
  const activePageTitle =
    navigationConfig.find((item) => isItemActive(item))?.title ?? "RFPilot";

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden h-dvh min-h-0 w-[90px] flex-col overflow-hidden border-r border-gray-200 bg-white lg:flex">
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

      <nav
        aria-label="Primary navigation"
        className="sidebar-scrollbar flex min-h-0 flex-1 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4"
      >
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
                    "mt-0.5 w-full whitespace-normal break-normal text-center text-[9.5px] font-bold leading-[1.08] tracking-wide",
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

      <div
        data-testid="sidebar-footer-divider"
        className="mx-4 h-px shrink-0 bg-linear-to-r from-transparent via-gray-200 to-transparent"
      />

      <div className="flex shrink-0 flex-col items-center gap-2 px-2.5 py-3">
        {onOpenAssistant && (
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
        )}

        <Link
          href="/notification"
          title="Notifications"
          className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-200",
            pathname.startsWith("/notification")
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

    <header
      className="fixed inset-x-0 top-0 z-50 flex h-[calc(4rem+env(safe-area-inset-top))] items-end border-b border-slate-200 bg-white/95 px-3 pb-2 pt-[env(safe-area-inset-top)] shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden"
    >
      <div className="flex h-12 w-full min-w-0 items-center justify-between gap-2">
        <Link
          href="/dashboard"
          aria-label="Go to dashboard"
          className="flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Image
            src={avatarUrl}
            alt="RFPilot"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 object-contain p-1"
            priority
          />
          <span className="truncate text-sm font-extrabold text-slate-800">
            {activePageTitle}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          {onOpenAssistant && (
            <button
              type="button"
              aria-label={
                assistantOpen
                  ? "Hide AI Assistant popup from mobile navigation"
                  : "Open AI Assistant from mobile navigation"
              }
              aria-haspopup="dialog"
              aria-expanded={assistantOpen}
              onClick={onOpenAssistant}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                assistantOpen
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-primary/20 bg-primary/10 text-[#009da4]",
              )}
            >
              <Bot size={19} strokeWidth={2.2} aria-hidden />
            </button>
          )}
          <Link
            href="/notification"
            aria-label="Notifications"
            className={cn(
              "relative grid h-10 w-10 place-items-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              pathname.startsWith("/notification")
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-slate-200 bg-white text-slate-500",
            )}
          >
            <BellDot size={18} strokeWidth={2.1} aria-hidden />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => void signOutHandler()}
            disabled={signingOut}
            aria-label="Sign out from mobile navigation"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-wait disabled:opacity-60"
          >
            {signingOut ? (
              <LoaderCircle className="h-[18px] w-[18px] animate-spin" aria-hidden />
            ) : (
              <LogOut className="h-[18px] w-[18px]" aria-hidden />
            )}
          </button>
        </div>
      </div>
      </header>

      <nav
        aria-label="Mobile primary navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-24px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden"
      >
        <div className="grid h-[4.5rem] grid-cols-5 px-1">
        {navigationConfig.map((item) => {
          const isActive = isItemActive(item);
          const badge =
            item.id === "vendor-responses" && vendorUnreadCount > 0
              ? vendorUnreadCount
              : null;
          const mobileTitle =
            item.id === "vendor-responses" ? "Vendor" : item.title;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                isActive ? "text-primary" : "text-slate-400",
              )}
            >
              {isActive && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-primary" />
              )}
              <span
                className={cn(
                  "relative grid h-8 w-8 place-items-center rounded-xl",
                  isActive && "bg-primary/10",
                )}
              >
                {item.icon}
                {badge !== null && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#008ad2] px-1 text-[9px] font-black text-white ring-2 ring-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center leading-none">
                {mobileTitle}
              </span>
            </Link>
          );
        })}
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
