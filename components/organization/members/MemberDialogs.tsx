"use client";

import { Crown, ShieldAlert, UserX } from "lucide-react";
import { useState } from "react";
import {
  changeMemberRoleAction,
  changeMemberTeamsAction,
  deactivateMemberAction,
  transferOwnershipAction,
} from "@/app/actions/organizationMembers";
import type { OrgActionResult } from "@/app/actions/organizationApi";
import { isVersionConflict, orgErrorMessage, ownedRfpCount } from "./errorMessages";
import { ASSIGNABLE_ROLES, memberDisplayName, ROLE_DESCRIPTIONS, ROLE_LABELS, roleWithArticle } from "./orgAccess";
import ReassignRfpsPanel from "./ReassignRfpsPanel";
import type { InvitableRole, OrgMember, Team } from "./types";
import { dangerButtonClass, InlineError, OrgDialog, primaryButtonClass, primaryButtonStyle, secondaryButtonClass, Spinner } from "./ui";

export type MemberDialogKind = "role" | "teams" | "deactivate" | "transfer";

type Props = {
  kind: MemberDialogKind;
  member: OrgMember;
  members: OrgMember[];
  teams: Team[];
  onClose: () => void;
  // Called after a successful change with a toast message.
  onDone: (message: string) => void;
  // Reloads the members list and returns it, so a retry uses the latest version.
  refresh: () => Promise<OrgMember[]>;
};

type Attempt = (member: OrgMember) => Promise<OrgActionResult<unknown>>;

// One change to one member, with the version the API requires: a STALE_VERSION refusal reloads
// the member so the next try goes through, and OWNER_HAS_RFPS offers the reassignment step.
const useMemberChange = (initial: OrgMember, refresh: Props["refresh"]) => {
  const [member, setMember] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownedCount, setOwnedCount] = useState<number | null>(null);

  const run = async (attempt: Attempt, target: OrgMember = member): Promise<boolean> => {
    setBusy(true);
    setError(null);
    const result = await attempt(target);
    if (result.success) {
      setBusy(false);
      return true;
    }
    if (isVersionConflict(result)) {
      const fresh = (await refresh()).find((m) => m.userId === target.userId);
      if (fresh) setMember(fresh);
    }
    const owned = ownedRfpCount(result);
    if (owned !== null) setOwnedCount(owned);
    else setError(orgErrorMessage(result));
    setBusy(false);
    return false;
  };

  // After the proposals moved: reload (the version may have moved too) and retry the change.
  const retryAfterReassign = async (attempt: Attempt): Promise<boolean> => {
    const fresh = (await refresh()).find((m) => m.userId === member.userId) ?? member;
    setMember(fresh);
    setOwnedCount(null);
    return run(attempt, fresh);
  };

  return { member, busy, error, ownedCount, run, retryAfterReassign };
};

export default function MemberDialog(props: Props) {
  switch (props.kind) {
    case "role":
      return <ChangeRoleDialog {...props} />;
    case "teams":
      return <ChangeTeamsDialog {...props} />;
    case "deactivate":
      return <DeactivateDialog {...props} />;
    case "transfer":
      return <TransferOwnershipDialog {...props} />;
  }
}

