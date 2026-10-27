import { OPERATOR_ROLE_DEPARTMENTS, REQUESTED_ROLES_GROUP, groupCrewRoles } from "./operatorRoles";

const role = (label: string) => ({ id: `role-${label}`, label });

describe("operator role groups", () => {
  it("lists all 47 roles from the operator roles sheet across 9 departments", () => {
    expect(OPERATOR_ROLE_DEPARTMENTS).toHaveLength(9);
    expect(OPERATOR_ROLE_DEPARTMENTS.flatMap((group) => group.roles)).toHaveLength(47);
  });

  it("puts the client's own roles first, then departments in sheet order", () => {
    const groups = groupCrewRoles([
      role("Stagehand"),
      role("A2 - Audio Assistant"),
      role("Audio Engineer"),
      role("A1 - Audio Engineer"),
      role("technical director"),
      role("AV technician"),
    ]);
    expect(groups.map((group) => [group.label, group.roles.map((entry) => entry.label)])).toEqual([
      [REQUESTED_ROLES_GROUP, ["Audio Engineer"]],
      ["Show Control & Direction", ["technical director"]],
      ["Audio", ["A1 - Audio Engineer", "A2 - Audio Assistant"]],
      ["Rigging & Staging", ["Stagehand"]],
      ["Specialty", ["AV technician"]],
    ]);
  });
});
