import type { CustomerRole, Invitation, InvitableRole, OrgAccess, OrgMember } from "./types";

// Role names and what the signed-in user may do. The backend enforces all of this; the UI only
// hides what would be refused so it stays honest.

export const ROLE_LABELS: Record<CustomerRole, string> = {
  owner: "Owner",
  organization_admin: "Admin",
  team_manager: "Team Manager",
  planner: "Planner",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<CustomerRole, string> = {
  owner: "Full control, including billing and ownership.",
  organization_admin: "Manages members, teams, invitations and every RFP.",
  team_manager: "Manages RFPs of the teams they lead.",
  planner: "Creates and works on their own RFPs.",
  viewer: "Reads RFPs shared with them.",
};

export const ASSIGNABLE_ROLES: InvitableRole[] = ["organization_admin", "team_manager", "planner", "viewer"];
const MANAGER_INVITABLE_ROLES: InvitableRole[] = ["planner", "viewer"];

export const roleLabel = (role: string | null | undefined): string =>
  role && role in ROLE_LABELS ? ROLE_LABELS[role as CustomerRole] : "No role";

export const roleWithArticle = (role: string | null | undefined): string => {
  const label = roleLabel(role);
  return `${/^[AEIOU]/.test(label) ? "an" : "a"} ${label}`;
};

export const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  deactivated: "Deactivated",
  invited: "Invited",
  removed: "Removed",
};

export const isOrgAdmin = (access: OrgAccess | null) => Boolean(access?.canManageMembers);
export const isOwner = (access: OrgAccess | null) => access?.role === "owner";

export type MemberPermissions = {
  changeRole: boolean;
  changeTeams: boolean;
  deactivate: boolean;
  reactivate: boolean;
  transferOwnership: boolean;
};

const NONE: MemberPermissions = { changeRole: false, changeTeams: false, deactivate: false, reactivate: false, transferOwnership: false };

// Per-member actions for the signed-in user. The Owner role only moves by ownership transfer, the
// Owner can't be deactivated, and nobody changes their own role or deactivates themselves here.
export const memberPermissions = (access: OrgAccess | null, member: OrgMember): MemberPermissions => {
  if (!access?.canManageMembers || member.status === "removed") return NONE;
  const self = member.userId === access.userId;
  const targetIsOwner = member.role === "owner";
  const active = member.status === "active";
  return {
    changeRole: !self && !targetIsOwner && active,
    changeTeams: active,
    deactivate: !self && !targetIsOwner && active,
    reactivate: member.status === "deactivated",
    transferOwnership: isOwner(access) && !self && active,
  };
};

// Roles the signed-in user can put on an invitation (ORG-203 inviteRefusal).
export const invitableRoles = (access: OrgAccess | null): InvitableRole[] => {
  if (!access?.canInvite) return [];
  return access.canManageMembers ? ASSIGNABLE_ROLES : MANAGER_INVITABLE_ROLES;
};

// Team Managers must invite into one of their teams; Admins may leave the team empty.
export const inviteTeamRequired = (access: OrgAccess | null): boolean => Boolean(access?.canInvite && !access.canManageMembers);

// Only members holding the Team Manager role can be a team's manager.
export const canBeTeamManager = (member: Pick<OrgMember, "role" | "roles"> | undefined | null): boolean =>
  Boolean(member && (member.role === "team_manager" || member.roles?.includes("team_manager")));

// Who can receive a member's RFPs: another active member who isn't a Viewer (ORG-207).
export const reassignTargets = (members: OrgMember[], fromUserId: string): OrgMember[] =>
  members.filter((m) => m.userId !== fromUserId && m.status === "active" && m.role !== null && m.role !== "viewer");

export const memberDisplayName = (member: Pick<OrgMember, "name" | "email"> | undefined | null): string =>
  member?.name?.trim() || member?.email || "Unknown member";

// Search (name or email), role and status filters for the members table.
// Pending invitations are the "Invited" rows of the Users table, filtered the same way.
export const filterInvitations = (invitations: Invitation[], query: string, role: string, status: string): Invitation[] => {
  const q = query.trim().toLowerCase();
  return invitations.filter(
    (invitation) =>
      (!role || invitation.role === role) &&
      (!status || status === "invited") &&
      (!q || invitation.email.toLowerCase().includes(q)),
  );
};

export const filterMembers = (members: OrgMember[], query: string, role: string, status: string): OrgMember[] => {
  const q = query.trim().toLowerCase();
  return members.filter(
    (member) =>
      (!role || member.role === role) &&
      (!status || member.status === status) &&
      (!q || [member.name, member.email].some((value) => value?.toLowerCase().includes(q))),
  );
};
