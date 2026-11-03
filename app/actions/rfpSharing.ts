"use server";

import { auth } from "@/auth";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import {
  accessErrorMessage,
  type DirectoryMember,
  type RfpAccessSnapshot,
  type RfpShare,
  type SharePermission,
  type TeamOption,
} from "@/components/proposals/sharing/rfpAccessModel";

// RFP sharing (ORG-208/210), RFP team (ORG-202) and single-RFP owner reassignment (ORG-207).
// Every call goes to the real backend; refusals come back as human sentences, never raw codes.

export type RfpAccessResult<T> =
  | { success: true; data: T }
  | { success: false; message: string; code?: string; status?: number };

type Envelope = { success?: boolean; data?: unknown; message?: string; code?: string };

const OBJECT_ID = /^[a-f0-9]{24}$/i;

const request = async (path: string, init?: RequestInit) => {
  const response = await authenticatedBackendFetch(`${BACKEND_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await response.json().catch(() => null)) as Envelope | null;
  return { response, body };
};

const call = async <T,>(path: string, init?: RequestInit): Promise<RfpAccessResult<T>> => {
  try {
    const { response, body } = await request(path, init);
    if (!response.ok || !body?.success) {
      return { success: false, status: response.status, code: body?.code, message: accessErrorMessage(body?.code, response.status) };
    }
    return { success: true, data: body.data as T };
  } catch {
    return { success: false, message: "We couldn't reach RFPilot. Check your connection and try again." };
  }
};

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const idOf = (value: unknown): string | null => {
  if (typeof value === "string" && value) return value;
  if (record(value) && typeof value._id === "string") return value._id;
  return null;
};
const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

const toShares = (value: unknown): RfpShare[] =>
  (Array.isArray(value) ? value : []).filter(record).flatMap((item) => {
    const userId = idOf(item.userId);
    if (!userId) return [];
    return [{
      userId,
      permission: item.permission === "edit" ? "edit" : "view",
      grantedBy: idOf(item.grantedBy) ?? "",
      memberActive: item.memberActive !== false,
      createdAt: text(item.createdAt) ?? undefined,
      updatedAt: text(item.updatedAt) ?? undefined,
    } satisfies RfpShare];
  });

const toMembers = (value: unknown): DirectoryMember[] => {
  const list = record(value) && Array.isArray(value.members) ? value.members : [];
  return list.filter(record).flatMap((item) => {
    const userId = idOf(item.userId);
    if (!userId) return [];
    return [{
      userId,
      name: text(item.name),
      email: text(item.email),
      role: text(item.role),
      roles: Array.isArray(item.roles) ? item.roles.filter((role): role is string => typeof role === "string") : [],
      status: text(item.status) ?? "active",
    }];
  });
};

const toTeams = (value: unknown): TeamOption[] =>
  (Array.isArray(value) ? value : []).filter(record).flatMap((item) => {
    const id = idOf(item.id) ?? idOf(item._id);
    const name = text(item.name);
    return id && name ? [{ id, name, archived: item.archived === true }] : [];
  });

const invalidId = <T,>(): RfpAccessResult<T> => ({ success: false, status: 404, message: accessErrorMessage("PROPOSAL_NOT_FOUND") });

/**
 * Everything the access panel needs in one round trip. The shares and members requests double
 * as permission probes: a 403 from either one just means "not for you", never an error screen.
 */
export async function getRfpAccessAction(proposalId: string): Promise<RfpAccessResult<RfpAccessSnapshot>> {
  if (!OBJECT_ID.test(proposalId)) return invalidId();
  const [session, proposal, shares, members, teams] = await Promise.all([
    auth().catch(() => null),
    call<unknown>(`/api/proposals/${proposalId}`),
    call<unknown>(`/api/v1/proposals/${proposalId}/shares`),
    call<unknown>("/api/organization/members"),
    call<unknown>("/api/v1/teams"),
  ]);
  if (!proposal.success) return proposal;
  if (!shares.success && shares.status !== 403) return shares;

  const data = record(proposal.data) ? proposal.data : {};
  const event = record(data.event) ? data.event : {};
  const user = session?.user as { _id?: string; id?: string } | undefined;
  return {
    success: true,
    data: {
      proposalId,
      title: text(event.eventName)?.trim() || "Untitled RFP",
      viewerUserId: user?._id ?? user?.id ?? null,
      ownerUserId: idOf(data.userId),
      teamId: idOf(data.teamId),
      shares: shares.success ? toShares(shares.data) : null,
      directory: members.success ? toMembers(members.data) : null,
      teams: teams.success ? toTeams(teams.data) : [],
    },
  };
}

export async function grantRfpShareAction(
  proposalId: string,
  userId: string,
  permission: SharePermission,
): Promise<RfpAccessResult<RfpShare[]>> {
  if (!OBJECT_ID.test(proposalId)) return invalidId();
  if (!OBJECT_ID.test(userId)) return { success: false, status: 404, message: accessErrorMessage("MEMBER_NOT_FOUND") };
  const result = await call<unknown>(`/api/v1/proposals/${proposalId}/shares/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ permission }),
  });
  return result.success ? { success: true, data: toShares(result.data) } : result;
}

