"use server";

import type { BulkInviteResult, Invitation } from "@/components/organization/members/types";
import { orgRequest, segment, type OrgActionResult } from "./organizationApi";

// ORG-203 invitations (backend routes/invitationRoute.ts). Owners/Admins manage all; Team
// Managers manage their own teams' invitations when the organization allows it.

const pickInvitation = (p: Record<string, unknown>) => p.invitation as Invitation;

export async function listInvitationsAction(status?: string): Promise<OrgActionResult<Invitation[]>> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return orgRequest(`/api/v1/organization/invitations${query}`, {}, (p) => (Array.isArray(p.invitations) ? (p.invitations as Invitation[]) : []));
}

export async function createInvitationAction(input: { email: string; role: string; teamId?: string | null }): Promise<OrgActionResult<Invitation>> {
  return orgRequest(
    "/api/v1/organization/invitations",
    { method: "POST", body: { email: input.email, role: input.role, ...(input.teamId ? { teamId: input.teamId } : {}) } },
    pickInvitation,
  );
}

export async function createBulkInvitationsAction(input: { emails: string[]; role: string; teamId?: string | null }): Promise<OrgActionResult<BulkInviteResult>> {
  return orgRequest(
    "/api/v1/organization/invitations/bulk",
    { method: "POST", body: { emails: input.emails, role: input.role, ...(input.teamId ? { teamId: input.teamId } : {}) } },
    (p) => ({ summary: p.summary as BulkInviteResult["summary"], rows: (p.rows as BulkInviteResult["rows"]) ?? [] }),
  );
}

export async function resendInvitationAction(id: string): Promise<OrgActionResult<Invitation>> {
  return orgRequest(`/api/v1/organization/invitations/${segment(id)}/resend`, { method: "POST", body: {} }, pickInvitation);
}

export async function revokeInvitationAction(id: string): Promise<OrgActionResult<Invitation>> {
  return orgRequest(`/api/v1/organization/invitations/${segment(id)}/revoke`, { method: "POST", body: {} }, pickInvitation);
}
