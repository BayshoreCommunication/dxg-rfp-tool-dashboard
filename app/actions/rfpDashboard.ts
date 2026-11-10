"use server";

import {
  toRfpList,
  toRfpSummary,
  type RfpList,
  type RfpSummary,
} from "@/components/dashboard/rfpDashboardModel";
import { orgRequest, type OrgActionResult } from "./organizationApi";

// ORG-402 role dashboards, over the ORG-401 endpoints (backend routes/rfpDashboardRoute.ts).
// Both answer only with RFPs the signed-in member may see; a filter can narrow that set, never
// widen it. The list and the summary take the same filters.

const withQuery = (path: string, query: Record<string, string>) => {
  const params = new URLSearchParams(query).toString();
  return params ? `${path}?${params}` : path;
};

export async function listDashboardRfpsAction(query: Record<string, string> = {}): Promise<OrgActionResult<RfpList>> {
  return orgRequest(withQuery("/api/v1/rfps", query), {}, (payload) => toRfpList(payload.data));
}

export async function getDashboardRfpSummaryAction(query: Record<string, string> = {}): Promise<OrgActionResult<RfpSummary>> {
  return orgRequest(withQuery("/api/v1/rfps/summary", query), {}, (payload) => toRfpSummary(payload.data));
}
