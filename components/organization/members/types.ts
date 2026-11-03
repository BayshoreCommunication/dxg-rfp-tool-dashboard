// Shapes returned by the backend organization APIs (docs/API.md "Organization members",
// "Teams", "Organization invitations").

export type CustomerRole = "owner" | "organization_admin" | "team_manager" | "planner" | "viewer";
export type InvitableRole = Exclude<CustomerRole, "owner">;

export type TeamRef = { id: string; name: string };

export type OrgMember = {
  userId: string;
  membershipId: string;
  name: string | null;
  email: string | null;
  role: CustomerRole | null;
  roles: string[];
  teams: TeamRef[];
  status: "active" | "deactivated" | "invited" | "removed" | string;
  lastSignedInAt: string | null;
  version: number;
  joinedAt: string | null;
};

export type TeamMembership = { userId: string; isManager: boolean };

// Owners and Admins get every team with members; everyone else gets { id, name } of active teams.
export type Team = {
  id: string;
  name: string;
  archived?: boolean;
  archivedAt?: string | null;
  createdAt?: string;
  members?: TeamMembership[];
};

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type Invitation = {
  id: string;
  email: string;
  role: InvitableRole;
  teamId: string | null;
  invitedBy: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  emailDelivery: "queued" | "sending" | "sent" | "failed";
};

export type BulkInviteRow =
  | { row: number; email: string; outcome: "invited"; invitation: Invitation }
  | { row: number; email: string; outcome: "refused"; code: string; message: string };

export type BulkInviteResult = {
  summary: { total: number; invited: number; refused: number };
  rows: BulkInviteRow[];
};

// What the signed-in user may do here, worked out from what the backend lets them read.
export type OrgAccess = {
  userId: string | null;
  role: CustomerRole | null;
  // Owner or Admin: the members API answered.
  canManageMembers: boolean;
  // Owner, Admin, or a Team Manager the invitations API answers.
  canInvite: boolean;
};
