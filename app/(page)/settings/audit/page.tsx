import { notFound } from "next/navigation";
import { getAuditFilterOptionsAction, listAuditEventsAction } from "@/app/actions/auditLog";
import { listMembersAction } from "@/app/actions/organizationMembers";
import AuditLogSettings from "@/components/organization/audit/AuditLogSettings";
import { auditErrorMessage } from "@/components/organization/audit/auditLogModel";
import { dashboardRoleOf } from "@/components/dashboard/rfpDashboardModel";
import { getMemberIdentity } from "@/lib/server/memberIdentity";

// ORG-407. Only an Owner or Admin reads the audit log. The role in the session decides whether
// the page exists at all; the backend is still the judge and answers 403 to anyone else.
export default async function SettingsAuditPage() {
  const role = dashboardRoleOf((await getMemberIdentity()).roles);
  if (role !== "owner" && role !== "organization_admin") notFound();

  const [page, options, members] = await Promise.all([listAuditEventsAction(), getAuditFilterOptionsAction(), listMembersAction()]);
  if (page.status === 403) notFound();
  return (
    <AuditLogSettings
      initialPage={page.success ? (page.data ?? null) : null}
      initialError={page.success ? null : auditErrorMessage(page, "The audit log couldn't be loaded. Try again.")}
      options={options.success ? (options.data ?? null) : null}
      members={members.success ? (members.data ?? []).map((member) => ({ userId: member.userId, name: member.name, email: member.email })) : []}
    />
  );
}
