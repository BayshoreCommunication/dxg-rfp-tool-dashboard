// Pure rules for the RFP sharing, team and reassignment screens (ORG-202, ORG-207, ORG-210).
// The backend enforces every rule; this module only keeps the UI honest about what the
// signed-in member can do and turns backend error codes into plain sentences.

export type SharePermission = "view" | "edit";

export type RfpShare = {
  userId: string;
  permission: SharePermission;
  grantedBy: string;
  memberActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type DirectoryMember = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string | null;
  roles: string[];
  status: string;
};

export type TeamOption = { id: string; name: string; archived?: boolean };

export type RfpAccessSnapshot = {
  proposalId: string;
  title: string;
  viewerUserId: string | null;
  ownerUserId: string | null;
  teamId: string | null;
  // null when the signed-in member may not share this RFP (the shares route answered 403).
  shares: RfpShare[] | null;
  // null unless the signed-in member is an Owner or Admin (the member list is theirs only).
  directory: DirectoryMember[] | null;
  teams: TeamOption[];
};

export type RfpCapabilities = {
  canShare: boolean;
  canBrowseMembers: boolean;
  canChangeTeam: boolean;
  canReassign: boolean;
};

const EDIT_SHARE_ROLES = ["owner", "organization_admin", "team_manager", "planner"];
const SHAREABLE_ROLES = [...EDIT_SHARE_ROLES, "viewer"];
const RFP_OWNER_ROLES = EDIT_SHARE_ROLES;

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  organization_admin: "Admin",
  team_manager: "Team Manager",
  planner: "Planner",
  viewer: "Viewer",
};

export const roleLabel = (member: Pick<DirectoryMember, "role" | "roles">): string => {
  const role = member.role ?? member.roles.find((value) => value in ROLE_LABELS) ?? null;
  return role ? ROLE_LABELS[role] ?? "Member" : "Member";
};

const rolesOf = (member: Pick<DirectoryMember, "role" | "roles">) =>
  member.role ? [member.role, ...member.roles] : member.roles;

export const isViewerOnly = (member: Pick<DirectoryMember, "role" | "roles">): boolean => {
  const roles = rolesOf(member);
  return roles.includes("viewer") && !roles.some((role) => EDIT_SHARE_ROLES.includes(role));
};

export const canOwnRfps = (member: Pick<DirectoryMember, "role" | "roles">): boolean =>
  rolesOf(member).some((role) => RFP_OWNER_ROLES.includes(role));

// The shares route answers 200 exactly when the policy's "share" decision allows (the RFP's
// owner, a manager of its team, or an Owner/Admin). The same people may edit the RFP, so they
// may also change its team. Single-RFP reassignment only exists on the Owner/Admin members API.
export const deriveCapabilities = (snapshot: Pick<RfpAccessSnapshot, "shares" | "directory" | "ownerUserId">): RfpCapabilities => {
  const canShare = snapshot.shares !== null;
  const canBrowseMembers = snapshot.directory !== null;
  return {
    canShare,
    canBrowseMembers,
    canChangeTeam: canShare,
    canReassign: canBrowseMembers && Boolean(snapshot.ownerUserId),
  };
};

export const permissionOptions = (member: Pick<DirectoryMember, "role" | "roles"> | undefined): SharePermission[] =>
  member && isViewerOnly(member) ? ["view"] : ["view", "edit"];

// Members who can be added to the share list: active, in a role a share reaches, not the
// owner and not already on the list.
export const shareCandidates = (snapshot: Pick<RfpAccessSnapshot, "directory" | "shares" | "ownerUserId">): DirectoryMember[] => {
  if (!snapshot.directory) return [];
  const shared = new Set((snapshot.shares ?? []).map((share) => share.userId));
  return snapshot.directory.filter((member) =>
    member.status === "active"
    && member.userId !== snapshot.ownerUserId
    && !shared.has(member.userId)
    && rolesOf(member).some((role) => SHAREABLE_ROLES.includes(role)));
};

