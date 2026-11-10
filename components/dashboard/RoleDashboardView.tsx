import { ChevronLeft, ChevronRight, Eye, FileText, Inbox, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { CustomerRole } from "@/components/organization/members/types";
import { roleLabel } from "@/components/organization/members/orgAccess";
import FirstRunDashboard from "./FirstRunDashboard";
import {
  SORT_OPTIONS,
  RFP_STAGES,
  STAGE_LABELS,
  VIEW_LABELS,
  dashboardHref,
  daysUntil,
  deadlineOf,
  dueLabel,
  filtersFor,
  formatDay,
  formatEventDates,
  hasActiveFilters,
  quarterLabel,
  rfpResponsesHref,
  rfpViewHref,
  viewsFor,
  type DashboardState,
  type DashboardView,
  type FilterOption,
  type RfpList,
  type RfpListItem,
  type RfpStage,
  type RfpSummary,
} from "./rfpDashboardModel";

// The role dashboards (ORG-402): what a Planner, Team Manager, Admin/Owner or Viewer sees on
// /dashboard. Server-rendered from the page's query string; every filter is a plain link or a
// GET form, so a filtered dashboard can be bookmarked and shared inside the organization.

export type RoleDashboardViewProps = {
  role: CustomerRole;
  state: DashboardState;
  // Today's date (YYYY-MM-DD) in the organization's time zone.
  today: string;
  list: RfpList | null;
  summary: RfpSummary | null;
  stageCounts: Record<RfpStage, number> | null;
  deadlines: RfpListItem[] | null;
  submissions: RfpListItem[] | null;
  owners: FilterOption[];
  teams: FilterOption[];
  // A plain sentence when the list could not be loaded.
  error: string | null;
};

const cardClass = "rounded-2xl border border-slate-200 bg-white shadow-sm";
const fieldLabelClass = "mb-1.5 block text-xs font-semibold text-slate-600";
const fieldClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

const STAGE_TONES: Record<RfpStage, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  sent: "border-sky-100 bg-sky-50 text-sky-700",
  receiving_responses: "border-amber-100 bg-amber-50 text-amber-800",
  under_review: "border-violet-100 bg-violet-50 text-violet-700",
  awarded: "border-emerald-100 bg-emerald-50 text-emerald-700",
  archived: "border-slate-200 bg-slate-50 text-slate-600",
};

