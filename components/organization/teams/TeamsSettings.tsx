"use client";

import { ChevronRight, Lock, Plus, Star, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { listMembersAction } from "@/app/actions/organizationMembers";
import { listTeamsAction } from "@/app/actions/teams";
import TopHeader from "@/components/settings/TopHeaser";
import { orgErrorMessage } from "../members/errorMessages";
import { memberDisplayName } from "../members/orgAccess";
import type { OrgMember, Team } from "../members/types";
import { Badge, EmptyState, InlineError, primaryButtonClass, primaryButtonStyle, sectionClass, sectionTitleClass, TableSkeleton } from "../members/ui";
import { useOrgAccess } from "../members/useOrgAccess";
import { ArchiveTeamDialog, TeamNameDialog } from "./TeamDialogs";
import TeamDrawer from "./TeamDrawer";

type DialogState = { kind: "create" } | { kind: "rename"; team: Team } | { kind: "archive"; team: Team } | null;

export default function TeamsSettings() {
  const { access, error: accessError } = useOrgAccess();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [showArchived, setShowArchived] = useState(false);
  const admin = Boolean(access?.canManageMembers);

  const loadTeams = useCallback(async () => {
    const result = await listTeamsAction();
    if (result.success) {
      setTeams(result.data ?? []);
      setLoadError(null);
    } else {
      setLoadError(orgErrorMessage(result, "Teams couldn't be loaded."));
    }
  }, []);

  useEffect(() => {
    if (!access) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTeams();
    if (access.canManageMembers) {
      void listMembersAction().then((result) => {
        if (result.success) setMembers(result.data ?? []);
      });
    }
  }, [access, loadTeams]);

  const byId = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members]);
  const active = (teams ?? []).filter((team) => !team.archived);
  const archived = (teams ?? []).filter((team) => team.archived);
  const openTeam = teams?.find((team) => team.id === openTeamId) ?? null;

  const replaceTeam = (team: Team) =>
    setTeams((previous) => {
      const list = previous ?? [];
      return list.some((t) => t.id === team.id) ? list.map((t) => (t.id === team.id ? team : t)) : [...list, team];
    });

  const header = <TopHeader />;

  if (accessError) {
    return <div className="space-y-6 px-6 pb-8">{header}<InlineError>{accessError}</InlineError></div>;
  }

  const teamCard = (team: Team) => {
    const memberships = team.members ?? [];
    const managers = memberships.filter((m) => m.isManager).map((m) => memberDisplayName(byId.get(m.userId)));
    return (
      <li key={team.id}>
        <button
          type="button"
          onClick={() => setOpenTeamId(team.id)}
          className="group flex w-full items-center gap-4 rounded-md border border-[#e4e4e4] bg-white px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_8px_24px_rgba(14,165,233,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-[#008ad2]"><UsersRound size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-800">{team.name}</span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">
              {memberships.length} member{memberships.length === 1 ? "" : "s"}
              {managers.length > 0 && <> · <Star size={10} className="-mt-0.5 inline fill-amber-400 text-amber-400" aria-hidden="true" /> {managers.join(", ")}</>}
            </span>
          </span>
          {team.archived && <Badge>Archived</Badge>}
          <ChevronRight size={16} className="text-slate-300 transition-colors group-hover:text-[#008ad2]" aria-hidden="true" />
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-6 px-6 pb-8">
      {header}
      <section className={sectionClass} aria-labelledby="teams-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="teams-title" className={sectionTitleClass}>Teams</h2>
            <p className="mt-2 text-sm text-slate-500">
              {admin ? "Group planners by region or client. Team Managers see and manage their team's RFPs." : "Teams in your organization."}
            </p>
          </div>
          {admin && (
            <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={() => setDialog({ kind: "create" })}>
              <Plus size={15} aria-hidden="true" /> New team
            </button>
          )}
        </div>

        <div className="mt-6">
          {loadError ? (
            <InlineError>{loadError}</InlineError>
          ) : !access || teams === null ? (
            <TableSkeleton rows={3} />
          ) : active.length === 0 ? (
            <EmptyState
              icon={<UsersRound size={20} />}
              title="No teams yet"
              body={admin ? "Create a team, then add members and choose its managers." : "Your organization hasn't set up teams yet."}
              action={admin ? (
                <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={() => setDialog({ kind: "create" })}>
                  <Plus size={15} aria-hidden="true" /> New team
                </button>
              ) : undefined}
            />
          ) : admin ? (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{active.map(teamCard)}</ul>
          ) : (
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {active.map((team) => (
                <li key={team.id} className="flex items-center gap-3 rounded-md border border-[#e4e4e4] px-4 py-3 text-sm font-medium text-slate-700">
                  <UsersRound size={16} className="text-[#008ad2]" aria-hidden="true" /> {team.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!admin && access && (
          <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
            <Lock size={12} aria-hidden="true" /> Only Owners and Admins can create teams or change who is on them.
          </p>
        )}

        {admin && archived.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <button type="button" className="text-xs font-semibold text-slate-500 hover:text-slate-700" onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived}>
              {showArchived ? "Hide" : "Show"} archived teams ({archived.length})
            </button>
            {showArchived && <ul className="mt-3 grid grid-cols-1 gap-3 opacity-80 md:grid-cols-2">{archived.map(teamCard)}</ul>}
          </div>
        )}
      </section>

      {openTeam && admin && !dialog && (
        <TeamDrawer
          team={openTeam}
          members={members}
          onClose={() => setOpenTeamId(null)}
          onChanged={replaceTeam}
          onRename={() => setDialog({ kind: "rename", team: openTeam })}
          onArchive={() => setDialog({ kind: "archive", team: openTeam })}
        />
      )}

      {dialog?.kind === "create" && (
        <TeamNameDialog
          onClose={() => setDialog(null)}
          onSaved={(team) => {
            replaceTeam(team);
            setDialog(null);
            setOpenTeamId(team.id);
            toast.success(`Team “${team.name}” created. Add its members next.`);
          }}
        />
      )}
      {dialog?.kind === "rename" && (
        <TeamNameDialog
          team={dialog.team}
          onClose={() => setDialog(null)}
          onSaved={(team) => {
            replaceTeam(team);
            setDialog(null);
            toast.success(`Team renamed to “${team.name}”.`);
          }}
        />
      )}
      {dialog?.kind === "archive" && (
        <ArchiveTeamDialog
          team={dialog.team}
          onClose={() => setDialog(null)}
          onArchived={(team) => {
            replaceTeam(team);
            setDialog(null);
            setOpenTeamId(null);
            toast.success(`${team.name} archived.`);
          }}
        />
      )}
    </div>
  );
}
