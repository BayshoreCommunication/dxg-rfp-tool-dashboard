"use server";

import { toOverviewTotals, type DashboardOverviewTotals } from "@/components/dashboard/dashboardStats";
import { orgRequest, type OrgActionResult } from "./organizationApi";

// The signed-in member's own totals (backend routes/dashboardRoute.ts): proposals they own and
// the email and view activity on them. Not scoped by role, team or the dashboard's filters.
// `data` is null when the backend answered without usable totals.
export async function getDashboardOverviewAction(): Promise<OrgActionResult<DashboardOverviewTotals | null>> {
  return orgRequest("/api/dashboard/overview", {}, (payload) => toOverviewTotals(payload.data));
}
