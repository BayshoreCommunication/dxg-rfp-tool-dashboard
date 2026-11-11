"use client";

import { grantRfpShareAction, revokeRfpShareAction } from "@/app/actions/rfpSharing";
import GlobalSelect from "@/components/shared/GlobalSelect";
import { Info, LoaderCircle, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import AccessDialog from "./AccessDialog";
import {
  memberEmail,
  memberName,
  permissionOptions,
  roleLabel,
  shareCandidates,
  type RfpAccessSnapshot,
  type RfpShare,
  type SharePermission,
} from "./rfpAccessModel";

export const selectClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 transition-colors hover:border-slate-300 focus:border-[#0786cf] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500";

const PERMISSION_LABEL: Record<SharePermission, string> = { view: "Can view", edit: "Can edit" };

type Props = {
  snapshot: RfpAccessSnapshot;
  onSharesChange: (shares: RfpShare[]) => void;
  onClose: () => void;
};

export default function ShareRfpDialog({ snapshot, onSharesChange, onClose }: Props) {
  const shares = snapshot.shares ?? [];
  const candidates = shareCandidates(snapshot);
  const [memberId, setMemberId] = useState("");
  const [permission, setPermission] = useState<SharePermission>("view");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const selected = candidates.find((member) => member.userId === memberId);
  const allowedForSelected = permissionOptions(selected);
  const effectivePermission = allowedForSelected.includes(permission) ? permission : "view";

  const run = async (key: string, work: () => ReturnType<typeof grantRfpShareAction>, success: string) => {
    setBusyKey(key);
    setError("");
    const result = await work();
    setBusyKey(null);
    if (!result.success) {
      setError(result.message);
      return false;
    }
    onSharesChange(result.data);
    toast.success(success);
    return true;
  };

  const add = async () => {
    if (!selected) {
      setError("Choose a member to share with.");
      return;
    }
    const added = await run(
      "add",
      () => grantRfpShareAction(snapshot.proposalId, selected.userId, effectivePermission),
      `Shared with ${memberName(selected.userId, snapshot)}.`,
    );
    if (added) {
      setMemberId("");
      setPermission("view");
    }
  };

  const busy = busyKey !== null;

  return (
    <AccessDialog
      title={`Share “${snapshot.title}”`}
      description="People you add see this proposal in their list. Edit lets them change it too."
      busy={busy}
      onClose={onClose}
      footer={(
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
        >
          Done
        </button>
      )}
    >
      {snapshot.directory ? (
        <section aria-label="Add people" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0786cf]">Add people</p>
          {candidates.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Everyone in your organization who can be added already has access.</p>
          ) : (
            <div className="mt-3 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
              <GlobalSelect aria-label="Member" value={memberId} onChange={(event) => { setMemberId(event.target.value); setError(""); }} className={selectClass} disabled={busy}>
                <option value="">Choose a member…</option>
                {candidates.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {`${member.name?.trim() || member.email || "Member"} · ${roleLabel(member)}`}
                  </option>
                ))}
              </GlobalSelect>
              <GlobalSelect aria-label="Permission" value={effectivePermission} onChange={(event) => setPermission(event.target.value as SharePermission)} className={selectClass} disabled={busy}>
                {allowedForSelected.map((option) => <option key={option} value={option}>{PERMISSION_LABEL[option]}</option>)}
              </GlobalSelect>
              <button
                type="button"
                onClick={() => void add()}
                disabled={busy || !selected}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0786cf] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#066fab] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyKey === "add" ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
                Share
              </button>
            </div>
          )}
          {selected && allowedForSelected.length === 1 && (
            <p className="mt-2 text-xs text-slate-500">Viewers can only be given View access.</p>
          )}
        </section>
      ) : (
        <p className="flex items-start gap-2.5 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm leading-6 text-sky-900">
          <Info size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
          Only Owners and Admins can browse your organization’s members, so ask one of them to add people. You can still change or remove the access below.
        </p>
      )}

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">{error}</p>}

      <section aria-label="People with access" className="mt-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">People with access</p>
        <ul className="mt-2 max-h-[min(22rem,45dvh)] divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200">
          <li className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{memberName(snapshot.ownerUserId, snapshot)}</p>
              {snapshot.ownerUserId && memberEmail(snapshot.ownerUserId, snapshot) && (
                <p className="truncate text-xs text-slate-500">{memberEmail(snapshot.ownerUserId, snapshot)}</p>
              )}
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Proposal owner</span>
          </li>
          {shares.length === 0 && (
            <li className="px-4 py-4 text-sm text-slate-500">Not shared with anyone yet.</li>
          )}
          {shares.map((share) => {
            const member = snapshot.directory?.find((item) => item.userId === share.userId);
            const email = memberEmail(share.userId, snapshot);
            const options = permissionOptions(member);
            const rowBusy = busyKey === share.userId;
            return (
              <li key={share.userId} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{memberName(share.userId, snapshot)}</p>
                    {!share.memberActive && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200">Inactive member</span>
                    )}
                  </div>
                  {email && <p className="truncate text-xs text-slate-500">{email}</p>}
                  {share.grantedBy && (
                    <p className="mt-0.5 text-xs text-slate-400">Shared by {memberName(share.grantedBy, snapshot)}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div role="group" aria-label={`Permission for ${memberName(share.userId, snapshot)}`} className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    {(["view", "edit"] as const).map((option) => {
                      const current = share.permission === option;
                      const blocked = !options.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={current}
                          disabled={busy || blocked}
                          title={blocked ? "Viewers can only be given View access." : undefined}
                          onClick={() => {
                            if (current) return;
                            void run(share.userId, () => grantRfpShareAction(snapshot.proposalId, share.userId, option), `Access changed to ${option === "edit" ? "Edit" : "View"}.`);
                          }}
                          className={`min-h-9 rounded-lg px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed ${
                            current ? "bg-white text-[#0786cf] shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800 disabled:text-slate-300"
                          }`}
                        >
                          {option === "edit" ? "Edit" : "View"}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove access for ${memberName(share.userId, snapshot)}`}
                    onClick={() => void run(share.userId, () => revokeRfpShareAction(snapshot.proposalId, share.userId), "Access removed.")}
                    disabled={busy}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
                  >
                    {rowBusy ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </AccessDialog>
  );
}
