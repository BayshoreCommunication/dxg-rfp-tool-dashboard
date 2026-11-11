import { ROLE_LABELS } from "./orgAccess";
import {
  ACCESS_LEVEL_LABELS,
  ROLE_ACCESS_GROUPS,
  ROLE_ORDER,
  ROLE_SUMMARIES,
  accessCellText,
  customerRoleOf,
  type RoleAccessRow,
} from "./roleAccess";
import type { CustomerRole } from "./types";

// The role guide must stay complete: every customer role, in every row, with a value. Adding a
// role to ROLE_LABELS (or a row to the table) without filling it in fails here.

const ROLES = Object.keys(ROLE_LABELS) as CustomerRole[];
const rows: RoleAccessRow[] = ROLE_ACCESS_GROUPS.flatMap((group) => group.rows);
const byId = (id: string) => {
  const row = rows.find((entry) => entry.id === id);
  if (!row) throw new Error(`No row ${id}`);
  return row;
};
const levels = (id: string) => ROLES.map((role) => byId(id).access[role].level);

describe("role access guide data", () => {
  it("covers exactly the customer roles, highest first", () => {
    expect([...ROLE_ORDER]).toEqual(["owner", "organization_admin", "team_manager", "planner", "viewer"]);
    expect([...ROLE_ORDER].sort()).toEqual([...ROLES].sort());
  });

  it("has a short summary for every role", () => {
    for (const role of ROLES) {
      expect(ROLE_SUMMARIES[role]?.trim()).toBeTruthy();
      expect(ROLE_SUMMARIES[role].length).toBeLessThanOrEqual(80);
    }
    expect(Object.keys(ROLE_SUMMARIES).sort()).toEqual([...ROLES].sort());
  });

  it("groups the rows as Proposals, People, Organization, Security and support", () => {
    expect(ROLE_ACCESS_GROUPS.map((group) => group.title)).toEqual(["Proposals", "People", "Organization", "Security and support"]);
    for (const group of ROLE_ACCESS_GROUPS) expect(group.rows.length).toBeGreaterThan(0);
  });

  it.each(rows.map((row) => [row.id, row] as const))("row %s has a value for every role and nothing extra", (_id, row) => {
    expect(Object.keys(row.access).sort()).toEqual([...ROLES].sort());
    for (const role of ROLES) {
      const cell = row.access[role];
      expect(cell).toBeDefined();
      expect(Object.keys(ACCESS_LEVEL_LABELS)).toContain(cell.level);
      // A limit is always spelled out; colour or an icon alone never carries it.
      if (cell.level === "limited") expect(cell.note?.trim()).toBeTruthy();
      expect(accessCellText(cell)).toMatch(/^(Yes|Limited|No)/);
    }
    expect(row.capability.trim()).toBeTruthy();
    // Every row names the backend rule it was read from.
    expect(row.source.trim()).toBeTruthy();
  });

  it("has unique row ids", () => {
    const ids = rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("says Proposal, never RFP, in everything a member reads", () => {
    const shown = [
      ...Object.values(ROLE_SUMMARIES),
      ...ROLE_ACCESS_GROUPS.map((group) => group.title),
      ...rows.flatMap((row) => [row.capability, row.note ?? "", ...ROLES.map((role) => row.access[role].note ?? "")]),
    ];
    for (const text of shown) expect(text.replace(/RFPilot/g, "")).not.toMatch(/\bRFPs?\b/i);
  });

  // Spot checks against the backend rules (authorizationPolicy.ts, rfpAccessPolicy.ts,
  // memberPolicy.ts, invitationRules.ts). Order: Owner, Admin, Team Manager, Planner, Viewer.
  it.each([
    ["proposal-see", ["yes", "yes", "limited", "limited", "limited"]],
    ["proposal-create", ["yes", "yes", "yes", "yes", "no"]],
    ["proposal-edit", ["yes", "yes", "limited", "limited", "no"]],
    ["proposal-assistant", ["yes", "yes", "yes", "yes", "no"]],
    ["proposal-share", ["yes", "yes", "limited", "limited", "no"]],
    ["proposal-archive", ["yes", "yes", "limited", "limited", "no"]],
    ["proposal-reassign", ["yes", "yes", "no", "no", "no"]],
    ["vendor-responses-see", ["yes", "yes", "limited", "limited", "limited"]],
    ["template-use", ["yes", "yes", "yes", "yes", "no"]],
    ["template-publish", ["yes", "yes", "no", "no", "no"]],
    ["vendor-list-read", ["yes", "yes", "yes", "yes", "no"]],
    ["vendor-list-write", ["yes", "yes", "yes", "no", "no"]],
    ["members-see", ["yes", "yes", "no", "no", "no"]],
    ["members-invite", ["yes", "yes", "limited", "no", "no"]],
    ["members-manage", ["yes", "yes", "no", "no", "no"]],
    ["access-requests", ["yes", "yes", "no", "no", "no"]],
    ["teams-manage", ["yes", "yes", "no", "no", "no"]],
    ["ownership-transfer", ["yes", "no", "no", "no", "no"]],
    ["organization-see", ["yes", "yes", "yes", "yes", "yes"]],
    ["organization-details", ["yes", "yes", "no", "no", "no"]],
    ["plan-change", ["no", "no", "no", "no", "no"]],
    ["security-own", ["yes", "yes", "yes", "yes", "yes"]],
    ["security-settings", ["yes", "yes", "no", "no", "no"]],
    ["security-reset-2fa", ["yes", "yes", "no", "no", "no"]],
    ["support-access", ["yes", "yes", "no", "no", "no"]],
    ["audit-log", ["yes", "yes", "no", "no", "no"]],
  ])("%s matches the backend rule", (id, expected) => {
    expect(levels(id)).toEqual(expected);
  });

  it("pins every row, so a new one is checked against the backend before it ships", () => {
    expect(rows).toHaveLength(26);
  });

  it("says what the Team Manager invite depends on", () => {
    const note = byId("members-invite").access.team_manager.note ?? "";
    expect(note).toMatch(/Planners and Viewers/);
    expect(note).toMatch(/teams they manage/);
    expect(note).toMatch(/turned on for the organization/);
  });

  it("reads a member's role from their session roles, and names none when unsure", () => {
    expect(customerRoleOf(["planner"])).toBe("planner");
    expect(customerRoleOf(["knowledge_editor", "organization_admin"])).toBe("organization_admin");
    expect(customerRoleOf(["viewer", "owner"])).toBe("owner");
    expect(customerRoleOf(["dxg_admin"])).toBeNull();
    expect(customerRoleOf([])).toBeNull();
    expect(customerRoleOf(null)).toBeNull();
  });
});
