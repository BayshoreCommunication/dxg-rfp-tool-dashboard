import type { VendorResponseQuestionnaireV1 } from "@/contracts/generated/vendor-response-questionnaire-v1";
import { groupCrewRoles } from "@/lib/vendorResponses/operatorRoles";

/** A role dropdown's options, grouped by department. */
export default function CrewRoleOptions({ roles }: { roles: VendorResponseQuestionnaireV1["crew"]["roles"] }) {
  return (
    <>
      {groupCrewRoles(roles).map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.roles.map((role) => (
            <option value={role.id} key={role.id}>
              {role.label}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
