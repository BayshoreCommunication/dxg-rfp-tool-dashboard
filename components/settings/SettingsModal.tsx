"use client";

import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import UsersSettings from "@/components/organization/members/UsersSettings";
import SecuritySettings from "@/components/organization/security/SecuritySettings";
import TeamsSettings from "@/components/organization/teams/TeamsSettings";
import TemplateListSettings from "@/components/organization/templates/TemplateListSettings";
import VendorListSettings from "@/components/organization/vendors/VendorListSettings";
import SettingsDetials from "./SettingsDetials";
import { useSettingsAccess } from "./SettingsAccessContext";
import type { SettingsAccess } from "./settingsAccess";
import { SettingsModalProvider } from "./SettingsModalContext";
import { useSettingsSections, type SettingsSection } from "./useSettingsSections";

function sectionContent(href: string, access: SettingsAccess | null): ReactNode {
  switch (href) {
    case "/settings":
      return <SettingsDetials />;
    case "/settings/users":
      return <UsersSettings sessionRole={access?.role ?? null} />;
    case "/settings/teams":
      return <TeamsSettings />;
    case "/settings/security":
      return <SecuritySettings />;
    case "/settings/vendors":
      return access?.vendors.canRead ? <VendorListSettings canEdit={access.vendors.canEdit} /> : null;
    case "/settings/templates":
      return access?.templates.canUse ? <TemplateListSettings access={access.templates} /> : null;
    default:
      return null;
  }
}

function groupSections(sections: SettingsSection[]) {
  const groups: { name: string; items: SettingsSection[] }[] = [];
  for (const section of sections) {
    const group = groups.find((entry) => entry.name === section.group);
    if (group) group.items.push(section);
    else groups.push({ name: section.group, items: [section] });
  }
  return groups;
}

// A plain left click switches section in place; a modified click (new tab, new window) is left
// to the browser so the link still works as a link.
const isPlainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

// Settings as a dialog over the page the member was on, with the sections in a grouped list on
// the left. Rendered once by app/(page)/@modal/(.)settings/layout.tsx; a direct visit to
// /settings still renders the full page.
//
// Speed: the dialog renders the sections itself instead of navigating between routes. Switching
// section only swaps which panel is visible and rewrites the address with replaceState, so there
// is no server round trip. A section stays mounted once opened, so going back to it shows its
// data at once, and hovering or focusing a section in the list starts loading it before the click.
export default function SettingsModal() {
  const router = useRouter();
  const pathname = usePathname() ?? "/settings";
  const access = useSettingsAccess();
  const sections = useSettingsSections();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef(new Map<string, number>());

  const sectionFor = (path: string) => (sections.some((section) => section.href === path) ? path : "/settings");
  const [active, setActive] = useState(() => sectionFor(pathname));
  const [mounted, setMounted] = useState<string[]>(() => [sectionFor(pathname)]);

  // A link inside a section (for example Users → "Manage domains in Security") navigates; follow
  // it. Any other path is the page underneath while the dialog closes, so the section stays put.
  const [seenPathname, setSeenPathname] = useState(pathname);
  if (pathname !== seenPathname) {
    setSeenPathname(pathname);
    if (sections.some((section) => section.href === pathname)) setActive(pathname);
  }
  if (!mounted.includes(active)) setMounted([...mounted, active]);

  const close = () => router.back();

  const preload = (href: string) => {
    setMounted((current) => (current.includes(href) ? current : [...current, href]));
  };

  const select = (href: string) => {
    if (href === active) return;
    scrollPositions.current.set(active, bodyRef.current?.scrollTop ?? 0);
    setActive(href);
    // Keep the address in step without a navigation; Back still closes the dialog.
    window.history.replaceState(null, "", href);
  };

  useLayoutEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = scrollPositions.current.get(active) ?? 0;
  }, [active]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // A dialog opened from inside a section (invite, rename, archive) closes first.
      if (document.querySelectorAll('[role="dialog"][aria-modal="true"]').length > 1) return;
      router.back();
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

  const activeLabel = sections.find((section) => section.href === active)?.label ?? "Settings";
  const linkProps = (href: string) => ({
    href,
    "aria-current": href === active ? ("page" as const) : undefined,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      select(href);
    },
    onMouseEnter: () => preload(href),
    onFocus: () => preload(href),
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close settings"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 cursor-default bg-slate-950/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        className="relative flex h-[min(760px,calc(100dvh-1.5rem))] w-full max-w-[1040px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_80px_rgba(2,15,27,0.28)] ring-1 ring-black/5 focus-visible:outline-none dark:bg-[#0d1d28] dark:ring-white/10"
      >
        <nav
          aria-label="Settings sections"
          className="hidden w-[232px] shrink-0 flex-col overflow-y-auto bg-[#f5f5f6] px-2.5 py-4 sm:flex dark:bg-[#0a1822]"
        >
          {groupSections(sections).map((group) => (
            <div key={group.name} className="mb-3">
              <p className="px-3 pb-1.5 pt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                {group.name}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((section) => {
                  const current = section.href === active;
                  return (
                    <li key={section.href}>
                      <a
                        {...linkProps(section.href)}
                        className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          current
                            ? "bg-black/[0.07] font-medium text-slate-900 dark:bg-white/10 dark:text-white"
                            : "text-slate-700 hover:bg-black/[0.04] dark:text-slate-300 dark:hover:bg-white/5"
                        }`}
                      >
                        <section.icon
                          size={17}
                          strokeWidth={1.75}
                          aria-hidden
                          className={current ? "text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}
                        />
                        {section.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-8 sm:pt-6">
            <h2 className="hidden text-[18px] font-semibold text-slate-900 sm:block dark:text-white">{activeLabel}</h2>
            {/* Narrow screens have no left list: a scrolling row keeps every section reachable. */}
            <nav aria-label="Settings sections (compact)" className="flex min-w-0 gap-1 overflow-x-auto sm:hidden">
              {sections.map((section) => (
                <a
                  key={section.href}
                  {...linkProps(section.href)}
                  className={`whitespace-nowrap rounded-[10px] px-2.5 py-1.5 text-[13px] ${
                    section.href === active
                      ? "bg-black/[0.07] font-medium text-slate-900 dark:bg-white/10 dark:text-white"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {section.label}
                </a>
              ))}
            </nav>
            <button
              type="button"
              onClick={close}
              aria-label="Close settings"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
            >
              <X size={15} aria-hidden />
            </button>
          </div>
          <div ref={bodyRef} className="settings-dialog-body min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-8 sm:pb-8">
            <SettingsModalProvider value={true}>
              {sections
                .filter((section) => mounted.includes(section.href))
                .map((section) => (
                  <div key={section.href} hidden={section.href !== active} data-settings-section={section.href}>
                    {sectionContent(section.href, access)}
                  </div>
                ))}
            </SettingsModalProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
