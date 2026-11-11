import type { CustomerRole } from "./types";

// What each customer role can do, in words a member can act on. This is a description only: the
// backend decides every request. Each row names the backend rule it was read from, so when one of
// those rules changes this file is the single place to update (roleAccess.test.ts fails if a role
// or a value is missing).
//
// Sources, all in dxg-rfp-tool-backend:
//   policy   src/modules/identity/domain/authorizationPolicy.ts (what a role may do)
//   scope    src/modules/identity/domain/rfpAccessPolicy.ts (which proposals a role reaches)
//   members  src/modules/organizationMembers/domain/memberPolicy.ts
//   invites  src/modules/invitations/domain/invitationRules.ts
//   routes   routes/*.ts (the guard on each endpoint), described in docs/API.md

// Highest first: the order of the table's columns and of every role list.
export const ROLE_ORDER: readonly CustomerRole[] = ["owner", "organization_admin", "team_manager", "planner", "viewer"];

// One short line per role. Shown next to the role picker when inviting someone or changing a
// role (and in the onboarding invite step), so keep each under about 70 characters.
export const ROLE_SUMMARIES: Record<CustomerRole, string> = {
  owner: "Full control of the organization, including transferring ownership.",
  organization_admin: "Manages people, teams, security and every proposal.",
  team_manager: "Works on their own proposals and those of teams they manage.",
  planner: "Creates and works on their own proposals and ones shared with them.",
  viewer: "Read-only: sees only the proposals shared with them.",
};

export type AccessLevel = "yes" | "limited" | "no";

// "limited" always says what the limit is, in `note`.
export type RoleAccessCell = { level: "yes" | "no"; note?: string } | { level: "limited"; note: string };

export type RoleAccessRow = {
  id: string;
  capability: string;
  // Applies to every role that has the capability (a setting or a plan it depends on).
  note?: string;
  // Where the rule lives in the backend. Not shown to members.
  source: string;
  access: Record<CustomerRole, RoleAccessCell>;
};

export type RoleAccessGroup = { id: string; title: string; rows: RoleAccessRow[] };

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = { yes: "Yes", limited: "Limited", no: "No" };

const yes: RoleAccessCell = { level: "yes" };
const no: RoleAccessCell = { level: "no" };
const limited = (note: string): RoleAccessCell => ({ level: "limited", note });

// The usual shapes: Owner and Admin only, and everyone except Viewers.
const adminsOnly: Record<CustomerRole, RoleAccessCell> = { owner: yes, organization_admin: yes, team_manager: no, planner: no, viewer: no };
const allButViewer: Record<CustomerRole, RoleAccessCell> = { owner: yes, organization_admin: yes, team_manager: yes, planner: yes, viewer: no };

