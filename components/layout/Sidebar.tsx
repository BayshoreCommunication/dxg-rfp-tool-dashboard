"use client";

import { signOutAction } from "@/app/actions/auth";
import {
  getNotificationSocketConfigAction,
  getUnreadNotificationCountAction,
} from "@/app/actions/notification";
import { getSupportUnreadCountAction } from "@/app/actions/supportDesk";
import { getVendorUnreadCountAction } from "@/app/actions/vendorResponse";
import { navigationConfig, NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { SUPPORT_UPDATED_EVENT } from "@/lib/support/realtime";
import {
  BellDot,
  Bot,
  LifeBuoy,
  LoaderCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import OrgMenu from "@/components/layout/OrgMenu";
import ThemeMenuItem from "@/components/layout/ThemeMenuItem";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

type NotificationSocketPayload = {
  event: "connected" | "notification:new" | "notification:unread-count";
  data?: {
    title?: string;
    message?: string;
    count?: number;
    type?: string;
    metadata?: { ticketId?: unknown };
  };
};

export type SidebarUser = {
  name?: string | null;
  email?: string | null;
};

const getUserInitials = (name?: string | null, email?: string | null) => {
  const nameParts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
  }

  const source = nameParts[0] || email?.split("@")[0] || "User";
  return source.slice(0, 2).toUpperCase();
};

function AccountMenu({
  currentUser,
  signingOut,
  onSignOut,
  placement,
}: {
  currentUser?: SidebarUser;
  signingOut: boolean;
  onSignOut: () => void;
  placement: "desktop" | "mobile";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayName = currentUser?.name?.trim() ||
    currentUser?.email?.split("@")[0] ||
    "Your account";
  const displayEmail = currentUser?.email?.trim() || "Email unavailable";
  const initials = getUserInitials(currentUser?.name, currentUser?.email);
  const menuId = `${placement}-account-menu`;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={`${open ? "Close" : "Open"} ${placement === "mobile" ? "mobile " : ""}account menu for ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={displayName}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "group relative grid place-items-center rounded-full border border-primary/30 bg-primary/10 font-extrabold text-primary transition-all duration-200 hover:border-primary/50 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-[#38bdf8] dark:focus-visible:ring-offset-[#0d1d28]",
          "h-10 w-10 text-xs",
          open && "border-primary/50 bg-primary/15 shadow-[0_10px_24px_-16px_rgba(33,140,203,0.9)]",
        )}
      >
        {initials}
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account options"
          className={cn(
            "absolute z-[70] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_20px_50px_-18px_rgba(15,23,42,0.28)]",
            placement === "desktop"
              ? "bottom-0 left-[calc(100%+12px)]"
              : "right-0 top-[calc(100%+10px)]",
          )}
        >
          <div className="px-4 py-3.5">
            <p className="truncate text-sm font-extrabold text-slate-900">
              {displayName}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {displayEmail}
            </p>
          </div>

          <div className="border-t border-slate-100 p-1.5">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Settings size={16} aria-hidden />
              Settings
            </Link>
            <ThemeMenuItem className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
          </div>

          <div className="border-t border-slate-100 p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={onSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-wait disabled:opacity-60"
            >
              {signingOut ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <LogOut className="h-4 w-4" aria-hidden />
              )}
              {signingOut ? "Signing out" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarRow({
  href,
  icon,
  label,
  active,
  badge,
  collapsed,
  compact = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge: number | null;
  collapsed: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        compact ? "h-11" : "h-12",
        collapsed && "justify-center px-0",
        active
          ? "bg-primary text-white shadow-[0_10px_24px_-14px_rgba(0,138,210,0.9)]"
          : "text-slate-600 hover:bg-primary/5 hover:text-primary dark:text-slate-300",
      )}
    >
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        {icon}
        {badge !== null && collapsed && (
          <span className="pointer-events-none absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#008ad2] px-1 text-[9px] font-black leading-none text-white ring-2 ring-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && badge !== null && (
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black leading-none",
            active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600",
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

const Sidebar = ({
  assistantOpen = false,
  onOpenAssistant,
  currentUser,
  collapsed = false,
  onToggleCollapsed,
}: {
  assistantOpen?: boolean;
  onOpenAssistant?: () => void;
  currentUser?: SidebarUser;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) => {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [vendorUnreadCount, setVendorUnreadCount] = useState(0);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [socketUrl, setSocketUrl] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const isItemActive = (item: NavItem) =>
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

  const badgeFor = (item: NavItem) =>
    item.id === "vendor-responses" && vendorUnreadCount > 0
      ? vendorUnreadCount
      : item.id === "support" && supportUnreadCount > 0
        ? supportUnreadCount
        : null;
  // Support lives in the footer, with Settings; everything else is main navigation.
  const supportItem = navigationConfig.find((item) => item.id === "support");
  const mainNavItems = navigationConfig.filter((item) => item.id !== "support");

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
    const load = async () => {
      const count = await getSupportUnreadCountAction();
      if (mounted) setSupportUnreadCount(count);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [pathname]);

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
          if (payload.data?.type === "support_ticket") {
            void getSupportUnreadCountAction().then(setSupportUnreadCount);
            const ticketId = payload.data.metadata?.ticketId;
            window.dispatchEvent(
              new CustomEvent(SUPPORT_UPDATED_EVENT, {
                detail: { ticketId: typeof ticketId === "string" ? ticketId : undefined },
              }),
            );
          }
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
    navigationConfig.find((item) => isItemActive(item))?.title ??
    (pathname.startsWith("/settings") ? "Settings" : "RFPilot");

  return (
    <>
      <aside
        aria-label="Sidebar"
        data-collapsed={collapsed}
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden h-dvh min-h-0 flex-col overflow-visible border-r border-gray-200 bg-white transition-[width] duration-200 lg:flex dark:border-[#22343f] dark:bg-[#0d1d28]",
          collapsed ? "w-[88px]" : "w-[248px]",
        )}
      >
        <div
          className={cn(
            "flex h-[68px] shrink-0 items-center border-b border-gray-200 px-3 dark:border-[#22343f]",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            className="group flex h-12 min-w-0 items-center gap-2 overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5"
          >
            <Image
              src={avatarUrl}
              alt="Logo"
              width={64}
              height={64}
              className="h-12 w-12 shrink-0 object-contain p-1.5"
            />
            {!collapsed && (
              <span className="truncate text-base font-extrabold text-slate-900 dark:text-white">
                RFPilot
              </span>
            )}
          </Link>
          {!collapsed && onToggleCollapsed && (
            <button
              type="button"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              onClick={onToggleCollapsed}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-[#12293a]"
            >
              <PanelLeftClose size={18} aria-hidden />
            </button>
          )}
        </div>

        <nav
          aria-label="Primary navigation"
          className="sidebar-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4"
        >
          {collapsed && onToggleCollapsed && (
            <button
              type="button"
              aria-label="Expand sidebar"
              title="Expand sidebar"
              onClick={onToggleCollapsed}
              className="mb-2 grid h-10 w-full place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-[#12293a]"
            >
              <PanelLeftOpen size={18} aria-hidden />
            </button>
          )}
          {mainNavItems.map((item) => (
            <SidebarRow
              key={item.id}
              href={item.href}
              icon={item.icon}
              label={item.title}
              active={isItemActive(item)}
              badge={badgeFor(item)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div
          data-testid="sidebar-footer-divider"
          className="mx-4 h-px shrink-0 bg-linear-to-r from-transparent via-gray-200 to-transparent dark:via-[#283c4a]"
        />

        <div className="flex shrink-0 flex-col gap-1 px-3 py-3">
          {onOpenAssistant && (
            <button
              id="ai-assistant-launcher"
              type="button"
              aria-label={
                assistantOpen ? "Hide AI Assistant popup" : "Open AI Assistant"
              }
              aria-haspopup="dialog"
              aria-expanded={assistantOpen}
              title="AI Assistant"
              onClick={onOpenAssistant}
              className={cn(
                "group flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                collapsed && "justify-center px-0",
                assistantOpen
                  ? "bg-[#0e1b2b] text-white"
                  : "text-[#009da4] hover:bg-primary/10",
              )}
            >
              <Bot size={20} strokeWidth={2.2} aria-hidden />
              {!collapsed && <span>AI Assistant</span>}
            </button>
          )}

          {supportItem && (
            <SidebarRow
              href={supportItem.href}
              icon={<LifeBuoy size={20} aria-hidden />}
              label="Support"
              active={isItemActive(supportItem)}
              badge={badgeFor(supportItem)}
              collapsed={collapsed}
              compact
            />
          )}
          <SidebarRow
            href="/settings"
            icon={<Settings size={20} aria-hidden />}
            label="Settings"
            active={pathname.startsWith("/settings")}
            badge={null}
            collapsed={collapsed}
            compact
          />

          <div className="mt-2">
            <OrgMenu
              currentUser={currentUser}
              unreadCount={unreadCount}
              signingOut={signingOut}
              onSignOut={() => void signOutHandler()}
              collapsed={collapsed}
            />
          </div>
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
              id="ai-assistant-mobile-launcher"
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
          <AccountMenu
            currentUser={currentUser}
            signingOut={signingOut}
            onSignOut={() => void signOutHandler()}
            placement="mobile"
          />
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
              : item.id === "support" && supportUnreadCount > 0
                ? supportUnreadCount
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
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#218ccb] px-1 text-[9px] font-black text-white ring-2 ring-white">
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
