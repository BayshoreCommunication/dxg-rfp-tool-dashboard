"use server";

import { orgRequest, segment, type OrgActionResult } from "./organizationApi";

// ORG-306: people who signed up with an email on one of this organization's verified domains and
// asked to join. Owner/Admin only (backend routes/accessRequestRoute.ts). Approving sends an
// ordinary invitation, which then appears under pending invitations.

export type AccessRequest = {
  id: string;
  email: string;
  name: string;
  status: "pending" | "approved" | "denied";
  autoApproved: boolean;
  createdAt: string;
  decidedAt: string | null;
};

export type AccessRequestSettings = { autoApproveDomain: boolean; verifiedDomains: string[] };

export async function listAccessRequestsAction(): Promise<OrgActionResult<AccessRequest[]>> {
  return orgRequest<AccessRequest[]>("/api/v1/organization/access-requests?status=pending", {}, (p) => (p.data as AccessRequest[]) ?? []);
}

export async function approveAccessRequestAction(
  id: string,
  input: { role: string; teamId: string | null },
): Promise<OrgActionResult<AccessRequest>> {
  return orgRequest<AccessRequest>(`/api/v1/organization/access-requests/${segment(id)}/approve`, {
    method: "POST",
    body: { role: input.role, ...(input.teamId ? { teamId: input.teamId } : {}) },
  });
}

export async function denyAccessRequestAction(id: string): Promise<OrgActionResult<AccessRequest>> {
  return orgRequest<AccessRequest>(`/api/v1/organization/access-requests/${segment(id)}/deny`, { method: "POST", body: {} });
}

export async function getAccessRequestSettingsAction(): Promise<OrgActionResult<AccessRequestSettings>> {
  return orgRequest<AccessRequestSettings>("/api/v1/organization/access-requests/settings");
}

export async function setAutoApproveDomainAction(autoApproveDomain: boolean): Promise<OrgActionResult<AccessRequestSettings>> {
  return orgRequest<AccessRequestSettings>("/api/v1/organization/access-requests/settings", {
    method: "PUT",
    body: { autoApproveDomain },
  });
}
