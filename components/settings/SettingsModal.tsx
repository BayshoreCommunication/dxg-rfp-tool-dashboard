"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { SettingsModalProvider } from "./SettingsModalContext";
import { useSettingsSections } from "./useSettingsSections";

// Settings as a dialog over the page the member was on, with the sections in a left-hand list.
// Opened by the intercepting routes under app/(page)/@modal; a direct visit to /settings still
// renders the full page.
export default function SettingsModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/settings";
  const sections = useSettingsSections();
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => router.back();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.back();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [router]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close settings"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        className="relative flex h-[min(760px,calc(100dvh-2rem))] w-full max-w-5xl overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(2,15,27,0.34)] focus-visible:outline-none dark:border-[#2b4352] dark:bg-[#0d1d28]"
      >
        <nav
          aria-label="Settings sections"
          className="hidden w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-slate-100 bg-slate-50/60 p-4 sm:flex dark:border-[#22343f] dark:bg-[#0a1822]"
        >
          <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            Settings
          </p>
          {sections.map((section) => {
            const active = pathname === section.href;
            return (
              <Link
                key={section.href}
                href={section.href}
                replace
                aria-current={active ? "page" : undefined}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-[#12293a] dark:text-white dark:ring-[#2b4352]"
                    : "text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-[#12293a] dark:hover:text-white"
                }`}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-[#22343f]">
            {/* Narrow screens have no left list: a select-free row of links keeps every section reachable. */}
            <nav
              aria-label="Settings sections (compact)"
              className="flex min-w-0 gap-1 overflow-x-auto sm:hidden"
            >
              {sections.map((section) => (
                <Link
                  key={section.href}
                  href={section.href}
                  replace
                  aria-current={pathname === section.href ? "page" : undefined}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-semibold ${
                    pathname === section.href
                      ? "bg-primary/10 text-primary"
                      : "text-slate-500"
                  }`}
                >
                  {section.label}
                </Link>
              ))}
            </nav>
            <h2 className="hidden text-base font-extrabold text-slate-900 sm:block dark:text-white">
              {sections.find((section) => section.href === pathname)?.label ?? "Settings"}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close settings"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-[#2b4352] dark:hover:bg-[#12293a]"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#F4F7FA] p-4 sm:p-6 dark:bg-[#07131c]">
            <SettingsModalProvider value={true}>{children}</SettingsModalProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
