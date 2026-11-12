"use client";

import { reassignRfpOwnerAction } from "@/app/actions/rfpSharing";
import GlobalSelect from "@/components/shared/GlobalSelect";
import { ArrowRight, LoaderCircle, UserRoundCog } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import AccessDialog from "./AccessDialog";
import { selectClass } from "./ShareRfpDialog";
import { memberName, reassignCandidates, roleLabel, type RfpAccessSnapshot } from "./rfpAccessModel";

type Props = {
  snapshot: RfpAccessSnapshot;
  onReassigned: () => void;
  onClose: () => void;
};

export default function ReassignRfpDialog({ snapshot, onReassigned, onClose }: Props) {
  const candidates = reassignCandidates(snapshot);
  const [toUserId, setToUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const target = candidates.find((member) => member.userId === toUserId);

  const confirm = async () => {
    if (!target || !snapshot.ownerUserId) {
      setError("Choose the member who should own this proposal.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await reassignRfpOwnerAction({
      proposalId: snapshot.proposalId,
      fromUserId: snapshot.ownerUserId,
      toUserId: target.userId,
    });
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    toast.success(`${memberName(target.userId, snapshot)} now owns this proposal.`);
    onReassigned();
  };

  return (
    <AccessDialog
      title="Reassign proposal owner"
      description="The new owner gets full control of this proposal. Shares and the team stay as they are."
      busy={busy}
      onClose={onClose}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy || !target}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0786cf] px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#066fab] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <UserRoundCog size={16} aria-hidden="true" />}
            {busy ? "Reassigning…" : "Reassign proposal"}
          </button>
        </>
      )}
    >
      <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Current owner</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">{memberName(snapshot.ownerUserId, snapshot)}</p>
        </div>
        <ArrowRight size={18} className="hidden text-slate-400 sm:block" aria-hidden="true" />
        <div>
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">New owner</p>
          {candidates.length === 0 ? (
            <p className="text-sm text-slate-600">No other active member can own proposals. Viewers can’t own proposals.</p>
          ) : (
            <GlobalSelect aria-label="New owner" value={toUserId} onChange={(event) => { setToUserId(event.target.value); setError(""); }} className={selectClass} disabled={busy}>
              <option value="">Choose a member…</option>
              {candidates.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {`${member.name?.trim() || member.email || "Member"} · ${roleLabel(member)}`}
                </option>
              ))}
            </GlobalSelect>
          )}
        </div>
      </div>
      {target && (
        <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-900">
          {memberName(snapshot.ownerUserId, snapshot)} will keep access only through their role, their team or a share.
        </p>
      )}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">{error}</p>}
    </AccessDialog>
  );
}
