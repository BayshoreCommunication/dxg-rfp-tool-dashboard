"use client";

import { Mail, MailPlus, RotateCw, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { listInvitationsAction, resendInvitationAction, revokeInvitationAction } from "@/app/actions/invitations";
import { formatWait, orgErrorMessage } from "../members/errorMessages";
import { roleLabel } from "../members/orgAccess";
import type { Invitation, OrgAccess, Team } from "../members/types";
import {
  Badge,
  dangerButtonClass,
  EmptyState,
  formatDate,
  InlineError,
  linkButtonClass,
  OrgDialog,
  primaryButtonClass,
  primaryButtonStyle,
  ROLE_TONES,
  secondaryButtonClass,
  sectionClass,
  sectionTitleClass,
  Spinner,
  TableSkeleton,
} from "../members/ui";
import InviteDialog from "./InviteDialog";

type Props = {
  access: OrgAccess;
  teams: Team[];
  // Bumped by the parent to make this section reload (e.g. after the header's Invite button).
  reloadKey?: number;
};

const DELIVERY_LABELS: Record<Invitation["emailDelivery"], { label: string; tone: "slate" | "emerald" | "rose" | "amber" }> = {
  queued: { label: "Queued", tone: "slate" },
  sending: { label: "Sending", tone: "amber" },
  sent: { label: "Email sent", tone: "emerald" },
  failed: { label: "Email failed", tone: "rose" },
};

const clock = () => Date.now();

export default function InvitationsSection({ access, teams, reloadKey = 0 }: Props) {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revoking, setRevoking] = useState<Invitation | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const teamNames = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);

  const load = useCallback(async () => {
    const result = await listInvitationsAction("pending");
    if (result.success) {
      setInvitations(result.data ?? []);
      setLoadError(null);
    } else {
      setLoadError(orgErrorMessage(result, "Pending invitations couldn't be loaded."));
    }
  }, []);

  useEffect(() => {
    // Initial load and parent-triggered reloads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, reloadKey]);

  // Ticks the resend countdowns.
  useEffect(() => {
    if (Object.keys(cooldowns).length === 0) return;
    const timer = setInterval(() => setNow(clock()), 15_000);
    return () => clearInterval(timer);
  }, [cooldowns]);

  const startCooldown = (id: string, seconds: number) => {
    const at = clock();
    setCooldowns((previous) => ({ ...previous, [id]: at + seconds * 1000 }));
    setNow(at);
  };

  const resend = async (invitation: Invitation) => {
    setResendingId(invitation.id);
    const result = await resendInvitationAction(invitation.id);
    setResendingId(null);
    if (result.success) {
      toast.success(`Invitation resent to ${invitation.email}. The previous link no longer works.`);
      startCooldown(invitation.id, 5 * 60);
      void load();
      return;
    }
    if (result.code === "INVITATION_RESEND_COOLDOWN") {
      const seconds = Number(result.details?.retryAfterSeconds ?? 300);
      startCooldown(invitation.id, seconds);
    }
    toast.error(orgErrorMessage(result));
    if (result.code === "INVITATION_NOT_PENDING" || result.code === "INVITATION_NOT_FOUND") void load();
  };

  const revoke = async () => {
    if (!revoking) return;
    setRevokeBusy(true);
    const result = await revokeInvitationAction(revoking.id);
    setRevokeBusy(false);
    if (result.success) {
      toast.success(`Invitation to ${revoking.email} withdrawn.`);
      setRevoking(null);
      void load();
    } else {
      toast.error(orgErrorMessage(result));
      setRevoking(null);
      void load();
    }
  };

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
                  const waitMs = (cooldowns[invitation.id] ?? 0) - now;
                  const coolingDown = waitMs > 0;
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
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          className={linkButtonClass}
                          onClick={() => resend(invitation)}
                          disabled={resendingId === invitation.id || coolingDown}
                          title={coolingDown ? `You can resend in ${formatWait(waitMs / 1000)}` : undefined}
                        >
                          {resendingId === invitation.id ? <Spinner size={12} /> : <RotateCw size={12} className="mr-1 inline" aria-hidden="true" />}
                          {coolingDown ? `Resend in ${formatWait(waitMs / 1000)}` : "Resend"}
                        </button>
                        <button type="button" className={`${linkButtonClass} text-rose-600 hover:bg-rose-50`} onClick={() => setRevoking(invitation)}>
                          <Undo2 size={12} className="mr-1 inline" aria-hidden="true" />
                          Revoke
                        </button>
                      </td>
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

      {revoking && (
        <OrgDialog
          title="Revoke invitation?"
          description={<>The link sent to <span className="font-semibold text-slate-700">{revoking.email}</span> stops working at once. You can invite them again later.</>}
          busy={revokeBusy}
          onClose={() => setRevoking(null)}
          footer={
            <>
              <button type="button" className={secondaryButtonClass} onClick={() => setRevoking(null)} disabled={revokeBusy}>Cancel</button>
              <button type="button" className={dangerButtonClass} onClick={revoke} disabled={revokeBusy}>
                {revokeBusy && <Spinner />} Revoke invitation
              </button>
            </>
          }
        />
      )}
    </section>
  );
}
