import { auth } from "@/auth";
import { listMembersAction } from "@/app/actions/organizationMembers";
import { getDashboardRfpSummaryAction, listDashboardRfpsAction } from "@/app/actions/rfpDashboard";
import { listTeamsAction } from "@/app/actions/teams";
import { memberDisplayName } from "@/components/organization/members/orgAccess";
import { loadRfpUsage } from "@/components/entitlements/planGate";
import { getMemberIdentity } from "@/lib/server/memberIdentity";
import RoleDashboardView from "./RoleDashboardView";
import TopHeader from "./TopHeader";
import VerifyDomainPrompt from "./VerifyDomainPrompt";
import {
  ACTIVE_STAGES,
  canCreateRfps,
  dashboardErrorMessage,
  dashboardRoleOf,
  earliestToday,
  filterQuery,
  listQuery,
  optionsFromItems,
  parseDashboardState,
  scopeQuery,
  stageCountQuery,
  todayIn,
  upcomingDeadlines,
  type FilterOption,
} from "./rfpDashboardModel";

type SearchParams = Record<string, string | string[] | undefined>;

const PANEL_SIZE = 5;

// Planner and team choices. Owners and Admins read them from the member and team lists; a Team
// Manager can't read those, so theirs come from the proposals they can see (the latest 100).
const loadFilterOptions = async (view: string): Promise<{ owners: FilterOption[]; teams: FilterOption[] }> => {
  if (view === "organization") {
    const [members, teams] = await Promise.all([listMembersAction({ status: "active" }), listTeamsAction()]);
    return {
      owners: (members.data ?? [])
        .filter((member) => member.role !== "viewer")
        .map((member) => ({ id: member.userId, name: memberDisplayName(member) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      teams: (teams.data ?? [])
        .filter((team) => !team.archived)
        .map((team) => ({ id: team.id, name: team.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }
  if (view === "team") {
    const visible = await listDashboardRfpsAction({ limit: "100", stage: "draft,sent,receiving_responses,under_review,awarded,archived" });
    return optionsFromItems(visible.data?.items ?? []);
  }
  return { owners: [], teams: [] };
};

// /dashboard for the signed-in member's role (ORG-402). Every number and row comes from the two
// scoped ORG-401 endpoints with the same filters, so the counts always describe the list.
export default async function RoleDashboard({ searchParams }: { searchParams: SearchParams }) {
  const [identity, session] = await Promise.all([getMemberIdentity(), auth()]);
  const role = dashboardRoleOf(identity.roles);
  const userId = identity.userId ?? session?.user?._id ?? session?.user?.id ?? null;
  const state = parseDashboardState(searchParams, role);
  const isViewer = role === "viewer";
  const showPanels = !isViewer && state.view !== "organization";
  const scope = scopeQuery(state, userId);

  // "My Proposals" without knowing who is asking would list everyone's proposals under that title.
  if (state.view === "mine" && !userId) {
    return (
      <div className="relative mx-auto min-h-full w-full max-w-[1800px] space-y-5 pb-6">
        <TopHeader canCreate={false} />
        <RoleDashboardView
          role={role} userId={null} state={state} today={todayIn("UTC")} timeZone={null}
          list={null} summary={null} stageCounts={null} deadlines={null} submissions={null} owners={[]} teams={[]}
          error={dashboardErrorMessage(undefined, 401)}
        />
      </div>
    );
  }

  const canCreate = canCreateRfps(role);
  const [list, summary, stageCounts, deadlineSource, submissions, options, rfpUsage] = await Promise.all([
    listDashboardRfpsAction(listQuery(state, userId)),
    isViewer ? null : getDashboardRfpSummaryAction(filterQuery(state, userId)),
    getDashboardRfpSummaryAction(stageCountQuery(state, userId)),
    showPanels
      ? listDashboardRfpsAction({ ...scope, stage: ACTIVE_STAGES.join(","), eventFrom: earliestToday(), sortBy: "eventStartDate", sortOrder: "asc", limit: "10" })
      : null,
    showPanels
      ? listDashboardRfpsAction({ ...scope, stage: "receiving_responses", sortBy: "updatedAt", sortOrder: "desc", limit: String(PANEL_SIZE) })
      : null,
    loadFilterOptions(state.view),
    // The plan's proposal counter sits with the create button, which Viewers don't have (ORG-602).
    canCreate ? loadRfpUsage() : null,
  ]);

  // A page past the end (a stale link, or proposals archived since): show the last page. The
  // list is asked for again instead of redirecting: this component streams inside a Suspense
  // boundary, and a redirect after the page has started to arrive breaks the browser's router.
  let shownList = list;
  let shownState = state;
  const lastPage = list.data ? Math.max(1, list.data.pagination.totalPages) : 1;
  if (list.success && list.data && list.data.items.length === 0 && list.data.pagination.total > 0 && state.page > lastPage) {
    shownState = { ...state, page: lastPage };
    shownList = await listDashboardRfpsAction(listQuery(shownState, userId));
  }

  const timeZone = stageCounts.data?.quarter?.timeZone ?? summary?.data?.quarter?.timeZone ?? null;
  const today = todayIn(timeZone);
  const deadlines = deadlineSource?.success ? upcomingDeadlines(deadlineSource.data?.items ?? [], today, PANEL_SIZE) : null;

  return (
    <div className="relative mx-auto min-h-full w-full max-w-[1800px]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,138,210,0.07),transparent)]" />
      <div className="space-y-5 pb-6 sm:space-y-7 sm:pb-10 lg:space-y-8 lg:pb-12">
        <TopHeader canCreate={canCreate} rfpUsage={rfpUsage} />
        <VerifyDomainPrompt />
        <RoleDashboardView
          role={role}
          userId={userId}
          rfpUsage={rfpUsage}
          state={shownState}
          today={today}
          timeZone={timeZone}
          list={shownList.success ? shownList.data ?? null : null}
          summary={summary?.success ? summary.data ?? null : null}
          stageCounts={stageCounts.success ? stageCounts.data?.byStage ?? null : null}
          deadlines={deadlines}
          submissions={submissions?.success ? submissions.data?.items ?? [] : null}
          owners={options.owners}
          teams={options.teams}
          error={shownList.success ? null : dashboardErrorMessage(shownList.code, shownList.status)}
        />
      </div>
    </div>
  );
}
