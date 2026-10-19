"use client";

import { LifeBuoy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupportUnreadCountAction } from "@/app/actions/supportDesk";

/**
 * Always-available entry to human support, bottom-right of every signed-in
 * page except Support itself. It is a plain link, so it works before any
 * script runs; the unread badge is a progressive enhancement.
 */
export default function SupportFab() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const onSupport = pathname === "/support" || pathname.startsWith("/support/");

  useEffect(() => {
    if (onSupport) return;
    let mounted = true;
    void getSupportUnreadCountAction().then((count) => {
      if (mounted) setUnread(count);
    });
    return () => {
      mounted = false;
    };
  }, [onSupport, pathname]);

  if (onSupport) return null;

  return (
    <Link
      href={unread > 0 ? "/support" : "/support?new=1"}
      aria-label={unread > 0 ? `Support: ${unread} new repl${unread === 1 ? "y" : "ies"}` : "Need support? Message DXG"}
      data-testid="support-fab"
      className="group fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[60] flex items-center gap-2 rounded-full bg-[#008ad2] py-2.5 pl-2.5 pr-4 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(0,138,210,0.7)] ring-4 ring-white/70 transition hover:-translate-y-0.5 hover:bg-[#0076b4] focus-visible:outline-none focus-visible:ring-[#008ad2]/40 sm:bottom-5 sm:right-5 dark:ring-[#07131c]/70"
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
        <LifeBuoy className="h-5 w-5 transition group-hover:rotate-12" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none ring-2 ring-[#008ad2]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
      <span>{unread > 0 ? "DXG replied" : "Need support?"}</span>
    </Link>
  );
}
