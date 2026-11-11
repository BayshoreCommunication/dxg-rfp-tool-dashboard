"use client";

import { getRfpAccessAction, setRfpTeamAction } from "@/app/actions/rfpSharing";
import GlobalSelect from "@/components/shared/GlobalSelect";
import { LoaderCircle, RotateCw, Share2, UserRound, UserRoundCog, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import ReassignRfpDialog from "./ReassignRfpDialog";
import ShareRfpDialog, { selectClass } from "./ShareRfpDialog";
import {
  NO_TEAM,
  deriveCapabilities,
  memberName,
  teamChoices,
  teamLabel,
  type RfpAccessSnapshot,
} from "./rfpAccessModel";

type Props = {
  proposalId: string;
  initial?: RfpAccessSnapshot | null;
};

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; snapshot: RfpAccessSnapshot };

// Owner, team and sharing for one RFP, with Share and Reassign actions for those allowed.
export default function RfpAccessPanel({ proposalId, initial = null }: Props) {
  const router = useRouter();
  const [load, setLoad] = useState<Load>(initial ? { state: "ready", snapshot: initial } : { state: "loading" });
  const [dialog, setDialog] = useState<"share" | "reassign" | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamError, setTeamError] = useState("");

  const reload = useCallback(async () => {
    const result = await getRfpAccessAction(proposalId);
    setLoad(result.success ? { state: "ready", snapshot: result.data } : { state: "error", message: result.message });
  }, [proposalId]);

  useEffect(() => {
    if (initial) return;
    let active = true;
    void getRfpAccessAction(proposalId).then((result) => {
      if (!active) return;
      setLoad(result.success ? { state: "ready", snapshot: result.data } : { state: "error", message: result.message });
    });
    return () => { active = false; };
  }, [initial, proposalId]);

  if (load.state === "loading") {
    return (
      <div role="status" className="flex min-h-14 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-500">
        <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Loading owner, team and sharing…
      </div>
    );
  }

  if (load.state === "error") {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <span>{load.message}</span>
        <button
          type="button"
          onClick={() => { setLoad({ state: "loading" }); void reload(); }}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50"
        >
          <RotateCw size={14} aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }

  const { snapshot } = load;
  const capabilities = deriveCapabilities(snapshot);
  const sharedCount = snapshot.shares?.length ?? 0;
  const update = (next: Partial<RfpAccessSnapshot>) => setLoad({ state: "ready", snapshot: { ...snapshot, ...next } });

  const changeTeam = async (value: string) => {
    const teamId = value === NO_TEAM ? null : value;
    if (teamId === snapshot.teamId) return;
    setSavingTeam(true);
    setTeamError("");
    const result = await setRfpTeamAction(snapshot.proposalId, teamId);
    setSavingTeam(false);
    if (!result.success) {
      setTeamError(result.message);
      return;
    }
    update({ teamId: result.data.teamId });
    toast.success(result.data.teamId ? `Team set to ${teamLabel(result.data.teamId, snapshot.teams)}.` : "Team removed.");
  };

  return (
    <section aria-label="Owner, team and sharing" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <dl className="grid flex-1 gap-4 sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
              <UserRound size={13} aria-hidden="true" /> Owner
            </dt>
            <dd className="mt-1.5 truncate text-sm font-semibold text-slate-900">{memberName(snapshot.ownerUserId, snapshot)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
              <Users size={13} aria-hidden="true" /> Team
            </dt>
            <dd className="mt-1.5">
              {capabilities.canChangeTeam ? (
                <div className="flex items-center gap-2">
                  <GlobalSelect aria-label="Proposal team" value={snapshot.teamId ?? NO_TEAM} onChange={(event) => void changeTeam(event.target.value)} className={selectClass} disabled={savingTeam}>
                    <option value={NO_TEAM}>No team</option>
                    {teamChoices(snapshot.teamId, snapshot.teams).map((team) => (
                      <option key={team.id} value={team.id}>{team.label}</option>
                    ))}
                  </GlobalSelect>
                  {savingTeam && <LoaderCircle size={16} className="shrink-0 animate-spin text-slate-400 motion-reduce:animate-none" aria-label="Saving team" />}
                </div>
              ) : (
                <span className="truncate text-sm font-semibold text-slate-900">{teamLabel(snapshot.teamId, snapshot.teams)}</span>
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
              <Share2 size={13} aria-hidden="true" /> Shared with
            </dt>
            <dd className="mt-1.5 text-sm font-semibold text-slate-900">
              {capabilities.canShare
                ? sharedCount === 0 ? "Nobody yet" : `${sharedCount} ${sharedCount === 1 ? "person" : "people"}`
                : snapshot.ownerUserId && snapshot.ownerUserId === snapshot.viewerUserId ? "Only you" : "Shared with you"}
            </dd>
          </div>
        </dl>

        {(capabilities.canShare || capabilities.canReassign) && (
          <div className="flex flex-wrap gap-2">
            {capabilities.canReassign && (
              <button
                type="button"
                onClick={() => setDialog("reassign")}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-[#0786cf] hover:text-[#0786cf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <UserRoundCog size={16} aria-hidden="true" /> Reassign owner
              </button>
            )}
            {capabilities.canShare && (
              <button
                type="button"
                onClick={() => setDialog("share")}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0786cf] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#066fab] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
              >
                <Share2 size={16} aria-hidden="true" /> Share
              </button>
            )}
          </div>
        )}
      </div>
      {teamError && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{teamError}</p>}

      {dialog === "share" && (
        <ShareRfpDialog
          snapshot={snapshot}
          onSharesChange={(shares) => update({ shares })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "reassign" && (
        <ReassignRfpDialog
          snapshot={snapshot}
          onReassigned={() => {
            setDialog(null);
            void reload();
            router.refresh();
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}
