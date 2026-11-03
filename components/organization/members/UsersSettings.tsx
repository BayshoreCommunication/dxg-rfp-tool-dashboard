"use client";

import { Lock, Search, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { listMembersAction, reactivateMemberAction } from "@/app/actions/organizationMembers";
import { listTeamsAction } from "@/app/actions/teams";
import GlobalSelect from "@/components/shared/GlobalSelect";
import TopHeader from "@/components/settings/TopHeaser";
import InvitationsSection from "../invitations/InvitationsSection";
import { isVersionConflict, orgErrorMessage } from "./errorMessages";
import MemberActionsMenu, { type MemberMenuAction } from "./MemberActionsMenu";
import MemberDialog, { type MemberDialogKind } from "./MemberDialogs";
import { filterMembers, memberDisplayName, memberPermissions, ROLE_LABELS, roleLabel, STATUS_LABELS } from "./orgAccess";
import type { CustomerRole, OrgMember, Team } from "./types";
import {
  Badge,
  EmptyState,
  formatRelative,
  InlineError,
  inputClass,
  ROLE_TONES,
  sectionClass,
  sectionTitleClass,
  TableSkeleton,
} from "./ui";
import { useOrgAccess } from "./useOrgAccess";

const STATUS_TONES: Record<string, "emerald" | "slate" | "amber" | "rose"> = {
  active: "emerald",
  deactivated: "rose",
  invited: "amber",
  removed: "slate",
};

export default function UsersSettings() {
  const { access, error: accessError, reload: reloadAccess } = useOrgAccess();
  const [members, setMembers] = useState<OrgMember[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialog, setDialog] = useState<{ kind: MemberDialogKind; member: OrgMember } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refreshMembers = useCallback(async (): Promise<OrgMember[]> => {
    const result = await listMembersAction();
    if (result.success) {
      setMembers(result.data ?? []);
      setLoadError(null);
      setNow(Date.now());
      return result.data ?? [];
    }
    setLoadError(orgErrorMessage(result, "Members couldn't be loaded."));
    return [];
  }, []);

  const refreshTeams = useCallback(async () => {
    const result = await listTeamsAction();
    if (result.success) setTeams(result.data ?? []);
  }, []);

  useEffect(() => {
    if (!access) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (access.canManageMembers) void refreshMembers();
    if (access.canInvite) void refreshTeams();
  }, [access, refreshMembers, refreshTeams]);

  const visible = useMemo(() => filterMembers(members ?? [], query, roleFilter, statusFilter), [members, query, roleFilter, statusFilter]);

  const reactivate = async (member: OrgMember) => {
    const result = await reactivateMemberAction(member.userId, member.version);
    if (result.success) toast.success(`${memberDisplayName(member)} can sign in again.`);
    else toast.error(orgErrorMessage(result));
    if (result.success || isVersionConflict(result)) await refreshMembers();
  };

  const onAction = (member: OrgMember, action: MemberMenuAction) => {
    if (action === "reactivate") void reactivate(member);
    else setDialog({ kind: action, member });
  };

  const header = <TopHeader />;

  if (accessError) {
    return (
      <div className="space-y-6 px-6 pb-8">
        {header}
        <InlineError>{accessError}</InlineError>
      </div>
    );
  }

  if (!access) {
    return (
      <div className="space-y-6 px-6 pb-8">
        {header}
        <div className={sectionClass}><TableSkeleton rows={5} /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 pb-8">
      {header}

      {access.canManageMembers ? (
        <section className={sectionClass} aria-labelledby="members-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="members-title" className={sectionTitleClass}>Users</h2>
              <p className="mt-2 text-sm text-slate-500">
                Everyone in your organization, their role and teams.{" "}
                {members && <span className="font-medium text-slate-600">{members.length} member{members.length === 1 ? "" : "s"}</span>}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_200px_180px]">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or email"
                aria-label="Search members"
                className={`${inputClass} pl-9`}
              />
            </div>
            <GlobalSelect value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter by role" className={inputClass}>
              <option value="">All roles</option>
              {(Object.keys(ROLE_LABELS) as CustomerRole[]).map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </GlobalSelect>
            <GlobalSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status" className={inputClass}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </GlobalSelect>
          </div>

          <div className="mt-5">
            {loadError ? (
              <InlineError>{loadError}</InlineError>
            ) : members === null ? (
              <TableSkeleton rows={5} />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<UserRound size={20} />}
                title={members.length === 0 ? "No members yet" : "No members match"}
                body={members.length === 0 ? "Invite your team below." : "Try a different search or filter."}
              />
            ) : (
              <div className="overflow-x-auto rounded-md border border-[#e4e4e4]">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-[#f5f6f8] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Name</th>
                      <th scope="col" className="px-4 py-3">Role</th>
                      <th scope="col" className="px-4 py-3">Teams</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3">Last active</th>
                      <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visible.map((member) => {
                      const name = memberDisplayName(member);
                      const isSelf = member.userId === access.userId;
                      return (
                        <tr key={member.userId} className={member.status === "deactivated" ? "bg-slate-50/60 text-slate-400" : "text-slate-700"}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2fc6f5] to-[#008ad2] text-xs font-bold uppercase text-white">
                                {name.slice(0, 2)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-800">
                                  {member.name || "—"}
                                  {isSelf && <span className="ml-1.5 text-xs font-medium text-slate-400">(you)</span>}
                                </p>
                                <p className="truncate text-xs text-slate-500">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><Badge tone={ROLE_TONES[member.role ?? ""] ?? "slate"}>{roleLabel(member.role)}</Badge></td>
                          <td className="px-4 py-3">
                            {member.teams.length === 0 ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <div className="flex max-w-[240px] flex-wrap gap-1">
                                {member.teams.map((team) => <Badge key={team.id}>{team.name}</Badge>)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3"><Badge tone={STATUS_TONES[member.status] ?? "slate"}>{STATUS_LABELS[member.status] ?? member.status}</Badge></td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatRelative(member.lastSignedInAt, now)}</td>
                          <td className="px-4 py-3 text-right">
                            <MemberActionsMenu label={name} permissions={memberPermissions(access, member)} onSelect={(action) => onAction(member, action)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className={sectionClass}>
          <div className="flex items-start gap-3">
            <Lock size={18} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-[#222628]">Members are managed by Owners and Admins</h2>
              <p className="mt-1 text-sm text-slate-500">
                {access.canInvite
                  ? "As a Team Manager you can invite Planners and Viewers into the teams you manage."
                  : "Ask an Admin if you need someone added, or your role changed."}{" "}
                <Link href="/settings/teams" className="inline-flex items-center gap-1 font-semibold text-[#008ad2] hover:underline">
                  <Users size={13} aria-hidden="true" /> See teams
                </Link>
              </p>
            </div>
          </div>
        </section>
      )}

      {access.canInvite && <InvitationsSection access={access} teams={teams} />}

      {dialog && members && (
        <MemberDialog
          kind={dialog.kind}
          member={dialog.member}
          members={members}
          teams={teams}
          refresh={refreshMembers}
          onClose={() => setDialog(null)}
          onDone={(message) => {
            toast.success(message);
            setDialog(null);
            void refreshMembers();
            if (dialog.kind === "transfer") reloadAccess();
          }}
        />
      )}
    </div>
  );
}