export async function revokeRfpShareAction(proposalId: string, userId: string): Promise<RfpAccessResult<RfpShare[]>> {
  if (!OBJECT_ID.test(proposalId)) return invalidId();
  if (!OBJECT_ID.test(userId)) return { success: false, status: 404, message: accessErrorMessage("SHARE_NOT_FOUND") };
  const result = await call<unknown>(`/api/v1/proposals/${proposalId}/shares/${userId}`, { method: "DELETE" });
  return result.success ? { success: true, data: toShares(result.data) } : result;
}

/** ORG-202: `teamId` is an active team of the organization, or null for no team. */
export async function setRfpTeamAction(proposalId: string, teamId: string | null): Promise<RfpAccessResult<{ teamId: string | null }>> {
  if (!OBJECT_ID.test(proposalId)) return invalidId();
  if (teamId !== null && !OBJECT_ID.test(teamId)) {
    return { success: false, status: 422, code: "TEAM_NOT_ASSIGNABLE", message: accessErrorMessage("TEAM_NOT_ASSIGNABLE") };
  }
  const result = await call<unknown>(`/api/proposals/${proposalId}`, {
    method: "PUT",
    body: JSON.stringify({ teamId }),
  });
  if (!result.success) return result;
  return { success: true, data: { teamId: record(result.data) ? idOf(result.data.teamId) : teamId } };
}

/**
 * ORG-207 has no single-RFP route; this uses the Owner/Admin offboarding route with one RFP
 * selected (`rfpIds: [proposalId]`), moving it from its current owner to `toUserId`.
 */
export async function reassignRfpOwnerAction(input: {
  proposalId: string;
  fromUserId: string;
  toUserId: string;
}): Promise<RfpAccessResult<{ reassignedCount: number }>> {
  if (!OBJECT_ID.test(input.proposalId)) return invalidId();
  if (!OBJECT_ID.test(input.fromUserId)) return { success: false, status: 404, message: accessErrorMessage("MEMBER_NOT_FOUND") };
  if (!OBJECT_ID.test(input.toUserId)) return { success: false, status: 400, message: accessErrorMessage("REASSIGN_TARGET_REQUIRED") };
  const result = await call<unknown>(`/api/organization/members/${input.fromUserId}/reassign-rfps`, {
    method: "POST",
    body: JSON.stringify({ toUserId: input.toUserId, rfpIds: [input.proposalId] }),
  });
  if (!result.success) return result;
  const count = record(result.data) && typeof result.data.reassignedCount === "number" ? result.data.reassignedCount : 0;
  if (count === 0) {
    return { success: false, code: "RFPS_NOT_OWNED_BY_MEMBER", message: accessErrorMessage("RFPS_NOT_OWNED_BY_MEMBER") };
  }
  return { success: true, data: { reassignedCount: count } };
}
