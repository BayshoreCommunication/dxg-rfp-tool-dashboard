"use server";

import { toEntitlements, type Entitlements } from "@/lib/entitlements/entitlements";
import { orgRequest, type OrgActionResult } from "./organizationApi";

// The signed-in member's organization plan: RFPs used against the limit and which features are
// unlocked (ORG-601, GET /api/organization/entitlements; any member may read it). `data` is null
// when the answer can't be read; the screens then behave as if there were no plan limits and the
// backend refuses what the plan doesn't include.
export async function getEntitlementsAction(): Promise<OrgActionResult<Entitlements | null>> {
  return orgRequest("/api/organization/entitlements", {}, (payload) => toEntitlements(payload.data));
}