// Members who can receive the RFP: active and allowed to own RFPs (not Viewers).
export const reassignCandidates = (snapshot: Pick<RfpAccessSnapshot, "directory" | "ownerUserId">): DirectoryMember[] =>
  (snapshot.directory ?? []).filter((member) =>
    member.status === "active" && member.userId !== snapshot.ownerUserId && canOwnRfps(member));

export const memberName = (
  userId: string | null,
  snapshot: Pick<RfpAccessSnapshot, "directory" | "viewerUserId">,
): string => {
  if (!userId) return "Unknown member";
  const member = snapshot.directory?.find((item) => item.userId === userId);
  const label = member?.name?.trim() || member?.email?.trim();
  if (userId === snapshot.viewerUserId) return label ? `${label} (you)` : "You";
  if (label) return label;
  return `Member …${userId.slice(-4)}`;
};

export const memberEmail = (userId: string, snapshot: Pick<RfpAccessSnapshot, "directory">): string | null =>
  snapshot.directory?.find((item) => item.userId === userId)?.email ?? null;

export const NO_TEAM = "";

export const teamLabel = (teamId: string | null, teams: TeamOption[]): string => {
  if (!teamId) return "No team";
  const team = teams.find((item) => item.id === teamId);
  if (!team) return "Archived team";
  return team.archived ? `${team.name} (archived)` : team.name;
};

// Active teams to choose from, plus the RFP's current team when it is archived, so the
// picker can still show what is selected (resending it is accepted by the backend).
export const teamChoices = (teamId: string | null, teams: TeamOption[]): Array<{ id: string; label: string }> => {
  const active = teams.filter((team) => !team.archived).map((team) => ({ id: team.id, label: team.name }));
  if (!teamId || active.some((team) => team.id === teamId)) return active;
  return [...active, { id: teamId, label: teamLabel(teamId, teams) }];
};

const MESSAGES: Record<string, string> = {
  // Sharing (ORG-208)
  PROPOSAL_NOT_FOUND: "This RFP no longer exists, or it isn't available to you.",
  SHARE_NOT_ALLOWED: "Only the RFP's owner, a manager of its team, or an Owner or Admin can share it.",
  MEMBER_NOT_FOUND: "That person isn't a member of your organization.",
  MEMBER_INACTIVE: "That member is deactivated, so they can't be given access.",
  VIEWER_VIEW_ONLY: "Viewers can only be given View access.",
  SHARE_TARGET_IS_OWNER: "That member already owns this RFP.",
  SHARE_NOT_FOUND: "This RFP is no longer shared with that member.",
  INVALID_SHARE_PERMISSION: "Choose View or Edit.",
  // Team (ORG-202)
  TEAM_NOT_ASSIGNABLE: "That team can't be used for this RFP. Pick an active team, or No team.",
  PROPOSAL_ACCESS_DENIED: "You don't have permission to change this RFP.",
  // Reassignment (ORG-207)
  REASSIGN_TARGET_REQUIRED: "Choose the member who should own this RFP.",
  REASSIGN_TARGET_NOT_FOUND: "The member you picked is no longer in your organization.",
  REASSIGN_TO_SELF: "That member already owns this RFP. Choose someone else.",
  REASSIGN_TARGET_INELIGIBLE: "RFPs can only go to an active member who isn't a Viewer.",
  RFPS_NOT_OWNED_BY_MEMBER: "This RFP's owner changed in the meantime. Refresh and try again.",
  INVALID_RFP_SELECTION: "This RFP couldn't be selected for reassignment.",
  MEMBER_REMOVED: "That member has been removed from your organization.",
  FORBIDDEN: "Only Owners and Admins can do that.",
  // Shared
  AUTHENTICATION_REQUIRED: "Your session has ended. Sign in again to continue.",
  STALE_VERSION: "Someone else just changed this. Refresh and try again.",
};

export const accessErrorMessage = (code: string | undefined, status?: number): string => {
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (status === 401) return MESSAGES.AUTHENTICATION_REQUIRED;
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find that. It may have been removed.";
  if (status === 429) return "Too many changes in a short time. Wait a moment and try again.";
  return "That didn't work. Please try again.";
};
