import { BarChart3, ChevronLeft, ChevronRight, Eye, FileText, Inbox, Plus, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { CustomerRole } from "@/components/organization/members/types";
import { roleLabel } from "@/components/organization/members/orgAccess";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import DataTable, { type DataTableColumn } from "@/components/ui/DataTable";
import FilterChip from "@/components/ui/FilterChip";
import type { RfpUsage } from "@/lib/entitlements/entitlements";
import DashboardFilters from "./DashboardFilters";
import FirstRunDashboard from "./FirstRunDashboard";
import ProposalRowActions from "./ProposalRowActions";
import {
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
  formatInstant,
  hasActiveFilters,
  quarterLabel,
  rfpEditHref,
  rfpResponsesHref,
  rfpRowHref,
  rfpViewHref,
  rowActionsFor,
  rowIdentifiers,
  sortDirectionOf,
  sortHref,
  viewsFor,
  withoutFilters,
  type DashboardState,
  type DashboardView,
  type FilterOption,
  type RfpList,
  type RfpListItem,
  type RfpStage,
  type RfpSummary,
} from "./rfpDashboardModel";

// The role dashboards (ORG-402): what a Planner, Team Manager, Admin/Owner or Viewer sees on
// /dashboard. Server-rendered from the page's query string, so a filtered, sorted dashboard can
// be bookmarked and shared inside the organization. Status tabs, column sorts, filter chips and
// paging are plain links. Only the filter controls (DashboardFilters) and a row's action menu
// (ProposalRowActions) run in the browser, and both only change the URL or call an action: the
// list itself is always rendered here from what the backend answered.

export type RoleDashboardViewProps = {
  role: CustomerRole;
  // The signed-in member, to tell their own proposals from other people's.
  userId: string | null;
  state: DashboardState;
  // Today's date (YYYY-MM-DD) in the organization's time zone, and that zone.
  today: string;
  timeZone: string | null;
  list: RfpList | null;
  summary: RfpSummary | null;
  stageCounts: Record<RfpStage, number> | null;
  deadlines: RfpListItem[] | null;
  submissions: RfpListItem[] | null;
  owners: FilterOption[];
  teams: FilterOption[];
  // The plan's proposal counter (null on a plan with no limit, and for Viewers).
  rfpUsage?: RfpUsage | null;
  // A plain sentence when the list could not be loaded.
  error: string | null;
};

const cardClass = "rounded-2xl border border-slate-200 bg-white shadow-sm";
const fieldLabelClass = "mb-1.5 block text-xs font-semibold text-slate-600";
const fieldClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

// Draft gray, Sent blue, Receiving amber, Under review purple, Awarded green, Archived muted.
export const STAGE_TONES: Record<RfpStage, BadgeTone> = {
  draft: "gray",
  sent: "blue",
  receiving_responses: "amber",
  under_review: "purple",
  awarded: "green",
  archived: "muted",
};

const StageBadge = ({ stage }: { stage: RfpStage }) => <Badge tone={STAGE_TONES[stage]}>{STAGE_LABELS[stage]}</Badge>;

const VIEW_INTRO: Record<DashboardView, string> = {
  mine: "Proposals you own, by status.",
  team: "Proposals from the teams you manage, plus your own and any shared with you.",
  organization: "Every proposal in your organization, drafts included.",
  shared: "Proposals your organization has shared with you. You can read them; you can't edit or send them.",
};

const ViewTabs = ({ views, state }: { views: DashboardView[]; state: DashboardState }) => (
  <nav aria-label="Dashboard views" className="flex flex-wrap gap-2">
    {views.map((view) => {
      const selected = view === state.view;
      return (
        <Link
          key={view}
          href={dashboardHref({ ...withoutFilters(state), stage: null }, { view }, views[0])}
          aria-current={selected ? "page" : undefined}
          className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${focusRing} ${
            selected ? "border-sky-700 bg-sky-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {VIEW_LABELS[view]}
        </Link>
      );
    })}
  </nav>
);

const SummaryCard = ({ id, icon, label, value, hint }: { id: string; icon: ReactNode; label: string; value: number; hint: string }) => (
  <li className={`${cardClass} flex items-center gap-4 px-5 py-4`}>
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700" aria-hidden="true">{icon}</div>
    <p className="min-w-0">
      <span className="block text-xs font-semibold text-slate-600">{label}</span>
      <span data-testid={`summary-${id}`} className="block text-2xl font-extrabold leading-tight tracking-tight text-slate-900">{value.toLocaleString("en-US")}</span>
      <span className="block text-xs text-slate-500">{hint}</span>
    </p>
  </li>
);

const summaryIsEmpty = (summary: RfpSummary): boolean =>
  summary.activeRfps === 0 && summary.responsesReceived === 0 && summary.awardedThisQuarter === 0;

// Three zeros say nothing: one card says what will show up here and offers the way to start.
const SummaryEmpty = ({ narrowed, canCreate }: { narrowed: boolean; canCreate: boolean }) => (
  <section aria-label="Summary">
    <div data-testid="summary-empty" className={`${cardClass} flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between`}>
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700" aria-hidden="true">
          <BarChart3 size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900">
            {narrowed ? "No activity for these filters yet" : "No proposal activity yet"}
          </h2>
          <p className="mt-0.5 max-w-xl text-sm text-slate-600">
            Active proposals, vendor responses and awards are counted here once a proposal has been sent to vendors.
          </p>
        </div>
      </div>
      {canCreate && (
        <Link
          href="/proposals/add-new-proposal"
          data-testid="summary-empty-create"
          className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 text-sm font-bold text-white hover:bg-sky-800 ${focusRing}`}
        >
          <Plus size={16} aria-hidden="true" />
          New Proposal
        </Link>
      )}
    </div>
  </section>
);

const SummaryRow = ({ summary }: { summary: RfpSummary }) => (
  <section aria-label="Summary">
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryCard id="active" icon={<FileText size={20} />} label="Active proposals" value={summary.activeRfps} hint="Sent, receiving responses or under review" />
      <SummaryCard id="responses" icon={<Inbox size={20} />} label="Responses received" value={summary.responsesReceived} hint="Vendor responses on the proposals listed below" />
      <SummaryCard id="awarded" icon={<Trophy size={20} />} label="Awarded this quarter" value={summary.awardedThisQuarter} hint={`Awarded in ${quarterLabel(summary.quarter)}`} />
    </ul>
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
  <PanelShell id="dashboard-deadlines" title="Upcoming deadlines" hint="The next dates on active proposals.">
    {items.length === 0 ? (
      <PanelEmpty>No upcoming dates on active proposals.</PanelEmpty>
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

const SubmissionsPanel = ({ items, timeZone }: { items: RfpListItem[]; timeZone: string | null }) => (
  <PanelShell id="dashboard-submissions" title="New submissions" hint="Proposals with vendor responses that nobody has started reviewing.">
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
              <p className="text-xs text-slate-500">Updated {formatInstant(item.updatedAt, timeZone)}</p>
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
    <nav aria-label="Proposal status" className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const selected = tab.stage === state.stage;
        return (
          <Link
            key={tab.stage ?? "open"}
            href={dashboardHref(state, { stage: tab.stage, page: 1 }, defaultView)}
            aria-current={selected ? "true" : undefined}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold transition-colors ${focusRing} ${
              selected ? "border-sky-700 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <>
                <span className="sr-only">: </span>
                <span className="text-xs font-bold text-slate-500">{tab.count}</span>
                <span className="sr-only"> {tab.count === 1 ? "proposal" : "proposals"}</span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

// The filters in force, each removable on its own, and one link that clears them all.
const FilterChips = ({ state, owners, teams, defaultView }: { state: DashboardState; owners: FilterOption[]; teams: FilterOption[]; defaultView: DashboardView }) => {
  if (!hasActiveFilters(state)) return null;
  const nameOf = (options: FilterOption[], id: string, fallback: string) => options.find((option) => option.id === id)?.name ?? fallback;
  const without = (changes: Partial<DashboardState>) => dashboardHref(state, { ...changes, page: 1 }, defaultView);
  const dates =
    state.eventFrom && state.eventTo
      ? state.eventFrom === state.eventTo ? formatDay(state.eventFrom) : `${formatDay(state.eventFrom)} – ${formatDay(state.eventTo)}`
      : state.eventFrom ? `From ${formatDay(state.eventFrom)}` : state.eventTo ? `Until ${formatDay(state.eventTo)}` : "";
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Applied filters" data-testid="filter-chips">
      {state.search && <FilterChip label="Search" value={state.search} removeHref={without({ search: "" })} />}
      {state.owner && <FilterChip label="Planner" value={nameOf(owners, state.owner, "Selected planner")} removeHref={without({ owner: "" })} />}
      {state.team && <FilterChip label="Team" value={nameOf(teams, state.team, "Selected team")} removeHref={without({ team: "" })} />}
      {state.venueCity && <FilterChip label="Venue city" value={state.venueCity} removeHref={without({ venueCity: "" })} />}
      {dates && <FilterChip label="Event dates" value={dates} removeHref={without({ eventFrom: "", eventTo: "" })} />}
      <Link
        href={dashboardHref(withoutFilters(state), {}, defaultView)}
        className={`inline-flex min-h-7 items-center rounded-md px-2 text-xs font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-900 ${focusRing}`}
      >
        Clear all
      </Link>
    </div>
  );
};

type RowContext = {
  role: CustomerRole;
  userId: string | null;
  state: DashboardState;
  timeZone: string | null;
  defaultView: DashboardView;
  rfpUsage: RfpUsage | null;
};

const ProposalTable = ({ items, context }: { items: RfpListItem[]; context: RowContext }) => {
  const { role, userId, state, timeZone, defaultView, rfpUsage } = context;
  // On "My Proposals" every row is the member's own, so the planner column would repeat one name.
  const showOwner = state.view !== "mine";
  const showTeam = state.view === "organization" || state.view === "team";
  const identifiers = rowIdentifiers(items);
  const actionsOf = (item: RfpListItem) => rowActionsFor(item, role, userId);
  // A Viewer changes nothing, so their table has no actions column at all.
  const showActions = role !== "viewer" && items.some((item) => actionsOf(item).canEdit);
  const sort = (label: string, field: Parameters<typeof sortHref>[1]) => ({
    label,
    href: sortHref(state, field, defaultView),
    direction: sortDirectionOf(state, field),
  });

  const columns: DataTableColumn<RfpListItem>[] = [
    {
      id: "proposal",
      header: "Proposal",
      // The cell shows the name and the event dates, so the header sorts by either.
      sorts: [sort("Proposal", "eventName"), sort("Event date", "eventStartDate")],
      rowHeader: true,
      className: "max-w-[20rem]",
      cell: (item) => (
        <>
          <Link href={rfpRowHref(item, actionsOf(item))} className={`block break-words text-sm font-semibold text-slate-900 hover:underline ${focusRing}`}>
            {item.eventName}
          </Link>
          <span className="block text-xs text-slate-600" data-testid="row-identifier">
            {identifiers.get(item.id)}
            {item.venueCity && <> · {item.venueCity}</>}
          </span>
        </>
      ),
    },
    { id: "status", header: "Status", cell: (item) => <StageBadge stage={item.stage} /> },
    ...(showOwner ? [{ id: "planner", header: "Planner", className: "hidden md:table-cell", cell: (item: RfpListItem) => item.ownerName ?? "No planner" }] : []),
    ...(showTeam ? [{ id: "team", header: "Team", className: "hidden lg:table-cell", cell: (item: RfpListItem) => item.teamName ?? "No team" }] : []),
    {
      id: "responses",
      header: "Responses",
      className: "hidden whitespace-nowrap sm:table-cell",
      cell: (item) =>
        item.vendorsInvited === 0 && item.vendorsResponded === 0
          ? "None invited"
          : `${item.vendorsResponded} of ${Math.max(item.vendorsInvited, item.vendorsResponded)}`,
    },
    {
      id: "updated",
      header: "Updated",
      sorts: [sort("Updated", "updatedAt")],
      className: "hidden whitespace-nowrap lg:table-cell",
      cell: (item) => formatInstant(item.updatedAt, timeZone),
    },
    ...(showActions
      ? [{
          id: "actions",
          header: "Actions",
          headerHidden: true,
          align: "right" as const,
          className: "w-12 px-2!",
          cell: (item: RfpListItem) => (
            <ProposalRowActions
              proposal={{ id: item.id, eventName: item.eventName, eventStartDate: item.eventStartDate, eventEndDate: item.eventEndDate }}
              actions={actionsOf(item)}
              editHref={rfpEditHref(item)}
              viewHref={rfpViewHref(item)}
              usage={rfpUsage}
            />
          ),
        }]
      : []),
  ];

  return <DataTable caption={`${VIEW_LABELS[state.view]}: proposals`} columns={columns} rows={items} rowKey={(item) => item.id} />;
};

// The pages worth a link: the first, the last and the ones around the current page.
const pageNumbers = (page: number, totalPages: number): (number | "gap")[] => {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= totalPages));
  const sorted = [...wanted].sort((a, b) => a - b);
  return sorted.flatMap((value, index) => (index > 0 && value - sorted[index - 1] > 1 ? ["gap" as const, value] : [value]));
};

const Pagination = ({ list, state, defaultView }: { list: RfpList; state: DashboardState; defaultView: DashboardView }) => {
  const { total, page, limit, totalPages } = list.pagination;
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, (page - 1) * limit + list.items.length);
  const linkClass = `inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`;
  const offClass = "inline-flex h-9 items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500";
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600" data-testid="pagination-summary">
        Showing {from.toLocaleString("en-US")}–{to.toLocaleString("en-US")} of {total.toLocaleString("en-US")} {total === 1 ? "proposal" : "proposals"}
      </p>
      {totalPages > 1 && (
        <ul className="flex flex-wrap items-center gap-1.5">
          <li>
            {page > 1 ? (
              <Link href={dashboardHref(state, { page: page - 1 }, defaultView)} className={linkClass}>
                <ChevronLeft size={14} aria-hidden="true" /> Previous
              </Link>
            ) : (
              <span aria-disabled="true" className={offClass}><ChevronLeft size={14} aria-hidden="true" /> Previous</span>
            )}
          </li>
          {pageNumbers(page, totalPages).map((entry, index) =>
            entry === "gap" ? (
              <li key={`gap-${index}`} aria-hidden="true" className="hidden px-1 text-sm text-slate-500 sm:block">…</li>
            ) : (
              <li key={entry} className="hidden sm:block">
                <Link
                  href={dashboardHref(state, { page: entry }, defaultView)}
                  aria-label={`Page ${entry}`}
                  aria-current={entry === page ? "page" : undefined}
                  className={entry === page ? `inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-sky-700 bg-sky-700 px-3 text-sm font-bold text-white ${focusRing}` : linkClass}
                >
                  {entry}
                </Link>
              </li>
            ),
          )}
          <li className="px-1 text-sm text-slate-600 sm:sr-only">Page {page} of {totalPages}</li>
          <li>
            {page < totalPages ? (
              <Link href={dashboardHref(state, { page: page + 1 }, defaultView)} className={linkClass}>
                Next <ChevronRight size={14} aria-hidden="true" />
              </Link>
            ) : (
              <span aria-disabled="true" className={offClass}>Next <ChevronRight size={14} aria-hidden="true" /></span>
            )}
          </li>
        </ul>
      )}
    </nav>
  );
};

const EMPTY_COPY: Record<DashboardView, { title: string; body: string }> = {
  mine: { title: "No proposals here yet", body: "Proposals you create show up here as they move from draft to awarded." },
  team: { title: "No team proposals yet", body: "Proposals owned by planners on the teams you manage show up here." },
  organization: { title: "No proposals in your organization yet", body: "Proposals created by anyone in your organization show up here." },
  shared: { title: "Nothing has been shared with you yet", body: "When someone in your organization shares a proposal with you, it shows up here." },
};

const EmptyList = ({ state, defaultView }: { state: DashboardState; defaultView: DashboardView }) => {
  const narrowed = hasActiveFilters(state) || state.stage !== null;
  const copy = narrowed
    ? { title: "No proposals match these filters", body: "Try a different status or clear the filters." }
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
          href={dashboardHref({ ...withoutFilters(state), stage: null }, {}, defaultView)}
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
  const rfpUsage = props.rfpUsage ?? null;
  const views = viewsFor(role);
  const defaultView = views[0];
  const isViewer = role === "viewer";
  const headingId = "dashboard-list-title";

  // A member who can create proposals and has none at all gets the three ways to start instead of
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
          Your organization&apos;s Admins can see your proposals, including drafts.
        </p>
      )}

      {firstRun ? (
        <FirstRunDashboard />
      ) : (
        <>
          {!isViewer && summary && (
            summaryIsEmpty(summary)
              ? <SummaryEmpty narrowed={hasActiveFilters(state) || state.stage !== null} canCreate={!rfpUsage?.atLimit} />
              : <SummaryRow summary={summary} />
          )}

          {!isViewer && state.view !== "organization" && (deadlines || submissions) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {deadlines && <DeadlinesPanel items={deadlines} today={props.today} />}
              {submissions && <SubmissionsPanel items={submissions} timeZone={props.timeZone} />}
            </div>
          )}

          <section aria-labelledby={headingId} className={`${cardClass} space-y-4 px-4 py-5 sm:px-6`}>
            <div>
              <h2 id={headingId} className="text-lg font-bold text-slate-900">{VIEW_LABELS[state.view]}</h2>
              <p className="mt-0.5 text-sm text-slate-600">{VIEW_INTRO[state.view]}</p>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <StageTabs state={state} counts={stageCounts} defaultView={defaultView} />
              <DashboardFilters
                search={state.search}
                owner={state.owner}
                team={state.team}
                venueCity={state.venueCity}
                eventFrom={state.eventFrom}
                eventTo={state.eventTo}
                offered={filtersFor(state.view)}
                owners={props.owners}
                teams={props.teams}
              />
            </div>
            <FilterChips state={state} owners={props.owners} teams={props.teams} defaultView={defaultView} />

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
                <ProposalTable
                  items={list.items}
                  context={{ role, userId: props.userId, state, timeZone: props.timeZone, defaultView, rfpUsage }}
                />
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
