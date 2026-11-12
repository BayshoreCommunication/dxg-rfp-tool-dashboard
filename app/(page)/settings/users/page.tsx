import { customerRoleOf } from "@/components/organization/members/roleAccess";
import UsersSettings from "@/components/organization/members/UsersSettings";
import { getMemberIdentity } from "@/lib/server/memberIdentity";

// The member's own role comes from their session (no extra request), for the "Your role" line.
export default async function SettingsUsersPage() {
  const { roles } = await getMemberIdentity();
  return <UsersSettings sessionRole={customerRoleOf(roles)} />;
}
