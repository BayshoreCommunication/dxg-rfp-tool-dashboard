"use client";

import { CheckCircle2, MailPlus, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { createBulkInvitationsAction, createInvitationAction } from "@/app/actions/invitations";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, invitableRoles, inviteTeamRequired } from "../members/orgAccess";
import type { InvitableRole, OrgAccess, Team } from "../members/types";
import {
  InlineError,
  OrgDialog,
  inputClass,
  labelClass,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  Spinner,
} from "../members/ui";
import { bulkInviteOutcome, singleInviteOutcome, type InviteOutcome } from "./inviteResults";
import { MAX_BULK_INVITATIONS, summarizeEmailList } from "./parseEmails";

type Props = {
  access: OrgAccess;
  teams: Team[];
  onClose: () => void;
  // Something was invited: reload the pending list.
  onInvited: () => void;
};

export default function InviteDialog({ access, teams, onClose, onInvited }: Props) {
  const roles = invitableRoles(access);
  const teamRequired = inviteTeamRequired(access);
  const activeTeams = teams.filter((team) => !team.archived);
  const [text, setText] = useState("");
  const [role, setRole] = useState<InvitableRole>(roles.includes("planner") ? "planner" : roles[0]);
  const [teamId, setTeamId] = useState(teamRequired ? activeTeams[0]?.id ?? "" : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Extract<InviteOutcome, { kind: "rows" }> | null>(null);
  const summary = useMemo(() => summarizeEmailList(text), [text]);

  const submit = async () => {
    setError(null);
    if (summary.emails.length === 0) return setError("Enter at least one email address.");
    if (summary.tooMany) return setError(`Invite at most ${MAX_BULK_INVITATIONS} people at a time.`);
    if (teamRequired && !teamId) return setError("Choose one of your teams for these invitations.");
    setBusy(true);
    const result =
      summary.emails.length === 1
        ? singleInviteOutcome(summary.emails[0], await createInvitationAction({ email: summary.emails[0], role, teamId: teamId || null }))
        : bulkInviteOutcome(await createBulkInvitationsAction({ emails: summary.emails, role, teamId: teamId || null }));
    setBusy(false);
    if (result.kind === "error") return setError(result.message);
    setOutcome(result);
    if (result.invited > 0) onInvited();
  };

  if (outcome) {
    return (
      <OrgDialog
        title={outcome.invited > 0 ? "Invitations sent" : "No invitations sent"}
        description={`${outcome.invited} invited${outcome.refused > 0 ? ` · ${outcome.refused} not invited` : ""}`}
        onClose={onClose}
        footer={
          <>
            <button type="button" className={secondaryButtonClass} onClick={() => { setOutcome(null); setText(""); }}>Invite more</button>
            <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={onClose}>Done</button>
          </>
        }
      >
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200" aria-label="Invitation results">
          {outcome.rows.map((row) => (
            <li key={`${row.row}-${row.email}`} className="flex items-start gap-3 px-4 py-3">
              {row.invited ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" aria-label="Invited" />
              ) : (
                <XCircle size={18} className="mt-0.5 shrink-0 text-rose-500" aria-label="Not invited" />
              )}
              <div className="min-w-0">
                <p className="break-all text-sm font-medium text-slate-800">{row.email}</p>
                <p className={`text-xs leading-5 ${row.invited ? "text-emerald-700" : "text-rose-700"}`}>
                  {row.invited ? `Invited as ${ROLE_LABELS[role]}` : row.reason}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </OrgDialog>
    );
  }

  return (
    <OrgDialog
      title="Invite people"
      description="Paste one email or a list. Separate addresses with commas or new lines."
      busy={busy}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={submit} disabled={busy || summary.emails.length === 0}>
            {busy ? <Spinner /> : <MailPlus size={15} aria-hidden="true" />}
            {summary.emails.length > 1 ? `Send ${summary.emails.length} invitations` : "Send invitation"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="invite-emails" className={labelClass}>Email addresses</label>
          <textarea
            id="invite-emails"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            placeholder={"jane@company.com\nsam@company.com, alex@company.com"}
            className={`${inputClass} h-auto resize-y py-2.5 leading-6`}
            disabled={busy}
          />
          <p className="mt-1.5 text-xs text-slate-500" aria-live="polite">
            {summary.emails.length === 0
              ? "You can paste straight from a spreadsheet or email client."
              : `${summary.emails.length} address${summary.emails.length === 1 ? "" : "es"}`}
            {summary.invalid.length > 0 && (
              <span className="text-amber-700"> · {summary.invalid.length} look{summary.invalid.length === 1 ? "s" : ""} invalid</span>
            )}
            {summary.duplicates.length > 0 && (
              <span className="text-amber-700"> · {summary.duplicates.length} repeated</span>
            )}
          </p>
        </div>

        <fieldset>
          <legend className={labelClass}>Role</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {roles.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${role === option ? "border-[#008ad2] bg-sky-50/60" : "border-slate-200 hover:border-slate-300"}`}
              >
                <input type="radio" name="invite-role" value={option} checked={role === option} onChange={() => setRole(option)} disabled={busy} className="mt-1 accent-[#008ad2]" />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{ROLE_LABELS[option]}</span>
                  <span className="block text-xs leading-5 text-slate-500">{ROLE_DESCRIPTIONS[option]}</span>
                </span>
              </label>
            ))}
          </div>
          {teamRequired && (
            <p className="mt-2 text-xs text-slate-500">As a Team Manager you can invite Planners and Viewers into teams you manage.</p>
          )}
        </fieldset>

        <div>
          <label htmlFor="invite-team" className={labelClass}>Team {teamRequired ? "" : <span className="font-normal">(optional)</span>}</label>
          <select id="invite-team" className={`${inputClass} appearance-auto`} value={teamId} onChange={(event) => setTeamId(event.target.value)} disabled={busy}>
            {!teamRequired && <option value="">No team</option>}
            {activeTeams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          {teamRequired && activeTeams.length === 0 && (
            <p className="mt-1.5 text-xs text-amber-700">There are no teams to invite into yet.</p>
          )}
        </div>

        {error && <InlineError>{error}</InlineError>}
      </div>
    </OrgDialog>
  );
}
