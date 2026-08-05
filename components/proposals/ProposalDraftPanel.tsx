"use client";
import { useEffect, useRef, useState } from "react";
import { getLatestProposalContextAction } from "@/app/actions/proposalContext";
import { getCandidateReviewAction } from "@/app/actions/candidateApplication";
import {
  createProposalDraftAction,
  decideDraftSectionAction,
  getLatestProposalDraftAction,
  getProposalDraftAction,
  regenerateDraftSectionAction,
  type ProposalDraft,
  type ProposalDraftSection,
} from "@/app/actions/proposalDraft";
import { getDurableJob } from "@/app/actions/durableJobs";
import { nextPollDelay } from "@/lib/asyncOperations";
import { proposalFieldLabel } from "@/lib/proposals/proposalFieldLabel";
import AiRunEvidence from "./AiRunEvidence";

type Overlay = {
  runId: string;
  section: ProposalDraftSection;
  showOriginal: boolean;
};

const versionConflictMessage =
  "The proposal changed — regenerate from the latest draft.";
const draftStatusLabel = (status: string) =>
  ({
    queued: "Starting…",
    running: "Creating your draft…",
    retry_scheduled: "Trying again…",
    succeeded: "Draft ready",
    failed: "Needs attention",
    dead_letter: "Needs attention",
    cancelled: "Cancelled",
  })[status] ?? status.replaceAll("_", " ");

