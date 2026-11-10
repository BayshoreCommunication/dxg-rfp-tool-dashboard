import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listMembersAction } from "@/app/actions/organizationMembers";
import { getDashboardRfpSummaryAction, listDashboardRfpsAction } from "@/app/actions/rfpDashboard";
import { listTeamsAction } from "@/app/actions/teams";
import { memberDisplayName } from "@/components/organization/members/orgAccess";
import { getMemberIdentity } from "@/lib/server/memberIdentity";
import RoleDashboardView from "./RoleDashboardView";
import TopHeader from "./TopHeader";
import VerifyDomainPrompt from "./VerifyDomainPrompt";
import {
  ACTIVE_STAGES,
  canCreateRfps,
  dashboardErrorMessage,
  dashboardHref,
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
  viewsFor,
  type FilterOption,
} from "./rfpDashboardModel";

type SearchParams = Record<string, string | string[] | undefined>;

const PANEL_SIZE = 5;

// Planner and team choices. Owners and Admins read them from the member and team lists; a Team
// Manager can't read those, so theirs come from the RFPs they can see (the latest 100).
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
  const defaultView = viewsFor(role)[0];
  const isViewer = role === "viewer";
  const showPanels = !isViewer && state.view !== "organization";
  const scope = scopeQuery(state, userId);

  const [list, summary, stageCounts, deadlineSource, submissions, options] = await Promise.all([
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
  ]);

  // A page past the end (a stale link, or RFPs archived since): go to the last page.
  if (list.success && list.data && list.data.items.length === 0 && list.data.pagination.total > 0 && state.page > 1) {
    redirect(dashboardHref(state, { page: Math.max(1, list.data.pagination.totalPages) }, defaultView));
  }

  const today = todayIn(stageCounts.data?.quarter?.timeZone ?? summary?.data?.quarter?.timeZone);
  const deadlines = deadlineSource?.success ? upcomingDeadlines(deadlineSource.data?.items ?? [], today, PANEL_SIZE) : null;

  return (
    <div className="relative mx-auto min-h-full w-full max-w-[1800px]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,138,210,0.07),transparent)]" />
      <div className="space-y-5 pb-6 sm:space-y-7 sm:pb-10 lg:space-y-8 lg:pb-12">
        <TopHeader canCreate={canCreateRfps(role)} />
        <VerifyDomainPrompt />
        <RoleDashboardView
          role={role}
          state={state}
          today={today}
          list={list.success ? list.data ?? null : null}
          summary={summary?.success ? summary.data ?? null : null}
          stageCounts={stageCounts.success ? stageCounts.data?.byStage ?? null : null}
          deadlines={deadlines}
          submissions={submissions?.success ? submissions.data?.items ?? [] : null}
          owners={options.owners}
          teams={options.teams}
          error={list.success ? null : dashboardErrorMessage(list.code, list.status)}
        />
      </div>
    </div>
  );
}
