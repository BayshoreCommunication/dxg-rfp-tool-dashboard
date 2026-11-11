import {
  accessErrorMessage,
  deriveCapabilities,
  memberName,
  permissionOptions,
  reassignCandidates,
  shareCandidates,
  teamChoices,
  teamLabel,
  type DirectoryMember,
  type RfpAccessSnapshot,
} from "./rfpAccessModel";

const member = (userId: string, role: string, extra: Partial<DirectoryMember> = {}): DirectoryMember => ({
  userId, name: `${role} person`, email: `${role}@example.test`, role, roles: [role], status: "active", ...extra,
});

const OWNER = "a".repeat(24);
const PLANNER = "b".repeat(24);
const VIEWER = "c".repeat(24);
const GONE = "d".repeat(24);
const ADMIN = "e".repeat(24);

const snapshot = (overrides: Partial<RfpAccessSnapshot> = {}): RfpAccessSnapshot => ({
  proposalId: "f".repeat(24),
  title: "Annual summit",
  viewerUserId: ADMIN,
  ownerUserId: OWNER,
  teamId: null,
  shares: [],
  directory: [
    member(OWNER, "planner"),
    member(PLANNER, "planner"),
    member(VIEWER, "viewer"),
    member(GONE, "planner", { status: "deactivated" }),
    member(ADMIN, "organization_admin"),
  ],
  teams: [],
  ...overrides,
});

describe("deriveCapabilities", () => {
  test("an Owner or Admin may share, change the team and reassign", () => {
    expect(deriveCapabilities(snapshot())).toEqual({ canShare: true, canBrowseMembers: true, canChangeTeam: true, canReassign: true });
  });

  test("a proposal owner or team manager may share and change the team but not reassign (no member API for them)", () => {
    expect(deriveCapabilities(snapshot({ directory: null }))).toEqual({ canShare: true, canBrowseMembers: false, canChangeTeam: true, canReassign: false });
  });

  test("someone the proposal was only shared with gets no actions", () => {
    expect(deriveCapabilities(snapshot({ shares: null, directory: null }))).toEqual({ canShare: false, canBrowseMembers: false, canChangeTeam: false, canReassign: false });
  });

  test("reassignment needs a known owner", () => {
    expect(deriveCapabilities(snapshot({ ownerUserId: null })).canReassign).toBe(false);
  });
});

describe("member choices", () => {
  test("share candidates exclude the owner, existing shares and inactive members", () => {
    const ids = shareCandidates(snapshot({ shares: [{ userId: PLANNER, permission: "view", grantedBy: ADMIN, memberActive: true }] }))
      .map((item) => item.userId);
    expect(ids).toEqual([VIEWER, ADMIN]);
  });

  test("Viewers can only be given View", () => {
    expect(permissionOptions(member(VIEWER, "viewer"))).toEqual(["view"]);
    expect(permissionOptions(member(PLANNER, "planner"))).toEqual(["view", "edit"]);
    expect(permissionOptions(undefined)).toEqual(["view", "edit"]);
  });

  test("reassignment targets are active members who can own proposals, other than the owner", () => {
    expect(reassignCandidates(snapshot()).map((item) => item.userId)).toEqual([PLANNER, ADMIN]);
  });

  test("names fall back to email, then a short id, and mark the signed-in member", () => {
    expect(memberName(PLANNER, snapshot())).toBe("planner person");
    expect(memberName(ADMIN, snapshot())).toBe("organization_admin person (you)");
    expect(memberName(PLANNER, snapshot({ directory: null }))).toBe("Member …bbbb");
    expect(memberName(ADMIN, snapshot({ directory: null }))).toBe("You");
  });
});

describe("teams", () => {
  const teams = [{ id: "t1", name: "East" }, { id: "t2", name: "West", archived: true }];

  test("labels the current team, including archived or unknown teams", () => {
    expect(teamLabel(null, teams)).toBe("No team");
    expect(teamLabel("t1", teams)).toBe("East");
    expect(teamLabel("t2", teams)).toBe("West (archived)");
    expect(teamLabel("t9", teams)).toBe("Archived team");
  });

  test("offers active teams plus the current archived one", () => {
    expect(teamChoices(null, teams)).toEqual([{ id: "t1", label: "East" }]);
    expect(teamChoices("t2", teams)).toEqual([{ id: "t1", label: "East" }, { id: "t2", label: "West (archived)" }]);
  });
});

describe("accessErrorMessage", () => {
  test.each([
    ["VIEWER_VIEW_ONLY", "Viewers can only be given View access."],
    ["TEAM_NOT_ASSIGNABLE", "That team can't be used for this proposal. Pick an active team, or No team."],
    ["SHARE_NOT_ALLOWED", "Only the proposal's owner, a manager of its team, or an Owner or Admin can share it."],
    ["MEMBER_INACTIVE", "That member is deactivated, so they can't be given access."],
    ["REASSIGN_TARGET_INELIGIBLE", "Proposals can only go to an active member who isn't a Viewer."],
  ])("maps %s to a sentence", (code, message) => {
    expect(accessErrorMessage(code, 422)).toBe(message);
  });

  test("falls back on the status and never shows the raw code", () => {
    expect(accessErrorMessage("SOMETHING_NEW", 403)).toBe("You don't have permission to do that.");
    expect(accessErrorMessage(undefined, 500)).toBe("That didn't work. Please try again.");
    expect(accessErrorMessage("SOMETHING_NEW", 500)).not.toContain("SOMETHING_NEW");
  });
});