export default function ProposalDraftPanel({
  proposalId,
}: {
  proposalId: string;
}) {
  const [version, setVersion] = useState<number>(),
    [jobId, setJobId] = useState<string>(),
    [runId, setRunId] = useState<string>(),
    [status, setStatus] = useState("idle"),
    [draft, setDraft] = useState<ProposalDraft>(),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const [overlays, setOverlays] = useState<Record<string, Overlay>>({}),
    [sectionBusy, setSectionBusy] = useState<
      Record<string, "deciding" | "regenerating" | undefined>
    >({}),
    [sectionErrors, setSectionErrors] = useState<
      Record<string, string | undefined>
    >({}),
    [rejectingKey, setRejectingKey] = useState<string>(),
    [rejectReason, setRejectReason] = useState("");
  const mounted = useRef(true),
    regenTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    mounted.current = true;
    const timers = regenTimers.current;
    return () => {
      mounted.current = false;
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);
  // Regenerated sections never replace the stored full draft; the newest
  // succeeded scoped child run per section is overlaid on the parent.
  const loadOverlays = async (data: ProposalDraft) => {
    const newestByKey = new Map<string, string>();
    for (const regeneration of data.regenerations)
      if (
        regeneration.status === "succeeded" &&
        regeneration.section_scope &&
        !newestByKey.has(regeneration.section_scope)
      )
        newestByKey.set(regeneration.section_scope, regeneration.id);
    const loaded = await Promise.all(
      [...newestByKey].map(async ([key, childRunId]) => {
        const child = await getProposalDraftAction(proposalId, childRunId);
        const section = child.success
          ? child.data.sections.find((s) => s.key === key)
          : undefined;
        return section
          ? ([
              key,
              { runId: childRunId, section, showOriginal: false },
            ] as const)
          : undefined;
      }),
    );
    if (mounted.current)
      setOverlays(
        Object.fromEntries(loaded.filter((entry) => entry !== undefined)),
      );
  };
  const refreshLatest = async () => {
    const latest = await getLatestProposalDraftAction(proposalId);
    if (!latest.success || !mounted.current) return;
    setDraft(latest.data);
    setStatus("succeeded");
    if (typeof latest.data.run.id === "string") setRunId(latest.data.run.id);
    await loadOverlays(latest.data);
  };
  useEffect(() => {
    void (async () => {
      const latest = await getLatestProposalContextAction(proposalId);
      if (latest.success && typeof latest.data.run.id === "string") {
        const review = await getCandidateReviewAction(
          proposalId,
          latest.data.run.id,
        );
        if (review.success) setVersion(review.data.proposalVersion);
      }
      const old = await getLatestProposalDraftAction(proposalId);
      if (old.success) {
        setDraft(old.data);
        setStatus("succeeded");
        if (typeof old.data.run.id === "string") setRunId(old.data.run.id);
        await loadOverlays(old.data);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);
  useEffect(() => {
    if (!jobId || !["queued", "running", "retry_scheduled"].includes(status))
      return;
    const timer = setInterval(async () => {
      const j = await getDurableJob(jobId);
      if (!j.success) {
        setError(j.message);
        clearInterval(timer);
        return;
      }
      setStatus(j.data.status);
      if (j.data.status === "succeeded" && runId) {
        const d = await getProposalDraftAction(proposalId, runId);
        if (d.success) {
          setDraft(d.data);
          await loadOverlays(d.data);
        } else setError(d.message);
      }
      if (["failed", "dead_letter", "cancelled"].includes(j.data.status)) {
        setError(
          j.data.errorCode === "LIVE_AI_KILLED"
            ? "Live AI was blocked by the emergency kill switch. No provider call was made."
            : [
                  "PROPOSAL_VERSION_CONFLICT",
                  "PROPOSAL_VERSION_OR_LIFECYCLE_CONFLICT",
                ].includes(String(j.data.errorCode))
              ? "Drafting was blocked because the proposal changed or is no longer an eligible draft. No new AI draft was created."
              : "Live proposal drafting did not complete safely. Try again after checking pilot readiness.",
        );
      }
      if (
        ["failed", "dead_letter", "cancelled", "succeeded"].includes(
          j.data.status,
        )
      )
        clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, proposalId, runId, status]);
  const generate = async () => {
    if (!version) {
      setError("Apply or review proposal context before drafting.");
      return;
    }
    setBusy(true);
    setError(undefined);
    const r = await createProposalDraftAction(proposalId, version);
    setBusy(false);
    if (!r.success) {
      setError(r.message);
      return;
    }
    setJobId(r.data.jobId);
    setRunId(r.data.runId);
    setStatus(r.data.status);
  };
  const setOneSectionError = (sectionKey: string, message?: string) =>
    setSectionErrors((v) => ({ ...v, [sectionKey]: message }));
  const decide = async (
    sectionKey: string,
    decision: "accepted" | "rejected",
    reason?: string,
  ) => {
    if (!draft || typeof draft.run.id !== "string" || sectionBusy[sectionKey])
      return;
    const parentRunId = draft.run.id;
    setSectionBusy((v) => ({ ...v, [sectionKey]: "deciding" }));
    setOneSectionError(sectionKey, undefined);
    const r = await decideDraftSectionAction(
      proposalId,
      parentRunId,
      sectionKey,
      { decision, ...(reason?.trim() ? { reason } : {}) },
    );
    if (!mounted.current) return;
    setSectionBusy((v) => ({ ...v, [sectionKey]: undefined }));
    if (!r.success) {
      setOneSectionError(sectionKey, r.message);
      return;
    }
    // The decision response is authoritative; no full refetch is needed.
    setDraft((current) =>
      current
        ? {
            ...current,
            sections: current.sections.map((s) =>
              s.key === sectionKey
                ? {
                    ...s,
                    decision: r.data.decision,
                    decisionReason: r.data.reason || null,
                  }
                : s,
            ),
          }
        : current,
    );
    if (rejectingKey === sectionKey) {
      setRejectingKey(undefined);
      setRejectReason("");
    }
  };
  const finishRegeneration = (sectionKey: string, message?: string) => {
    setSectionBusy((v) => ({ ...v, [sectionKey]: undefined }));
    setOneSectionError(sectionKey, message);
  };
  const pollRegeneration = (
    sectionKey: string,
    regenJobId: string,
    childRunId: string,
    pollCount: number,
  ) => {
    regenTimers.current[sectionKey] = setTimeout(
      async () => {
        if (!mounted.current) return;
        if (document.hidden) {
          pollRegeneration(sectionKey, regenJobId, childRunId, pollCount);
          return;
        }
        const j = await getDurableJob(regenJobId);
        if (!mounted.current) return;
        if (!j.success) {
          finishRegeneration(sectionKey, j.message);
          return;
        }
        if (j.data.status === "succeeded") {
          const child = await getProposalDraftAction(proposalId, childRunId);
          if (!mounted.current) return;
          const section = child.success
            ? child.data.sections.find((s) => s.key === sectionKey)
            : undefined;
          if (section)
            setOverlays((v) => ({
              ...v,
              [sectionKey]: {
                runId: childRunId,
                section,
                showOriginal: false,
              },
            }));
          finishRegeneration(
            sectionKey,
            child.success
              ? section
                ? undefined
                : "The regenerated section could not be read."
              : child.message,
          );
          return;
        }
        if (["failed", "dead_letter", "cancelled"].includes(j.data.status)) {
          const conflict = [
            "PROPOSAL_VERSION_CONFLICT",
            "PROPOSAL_VERSION_OR_LIFECYCLE_CONFLICT",
          ].includes(String(j.data.errorCode));
          finishRegeneration(
            sectionKey,
            conflict
              ? versionConflictMessage
              : j.data.errorCode === "LIVE_AI_KILLED"
                ? "Live AI was blocked by the emergency kill switch. No provider call was made."
                : "Section regeneration did not complete safely. Try again.",
          );
          if (conflict) await refreshLatest();
          return;
        }
        pollRegeneration(sectionKey, regenJobId, childRunId, pollCount + 1);
      },
      document.hidden ? 2_000 : nextPollDelay(pollCount),
    );
  };
  const regenerate = async (sectionKey: string) => {
    if (!draft || typeof draft.run.id !== "string" || sectionBusy[sectionKey])
      return;
    if (typeof version !== "number") {
      setOneSectionError(
        sectionKey,
        "Apply or review proposal context before regenerating.",
      );
      return;
    }
    setSectionBusy((v) => ({ ...v, [sectionKey]: "regenerating" }));
    setOneSectionError(sectionKey, undefined);
    const r = await regenerateDraftSectionAction(
      proposalId,
      draft.run.id,
      sectionKey,
      version,
      crypto.randomUUID(),
    );
    if (!mounted.current) return;
    if (!r.success) {
      finishRegeneration(
        sectionKey,
        r.code === "PROPOSAL_VERSION_CONFLICT"
          ? versionConflictMessage
          : r.message,
      );
      if (r.code === "PROPOSAL_VERSION_CONFLICT") await refreshLatest();
      return;
    }
    pollRegeneration(sectionKey, r.data.jobId, r.data.runId, 0);
  };
  const reviewable = draft?.run.status === "succeeded";
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Review AI draft</h2>
      <p className="mt-1 text-sm text-slate-600">
        RFPilot turns your approved proposal details into a draft. Review each
        section before it is included in your downloadable RFP.
      </p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={busy || ["queued", "running"].includes(status)}
          onClick={generate}
          className="rounded bg-[#087f69] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Starting…" : draft ? "Refresh draft" : "Create draft"}
        </button>
        <span role="status" className="py-2 text-sm text-slate-600">
          {status !== "idle" ? draftStatusLabel(status) : ""}
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {draft && (
        <div className="mt-5 space-y-4">
          <AiRunEvidence run={draft.run} />
          {(() => {
            // Only accepted sections are exported, so the control says so
            // rather than letting the planner discover it from a 409.
            const acceptedCount = draft.sections.filter(
              (s) => s.decision === "accepted",
            ).length;
            return (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <a
                  href={
                    acceptedCount
                      ? `/api/proposals/${encodeURIComponent(proposalId)}/draft-export`
                      : undefined
                  }
                  aria-disabled={acceptedCount === 0}
                  className={`rounded px-4 py-2 text-sm font-semibold ${acceptedCount ? "bg-[#087f69] text-white" : "pointer-events-none bg-slate-200 text-slate-500"}`}
                >
                  Download RFP
                </a>
                <p className="text-xs text-slate-600">
                  {acceptedCount
                    ? `${acceptedCount} accepted section${acceptedCount === 1 ? "" : "s"} will be included. Rejected and undecided sections are left out.`
                    : "Accept at least one section to download the RFP."}
                </p>
              </div>
            );
          })()}
          {draft.sections.map((s) => {
            const overlay = overlays[s.key],
              shown = overlay && !overlay.showOriginal ? overlay.section : s,
              pending = sectionBusy[s.key];
            return (
              <article
                key={s.id}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{s.heading}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {s.decision === "accepted" && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                        Accepted ✓
                      </span>
                    )}
                    {s.decision === "rejected" && (
                      <span
                        title={s.decisionReason ?? undefined}
                        className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800"
                      >
                        Rejected ✗
                      </span>
                    )}
                    {overlay && (
                      <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-800">
                        Regenerated
                      </span>
                    )}
                    {overlay && (
                      <button
                        type="button"
                        onClick={() =>
                          setOverlays((v) => ({
                            ...v,
                            [s.key]: {
                              ...overlay,
                              showOriginal: !overlay.showOriginal,
                            },
                          }))
                        }
                        className="text-xs font-semibold text-slate-600 underline underline-offset-2"
                      >
                        {overlay.showOriginal
                          ? "Show regenerated"
                          : "Show original"}
                      </button>
                    )}
                    {reviewable && (
                      <>
                        <button
                          type="button"
                          aria-label={`Accept ${s.heading}`}
                          disabled={!!pending}
                          onClick={() => void decide(s.key, "accepted")}
                          className="rounded border border-emerald-600 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          aria-label={`Reject ${s.heading}`}
                          disabled={!!pending}
                          onClick={() => {
                            setRejectingKey((current) =>
                              current === s.key ? undefined : s.key,
                            );
                            setRejectReason("");
                          }}
                          className="rounded border border-red-600 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          aria-label={`Regenerate ${s.heading}`}
                          disabled={!!pending || typeof version !== "number"}
                          title={
                            typeof version !== "number"
                              ? "Apply or review proposal context before regenerating."
                              : undefined
                          }
                          onClick={() => void regenerate(s.key)}
                          className="rounded border border-slate-400 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                        >
                          {pending === "regenerating"
                            ? "Regenerating…"
                            : "Regenerate"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {rejectingKey === s.key && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="flex-1 text-xs font-medium text-slate-700">
                      <span className="sr-only">
                        Reason for rejecting {s.heading}
                      </span>
                      <input
                        value={rejectReason}
                        maxLength={500}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!!pending}
                      onClick={() =>
                        void decide(s.key, "rejected", rejectReason)
                      }
                      className="rounded bg-red-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Confirm reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingKey(undefined);
                        setRejectReason("");
                      }}
                      className="text-xs font-semibold text-slate-600 underline underline-offset-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {pending === "regenerating" && (
                  <p role="status" className="mt-2 text-xs text-slate-600">
                    Regenerating this section… You can keep working while this
                    finishes.
                  </p>
                )}
                {sectionErrors[s.key] && (
                  <p
                    role="alert"
                    className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700"
                  >
                    {sectionErrors[s.key]}
                  </p>
                )}
                {shown.paragraphs.map((p, i) => {
                  const fieldCitations = p.citations.filter(
                      (c) => !c.startsWith("/knowledge/"),
                    ),
                    knowledgeCitations = p.citations.filter((c) =>
                      c.startsWith("/knowledge/"),
                    );
                  return (
                    <div key={i} className="mt-2 rounded bg-slate-50 p-3">
                      <p>{p.text}</p>
                      {fieldCitations.length > 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                          Based on:{" "}
                          {fieldCitations.map(proposalFieldLabel).join(", ")}
                        </p>
                      )}
                      {knowledgeCitations.length > 0 && (
                        <p className="mt-2 flex flex-wrap gap-1">
                          {knowledgeCitations.map((c) => (
                            <span
                              key={c}
                              className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800"
                            >
                              Reference library
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  );
                })}
              </article>
            );
          })}
          {draft.gaps.length > 0 && (
            <div>
              <h3 className="font-semibold text-amber-800">Information gaps</h3>
              <ul className="list-disc pl-5 text-sm text-amber-800">
                {draft.gaps.map((g) => (
                  <li key={g.code}>
                    {g.code.replaceAll("_", " ").toLowerCase()}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Your proposal has not been changed. Only accepted sections are
            included in the download.
          </p>
        </div>
      )}
    </section>
  );
}
