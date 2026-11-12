"use client";

import { LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import DateRangePicker, { formatRangeDay } from "@/components/ui/DateRangePicker";
import type { DashboardFilterKey, FilterOption } from "./rfpDashboardModel";

// The dashboard's filter controls: the search box and the Filters popover. This is the only
// part of the list that runs in the browser. It holds no list data and fetches nothing: every
// change is written to the page's query string and the server component renders the list again
// from it. Typing replaces the current history entry (after a short pause), a picked value adds
// one, so Back steps through choices and not keystrokes. Any change goes back to page one.

export type DashboardFiltersProps = {
  // The filters in the URL, as the server read them for this role and view.
  search: string;
  owner: string;
  team: string;
  venueCity: string;
  eventFrom: string;
  eventTo: string;
  // The filters this view offers (search is always one of them).
  offered: DashboardFilterKey[];
  owners: FilterOption[];
  teams: FilterOption[];
};

export const SEARCH_DEBOUNCE_MS = 300;

const fieldLabelClass = "mb-1.5 block text-xs font-semibold text-slate-600";
const fieldClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

type Navigate = (changes: Record<string, string>, mode: "push" | "replace") => void;

// A text filter that follows the URL but never fights the person typing: the box shows what
// they typed, the URL catches up after a pause, and a value arriving from the URL replaces the
// text only when it isn't one this box sent (Back, a removed chip, Clear all).
const useTypedFilter = (name: string, urlValue: string, navigate: Navigate) => {
  const [value, setValue] = useState(urlValue);
  const [seen, setSeen] = useState(urlValue);
  const [sent, setSent] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (urlValue !== seen) {
    setSeen(urlValue);
    if (!sent.includes(urlValue)) {
      setValue(urlValue);
      setSent([]);
    } else if (urlValue === value.trim()) {
      setSent([]);
    }
  }

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const commit = (text: string) => {
    cancel();
    const next = text.trim();
    if (next === urlValue && sent.length === 0) return;
    setSent((previous) => [...previous, next]);
    navigate({ [name]: next }, "replace");
  };

  const change = (text: string) => {
    setValue(text);
    cancel();
    timer.current = setTimeout(() => commit(text), SEARCH_DEBOUNCE_MS);
  };

  return { value, change, commitNow: () => commit(value) };
};

export default function DashboardFilters({ search, owner, team, venueCity, eventFrom, eventTo, offered, owners, teams }: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The query this component last asked for. Until the server has answered, the URL still shows
  // the old one, and a second change must build on the first instead of undoing it.
  const requested = useRef<string | null>(null);
  const current = searchParams.toString();
  useEffect(() => {
    requested.current = null;
  }, [current]);

  const navigate = useCallback<Navigate>(
    (changes, mode) => {
      const params = new URLSearchParams(requested.current ?? current);
      for (const [name, value] of Object.entries(changes)) {
        if (value) params.set(name, value);
        else params.delete(name);
      }
      // A different set of proposals: start again from its first page.
      params.delete("page");
      const query = params.toString();
      if (query === (requested.current ?? current)) return;
      requested.current = query;
      const href = query ? `${pathname}?${query}` : pathname;
      startTransition(() => {
        if (mode === "replace") router.replace(href, { scroll: false });
        else router.push(href, { scroll: false });
      });
    },
    [current, pathname, router],
  );

  const searchBox = useTypedFilter("search", search, navigate);
  const cityBox = useTypedFilter("venueCity", venueCity, navigate);

  const popoverFilters = offered.filter((key) => key !== "search");
  const activeCount = [owner, team, venueCity, eventFrom || eventTo].filter(Boolean).length;

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  // Closes on a press outside. The date picker's calendar is drawn outside this element, so
  // presses while it is open belong to it.
  useEffect(() => {
    if (!open || dateOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapperRef.current?.contains(event.target)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, dateOpen, close]);

  // Opening moves focus to the first control in the panel.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>("select, input") ?? panel?.querySelector<HTMLElement>("button"))?.focus();
  }, [open]);

  // A value picked earlier stays selectable even when it is no longer among the choices.
  const withSelected = (options: FilterOption[], selected: string, fallback: string) =>
    selected && !options.some((option) => option.id === selected) ? [...options, { id: selected, name: fallback }] : options;

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center" data-testid="dashboard-filters" aria-busy={pending}>
      <form
        role="search"
        aria-label="Search proposals"
        className="relative w-full sm:w-72"
        onSubmit={(event) => {
          event.preventDefault();
          searchBox.commitNow();
        }}
      >
        <label htmlFor="dashboard-search" className="sr-only">Search proposals by event name</label>
        <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          id="dashboard-search"
          type="search"
          value={searchBox.value}
          onChange={(event) => searchBox.change(event.target.value)}
          maxLength={120}
          placeholder="Search proposals"
          autoComplete="off"
          className={`${fieldClass} pl-9 pr-9`}
        />
        {pending && (
          <LoaderCircle size={15} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-500 motion-reduce:animate-none" />
        )}
        <span role="status" className="sr-only">{pending ? "Updating the list" : ""}</span>
      </form>

      {popoverFilters.length > 0 && (
        <div ref={wrapperRef} className="relative">
          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            onClick={() => setOpen((value) => !value)}
            className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition-colors sm:w-auto ${focusRing} ${
              activeCount > 0 ? "border-sky-700 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            Filters
            {activeCount > 0 && (
              <>
                <span aria-hidden="true" className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-700 px-1.5 text-[11px] font-bold text-white">
                  {activeCount}
                </span>
                <span className="sr-only">, {activeCount} applied</span>
              </>
            )}
          </button>

          {open && (
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label="Filters"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.stopPropagation();
                  close(true);
                }
              }}
              className="absolute left-0 right-0 top-full z-30 mt-2 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:left-auto sm:w-80"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">Filters</p>
                <button
                  type="button"
                  onClick={() => close(true)}
                  aria-label="Close filters"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              {offered.includes("owner") && (
                <div>
                  <label htmlFor="dashboard-owner" className={fieldLabelClass}>Planner</label>
                  <select id="dashboard-owner" value={owner} onChange={(event) => navigate({ owner: event.target.value }, "push")} className={fieldClass}>
                    <option value="">All planners</option>
                    {withSelected(owners, owner, "Selected planner").map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                </div>
              )}

              {offered.includes("team") && (
                <div>
                  <label htmlFor="dashboard-team" className={fieldLabelClass}>Team</label>
                  <select id="dashboard-team" value={team} onChange={(event) => navigate({ team: event.target.value }, "push")} className={fieldClass}>
                    <option value="">All teams</option>
                    {withSelected(teams, team, "Selected team").map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                </div>
              )}

              {offered.includes("venueCity") && (
                <div>
                  <label htmlFor="dashboard-city" className={fieldLabelClass}>Venue city</label>
                  <input
                    id="dashboard-city"
                    type="text"
                    value={cityBox.value}
                    onChange={(event) => cityBox.change(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") cityBox.commitNow();
                    }}
                    maxLength={120}
                    placeholder="For example, Chicago"
                    autoComplete="off"
                    aria-describedby="dashboard-city-hint"
                    className={fieldClass}
                  />
                  <p id="dashboard-city-hint" className="mt-1 text-xs text-slate-500">The whole city name.</p>
                </div>
              )}

              {offered.includes("eventDates") && (
                <DateRangePicker
                  label="Event dates"
                  description="Events that start in this range."
                  value={eventFrom && eventTo ? { from: eventFrom, to: eventTo } : null}
                  // A link can carry one end of a range only; say which.
                  placeholder={eventFrom ? `From ${formatRangeDay(eventFrom)}` : eventTo ? `Until ${formatRangeDay(eventTo)}` : "Any dates"}
                  onChange={(range) => navigate({ eventFrom: range?.from ?? "", eventTo: range?.to ?? "" }, "push")}
                  onOpenChange={setDateOpen}
                />
              )}

              <p className="text-xs text-slate-500">Changes apply as you make them.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
