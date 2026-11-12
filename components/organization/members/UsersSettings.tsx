"use client";

import { Lock, Mail, MailPlus, Search, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { listMembersAction, reactivateMemberAction } from "@/app/actions/organizationMembers";
import { listTeamsAction } from "@/app/actions/teams";
import GlobalSelect from "@/components/shared/GlobalSelect";
import TopHeader from "@/components/settings/TopHeaser";
import AccessRequestsSection from "../accessRequests/AccessRequestsSection";
import InvitationsSection from "../invitations/InvitationsSection";
import InviteDialog from "../invitations/InviteDialog";
import { DELIVERY_LABELS, useInvitations } from "../invitations/useInvitations";
import { isVersionConflict, orgErrorMessage } from "./errorMessages";
import MemberActionsMenu, { type MemberMenuAction } from "./MemberActionsMenu";
import MemberDialog, { type MemberDialogKind } from "./MemberDialogs";
import { filterInvitations, filterMembers, memberDisplayName, memberPermissions, ROLE_LABELS, roleLabel, STATUS_LABELS } from "./orgAccess";
import RoleAccessGuide from "./RoleAccessGuide";
import { shownRole } from "./roleAccess";
import type { CustomerRole, OrgMember, Team } from "./types";
import {
  Badge,
  EmptyState,
  formatDate,
  formatRelative,
  InlineError,
  inputClass,
  primaryButtonClass,
  primaryButtonStyle,
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

type Props = {
  // The signed-in member's role, read from their session by the page. The members list is the
  // fresher source for an Owner or Admin, so it wins when it answers.
  sessionRole?: CustomerRole | null;
};

export default function UsersSettings({ sessionRole = null }: Props) {
  const { access, error: accessError, reload: reloadAccess } = useOrgAccess();
  const [members, setMembers] = useState<OrgMember[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialog, setDialog] = useState<{ kind: MemberDialogKind; member: OrgMember } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [inviteOpen, setInviteOpen] = useState(false);
  // Owners and Admins see pending invitations as "Invited" rows in this table.
  const pending = useInvitations({ enabled: Boolean(access?.canManageMembers) });
  const teamNames = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);

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
  const visibleInvites = useMemo(
    () => filterInvitations(pending.invitations ?? [], query, roleFilter, statusFilter),
    [pending.invitations, query, roleFilter, statusFilter],
  );
  const invitedCount = pending.invitations?.length ?? 0;

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

      {/* ORG-306: sign-ups on the organization's verified domain asking to join. */}
      {access.canManageMembers && <AccessRequestsSection teams={teams} onInvited={() => void pending.load()} />}

      {access.canManageMembers ? (
        <section className={sectionClass} aria-labelledby="members-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="members-title" className={sectionTitleClass}>Users</h2>
              <p className="mt-2 text-sm text-slate-500">
                Everyone in your organization, their role and teams.{" "}
                {members && (
                  <span className="font-medium text-slate-600">
                    {members.length} member{members.length === 1 ? "" : "s"}
                    {invitedCount > 0 && ` · ${invitedCount} invited`}
                  </span>
                )}
              </p>
            </div>
            {access.canInvite && (
              <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={() => setInviteOpen(true)}>
                <MailPlus size={15} aria-hidden="true" /> Invite people
              </button>
            )}
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
              <option value="invited">Invited</option>
              <option value="deactivated">Deactivated</option>
            </GlobalSelect>
          </div>

          <div className="mt-5">
            {pending.loadError && <div className="mb-3"><InlineError>{pending.loadError}</InlineError></div>}
            {loadError ? (
              <InlineError>{loadError}</InlineError>
            ) : members === null ? (
              <TableSkeleton rows={5} />
            ) : visible.length === 0 && visibleInvites.length === 0 ? (
              <EmptyState
                icon={<UserRound size={20} />}
                title={members.length === 0 ? "No members yet" : "No members match"}
                body={members.length === 0 ? "Use Invite people to add your team." : "Try a different search or filter."}
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
                    {visibleInvites.map((invitation) => {
                      const delivery = DELIVERY_LABELS[invitation.emailDelivery] ?? DELIVERY_LABELS.queued;
                      return (
                        <tr key={`invitation-${invitation.id}`} className="text-slate-700">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                                <Mail size={15} aria-hidden="true" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-400">Not joined yet</p>
                                <p className="truncate text-xs text-slate-500">{invitation.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><Badge tone={ROLE_TONES[invitation.role] ?? "slate"}>{roleLabel(invitation.role)}</Badge></td>
                          <td className="px-4 py-3">
                            {invitation.teamId ? (
                              <Badge>{teamNames.get(invitation.teamId) ?? "Archived team"}</Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              <Badge tone={STATUS_TONES.invited}>{STATUS_LABELS.invited}</Badge>
                              {invitation.emailDelivery === "failed" && <Badge tone={delivery.tone}>{delivery.label}</Badge>}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">Expires {formatDate(invitation.expiresAt)}</td>
                          <td className="px-4 py-3 text-right">{pending.actionsFor(invitation)}</td>
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

      {/* Team Managers don't see the Users table, so they get their own list. */}
      {access.canInvite && !access.canManageMembers && <InvitationsSection access={access} teams={teams} />}

      {/* Every member who can open this page sees what each role can do, and their own role. */}
      <RoleAccessGuide role={shownRole(access, sessionRole)} />

      {inviteOpen && (
        <InviteDialog access={access} teams={teams} onClose={() => setInviteOpen(false)} onInvited={() => void pending.load()} />
      )}
      {pending.revokeDialog}

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