const StageBadge = ({ stage }: { stage: RfpStage }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STAGE_TONES[stage]}`}>
    {STAGE_LABELS[stage]}
  </span>
);

const VIEW_INTRO: Record<DashboardView, string> = {
  mine: "RFPs you own, by status.",
  team: "RFPs owned by the planners on the teams you manage.",
  organization: "Every RFP in your organization, drafts included.",
  shared: "RFPs your organization has shared with you. You can read them; you can't edit or send them.",
};

const ViewTabs = ({ views, state }: { views: DashboardView[]; state: DashboardState }) => (
  <nav aria-label="Dashboard views" className="flex flex-wrap gap-2">
    {views.map((view) => {
      const selected = view === state.view;
      return (
        <Link
          key={view}
          href={dashboardHref({ ...state, owner: "", team: "", eventFrom: "", eventTo: "", venueCity: "", search: "", stage: null, page: 1 }, { view }, views[0])}
          aria-current={selected ? "page" : undefined}
          className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${focusRing} ${
            selected ? "border-sky-600 bg-sky-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {VIEW_LABELS[view]}
        </Link>
      );
    })}
  </nav>
);

const SummaryCard = ({ icon, label, value, hint }: { icon: ReactNode; label: string; value: number; hint: string }) => (
  <div className={`${cardClass} flex items-center gap-4 px-5 py-4`}>
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700" aria-hidden="true">{icon}</div>
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-slate-600">{label}</dt>
      <dd className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900">{value.toLocaleString("en-US")}</dd>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  </div>
);

const SummaryRow = ({ summary }: { summary: RfpSummary }) => (
  <section aria-label="Summary">
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryCard icon={<FileText size={20} />} label="Active RFPs" value={summary.activeRfps} hint="Sent, receiving responses or under review" />
      <SummaryCard icon={<Inbox size={20} />} label="Responses received" value={summary.responsesReceived} hint="Vendor responses on the RFPs listed below" />
      <SummaryCard icon={<Trophy size={20} />} label="Awarded this quarter" value={summary.awardedThisQuarter} hint={`Awarded in ${quarterLabel(summary.quarter)}`} />
    </dl>
  </section>
);

const PanelShell = ({ id, title, hint, children }: { id: string; title: string; hint: string; children: ReactNode }) => (
  <section aria-labelledby={id} className={`${cardClass} px-5 py-5`}>
    <h2 id={id} className="text-base font-bold text-slate-900">{title}</h2>
    <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    <div className="mt-3">{children}</div>
  </section>
);

const PanelEmpty = ({ children }: { children: ReactNode }) => (
  <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-600">{children}</p>
);

const DeadlinesPanel = ({ items, today }: { items: RfpListItem[]; today: string }) => (
  <PanelShell id="dashboard-deadlines" title="Upcoming deadlines" hint="The next dates on your active RFPs.">
    {items.length === 0 ? (
      <PanelEmpty>No upcoming dates on your active RFPs.</PanelEmpty>
    ) : (
      <ul className="divide-y divide-slate-100">
        {items.map((item) => {
          const deadline = deadlineOf(item);
          if (!deadline) return null;
          return (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <Link href={rfpViewHref(item)} className={`block truncate text-sm font-semibold text-slate-900 hover:underline ${focusRing}`}>
                  {item.eventName}
                </Link>
                <p className="text-xs text-slate-500">{deadline.label} {formatDay(deadline.day)}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-slate-600">{dueLabel(daysUntil(deadline.day, today))}</span>
            </li>
          );
        })}
      </ul>
    )}
  </PanelShell>
);

const SubmissionsPanel = ({ items }: { items: RfpListItem[] }) => (
  <PanelShell id="dashboard-submissions" title="New submissions" hint="RFPs with vendor responses you haven't started reviewing.">
    {items.length === 0 ? (
      <PanelEmpty>No new vendor responses to review.</PanelEmpty>
    ) : (
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <Link href={rfpResponsesHref(item)} className={`block truncate text-sm font-semibold text-slate-900 hover:underline ${focusRing}`}>
                {item.eventName}
              </Link>
              <p className="text-xs text-slate-500">Updated {formatDay(item.updatedAt)}</p>
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-slate-600">
              {item.vendorsResponded} of {Math.max(item.vendorsInvited, item.vendorsResponded)} responded
            </span>
          </li>
        ))}
      </ul>
    )}
  </PanelShell>
);

const StageTabs = ({ state, counts, defaultView }: { state: DashboardState; counts: Record<RfpStage, number> | null; defaultView: DashboardView }) => {
  const openTotal = counts ? RFP_STAGES.filter((stage) => stage !== "archived").reduce((sum, stage) => sum + counts[stage], 0) : null;
  const tabs: { stage: RfpStage | null; label: string; count: number | null }[] = [
    { stage: null, label: "All open", count: openTotal },
    ...RFP_STAGES.map((stage) => ({ stage, label: STAGE_LABELS[stage], count: counts ? counts[stage] : null })),
  ];
  return (
    <nav aria-label="RFP status" className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const selected = tab.stage === state.stage;
        return (
          <Link
            key={tab.stage ?? "open"}
            href={dashboardHref(state, { stage: tab.stage, page: 1 }, defaultView)}
            aria-current={selected ? "true" : undefined}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold transition-colors ${focusRing} ${
              selected ? "border-sky-600 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {tab.label}
            {tab.count !== null && <span className="text-xs font-bold text-slate-500">{tab.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
};

const FilterForm = ({ state, owners, teams, defaultView }: { state: DashboardState; owners: FilterOption[]; teams: FilterOption[]; defaultView: DashboardView }) => {
  const offered = filtersFor(state.view);
  // A value picked earlier stays selectable even when it is no longer among the choices.
  const withSelected = (options: FilterOption[], selected: string, fallback: string) =>
    selected && !options.some((option) => option.id === selected) ? [...options, { id: selected, name: fallback }] : options;
  const ownerOptions = withSelected(owners, state.owner, "Selected planner");
  const teamOptions = withSelected(teams, state.team, "Selected team");
  return (
    <form action="/dashboard" method="get" role="search" aria-label="Filter RFPs" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {state.view !== defaultView && <input type="hidden" name="view" value={state.view} />}
      {state.stage && <input type="hidden" name="stage" value={state.stage} />}
      <div>
        <label htmlFor="dashboard-search" className={fieldLabelClass}>Event name</label>
        <input id="dashboard-search" name="search" type="search" defaultValue={state.search} maxLength={120} placeholder="Search RFPs" className={fieldClass} />
      </div>
      {offered.includes("owner") && (
        <div>
          <label htmlFor="dashboard-owner" className={fieldLabelClass}>Planner</label>
          <select id="dashboard-owner" name="owner" defaultValue={state.owner} className={fieldClass}>
            <option value="">All planners</option>
            {ownerOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </div>
      )}
      {offered.includes("team") && (
        <div>
          <label htmlFor="dashboard-team" className={fieldLabelClass}>Team</label>
          <select id="dashboard-team" name="team" defaultValue={state.team} className={fieldClass}>
            <option value="">All teams</option>
            {teamOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </div>
      )}
      {offered.includes("venueCity") && (
        <div>
          <label htmlFor="dashboard-city" className={fieldLabelClass}>Venue city</label>
          <input id="dashboard-city" name="venueCity" type="text" defaultValue={state.venueCity} maxLength={120} placeholder="For example, Chicago" className={fieldClass} />
        </div>
      )}
      {offered.includes("eventDates") && (
        <>
          <div>
            <label htmlFor="dashboard-event-from" className={fieldLabelClass}>Event starts on or after</label>
            <input id="dashboard-event-from" name="eventFrom" type="date" defaultValue={state.eventFrom} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="dashboard-event-to" className={fieldLabelClass}>Event starts on or before</label>
            <input id="dashboard-event-to" name="eventTo" type="date" defaultValue={state.eventTo} className={fieldClass} />
          </div>
        </>
      )}
      <div>
        <label htmlFor="dashboard-sort" className={fieldLabelClass}>Sort by</label>
        <select id="dashboard-sort" name="sortBy" defaultValue={state.sortBy} className={fieldClass}>
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="flex items-end gap-2">
        <button type="submit" className={`inline-flex h-10 items-center justify-center rounded-md bg-sky-700 px-4 text-sm font-bold text-white transition-colors hover:bg-sky-800 ${focusRing}`}>
          Apply
        </button>
        {hasActiveFilters(state) && (
          <Link
            href={dashboardHref({ ...state, owner: "", team: "", eventFrom: "", eventTo: "", venueCity: "", search: "", page: 1 }, {}, defaultView)}
            className={`inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
          >
            Clear filters
          </Link>
        )}
      </div>
    </form>
  );
};

