/** @jest-environment node */

jest.mock("@/lib/server/backendClient", () => ({ authenticatedBackendFetch: jest.fn() }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));

import { auth } from "@/auth";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import {
  getRfpAccessAction,
  grantRfpShareAction,
  reassignRfpOwnerAction,
  revokeRfpShareAction,
  setRfpTeamAction,
} from "./rfpSharing";

const mockedFetch = jest.mocked(authenticatedBackendFetch);
const mockedAuth = auth as unknown as jest.Mock;

const RFP = "a".repeat(24);
const OWNER = "b".repeat(24);
const MEMBER = "c".repeat(24);
const TEAM = "d".repeat(24);
const ME = "e".repeat(24);

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

const forbidden = () => jsonResponse(403, { success: false, message: "You don't have permission to perform this action" });

const routeResponses = (routes: Record<string, Response>) => {
  mockedFetch.mockImplementation(async (input) => {
    const url = String(input);
    const match = Object.keys(routes).find((path) => url.endsWith(path));
    return match ? routes[match] : jsonResponse(500, { success: false });
  });
};

const proposal = jsonResponse(200, { success: true, data: { _id: RFP, userId: OWNER, teamId: TEAM, event: { eventName: "Summit" } } });

describe("getRfpAccessAction", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedAuth.mockResolvedValue({ user: { _id: ME } });
  });

  test("an Owner/Admin gets shares, the member directory and teams", async () => {
    routeResponses({
      [`/api/proposals/${RFP}`]: proposal,
      [`/api/v1/proposals/${RFP}/shares`]: jsonResponse(200, { success: true, data: [{ userId: MEMBER, permission: "edit", grantedBy: ME, memberActive: false }] }),
      "/api/organization/members": jsonResponse(200, { success: true, data: { members: [{ userId: MEMBER, name: "Pat", email: "pat@example.test", role: "planner", roles: ["planner"], status: "active" }] } }),
      "/api/v1/teams": jsonResponse(200, { success: true, data: [{ id: TEAM, name: "East", archived: false, members: [] }] }),
    });
    const result = await getRfpAccessAction(RFP);
    expect(result).toEqual({
      success: true,
      data: {
        proposalId: RFP,
        title: "Summit",
        viewerUserId: ME,
        ownerUserId: OWNER,
        teamId: TEAM,
        shares: [{ userId: MEMBER, permission: "edit", grantedBy: ME, memberActive: false, createdAt: undefined, updatedAt: undefined }],
        directory: [{ userId: MEMBER, name: "Pat", email: "pat@example.test", role: "planner", roles: ["planner"], status: "active" }],
        teams: [{ id: TEAM, name: "East", archived: false }],
      },
    });
  });

  test("403s from shares and members mean 'not allowed', not an error", async () => {
    routeResponses({
      [`/api/proposals/${RFP}`]: proposal,
      [`/api/v1/proposals/${RFP}/shares`]: jsonResponse(403, { success: false, code: "SHARE_NOT_ALLOWED", message: "x" }),
      "/api/organization/members": forbidden(),
      "/api/v1/teams": jsonResponse(200, { success: true, data: [{ id: TEAM, name: "East" }] }),
    });
    const result = await getRfpAccessAction(RFP);
    expect(result.success && result.data).toMatchObject({ shares: null, directory: null, teams: [{ id: TEAM, name: "East" }] });
  });

  test("a proposal the member can't see is reported with a sentence and its status", async () => {
    routeResponses({ [`/api/proposals/${RFP}`]: jsonResponse(404, { success: false, message: "Proposal not found" }) });
    await expect(getRfpAccessAction(RFP)).resolves.toMatchObject({ success: false, status: 404, message: "We couldn't find that. It may have been removed." });
  });

  test("rejects a malformed id without calling the backend", async () => {
    await expect(getRfpAccessAction("../etc")).resolves.toMatchObject({ success: false, status: 404 });
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});

describe("share mutations", () => {
  beforeEach(() => mockedFetch.mockReset());

  test("grants with PUT and the permission, returning the updated list", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: [{ userId: MEMBER, permission: "view", grantedBy: ME, memberActive: true }] }));
    const result = await grantRfpShareAction(RFP, MEMBER, "view");
    expect(String(mockedFetch.mock.calls[0][0])).toMatch(new RegExp(`/api/v1/proposals/${RFP}/shares/${MEMBER}$`));
    expect(mockedFetch.mock.calls[0][1]).toMatchObject({ method: "PUT", body: JSON.stringify({ permission: "view" }), cache: "no-store" });
    expect(result).toMatchObject({ success: true, data: [{ userId: MEMBER, permission: "view" }] });
  });

  test("maps 422 VIEWER_VIEW_ONLY to a human message", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(422, { success: false, code: "VIEWER_VIEW_ONLY", message: "Viewers can only be given view access." }));
    await expect(grantRfpShareAction(RFP, MEMBER, "edit")).resolves.toEqual({
      success: false, status: 422, code: "VIEWER_VIEW_ONLY", message: "Viewers can only be given View access.",
    });
  });

  test("revokes with DELETE", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: [] }));
    await expect(revokeRfpShareAction(RFP, MEMBER)).resolves.toEqual({ success: true, data: [] });
    expect(mockedFetch.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
  });
});

describe("team and owner", () => {
  beforeEach(() => mockedFetch.mockReset());

  test("sets the team through PUT /api/proposals/:id, and null clears it", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { _id: RFP, teamId: null } }));
    await expect(setRfpTeamAction(RFP, null)).resolves.toEqual({ success: true, data: { teamId: null } });
    expect(String(mockedFetch.mock.calls[0][0])).toMatch(new RegExp(`/api/proposals/${RFP}$`));
    expect(mockedFetch.mock.calls[0][1]).toMatchObject({ method: "PUT", body: JSON.stringify({ teamId: null }) });
  });

  test("maps 422 TEAM_NOT_ASSIGNABLE", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(422, { success: false, code: "TEAM_NOT_ASSIGNABLE", message: "raw" }));
    await expect(setRfpTeamAction(RFP, TEAM)).resolves.toMatchObject({
      success: false, code: "TEAM_NOT_ASSIGNABLE", message: "That team can't be used for this proposal. Pick an active team, or No team.",
    });
  });

  test("reassigns one proposal through the members route with rfpIds", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { reassignedCount: 1, rfpIds: [RFP] } }));
    await expect(reassignRfpOwnerAction({ proposalId: RFP, fromUserId: OWNER, toUserId: MEMBER })).resolves.toEqual({ success: true, data: { reassignedCount: 1 } });
    expect(String(mockedFetch.mock.calls[0][0])).toMatch(new RegExp(`/api/organization/members/${OWNER}/reassign-rfps$`));
    expect(mockedFetch.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify({ toUserId: MEMBER, rfpIds: [RFP] }) });
  });

  test("a reassignment that moved nothing is a failure, and refusals are mapped", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { reassignedCount: 0, rfpIds: [] } }));
    await expect(reassignRfpOwnerAction({ proposalId: RFP, fromUserId: OWNER, toUserId: MEMBER })).resolves.toMatchObject({ success: false, code: "RFPS_NOT_OWNED_BY_MEMBER" });

    mockedFetch.mockResolvedValue(jsonResponse(409, { success: false, code: "REASSIGN_TARGET_INELIGIBLE", message: "raw" }));
    await expect(reassignRfpOwnerAction({ proposalId: RFP, fromUserId: OWNER, toUserId: MEMBER })).resolves.toMatchObject({
      success: false, message: "Proposals can only go to an active member who isn't a Viewer.",
    });
  });
});
