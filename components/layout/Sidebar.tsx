"use client";

import { signOutAction } from "@/app/actions/auth";
import { getSettingsAction } from "@/app/actions/settings";
import { navigationConfig, NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { BellDot, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SidebarSettings = {
  branding?: {
    brandName?: string;
    logoFile?: string | null;
  };
};

const bottomIcons = [{ icon: <BellDot size={17} />, label: "Alerts" }];

const Sidebar = () => {
  const pathname = usePathname();
  const [userData, setUserData] = useState<SidebarSettings | null>(null);
  const [showSignOut, setShowSignOut] = useState(false);

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

  const avatarUrl = userData?.branding?.logoFile?.trim() || "";
  const brandInitial =
    userData?.branding?.brandName?.charAt(0)?.toUpperCase() || "U";

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[90px] flex-col border-r border-gray-200 bg-white">
      <div className="flex h-[68px] shrink-0 items-center justify-center border-b border-gray-200">
        <Link href="/dashboard">
          <Image
            src="/assets/logo/logo.svg"
            alt="Logo"
            width={400}
            height={400}
            className="h-auto w-[50px]"
          />
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

      <div className="flex shrink-0 flex-col items-center gap-2 px-3 py-4">
        {bottomIcons.map(({ icon, label }) => (
          <button
            key={label}
            type="button"
            title={label}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-all duration-200 hover:bg-primary/5 hover:text-primary"
          >
            {icon}
          </button>
        ))}

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
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="User Avatar"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary to-blue-500 text-sm font-black text-white">
                  {brandInitial}
                </div>
              )}
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
