"use server";

import type { Team } from "@/components/organization/members/types";
import { orgRequest, segment, type OrgActionResult } from "./organizationApi";

// ORG-201 team administration (backend routes/teamsRoute.ts). Listing is open to every member
// (names only for non-admins); everything else is Owner/Admin only.

const pickTeam = (p: Record<string, unknown>) => p.data as Team;

export async function listTeamsAction(): Promise<OrgActionResult<Team[]>> {
  return orgRequest<Team[]>("/api/v1/teams", {}, (p) => (Array.isArray(p.data) ? (p.data as Team[]) : []));
}

export async function createTeamAction(name: string): Promise<OrgActionResult<Team>> {
  return orgRequest("/api/v1/teams", { method: "POST", body: { name } }, pickTeam);
}

export async function renameTeamAction(teamId: string, name: string): Promise<OrgActionResult<Team>> {
  return orgRequest(`/api/v1/teams/${segment(teamId)}`, { method: "PATCH", body: { name } }, pickTeam);
}

export async function archiveTeamAction(teamId: string): Promise<OrgActionResult<Team>> {
  return orgRequest(`/api/v1/teams/${segment(teamId)}/archive`, { method: "POST", body: {} }, pickTeam);
}

export async function addTeamMemberAction(teamId: string, userId: string, isManager: boolean): Promise<OrgActionResult<Team>> {
  return orgRequest(`/api/v1/teams/${segment(teamId)}/members`, { method: "POST", body: { userId, isManager } }, pickTeam);
}

export async function removeTeamMemberAction(teamId: string, userId: string): Promise<OrgActionResult<Team>> {
  return orgRequest(`/api/v1/teams/${segment(teamId)}/members/${segment(userId)}`, { method: "DELETE" }, pickTeam);
}

export async function setTeamManagerAction(teamId: string, userId: string, isManager: boolean): Promise<OrgActionResult<Team>> {
  return orgRequest(`/api/v1/teams/${segment(teamId)}/members/${segment(userId)}`, { method: "PATCH", body: { isManager } }, pickTeam);
}
