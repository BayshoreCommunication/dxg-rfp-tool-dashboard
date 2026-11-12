"use client";

import { ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { reassignMemberRfpsAction } from "@/app/actions/organizationMembers";
import { orgErrorMessage } from "./errorMessages";
import { memberDisplayName, reassignTargets, roleLabel } from "./orgAccess";
import type { OrgMember } from "./types";
import { InlineError, inputClass, labelClass, primaryButtonClass, primaryButtonStyle, Spinner } from "./ui";

type Props = {
  member: OrgMember;
  ownedRfpCount: number;
  members: OrgMember[];
  // Runs after the proposals moved; the caller retries the change that was refused.
  onReassigned: (toMember: OrgMember, count: number) => void | Promise<void>;
  continueLabel: string;
};

// ORG-207 offboarding step: a member who owns proposals hands them to someone else before a change
// that would leave the proposals without an owner (deactivation, or becoming a Viewer).
export default function ReassignRfpsPanel({ member, ownedRfpCount, members, onReassigned, continueLabel }: Props) {
  const candidates = reassignTargets(members, member.userId);
  const [toUserId, setToUserId] = useState(candidates[0]?.userId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const target = candidates.find((candidate) => candidate.userId === toUserId);
    if (!target) {
      setError("Choose who receives the proposals.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await reassignMemberRfpsAction(member.userId, target.userId);
    if (!result.success) {
      setError(orgErrorMessage(result));
      setBusy(false);
      return;
    }
    await onReassigned(target, result.data?.reassignedCount ?? ownedRfpCount);
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex items-start gap-3">
        <ArrowRightLeft size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {memberDisplayName(member)} owns {ownedRfpCount > 0 ? ownedRfpCount : "some"} proposal{ownedRfpCount === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-900/80">
            Reassign them to another active member first. The new owner gets full access; nothing else about the proposals changes.
          </p>
        </div>
      </div>
      {candidates.length === 0 ? (
        <p className="mt-3 text-sm text-amber-900">
          There&apos;s no other active member who can own proposals. Invite or reactivate a Planner, Team Manager or Admin first.
        </p>
      ) : (
        <div className="mt-4">
          <label htmlFor={`reassign-${member.userId}`} className={labelClass}>Reassign proposals to</label>
          <select
            id={`reassign-${member.userId}`}
            className={`${inputClass} appearance-auto`}
            value={toUserId}
            onChange={(event) => setToUserId(event.target.value)}
            disabled={busy}
          >
            {candidates.map((candidate) => (
              <option key={candidate.userId} value={candidate.userId}>
                {memberDisplayName(candidate)} · {roleLabel(candidate.role)}
              </option>
            ))}
          </select>
          {error && <div className="mt-3"><InlineError>{error}</InlineError></div>}
          <button type="button" onClick={submit} disabled={busy || !toUserId} className={`${primaryButtonClass} mt-4 w-full`} style={primaryButtonStyle}>
            {busy && <Spinner />}
            {busy ? "Reassigning…" : continueLabel}
          </button>
        </div>
      )}
    </div>
  );
}
