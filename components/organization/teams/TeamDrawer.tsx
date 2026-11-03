"use client";

import { Archive, Pencil, Star, UserMinus, UserPlus, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { addTeamMemberAction, removeTeamMemberAction, setTeamManagerAction } from "@/app/actions/teams";
import { orgErrorMessage } from "../members/errorMessages";
import { canBeTeamManager, memberDisplayName, roleLabel } from "../members/orgAccess";
import type { OrgMember, Team } from "../members/types";
import { Badge, formatDate, InlineError, inputClass, labelClass, primaryButtonClass, primaryButtonStyle, ROLE_TONES, secondaryButtonClass, Spinner } from "../members/ui";

type Props = {
  team: Team;
  members: OrgMember[];
  onClose: () => void;
  onChanged: (team: Team) => void;
  onRename: () => void;
  onArchive: () => void;
};

// Members who can be added: active in the organization and not already on the team.
export const addableMembers = (members: OrgMember[], team: Team): OrgMember[] => {
  const onTeam = new Set((team.members ?? []).map((m) => m.userId));
  return members.filter((member) => member.status === "active" && !onTeam.has(member.userId));
};

export default function TeamDrawer({ team, members, onClose, onChanged, onRename, onArchive }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const byId = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members]);
  const candidates = useMemo(() => addableMembers(members, team), [members, team]);
  const [newUserId, setNewUserId] = useState("");
  const [asManager, setAsManager] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = byId.get(newUserId);
  const archived = Boolean(team.archived);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    return () => {
      if (dialog && typeof dialog.close === "function") dialog.close();
    };
  }, []);

  const run = async (key: string, call: () => Promise<{ success: boolean; data?: Team; code?: string; message: string; status?: number }>, success: string) => {
    setBusyKey(key);
    setError(null);
    const result = await call();
    setBusyKey(null);
    if (result.success && result.data) {
      onChanged(result.data);
      toast.success(success);
      return true;
    }
    setError(orgErrorMessage(result));
    return false;
  };

  const add = async () => {
    if (!selected) return setError("Choose a member to add.");
    const ok = await run("add", () => addTeamMemberAction(team.id, selected.userId, asManager && canBeTeamManager(selected)),
      `${memberDisplayName(selected)} added to ${team.name}${asManager ? " as manager" : ""}.`);
    if (ok) {
      setNewUserId("");
      setAsManager(false);
    }
  };

  const teamMembers = [...(team.members ?? [])].sort((a, b) =>
    Number(b.isManager) - Number(a.isManager) || memberDisplayName(byId.get(a.userId)).localeCompare(memberDisplayName(byId.get(b.userId))),
  );

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-[520px] bg-white p-0 text-slate-900 shadow-[0_0_60px_rgba(15,23,42,0.25)] backdrop:bg-slate-950/35 backdrop:backdrop-blur-[2px] open:flex open:flex-col"
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#008ad2]">Team</p>
          <h2 id={titleId} className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-950">{team.name}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {(team.members ?? []).length} member{(team.members ?? []).length === 1 ? "" : "s"}
            {team.createdAt && ` · Created ${formatDate(team.createdAt)}`}
            {archived && " · Archived"}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {!archived && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={onRename}><Pencil size={14} aria-hidden="true" /> Rename</button>
            <button type="button" className={`${secondaryButtonClass} text-rose-600 hover:border-rose-200 hover:bg-rose-50`} onClick={onArchive}>
              <Archive size={14} aria-hidden="true" /> Archive
            </button>
          </div>
        )}

        {!archived && (
          <section aria-labelledby={`${titleId}-add`} className="rounded-xl border border-slate-200 bg-[#fafbfc] p-4">
            <h3 id={`${titleId}-add`} className="text-sm font-semibold text-slate-800">Add a member</h3>
            {candidates.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Everyone active in your organization is already on this team.</p>
            ) : (
              <>
                <label htmlFor={`${titleId}-member`} className={`${labelClass} mt-3`}>Member</label>
                <select
                  id={`${titleId}-member`}
                  className={`${inputClass} appearance-auto`}
                  value={newUserId}
                  onChange={(event) => {
                    setNewUserId(event.target.value);
                    setAsManager(false);
                  }}
                  disabled={busyKey !== null}
                >
                  <option value="">Choose a member…</option>
                  {candidates.map((member) => (
                    <option key={member.userId} value={member.userId}>{memberDisplayName(member)} · {roleLabel(member.role)}</option>
                  ))}
                </select>
                <label className={`mt-3 flex items-start gap-2.5 text-sm ${selected && !canBeTeamManager(selected) ? "text-slate-400" : "text-slate-700"}`}>
                  <input
                    type="checkbox"
                    checked={asManager}
                    onChange={(event) => setAsManager(event.target.checked)}
                    disabled={!selected || !canBeTeamManager(selected) || busyKey !== null}
                    className="mt-0.5 h-4 w-4 accent-[#008ad2]"
                  />
                  <span>
                    Make them a manager of this team
                    {selected && !canBeTeamManager(selected) && (
                      <span className="block text-xs">Only members with the Team Manager role can manage a team.</span>
                    )}
                  </span>
                </label>
                <button type="button" onClick={add} disabled={!selected || busyKey !== null} className={`${primaryButtonClass} mt-4`} style={primaryButtonStyle}>
                  {busyKey === "add" ? <Spinner /> : <UserPlus size={15} aria-hidden="true" />} Add to team
                </button>
              </>
            )}
          </section>
        )}

        {error && <InlineError>{error}</InlineError>}

        <section aria-labelledby={`${titleId}-members`}>
          <h3 id={`${titleId}-members`} className="text-sm font-semibold text-slate-800">Members</h3>
          {teamMembers.length === 0 ? (
            <p className="mt-2 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">No one is on this team yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {teamMembers.map((entry) => {
                const member = byId.get(entry.userId);
                const name = memberDisplayName(member);
                const eligible = canBeTeamManager(member);
                return (
                  <li key={entry.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-semibold text-slate-800">
                        {name}
                        {entry.isManager && <Badge tone="amber"><Star size={10} className="mr-1 fill-current" aria-hidden="true" />Manager</Badge>}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <Badge tone={ROLE_TONES[member?.role ?? ""] ?? "slate"}>{roleLabel(member?.role)}</Badge>
                        {member?.status === "deactivated" && <span className="text-rose-600">Deactivated</span>}
                      </p>
                    </div>
                    {!archived && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-semibold text-[#008ad2] hover:bg-sky-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                          disabled={busyKey !== null || (!entry.isManager && !eligible)}
                          title={!entry.isManager && !eligible ? "Only members with the Team Manager role can manage a team." : undefined}
                          onClick={() => run(`mgr-${entry.userId}`, () => setTeamManagerAction(team.id, entry.userId, !entry.isManager),
                            entry.isManager ? `${name} no longer manages ${team.name}.` : `${name} now manages ${team.name}.`)}
                        >
                          {busyKey === `mgr-${entry.userId}` ? <Spinner size={12} /> : entry.isManager ? "Remove manager" : "Make manager"}
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${name} from ${team.name}`}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                          disabled={busyKey !== null}
                          onClick={() => run(`rm-${entry.userId}`, () => removeTeamMemberAction(team.id, entry.userId), `${name} removed from ${team.name}.`)}
                        >
                          {busyKey === `rm-${entry.userId}` ? <Spinner size={14} /> : <UserMinus size={15} />}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </dialog>,
    document.body,
  );
}
