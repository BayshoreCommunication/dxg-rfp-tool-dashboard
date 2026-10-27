/**
 * Standard event-production crew roles by department (source:
 * DXG_Operator_Roles.xlsx, October 2026). The backend offers every one of
 * them to vendors; here they only decide how the role dropdowns are grouped.
 * Keep in step with src/modules/vendorResponses/domain/operatorRoles.ts in
 * the backend.
 */
export const OPERATOR_ROLE_DEPARTMENTS: ReadonlyArray<{ department: string; roles: readonly string[] }> = [
  { department: "Leadership & Management", roles: ["Executive Producer", "Producer", "Associate Producer", "Production Manager", "Project Manager"] },
  { department: "Show Control & Direction", roles: ["Technical Director", "Assistant Technical Director", "Show Caller", "Stage Manager", "Assistant Stage Manager", "Production Assistant"] },
  { department: "Audio", roles: ["A1 - Audio Engineer", "A2 - Audio Assistant", "Monitor Engineer", "RF Technician", "Audio Technician"] },
  { department: "Video", roles: ["V1 - Video Engineer", "V2 - Video Assistant", "Video Director", "Camera Operator", "PTZ Operator", "LED Technician", "LED Processor Operator", "Projectionist", "Video Technician"] },
  { department: "Graphics & Media", roles: ["Graphics Operator", "ProPresenter Operator", "Media Server Operator (Disguise/d3)", "Playback Operator", "Teleprompter Operator"] },
  { department: "Lighting", roles: ["L1 - Lighting Director", "L2 - Lighting Operator", "Lighting Designer", "Moving Light Technician", "Followspot Operator"] },
  { department: "Networking & IT", roles: ["Network Engineer", "Network Technician", "Systems/IT Technician"] },
  { department: "Rigging & Staging", roles: ["Head Rigger", "Rigger", "Ground Rigger", "Staging Lead", "Scenic Carpenter", "Stagehand"] },
  { department: "Specialty", roles: ["Drapery/Soft Goods Technician", "Power/Electrical Distro Technician", "AV Technician (General)"] },
];

const key = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "");

// Labels used by questionnaires published before the standard list.
const ALIASES: Record<string, string> = { [key("AV technician")]: key("AV Technician (General)") };

const position = new Map(
  OPERATOR_ROLE_DEPARTMENTS.flatMap((group, groupIndex) =>
    group.roles.map((label, roleIndex) => [key(label), { groupIndex, roleIndex }] as const),
  ),
);

export const REQUESTED_ROLES_GROUP = "Requested in this RFP";

/**
 * Splits a questionnaire's roles into dropdown groups: roles the client
 * asked for that are not on the standard list come first, then each
 * department in its usual order.
 */
export const groupCrewRoles = <T extends { id: string; label: string }>(roles: readonly T[]) => {
  const requested: T[] = [];
  const byDepartment = OPERATOR_ROLE_DEPARTMENTS.map(() => [] as { role: T; order: number }[]);
  for (const role of roles) {
    const match = position.get(ALIASES[key(role.label)] ?? key(role.label));
    if (match) byDepartment[match.groupIndex].push({ role, order: match.roleIndex });
    else requested.push(role);
  }
  return [
    { label: REQUESTED_ROLES_GROUP, roles: requested },
    ...OPERATOR_ROLE_DEPARTMENTS.map((group, index) => ({
      label: group.department,
      roles: byDepartment[index].sort((left, right) => left.order - right.order).map((entry) => entry.role),
    })),
  ].filter((group) => group.roles.length > 0);
};
