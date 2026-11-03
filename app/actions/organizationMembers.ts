"use server";

import type { OrgAccess, OrgMember } from "@/components/organization/members/types";
import { orgRequest, segment, type OrgActionResult } from "./organizationApi";

// ORG-206 / ORG-207 membership management (backend routes/organizationMembersRoute.ts, mounted at
// /api/organization, Owner/Admin only). Every write sends the member's current `version`.

export async function getOrganizationAccessAction(): Promise<OrgActionResult<OrgAccess>> {
  const me = await orgRequest<{ _id?: string } | null>("/api/auth/me", {}, (p) => (p.user as { _id?: string }) ?? null);
  if (!me.success) return { success: false, message: me.message, code: me.code, status: me.status };
  const userId = me.data?._id ? String(me.data._id) : null;

  const members = await orgRequest<OrgMember[]>("/api/organization/members", {}, (p) => (p.data as { members?: OrgMember[] })?.members ?? []);
  if (members.success) {
    const self = members.data?.find((member) => member.userId === userId);
    return {
      success: true,
      message: "OK",
      data: { userId, role: self?.role ?? "organization_admin", canManageMembers: true, canInvite: true },
    };
  }
  if (members.status !== 403) return { success: false, message: members.message, code: members.code, status: members.status };

  // Not an Owner/Admin. Team Managers may still manage invitations for their teams.
  const invitations = await orgRequest("/api/v1/organization/invitations?status=pending", {}, () => null);
  if (invitations.success) {
    return { success: true, message: "OK", data: { userId, role: "team_manager", canManageMembers: false, canInvite: true } };
  }
  return { success: true, message: "OK", data: { userId, role: null, canManageMembers: false, canInvite: false } };
}

export async function listMembersAction(filter: { q?: string; role?: string; status?: string } = {}): Promise<OrgActionResult<OrgMember[]>> {
  const params = new URLSearchParams();
  if (filter.q?.trim()) params.set("q", filter.q.trim());
  if (filter.role) params.set("role", filter.role);
  if (filter.status) params.set("status", filter.status);
  const query = params.toString();
  return orgRequest<OrgMember[]>(
    `/api/organization/members${query ? `?${query}` : ""}`,
    {},
    (p) => (p.data as { members?: OrgMember[] })?.members ?? [],
  );
}

const pickMember = (p: Record<string, unknown>) => (p.data as { member: OrgMember }).member;

export async function changeMemberRoleAction(userId: string, role: string, version: number): Promise<OrgActionResult<OrgMember>> {
  return orgRequest(`/api/organization/members/${segment(userId)}/role`, { method: "PATCH", body: { role, version } }, pickMember);
}

export async function changeMemberTeamsAction(userId: string, teamIds: string[], version: number): Promise<OrgActionResult<OrgMember>> {
  return orgRequest(`/api/organization/members/${segment(userId)}/teams`, { method: "PUT", body: { teamIds, version } }, pickMember);
}

export async function deactivateMemberAction(userId: string, version: number): Promise<OrgActionResult<OrgMember>> {
  return orgRequest(`/api/organization/members/${segment(userId)}/deactivate`, { method: "POST", body: { version } }, pickMember);
}

export async function reactivateMemberAction(userId: string, version: number): Promise<OrgActionResult<OrgMember>> {
  return orgRequest(`/api/organization/members/${segment(userId)}/reactivate`, { method: "POST", body: { version } }, pickMember);
}

// ORG-207: moves every RFP the member owns to another active, non-Viewer member.
export async function reassignMemberRfpsAction(fromUserId: string, toUserId: string): Promise<OrgActionResult<{ reassignedCount: number }>> {
  return orgRequest(
    `/api/organization/members/${segment(fromUserId)}/reassign-rfps`,
    { method: "POST", body: { toUserId } },
    (p) => ({ reassignedCount: Number((p.data as { reassignedCount?: number })?.reassignedCount ?? 0) }),
  );
}

// `version` is the new Owner's current membership version.
export async function transferOwnershipAction(toUserId: string, version: number): Promise<OrgActionResult<unknown>> {
  return orgRequest("/api/organization/ownership/transfer", { method: "POST", body: { toUserId, version } });
}
