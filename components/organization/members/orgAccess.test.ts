import {
  canBeTeamManager,
  filterInvitations,
  filterMembers,
  invitableRoles,
  inviteTeamRequired,
  memberPermissions,
  reassignTargets,
  roleWithArticle,
} from "./orgAccess";
import type { Invitation, OrgAccess, OrgMember } from "./types";

const member = (overrides: Partial<OrgMember>): OrgMember => ({
  userId: "u",
  membershipId: "m",
  name: "Name",
  email: "name@x.com",
  role: "planner",
  roles: ["planner"],
  teams: [],
  status: "active",
  lastSignedInAt: null,
  version: 1,
  joinedAt: null,
  ...overrides,
});

const owner: OrgAccess = { userId: "owner", role: "owner", canManageMembers: true, canInvite: true };
const admin: OrgAccess = { userId: "admin", role: "organization_admin", canManageMembers: true, canInvite: true };
const manager: OrgAccess = { userId: "tm", role: "team_manager", canManageMembers: false, canInvite: true };
const planner: OrgAccess = { userId: "p", role: null, canManageMembers: false, canInvite: false };

describe("memberPermissions", () => {
  it("lets an Admin change a planner's role and teams, and deactivate them, but not transfer ownership", () => {
    expect(memberPermissions(admin, member({ userId: "x" }))).toEqual({
      changeRole: true, changeTeams: true, deactivate: true, reactivate: false, transferOwnership: false,
    });
  });

  it("only lets the Owner transfer ownership, to another active member", () => {
    expect(memberPermissions(owner, member({ userId: "x" })).transferOwnership).toBe(true);
    expect(memberPermissions(owner, member({ userId: "owner", role: "owner" })).transferOwnership).toBe(false);
    expect(memberPermissions(owner, member({ userId: "x", status: "deactivated" })).transferOwnership).toBe(false);
  });

  it("never offers role change or deactivation for the Owner or for yourself", () => {
    const onOwner = memberPermissions(admin, member({ userId: "owner", role: "owner", roles: ["owner"] }));
    expect(onOwner.changeRole).toBe(false);
    expect(onOwner.deactivate).toBe(false);
    const onSelf = memberPermissions(admin, member({ userId: "admin", role: "organization_admin" }));
    expect(onSelf.changeRole).toBe(false);
    expect(onSelf.deactivate).toBe(false);
  });

  it("offers reactivation only for deactivated members", () => {
    const p = memberPermissions(admin, member({ userId: "x", status: "deactivated" }));
    expect(p.reactivate).toBe(true);
    expect(p.deactivate).toBe(false);
    expect(p.changeRole).toBe(false);
  });

  it("gives Team Managers and Planners no member actions", () => {
    expect(Object.values(memberPermissions(manager, member({ userId: "x" }))).some(Boolean)).toBe(false);
    expect(Object.values(memberPermissions(planner, member({ userId: "x" }))).some(Boolean)).toBe(false);
  });
});

describe("invite gating", () => {
  it("lets Admins invite any role without a team", () => {
    expect(invitableRoles(admin)).toEqual(["organization_admin", "team_manager", "planner", "viewer"]);
    expect(inviteTeamRequired(admin)).toBe(false);
  });

  it("limits Team Managers to Planners and Viewers in a team", () => {
    expect(invitableRoles(manager)).toEqual(["planner", "viewer"]);
    expect(inviteTeamRequired(manager)).toBe(true);
  });

  it("offers nothing to members who can't invite", () => {
    expect(invitableRoles(planner)).toEqual([]);
    expect(invitableRoles(null)).toEqual([]);
  });
});

describe("team and reassignment rules", () => {
  it("only Team Managers can manage a team", () => {
    expect(canBeTeamManager(member({ role: "team_manager", roles: ["team_manager"] }))).toBe(true);
    expect(canBeTeamManager(member({ role: "planner" }))).toBe(false);
    expect(canBeTeamManager(undefined)).toBe(false);
  });

  it("reassigns RFPs only to other active non-Viewers", () => {
    const list = [
      member({ userId: "from" }),
      member({ userId: "a", role: "planner" }),
      member({ userId: "v", role: "viewer" }),
      member({ userId: "d", status: "deactivated" }),
      member({ userId: "o", role: "owner" }),
    ];
    expect(reassignTargets(list, "from").map((m) => m.userId)).toEqual(["a", "o"]);
  });

  it("filters by search, role and status", () => {
    const list = [
      member({ userId: "1", name: "Ana Planner", email: "ana@x.com" }),
      member({ userId: "2", name: "Bo", email: "bo@east.com", role: "viewer", status: "deactivated" }),
    ];
    expect(filterMembers(list, "EAST", "", "").map((m) => m.userId)).toEqual(["2"]);
    expect(filterMembers(list, "", "planner", "").map((m) => m.userId)).toEqual(["1"]);
    expect(filterMembers(list, "", "", "deactivated").map((m) => m.userId)).toEqual(["2"]);
  });

  it("filters pending invitations as Invited rows", () => {
    const invite = (id: string, email: string, role: Invitation["role"]): Invitation => ({
      id, email, role, teamId: null, invitedBy: "o", status: "pending", expiresAt: "", createdAt: "",
      acceptedAt: null, revokedAt: null, emailDelivery: "sent",
    });
    const list = [invite("a", "sam@east.com", "planner"), invite("b", "kim@west.com", "viewer")];
    expect(filterInvitations(list, "", "", "").map((i) => i.id)).toEqual(["a", "b"]);
    expect(filterInvitations(list, "", "", "invited").map((i) => i.id)).toEqual(["a", "b"]);
    expect(filterInvitations(list, "", "", "active")).toEqual([]);
    expect(filterInvitations(list, "", "", "deactivated")).toEqual([]);
    expect(filterInvitations(list, "WEST", "", "").map((i) => i.id)).toEqual(["b"]);
    expect(filterInvitations(list, "", "planner", "").map((i) => i.id)).toEqual(["a"]);
  });

  it("uses the right article", () => {
    expect(roleWithArticle("organization_admin")).toBe("an Admin");
    expect(roleWithArticle("planner")).toBe("a Planner");
  });
});
