import { customerRoleOf } from "@/components/organization/members/roleAccess";
import type { CustomerRole } from "@/components/organization/members/types";
import { templateAccessForRoles, type TemplateAccess } from "@/components/organization/templates/templateModel";
import { vendorListAccessForRoles, type VendorListAccess } from "@/components/organization/vendors/vendorListModel";

// What the signed-in member can reach in Settings. Worked out once from the session's roles in
// the page layout, so the sidebar, the settings dialog and the full-page tab strip all know it on
// first render and never ask the server again.
export type SettingsAccess = {
  role: CustomerRole | null;
  vendors: VendorListAccess;
  templates: TemplateAccess;
};

export const settingsAccessForRoles = (roles: readonly string[]): SettingsAccess => ({
  role: customerRoleOf(roles),
  vendors: vendorListAccessForRoles(roles),
  templates: templateAccessForRoles(roles),
});