const headClass = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500";
const cellClass = "px-4 py-3 align-middle text-sm text-slate-600";

const RfpTable = ({ items, state }: { items: RfpListItem[]; state: DashboardState }) => {
  // On "My RFPs" every row is the member's own, so the planner column would repeat one name.
  const showOwner = state.view !== "mine";
  const showTeam = state.view === "organization" || state.view === "team";
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-full border-collapse">
        <caption className="sr-only">{VIEW_LABELS[state.view]}: RFPs</caption>
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className={headClass}>RFP</th>
            <th scope="col" className={headClass}>Status</th>
            {showOwner && <th scope="col" className={`${headClass} hidden md:table-cell`}>Planner</th>}
            {showTeam && <th scope="col" className={`${headClass} hidden lg:table-cell`}>Team</th>}
            <th scope="col" className={`${headClass} hidden sm:table-cell`}>Event date</th>
            <th scope="col" className={`${headClass} hidden sm:table-cell`}>Responses</th>
            <th scope="col" className={`${headClass} hidden lg:table-cell`}>Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((item) => (
            <tr key={item.id}>
              <th scope="row" className="max-w-[18rem] px-4 py-3 text-left align-middle font-normal">
                <Link href={rfpViewHref(item)} className={`block break-words text-sm font-semibold text-slate-900 hover:underline ${focusRing}`}>
                  {item.eventName}
                </Link>
                <span className="block text-xs text-slate-500">
                  {item.venueCity ?? "No venue city"}
                  <span className="sm:hidden"> · {formatEventDates(item)}</span>
                </span>
              </th>
              <td className={cellClass}><StageBadge stage={item.stage} /></td>
              {showOwner && <td className={`${cellClass} hidden md:table-cell`}>{item.ownerName ?? "No planner"}</td>}
              {showTeam && <td className={`${cellClass} hidden lg:table-cell`}>{item.teamName ?? "No team"}</td>}
              <td className={`${cellClass} hidden whitespace-nowrap sm:table-cell`}>{formatEventDates(item)}</td>
              <td className={`${cellClass} hidden whitespace-nowrap sm:table-cell`}>
                {item.vendorsInvited === 0 && item.vendorsResponded === 0
                  ? "None invited"
                  : `${item.vendorsResponded} of ${Math.max(item.vendorsInvited, item.vendorsResponded)}`}
              </td>
              <td className={`${cellClass} hidden whitespace-nowrap lg:table-cell`}>{formatDay(item.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Pagination = ({ list, state, defaultView }: { list: RfpList; state: DashboardState; defaultView: DashboardView }) => {
  const { total, page, limit, totalPages } = list.pagination;
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, (page - 1) * limit + list.items.length);
  const linkClass = `inline-flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`;
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">
        Showing {from.toLocaleString("en-US")}–{to.toLocaleString("en-US")} of {total.toLocaleString("en-US")} {total === 1 ? "RFP" : "RFPs"}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 && (
            <Link href={dashboardHref(state, { page: page - 1 }, defaultView)} className={linkClass}>
              <ChevronLeft size={14} aria-hidden="true" /> Previous
            </Link>
          )}
          <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={dashboardHref(state, { page: page + 1 }, defaultView)} className={linkClass}>
              Next <ChevronRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

const EMPTY_COPY: Record<DashboardView, { title: string; body: string }> = {
  mine: { title: "No RFPs here yet", body: "RFPs you create show up here as they move from draft to awarded." },
  team: { title: "No team RFPs yet", body: "RFPs owned by planners on the teams you manage show up here." },
  organization: { title: "No RFPs in your organization yet", body: "RFPs created by anyone in your organization show up here." },
  shared: { title: "Nothing has been shared with you yet", body: "When someone in your organization shares an RFP with you, it shows up here." },
};

const EmptyList = ({ state, defaultView }: { state: DashboardState; defaultView: DashboardView }) => {
  const narrowed = hasActiveFilters(state) || state.stage !== null;
  const copy = narrowed
    ? { title: "No RFPs match these filters", body: "Try a different status or clear the filters." }
    : EMPTY_COPY[state.view];
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-700" aria-hidden="true">
        {state.view === "shared" ? <Eye size={20} /> : state.view === "mine" ? <FileText size={20} /> : <UsersRound size={20} />}
      </div>
      <p className="text-sm font-semibold text-slate-900">{copy.title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-600">{copy.body}</p>
      {narrowed && (
        <Link
          href={dashboardHref({ ...state, owner: "", team: "", eventFrom: "", eventTo: "", venueCity: "", search: "", stage: null, page: 1 }, {}, defaultView)}
          className={`mt-4 inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
        >
          Clear filters
        </Link>
      )}
    </div>
  );
};

export default function RoleDashboardView(props: RoleDashboardViewProps) {
  const { role, state, list, summary, stageCounts, deadlines, submissions, error } = props;
  const views = viewsFor(role);
  const defaultView = views[0];
  const isViewer = role === "viewer";
  const headingId = "dashboard-list-title";

  // A member who can create RFPs and has none at all gets the three ways to start instead of
  // an empty table.
  const everything = stageCounts ? RFP_STAGES.reduce((sum, stage) => sum + stageCounts[stage], 0) : null;
  const firstRun = !isViewer && !error && state.view === defaultView && !hasActiveFilters(state) && state.stage === null && everything === 0;

  return (
    <div className="space-y-5 px-1 sm:px-2 lg:px-5" data-testid="role-dashboard" data-dashboard-role={role} data-dashboard-view={state.view}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {views.length > 1 ? <ViewTabs views={views} state={state} /> : <span />}
        <p className="text-xs text-slate-600">
          Your role: <span className="font-semibold text-slate-900">{roleLabel(role)}</span>
        </p>
      </div>

      {(role === "planner" || role === "team_manager") && state.view === "mine" && (
        <p className="rounded-md border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm text-sky-900" data-testid="admin-visibility-note">
          Your organization&apos;s Admins can see your RFPs, including drafts.
        </p>
      )}

      {firstRun ? (
        <FirstRunDashboard />
      ) : (
        <>
          {!isViewer && summary && <SummaryRow summary={summary} />}

          {!isViewer && state.view !== "organization" && (deadlines || submissions) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {deadlines && <DeadlinesPanel items={deadlines} today={props.today} />}
              {submissions && <SubmissionsPanel items={submissions} />}
            </div>
          )}

          <section aria-labelledby={headingId} className={`${cardClass} space-y-4 px-4 py-5 sm:px-6`}>
            <div>
              <h2 id={headingId} className="text-lg font-bold text-slate-900">{VIEW_LABELS[state.view]}</h2>
              <p className="mt-0.5 text-sm text-slate-600">{VIEW_INTRO[state.view]}</p>
            </div>

            <StageTabs state={state} counts={stageCounts} defaultView={defaultView} />
            <FilterForm state={state} owners={props.owners} teams={props.teams} defaultView={defaultView} />

            {error ? (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-semibold">{error}</p>
                <p className="mt-1">
                  <Link href={dashboardHref(state, {}, defaultView)} className={`font-semibold underline ${focusRing}`}>Try again</Link>
                  {" or "}
                  <Link href="/dashboard" className={`font-semibold underline ${focusRing}`}>reset the dashboard</Link>.
                </p>
              </div>
            ) : list && list.items.length > 0 ? (
              <>
                <RfpTable items={list.items} state={state} />
                <Pagination list={list} state={state} defaultView={defaultView} />
              </>
            ) : (
              <EmptyList state={state} defaultView={defaultView} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
