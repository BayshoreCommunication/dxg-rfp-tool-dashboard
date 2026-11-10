"use client";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getVendorListAccessAction } from "@/app/actions/vendorList";

// Settings sections, shown as links under the heading. One entry per page.
const SETTINGS_LINKS = [
  { href: "/settings", label: "General" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/teams", label: "Teams" },
  { href: "/settings/security", label: "Security" },
];

// ORG-607: shown to every role that can read the vendor list (not to a Viewer).
const VENDORS_LINK = { href: "/settings/vendors", label: "Vendors" };

// `vendorsLink` shows the Vendors tab straight away on a page that already knows the member can
// read the list; other pages find out after mounting.
const TopHeader = ({ vendorsLink = false }: { vendorsLink?: boolean } = {}) => {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showVendors, setShowVendors] = useState(vendorsLink);

  useEffect(() => {
    // Hydration guard: date/time text must be initialized on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (vendorsLink) return;
    let active = true;
    getVendorListAccessAction()
      .then((access) => {
        if (active) setShowVendors(access.canRead);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [vendorsLink]);

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
    <div className="relative">
      {/* Ambient glow behind header */}
      <div className="absolute -inset-4 bg-gradient-to-r from-[#008ad2]/5 via-[#0ea5e9]/3 to-[#2563eb]/5 rounded-3xl blur-2xl pointer-events-none" />

      <div className="relative flex items-center justify-between">
        {/* Left: Title block */}
        <div className="flex flex-col gap-1">
          {/* Pill badge */}
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-[#008ad2] mb-1">
            <Sparkles size={10} className="fill-[#008ad2]" />
            Overview
          </span>

          <h1 className="text-[30px] font-black tracking-tight leading-none">
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
              Settings
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
      </div>

      <nav aria-label="Settings sections" className="relative mt-5 flex gap-1 overflow-x-auto border-b border-[#e4e4e4]">
        {(showVendors ? [...SETTINGS_LINKS, VENDORS_LINK] : SETTINGS_LINKS).map((link) => {
          const active = (pathname ?? "/settings") === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${active ? "border-[#008ad2] text-[#008ad2]" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default TopHeader;