export const ROLE_ACCESS_GROUPS: readonly RoleAccessGroup[] = [
  {
    id: "proposals",
    title: "Proposals",
    rows: [
      {
        id: "proposal-see",
        capability: "See proposals, in lists and on the dashboard",
        source: "scope: relationshipGrants, rfpListScope; routes/rfpDashboardRoute.ts (proposal:read)",
        access: {
          owner: { level: "yes", note: "Every proposal in the organization, drafts included" },
          organization_admin: { level: "yes", note: "Every proposal in the organization, drafts included" },
          team_manager: limited("Their own, those of teams they manage, and ones shared with them"),
          planner: limited("Their own, and ones shared with them"),
          viewer: limited("Only ones shared with them"),
        },
      },
      {
        id: "proposal-create",
        capability: "Create a proposal: new, a copy, or from a template",
        note: "Each one counts toward your plan's proposal limit.",
        source: "policy: proposal:write; routes/proposalsRoute.ts POST /, POST /:id/copy; docs/API.md Plans and entitlements",
        access: allButViewer,
      },
      {
        id: "proposal-edit",
        capability: "Edit and publish a proposal, and mark it as awarded",
        source: "policy: proposal:write, proposal:publish; scope: edit (owner, team manager, edit share)",
        access: {
          owner: yes,
          organization_admin: yes,
          team_manager: limited("Their own, those of teams they manage, and ones shared with them for editing"),
          planner: limited("Their own, and ones shared with them for editing"),
          viewer: no,
        },
      },
      {
        id: "proposal-assistant",
        capability: "Use the AI assistant",
        source: "policy: assistant:use",
        access: allButViewer,
      },
      {
        id: "proposal-share",
        capability: "Share a proposal with other members, to view or to edit",
        note: "A Viewer can only ever be given view access.",
        source: "scope: share; routes/rfpSharesRoute.ts; docs/API.md RFP sharing",
        access: {
          owner: yes,
          organization_admin: yes,
          team_manager: limited("Their own, and those of teams they manage"),
          planner: limited("Their own"),
          viewer: no,
        },
      },
      {
        id: "proposal-archive",
        capability: "Archive, restore or permanently delete a proposal",
        source: "scope: archive, delete (not granted by a share); routes/proposalsRoute.ts (proposal:write)",
        access: {
          owner: yes,
          organization_admin: yes,
          team_manager: limited("Their own, and those of teams they manage"),
          planner: limited("Their own"),
          viewer: no,
        },
      },
      {
        id: "proposal-reassign",
        capability: "Move a member's proposals to another owner",
        note: "The new owner must be an active member who isn't a Viewer.",
        source: "routes/organizationMembersRoute.ts POST /members/:userId/reassign-rfps (organization:manage); members: decideReassignment",
        access: adminsOnly,
      },
      {
        id: "vendor-responses-see",
        capability: "See vendor responses",
        note: "Needs a plan that includes vendor responses.",
        source: "policy: vendor-response:read; scope: viewResponses (follows the proposal); docs/API.md Plans and entitlements",
        access: {
          owner: yes,
          organization_admin: yes,
          team_manager: limited("On the proposals they can see"),
          planner: limited("On the proposals they can see"),
          viewer: limited("On the proposals shared with them"),
        },
      },
      {
        id: "template-use",
        capability: "Use templates: save personal ones and start a proposal from one",
        source: "policy: template:use; docs/API.md RFP templates",
        access: allButViewer,
      },
      {
        id: "template-publish",
        capability: "Publish templates for the whole organization",
        source: "policy: template:publish",
        access: adminsOnly,
      },
      {
        id: "vendor-list-read",
        capability: "See the organization's vendor list and pick vendors from it",
        source: "policy: vendor-list:read",
        access: allButViewer,
      },
      {
        id: "vendor-list-write",
        capability: "Add, edit and archive vendors on the vendor list",
        source: "policy: vendor-list:write",
        access: { owner: yes, organization_admin: yes, team_manager: yes, planner: no, viewer: no },
      },
    ],
  },
  {
    id: "people",
    title: "People",
    rows: [
      {
        id: "members-see",
        capability: "See everyone in the organization, with their role, teams and status",
        source: "routes/organizationMembersRoute.ts GET /members (organization:manage)",
        access: adminsOnly,
      },
      {
        id: "members-invite",
        capability: "Invite people",
        note: "Nobody is invited as Owner: that role only moves by ownership transfer.",
        source: "invites: inviteRefusal (allowManagerInvites, MANAGER_INVITABLE_ROLES)",
        access: {
          owner: { level: "yes", note: "Any role except Owner, into any team" },
          organization_admin: { level: "yes", note: "Any role except Owner, into any team" },
          team_manager: limited(
            "Planners and Viewers, into teams they manage, and only when Team Manager invitations are turned on for the organization (off by default)",
          ),
          planner: no,
          viewer: no,
        },
      },
      {
        id: "members-manage",
        capability: "Change a member's role or teams, deactivate or reactivate them",
        note: "The Owner can't be demoted or deactivated, and a member who owns proposals hands them over before being deactivated or becoming a Viewer.",
        source: "members: decideRoleChange, decideDeactivation; routes/organizationMembersRoute.ts (organization:manage)",
        access: adminsOnly,
      },
      {
        id: "access-requests",
        capability: "Approve or deny requests to join the organization",
        source: "routes/accessRequestRoute.ts (organization:manage); docs/API.md Domain-match access requests",
        access: adminsOnly,
      },
      {
        id: "teams-manage",
        capability: "Create, rename and archive teams, and choose who manages a team",
        source: "routes/teamsRoute.ts (organization:manage)",
        access: adminsOnly,
      },
      {
        id: "ownership-transfer",
        capability: "Transfer ownership of the organization",
        source: "members: decideOwnershipTransfer (OWNER_ONLY)",
        access: { owner: yes, organization_admin: no, team_manager: no, planner: no, viewer: no },
      },
    ],
  },
  {
    id: "organization",
    title: "Organization",
    rows: [
      {
        id: "organization-see",
        capability: "See the organization's details and which plan it is on",
        source: "routes/organizationProfileRoute.ts GET /profile, GET /entitlements (any member)",
        access: { owner: yes, organization_admin: yes, team_manager: yes, planner: yes, viewer: yes },
      },
      {
        id: "organization-details",
        capability: "Edit the organization's details: name, type, country and time zone",
        source: "routes/organizationProfileRoute.ts PUT /profile (organization:manage)",
        access: adminsOnly,
      },
      {
        id: "plan-change",
        capability: "Change the plan",
        note: "RFPilot changes plans on request. Contact us to upgrade.",
        source: "docs/API.md Plan management for RFPilot staff (ORG-603): staff only",
        access: { owner: no, organization_admin: no, team_manager: no, planner: no, viewer: no },
      },
    ],
  },
  {
    id: "security",
    title: "Security and support",
    rows: [
      {
        id: "security-own",
        capability: "Manage their own sign-in: two-factor authentication and signed-in sessions",
        source: "routes/twoFactorRoute.ts, routes/authRoute.ts /sessions (any signed-in member)",
        access: { owner: yes, organization_admin: yes, team_manager: yes, planner: yes, viewer: yes },
      },
      {
        id: "security-settings",
        capability: "Change security settings: required two-factor, verified domains and company single sign-on",
        source: "routes/organizationSecurityRoute.ts, routes/organizationSsoRoute.ts (organization:manage)",
        access: adminsOnly,
      },
      {
        id: "security-reset-2fa",
        capability: "Reset a member's two-factor authentication",
        source: "routes/organizationSecurityRoute.ts POST /members/:userId/two-factor/reset (organization:manage)",
        access: adminsOnly,
      },
      {
        id: "support-access",
        capability: "Give RFPilot Support access to a proposal or the whole organization, and take it back",
        note: "Access always has an end date, 30 days at most.",
        source: "routes/supportAccessRoute.ts (organization:manage); scope: grantSupport; docs/API.md Support access grants",
        access: adminsOnly,
      },
      {
        id: "audit-log",
        capability: "Read and export the audit log",
        source: "policy: audit:read; routes/auditLogRoute.ts",
        access: adminsOnly,
      },
    ],
  },
];

// A cell as one plain sentence fragment, for screen readers and for the stacked (phone) layout.
export const accessCellText = (cell: RoleAccessCell): string =>
  cell.note ? `${ACCESS_LEVEL_LABELS[cell.level]}: ${cell.note}` : ACCESS_LEVEL_LABELS[cell.level];

// The member's customer role from their session roles; null when none is readable, so the page
// never names a role it isn't sure of.
export const customerRoleOf = (roles: readonly string[] | null | undefined): CustomerRole | null =>
  ROLE_ORDER.find((role) => roles?.includes(role)) ?? null;
