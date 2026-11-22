"use client";

import {
  Bell,
  Building2,
  ChevronsUpDown,
  FileStack,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSettingsSections } from "@/components/settings/useSettingsSections";
import { cn } from "@/lib/utils";

export type OrgMenuUser = {
  name?: string | null;
  email?: string | null;
};

const getInitials = (name?: string | null, email?: string | null) => {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  const source = parts[0] || email?.split("@")[0] || "User";
  return source.slice(0, 2).toUpperCase();
};

const ORG_ICONS: Record<string, React.ReactNode> = {
  "/settings/users": <Users size={16} aria-hidden />,
  "/settings/teams": <UsersRound size={16} aria-hidden />,
  "/settings/vendors": <Building2 size={16} aria-hidden />,
  "/settings/templates": <FileStack size={16} aria-hidden />,
};
const ORG_HREFS = ["/settings/users", "/settings/teams", "/settings/vendors", "/settings/templates"];

const itemClass =
  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-300 dark:hover:bg-[#12293a] dark:hover:text-white";

// The card pinned to the bottom of the sidebar. It opens a grouped menu: who you are, the
// organization pages you can reach, and your own account. Items follow the same role gating as
// the settings sections (a Viewer never sees Vendors or Templates).
export default function OrgMenu({
  currentUser,
  unreadCount,
  signingOut,
  onSignOut,
  collapsed,
}: {
  currentUser?: OrgMenuUser;
  unreadCount: number;
  signingOut: boolean;
  onSignOut: () => void;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sections = useSettingsSections();
  const displayName =
    currentUser?.name?.trim() || currentUser?.email?.split("@")[0] || "Your account";
  const displayEmail = currentUser?.email?.trim() || "Email unavailable";
  const initials = getInitials(currentUser?.name, currentUser?.email);
  const orgItems = sections.filter((section) => ORG_HREFS.includes(section.href));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`${open ? "Close" : "Open"} account menu for ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="org-menu"
        title={displayName}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-[#22343f] dark:bg-[#0f2230] dark:hover:bg-[#12293a]",
          collapsed && "justify-center p-1.5",
          open && "bg-slate-100 dark:bg-[#12293a]",
        )}
      >
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-extrabold text-primary dark:text-[#38bdf8]">
          {initials}
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0f2230]" aria-hidden />
          )}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold text-slate-900 dark:text-white">
                {displayName}
              </span>
              <span className="block truncate text-xs text-slate-500">{displayEmail}</span>
            </span>
            <ChevronsUpDown size={16} className="shrink-0 text-slate-400" aria-hidden />
          </>
        )}
      </button>

      {open && (
        <div
          id="org-menu"
          role="menu"
          aria-label="Account options"
          className="absolute bottom-0 left-[calc(100%+12px)] z-[70] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_20px_50px_-18px_rgba(15,23,42,0.28)] dark:border-[#2b4352] dark:bg-[#0d1d28]"
        >
          <div className="px-4 py-3.5">
            <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{displayName}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{displayEmail}</p>
          </div>

          {orgItems.length > 0 && (
            <div className="border-t border-slate-100 p-1.5 dark:border-[#22343f]">
              <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Organization
              </p>
              {orgItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={itemClass}
                >
                  {ORG_ICONS[item.href]}
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 p-1.5 dark:border-[#22343f]">
            <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Personal
            </p>
            <Link href="/notification" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <Bell size={16} aria-hidden />
              <span className="flex-1">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/settings/security" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <ShieldCheck size={16} aria-hidden />
              Account security
            </Link>
            <Link href="/settings" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <UserRound size={16} aria-hidden />
              Account details
            </Link>
          </div>

          <div className="border-t border-slate-100 p-1.5 dark:border-[#22343f]">
            <button
              type="button"
              role="menuitem"
              onClick={onSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-wait disabled:opacity-60"
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
