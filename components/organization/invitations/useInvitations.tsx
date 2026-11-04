"use client";

import { RotateCw, Undo2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { listInvitationsAction, resendInvitationAction, revokeInvitationAction } from "@/app/actions/invitations";
import { formatWait, orgErrorMessage } from "../members/errorMessages";
import type { Invitation } from "../members/types";
import { dangerButtonClass, linkButtonClass, OrgDialog, secondaryButtonClass, Spinner } from "../members/ui";

/* Pending invitations with resend and revoke, shared by the Users table (Owners
   and Admins see invited people as rows) and the Team Manager's own list. */

export const DELIVERY_LABELS: Record<Invitation["emailDelivery"], { label: string; tone: "slate" | "emerald" | "rose" | "amber" }> = {
  queued: { label: "Queued", tone: "slate" },
  sending: { label: "Sending", tone: "amber" },
  sent: { label: "Email sent", tone: "emerald" },
  failed: { label: "Email failed", tone: "rose" },
};

const clock = () => Date.now();

export function useInvitations({ enabled = true, reloadKey = 0 }: { enabled?: boolean; reloadKey?: number } = {}) {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<Invitation | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());

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
    if (!enabled) return;
    // Initial load and parent-triggered reloads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [enabled, load, reloadKey]);

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
    if (result.success) toast.success(`Invitation to ${revoking.email} withdrawn.`);
    else toast.error(orgErrorMessage(result));
    setRevoking(null);
    void load();
  };

  const actionsFor = (invitation: Invitation) => {
    const waitMs = (cooldowns[invitation.id] ?? 0) - now;
    return (
      <InvitationActions
        resending={resendingId === invitation.id}
        waitMs={waitMs}
        onResend={() => void resend(invitation)}
        onRevoke={() => setRevoking(invitation)}
      />
    );
  };

  const revokeDialog = revoking ? (
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
  ) : null;

  return { invitations, loadError, load, actionsFor, revokeDialog };
}

function InvitationActions({
  resending,
  waitMs,
  onResend,
  onRevoke,
}: {
  resending: boolean;
  waitMs: number;
  onResend: () => void;
  onRevoke: () => void;
}) {
  const coolingDown = waitMs > 0;
  return (
    <span className="whitespace-nowrap">
      <button
        type="button"
        className={linkButtonClass}
        onClick={onResend}
        disabled={resending || coolingDown}
        title={coolingDown ? `You can resend in ${formatWait(waitMs / 1000)}` : undefined}
      >
        {resending ? <Spinner size={12} /> : <RotateCw size={12} className="mr-1 inline" aria-hidden="true" />}
        {coolingDown ? `Resend in ${formatWait(waitMs / 1000)}` : "Resend"}
      </button>
      <button type="button" className={`${linkButtonClass} text-rose-600 hover:bg-rose-50`} onClick={onRevoke}>
        <Undo2 size={12} className="mr-1 inline" aria-hidden="true" />
        Revoke
      </button>
    </span>
  );
}
