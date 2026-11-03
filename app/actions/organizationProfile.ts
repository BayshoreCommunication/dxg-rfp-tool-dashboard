"use server";

import { unstable_update } from "@/auth";
import { COMPANY_NAMED_UPDATE } from "@/lib/auth/companyName";
import { orgRequest } from "./organizationApi";

/* The organization's name, under /api/organization/profile. Naming it also
   clears the session's needsCompanyName so the proxy stops sending the Owner
   to /welcome. */

export type OrganizationProfile = { name: string; needsName: boolean; canEditName: boolean };

export async function getOrganizationProfileAction() {
  return orgRequest<OrganizationProfile>("/api/organization/profile", {}, (payload) => ({
    name: String(payload.name ?? ""),
    needsName: payload.needsName === true,
    canEditName: payload.canEditName === true,
  }));
}

export async function saveCompanyNameAction(name: string) {
  const result = await orgRequest<{ name: string }>(
    "/api/organization/profile",
    { method: "PUT", body: { name } },
    (payload) => ({ name: String(payload.name ?? "") }),
  );
  if (result.success) {
    await unstable_update({ [COMPANY_NAMED_UPDATE]: true } as never);
  }
  return result;
}

/* "Skip for now": keep the placeholder name, stop asking for this session. */
export async function skipCompanyNameAction() {
  await unstable_update({ [COMPANY_NAMED_UPDATE]: true } as never);
}
