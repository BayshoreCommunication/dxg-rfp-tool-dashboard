"use client";

import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { useSettingsAccess } from "./SettingsAccessContext";
import type { SettingsAccess } from "./settingsAccess";
import { SettingsModalProvider } from "./SettingsModalContext";
import { useSettingsSections, type SettingsSection } from "./useSettingsSections";

// The host is on every page, so each section's code loads only when that section is first shown.
const SectionLoading = () => (
  <div className="space-y-3" aria-hidden="true">
    <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
    <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
  </div>
);
const SettingsDetials = dynamic(() => import("./SettingsDetials"), {
  ssr: false,
  loading: SectionLoading,
});
const UsersSettings = dynamic(() => import("@/components/organization/members/UsersSettings"), {
  ssr: false,
  loading: SectionLoading,
});
const TeamsSettings = dynamic(() => import("@/components/organization/teams/TeamsSettings"), {
  ssr: false,
  loading: SectionLoading,
});
const SecuritySettings = dynamic(() => import("@/components/organization/security/SecuritySettings"), {
  ssr: false,
  loading: SectionLoading,
});
const VendorListSettings = dynamic(() => import("@/components/organization/vendors/VendorListSettings"), {
  ssr: false,
  loading: SectionLoading,
});
const TemplateListSettings = dynamic(() => import("@/components/organization/templates/TemplateListSettings"), {
  ssr: false,
  loading: SectionLoading,
});

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

// How long a closed dialog keeps the sections the member only looked at. Reopening within this
// window shows them at once, as they were; after it they load fresh.
export const KEEP_CLOSED_SECTIONS_MS = 5 * 60_000;

// Controls that act rather than read. Using one inside a section means it may hold unsaved
// edits or a half-finished action, so the section starts fresh the next time the dialog opens.
const INTERACTIVE =
  'button, [role="button"], [role="switch"], [role="option"], [role="radio"], [role="checkbox"], [role="menuitem"]';

type SettingsDialogControl = { open: () => void; close: () => void };
const SettingsDialogControlContext = createContext<SettingsDialogControl | null>(null);

// Rendered by app/(page)/@modal/(.)settings/layout.tsx: the dialog is open for as long as an
// intercepted settings route is showing.
export function SettingsDialogOpener() {
  const control = useContext(SettingsDialogControlContext);
  useLayoutEffect(() => {
    control?.open();
    return () => control?.close();
  }, [control]);
  return null;
}

// Settings as a dialog over the page the member was on, with the sections in a grouped list on
// the left. This host wraps the app in app/(page)/layout.tsx and stays mounted; the intercepted
// settings routes only open it. A direct visit to /settings still renders the full page.
//
// Speed:
// - The dialog renders the sections itself instead of navigating between routes. Switching
//   section swaps which panel is visible and rewrites the address with replaceState, so there is
//   no server round trip.
// - A section stays mounted once opened, and hovering or focusing a section in the list starts
//   loading it before the click.
// - Closing hides the dialog instead of unmounting it, so reopening within
//   KEEP_CLOSED_SECTIONS_MS shows the sections already loaded. A section the member interacted
//   with (typed, changed a field, pressed a button) is dropped on close, so unsaved edits and
//   half-finished actions never come back.
export default function SettingsModal({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/settings";
  const access = useSettingsAccess();
  const sections = useSettingsSections();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef(new Map<string, number>());
  const touched = useRef(new Set<string>());
  const closedAt = useRef<number | null>(null);

  const isSection = (path: string) => sections.some((section) => section.href === path);
  const [isOpen, setIsOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [active, setActive] = useState(() => (isSection(pathname) ? pathname : "/settings"));
  const [mounted, setMounted] = useState<string[]>([]);
  // Bumped when kept sections expire, so they mount afresh rather than being reused in place.
  const [generation, setGeneration] = useState(0);

  const open = useCallback(() => {
    if (closedAt.current !== null && Date.now() - closedAt.current > KEEP_CLOSED_SECTIONS_MS) {
      setMounted([]);
      setGeneration((current) => current + 1);
      scrollPositions.current.clear();
    }
    closedAt.current = null;
    setIsOpen(true);
    setOpenCount((count) => count + 1);
  }, []);

  const hide = useCallback(() => {
    closedAt.current = Date.now();
    const dropped = touched.current;
    touched.current = new Set();
    for (const href of dropped) scrollPositions.current.delete(href);
    setMounted((current) => current.filter((href) => !dropped.has(href)));
    setIsOpen(false);
  }, []);

  const control = useMemo(() => ({ open, close: hide }), [open, hide]);

  // Opening, or a link inside a section (for example Users → "Manage domains in Security"),
  // picks the section from the address. Any other path is the page underneath, so the section
  // stays put.
  const [seen, setSeen] = useState({ pathname, openCount });
  if (seen.pathname !== pathname || seen.openCount !== openCount) {
    setSeen({ pathname, openCount });
    if (isSection(pathname)) setActive(pathname);
  }
  if (isOpen && !mounted.includes(active)) setMounted([...mounted, active]);

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

  const markTouched = (href: string) => (event: SyntheticEvent) => {
    if (event.type !== "click" || (event.target as Element).closest?.(INTERACTIVE)) touched.current.add(href);
  };

  useLayoutEffect(() => {
    if (isOpen && bodyRef.current) bodyRef.current.scrollTop = scrollPositions.current.get(active) ?? 0;
  }, [active, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, router]);

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

  // Nothing to show until the dialog first opens; after that it stays, hidden, while it has
  // sections to keep.
  const rendered = isOpen || mounted.length > 0;

  return (
    <SettingsDialogControlContext.Provider value={control}>
      {children}
      {rendered && (
        <div hidden={!isOpen} className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
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
                      <div
                        key={`${section.href}#${generation}`}
                        hidden={section.href !== active}
                        data-settings-section={section.href}
                        onInput={markTouched(section.href)}
                        onChange={markTouched(section.href)}
                        onClickCapture={markTouched(section.href)}
                      >
                        {sectionContent(section.href, access)}
                      </div>
                    ))}
                </SettingsModalProvider>
              </div>
            </div>
          </div>
        </div>
      )}
    </SettingsDialogControlContext.Provider>
  );
}
