"use client";

import { Mail, MailPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { roleLabel } from "../members/orgAccess";
import type { OrgAccess, Team } from "../members/types";
import {
  Badge,
  EmptyState,
  formatDate,
  InlineError,
  primaryButtonClass,
  primaryButtonStyle,
  ROLE_TONES,
  sectionClass,
  sectionTitleClass,
  TableSkeleton,
} from "../members/ui";
import InviteDialog from "./InviteDialog";
import { DELIVERY_LABELS, useInvitations } from "./useInvitations";

/* The Team Manager's view of pending invitations. Owners and Admins see the
   same invitations as "Invited" rows in the Users table instead. */

type Props = {
  access: OrgAccess;
  teams: Team[];
  // Bumped by the parent to make this section reload (e.g. after the header's Invite button).
  reloadKey?: number;
};

export default function InvitationsSection({ access, teams, reloadKey = 0 }: Props) {
  const { invitations, loadError, load, actionsFor, revokeDialog } = useInvitations({ reloadKey });
  const [inviteOpen, setInviteOpen] = useState(false);
  const teamNames = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);

  return (
    <section className={sectionClass} aria-labelledby="pending-invitations-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="pending-invitations-title" className={sectionTitleClass}>Pending invitations</h2>
          <p className="mt-2 text-sm text-slate-500">Links expire after 7 days. Resending sends a fresh link and restarts the clock.</p>
        </div>
        <button type="button" className={primaryButtonClass} style={primaryButtonStyle} onClick={() => setInviteOpen(true)}>
          <MailPlus size={15} aria-hidden="true" /> Invite people
        </button>
      </div>

      <div className="mt-6">
        {loadError ? (
          <InlineError>{loadError}</InlineError>
        ) : invitations === null ? (
          <TableSkeleton rows={2} />
        ) : invitations.length === 0 ? (
          <EmptyState icon={<Mail size={20} />} title="No pending invitations" body="Invite teammates and they'll show up here until they accept." />
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#e4e4e4]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#f5f6f8] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Role</th>
                  <th scope="col" className="px-4 py-3">Team</th>
                  <th scope="col" className="px-4 py-3">Sent</th>
                  <th scope="col" className="px-4 py-3">Expires</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((invitation) => {
                  const delivery = DELIVERY_LABELS[invitation.emailDelivery] ?? DELIVERY_LABELS.queued;
                  return (
                    <tr key={invitation.id} className="text-slate-700">
                      <td className="px-4 py-3">
                        <p className="break-all font-medium text-slate-800">{invitation.email}</p>
                        <div className="mt-1"><Badge tone={delivery.tone}>{delivery.label}</Badge></div>
                      </td>
                      <td className="px-4 py-3"><Badge tone={ROLE_TONES[invitation.role] ?? "slate"}>{roleLabel(invitation.role)}</Badge></td>
                      <td className="px-4 py-3 text-slate-500">{invitation.teamId ? teamNames.get(invitation.teamId) ?? "Archived team" : "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(invitation.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(invitation.expiresAt)}</td>
                      <td className="px-4 py-3 text-right">{actionsFor(invitation)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {inviteOpen && (
        <InviteDialog access={access} teams={teams} onClose={() => setInviteOpen(false)} onInvited={() => void load()} />
      )}

      {revokeDialog}
    </section>
  );
}
