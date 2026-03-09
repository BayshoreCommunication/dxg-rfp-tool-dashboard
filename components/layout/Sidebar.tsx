"use client";

import { navigationConfig, NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Activity, BellDot, Globe } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const bottomIcons = [
  { icon: <Activity size={17} />, label: "Activity" },
  { icon: <Globe size={17} />, label: "Web" },
  { icon: <BellDot size={17} />, label: "Alerts" },
];

const Sidebar = () => {
  const pathname = usePathname();

  const isItemActive = (item: NavItem) => pathname === item.href;

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[90px] flex-col bg-white border-r border-gray-100 shadow-sm">
      {/* Logo */}
      <div className="flex h-[68px] shrink-0 items-center justify-center border-b border-gray-100">
        <Link href="/dashboard">
          <Image
            src="/assets/logo/logo.svg"
            alt="Logo"
            width={400}
            height={400}
            className="w-[50px] h-auto"
          />
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden py-4 px-3">
        {navigationConfig.map((item) => {
          const isActive = isItemActive(item);

          return (
            <Link key={item.id} href={item.href} className="w-full block">
              <div
                className={cn(
                  "group relative flex w-full flex-col items-center gap-1 rounded-2xl py-3 px-1 transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-b from-primary/10 to-primary/5"
                    : "hover:bg-primary/5",
                )}
              >
                {/* Active left pill */}
                {isActive && (
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-7 w-[4px] rounded-r-full bg-primary shadow-[2px_0_8px_rgba(45,198,245,0.4)]" />
                )}

                {/* Icon */}
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

                {/* Label */}
                <span
                  className={cn(
                    "text-[9.5px] font-bold tracking-wide leading-none",
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

      {/* Divider */}
      <div className="mx-4 h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

      {/* Bottom Utility Icons */}
      <div className="flex shrink-0 flex-col items-center gap-2 py-4 px-3">
        {bottomIcons.map(({ icon, label }) => (
          <button
            key={label}
            title={label}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-all duration-200 hover:bg-primary/5 hover:text-primary"
          >
            {icon}
          </button>
        ))}

        {/* User Avatar */}
        <div className="mt-2 mb-4 group relative cursor-pointer">
          <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-primary/20 transition-all group-hover:ring-primary/40 group-hover:scale-105">
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-blue-500 text-sm font-black text-white">
              U
            </div>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
