import { notFound } from "next/navigation";
import { getAuditFilterOptionsAction, listAuditEventsAction } from "@/app/actions/auditLog";
import { listMembersAction } from "@/app/actions/organizationMembers";
import AuditLogSettings from "@/components/organization/audit/AuditLogSettings";
import { auditErrorMessage } from "@/components/organization/audit/auditLogModel";
import { dashboardRoleOf } from "@/components/dashboard/rfpDashboardModel";
import { getMemberIdentity } from "@/lib/server/memberIdentity";

// ORG-407. Only an Owner or Admin reads the audit log. The backend is the judge: it answers 403
// to every other role, and for them this page does not exist. The role in the session only saves
// the two extra requests for someone who is clearly not allowed; it never grants access, and a
// member promoted since their token was issued still gets in, because the backend says so.
export default async function SettingsAuditPage() {
  const page = await listAuditEventsAction();
  if (page.status === 403) notFound();

  const role = dashboardRoleOf((await getMemberIdentity()).roles);
  const privileged = page.success || role === "owner" || role === "organization_admin";
  const [options, members] = privileged
    ? await Promise.all([getAuditFilterOptionsAction(), listMembersAction()])
    : [null, null];
  return (
    <AuditLogSettings
      initialPage={page.success ? (page.data ?? null) : null}
      initialError={page.success ? null : auditErrorMessage(page, "The audit log couldn't be loaded. Try again.")}
      options={options?.success ? (options.data ?? null) : null}
      members={members?.success ? (members.data ?? []).map((member) => ({ userId: member.userId, name: member.name, email: member.email })) : []}
    />
  );
}