function ChangeRoleDialog({ member: initial, members, onClose, onDone, refresh }: Props) {
  const change = useMemberChange(initial, refresh);
  const startRole = (initial.role && initial.role !== "owner" ? initial.role : "planner") as InvitableRole;
  const [role, setRole] = useState<InvitableRole>(startRole);
  const attempt: Attempt = (m) => changeMemberRoleAction(m.userId, role, m.version);
  const name = memberDisplayName(change.member);

  const save = async () => {
    if (await change.run(attempt)) onDone(`${name} is now ${roleWithArticle(role)}.`);
  };

  return (
    <OrgDialog
      title="Change role"
      description={<>Choose what <span className="font-semibold text-slate-700">{name}</span> can do in your organization.</>}
      busy={change.busy}
      onClose={onClose}
      footer={change.ownedCount === null && (
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={change.busy}>Cancel</button>
          <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={save} disabled={change.busy || role === initial.role}>
            {change.busy && <Spinner />} Save role
          </button>
        </>
      )}
    >
      <fieldset className="space-y-2" disabled={change.busy || change.ownedCount !== null}>
        <legend className="sr-only">Role</legend>
        {ASSIGNABLE_ROLES.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${role === option ? "border-[#008ad2] bg-sky-50/60" : "border-slate-200 hover:border-slate-300"}`}
          >
            <input type="radio" name="member-role" value={option} checked={role === option} onChange={() => setRole(option)} className="mt-1 accent-[#008ad2]" />
            <span>
              <span className="block text-sm font-semibold text-slate-800">
                {ROLE_LABELS[option]}
                {initial.role === option && <span className="ml-2 text-xs font-medium text-slate-400">Current</span>}
              </span>
              <span className="block text-xs leading-5 text-slate-500">{ROLE_DESCRIPTIONS[option]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {change.ownedCount === null && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          For the full comparison, see &ldquo;What each role can do&rdquo; on the Users page.
        </p>
      )}
      {change.ownedCount !== null && (
        <div className="mt-4">
          <ReassignRfpsPanel
            member={change.member}
            ownedRfpCount={change.ownedCount}
            members={members}
            continueLabel={`Reassign and make ${ROLE_LABELS[role]}`}
            onReassigned={async (to, count) => {
              if (await change.retryAfterReassign(attempt)) {
                onDone(`Moved ${count} proposal${count === 1 ? "" : "s"} to ${memberDisplayName(to)}. ${name} is now ${roleWithArticle(role)}.`);
              }
            }}
          />
        </div>
      )}
      {change.error && <div className="mt-4"><InlineError>{change.error}</InlineError></div>}
    </OrgDialog>
  );
}

function ChangeTeamsDialog({ member: initial, teams, onClose, onDone, refresh }: Props) {
  const change = useMemberChange(initial, refresh);
  const activeTeams = teams.filter((team) => !team.archived);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial.teams.map((team) => team.id)));
  const name = memberDisplayName(change.member);

  const toggle = (teamId: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });

  const save = async () => {
    const ok = await change.run((m) => changeMemberTeamsAction(m.userId, [...selected], m.version));
    if (ok) onDone(`Updated ${name}'s teams.`);
  };

  return (
    <OrgDialog
      title="Change teams"
      description={<>Pick the teams <span className="font-semibold text-slate-700">{name}</span> belongs to.</>}
      busy={change.busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={change.busy}>Cancel</button>
          <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={save} disabled={change.busy || activeTeams.length === 0}>
            {change.busy && <Spinner />} Save teams
          </button>
        </>
      }
    >
      {activeTeams.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          No teams yet. Create one on the Teams page first.
        </p>
      ) : (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {activeTeams.map((team) => (
            <li key={team.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:border-slate-300">
                <input type="checkbox" checked={selected.has(team.id)} onChange={() => toggle(team.id)} disabled={change.busy} className="h-4 w-4 accent-[#008ad2]" />
                <span className="font-medium">{team.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {change.error && <div className="mt-4"><InlineError>{change.error}</InlineError></div>}
    </OrgDialog>
  );
}

function DeactivateDialog({ member: initial, members, onClose, onDone, refresh }: Props) {
  const change = useMemberChange(initial, refresh);
  const attempt: Attempt = (m) => deactivateMemberAction(m.userId, m.version);
  const name = memberDisplayName(change.member);

  const confirm = async () => {
    if (await change.run(attempt)) onDone(`${name} was deactivated and signed out.`);
  };

  return (
    <OrgDialog
      title={`Deactivate ${name}?`}
      description="They're signed out everywhere and can't sign in to this organization until you reactivate them."
      busy={change.busy}
      onClose={onClose}
      footer={change.ownedCount === null && (
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={change.busy}>Cancel</button>
          <button type="button" className={dangerButtonClass} onClick={confirm} disabled={change.busy}>
            {change.busy ? <Spinner /> : <UserX size={15} aria-hidden="true" />} Deactivate
          </button>
        </>
      )}
    >
      {change.ownedCount === null ? (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-600">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          <p>Their proposal shares stay in place but grant nothing while they&apos;re deactivated. If they own proposals, you&apos;ll reassign them next.</p>
        </div>
      ) : (
        <ReassignRfpsPanel
          member={change.member}
          ownedRfpCount={change.ownedCount}
          members={members}
          continueLabel="Reassign and deactivate"
          onReassigned={async (to, count) => {
            if (await change.retryAfterReassign(attempt)) {
              onDone(`Moved ${count} proposal${count === 1 ? "" : "s"} to ${memberDisplayName(to)} and deactivated ${name}.`);
            }
          }}
        />
      )}
      {change.error && <div className="mt-4"><InlineError>{change.error}</InlineError></div>}
    </OrgDialog>
  );
}

function TransferOwnershipDialog({ member: initial, onClose, onDone, refresh }: Props) {
  const change = useMemberChange(initial, refresh);
  const [confirmed, setConfirmed] = useState(false);
  const name = memberDisplayName(change.member);

  const confirm = async () => {
    if (await change.run((m) => transferOwnershipAction(m.userId, m.version))) {
      onDone(`${name} is now the Owner. You're an Admin.`);
    }
  };

  return (
    <OrgDialog
      title="Transfer ownership"
      description={<>Make <span className="font-semibold text-slate-700">{name}</span> the Owner of this organization.</>}
      busy={change.busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={change.busy}>Cancel</button>
          <button type="button" className={dangerButtonClass} onClick={confirm} disabled={change.busy || !confirmed}>
            {change.busy ? <Spinner /> : <Crown size={15} aria-hidden="true" />} Transfer ownership
          </button>
        </>
      }
    >
      <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3.5 text-sm text-rose-800">
        <p className="font-semibold">You become an Admin</p>
        <p className="mt-1 text-xs leading-5">
          There&apos;s exactly one Owner. Only {name} will be able to transfer it back. Your other signed-in sessions, and theirs, are signed out.
        </p>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={change.busy} className="mt-0.5 h-4 w-4 accent-rose-600" />
        I understand I&apos;ll no longer be the Owner.
      </label>
      {change.error && <div className="mt-4"><InlineError>{change.error}</InlineError></div>}
    </OrgDialog>
  );
}
