/** @jest-environment node */

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));

import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { createBulkInvitationsAction, resendInvitationAction } from "./invitations";
import {
  changeMemberRoleAction,
  getOrganizationAccessAction,
  reassignMemberRfpsAction,
} from "./organizationMembers";
import { setTeamManagerAction } from "./teams";

const mockedFetch = jest.mocked(authenticatedBackendFetch);

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  }) as unknown as Response;

describe("organization actions", () => {
  beforeEach(() => mockedFetch.mockReset());

  test("an Owner is recognised from their own row in the members list", async () => {
    mockedFetch
      .mockResolvedValueOnce(jsonResponse(200, { success: true, user: { _id: "u1" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { members: [{ userId: "u1", role: "owner" }] } }));
    const result = await getOrganizationAccessAction();
    expect(result.data).toEqual({ userId: "u1", role: "owner", canManageMembers: true, canInvite: true });
  });

  test("a Team Manager is someone the members API refuses but the invitations API answers", async () => {
    mockedFetch
      .mockResolvedValueOnce(jsonResponse(200, { success: true, user: { _id: "u2" } }))
      .mockResolvedValueOnce(jsonResponse(403, { success: false, code: "FORBIDDEN" }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, invitations: [] }));
    const result = await getOrganizationAccessAction();
    expect(result.data).toEqual({ userId: "u2", role: "team_manager", canManageMembers: false, canInvite: true });
  });

  test("everyone else gets read-only access", async () => {
    mockedFetch
      .mockResolvedValueOnce(jsonResponse(200, { success: true, user: { _id: "u3" } }))
      .mockResolvedValueOnce(jsonResponse(403, { success: false }))
      .mockResolvedValueOnce(jsonResponse(403, { success: false, code: "INVITE_NOT_ALLOWED" }));
    const result = await getOrganizationAccessAction();
    expect(result.data).toMatchObject({ canManageMembers: false, canInvite: false });
  });

  test("role changes send the version and surface OWNER_HAS_RFPS details", async () => {
    mockedFetch.mockResolvedValueOnce(
      jsonResponse(409, { success: false, code: "OWNER_HAS_RFPS", message: "x", ownedRfpCount: 4 }),
    );
    const result = await changeMemberRoleAction("abc", "viewer", 7);
    expect(String(mockedFetch.mock.calls[0][0])).toMatch(/\/api\/organization\/members\/abc\/role$/);
    expect(mockedFetch.mock.calls[0][1]).toMatchObject({ method: "PATCH", body: JSON.stringify({ role: "viewer", version: 7 }) });
    expect(result).toMatchObject({ success: false, status: 409, code: "OWNER_HAS_RFPS", details: { ownedRfpCount: 4 } });
  });

  test("reassignment posts the receiving member", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(200, { success: true, data: { reassignedCount: 3, rfpIds: [] } }));
    const result = await reassignMemberRfpsAction("from", "to");
    expect(String(mockedFetch.mock.calls[0][0])).toMatch(/\/members\/from\/reassign-rfps$/);
    expect(mockedFetch.mock.calls[0][1]).toMatchObject({ body: JSON.stringify({ toUserId: "to" }) });
    expect(result.data).toEqual({ reassignedCount: 3 });
  });

  test("resend cooldown and Retry-After reach the UI as retryAfterSeconds", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(429, { success: false, code: "INVITATION_RESEND_COOLDOWN", retryAfterSeconds: 120 }));
    expect((await resendInvitationAction("i1")).details).toMatchObject({ retryAfterSeconds: 120 });
    mockedFetch.mockResolvedValueOnce(jsonResponse(429, { success: false, code: "INVITATION_DAILY_LIMIT", remaining: 2 }, { "Retry-After": "3600" }));
    expect((await createBulkInvitationsAction({ emails: ["a@x.com"], role: "planner" })).details).toEqual({ remaining: 2, retryAfterSeconds: 3600 });
  });

  test("team manager toggles go to the team member route", async () => {
    mockedFetch.mockResolvedValueOnce(jsonResponse(422, { success: false, code: "TEAM_MANAGER_ROLE_REQUIRED", message: "m" }));
    const result = await setTeamManagerAction("t1", "u1", true);
    expect(String(mockedFetch.mock.calls[0][0])).toMatch(/\/api\/v1\/teams\/t1\/members\/u1$/);
    expect(result).toMatchObject({ success: false, status: 422, code: "TEAM_MANAGER_ROLE_REQUIRED" });
  });

  test("a network failure is a failed result, not a throw", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("offline"));
    expect(await changeMemberRoleAction("a", "planner", 1)).toMatchObject({ success: false, code: "NETWORK_ERROR" });
  });
});
