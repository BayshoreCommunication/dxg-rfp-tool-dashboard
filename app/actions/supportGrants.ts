"use server";

import {
  parseGrant,
  parseGrantDetail,
  parseGrantPage,
  parseGrantableRfps,
  type GrantableRfp,
  type SupportGrant,
  type SupportGrantDetail,
  type SupportGrantPage,
} from "@/components/organization/supportAccess/supportGrantModel";
import { orgRequest, segment, type OrgActionResult } from "./organizationApi";

// ORG-405: the customer side of RFPilot Support access (backend routes/supportAccessRoute.ts,
// ORG-404). Owner and Admin only: every other role gets a 403 from the backend. Everything is
// scoped to the caller's organization there; another organization's grant or RFP is a 404.

const GRANTS = "/api/v1/organization/support-grants";
// Every lifecycle stage: Support may be asked about an archived RFP too.
const ALL_STAGES = "draft,sent,receiving_responses,under_review,awarded,archived";

// An answer we can't read is a failure, not an empty screen.
const readable = <T,>(result: OrgActionResult<T | null>): OrgActionResult<T> => {
  if (!result.success) return { ...result, data: undefined };
  if (result.data === null || result.data === undefined) {
    return { success: false, status: result.status, code: "INVALID_RESPONSE", message: "The server's answer could not be read." };
  }
  return { ...result, data: result.data };
};

export async function listSupportGrantsAction(page = 1): Promise<OrgActionResult<SupportGrantPage>> {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  return readable(await orgRequest(`${GRANTS}?page=${safePage}`, {}, (payload) => parseGrantPage(payload.data)));
}

export async function getSupportGrantAction(grantId: string): Promise<OrgActionResult<SupportGrantDetail>> {
  return readable(await orgRequest(`${GRANTS}/${segment(grantId)}`, {}, (payload) => parseGrantDetail(payload.data)));
}

// Without `proposalId` the grant covers the whole organization.
export async function createSupportGrantAction(input: {
  proposalId?: string | null;
  expiresInDays: number;
  reason?: string;
}): Promise<OrgActionResult<SupportGrant>> {
  const body: Record<string, unknown> = { expiresInDays: input.expiresInDays };
  if (input.proposalId) body.proposalId = input.proposalId;
  const reason = input.reason?.trim();
  if (reason) body.reason = reason;
  return readable(await orgRequest(GRANTS, { method: "POST", body }, (payload) => parseGrant(payload.data)));
}

export async function revokeSupportGrantAction(grantId: string): Promise<OrgActionResult<SupportGrant>> {
  return readable(await orgRequest(`${GRANTS}/${segment(grantId)}/revoke`, { method: "POST", body: {} }, (payload) => parseGrant(payload.data)));
}

// The RFP picker: the organization's RFPs through the scoped dashboard list (ORG-401), which
// returns every RFP in the organization to an Owner or Admin and nothing from anywhere else.
export async function searchGrantableRfpsAction(search: string): Promise<OrgActionResult<GrantableRfp[]>> {
  const query = new URLSearchParams({ limit: "20", sortBy: "updatedAt", sortOrder: "desc", stage: ALL_STAGES });
  const term = search.trim().slice(0, 120);
  if (term) query.set("search", term);
  return orgRequest(`/api/v1/rfps?${query.toString()}`, {}, (payload) => parseGrantableRfps(payload.data));
}
