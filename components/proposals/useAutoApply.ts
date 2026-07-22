"use client";

// Automatic post-extraction application for the assistant workspace: when a
// proposal_context run completes, the workspace accepts ONLY safe candidates —
// the candidate fills an EMPTY proposal field, its confidence is at least 0.8,
// and it is the only candidate for that field (cross-source conflicts stay
// pending for the human reviewer). The review is saved, one controlled
// application job is queued with the review's proposal version, and the job is
// polled with the shared backoff. Overwrites are never confirmed automatically.
// The flow fires exactly once per runId (sessionStorage guard) and a failure —
// including PROPOSAL_VERSION_CONFLICT — surfaces a quiet notice pointing at
// the manual review surface instead of retrying.

import {
  applyCandidatesAction,
  getCandidateReviewAction,
  saveCandidateReviewAction,
  type CandidateReview,
} from "@/app/actions/candidateApplication";
import { getDurableJob } from "@/app/actions/durableJobs";
import { getProposalContextAction } from "@/app/actions/proposalContext";
import { nextPollDelay, presentJob } from "@/lib/asyncOperations";
import { useEffect, useRef, useState } from "react";

export const autoApplyKey = (runId: string) => `rfpilot:auto-apply:${runId}`;
export const AUTO_APPLY_MIN_CONFIDENCE = 0.8;

export type AutoApplyStatus =
  | { phase: "applying"; runId: string; count: number }
  | { phase: "applied"; runId: string; added: number; needsReview: number }
  | { phase: "failed"; runId: string; message: string };

const CONFLICT_MESSAGE =
  "Your proposal changed while I was filling it in, so nothing was applied automatically.";
const GENERIC_FAILURE_MESSAGE = "I couldn’t fill your proposal automatically.";

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== "";

// Safe-to-accept candidates: unapplied, high confidence, targeting an empty
// proposal field, and the only unapplied candidate for that canonical path.
const selectAutoAccepted = (review: CandidateReview) => {
  const unapplied = review.operations.filter(op => !review.appliedOperationIds.includes(op.id));
  const pathCounts = new Map<string, number>();
  for (const op of unapplied) {
    const path = review.canonicalPaths[op.id];
    pathCounts.set(path, (pathCounts.get(path) ?? 0) + 1);
  }
  const accepted = unapplied.filter(op => {
    const path = review.canonicalPaths[op.id];
    return (
      op.confidence >= AUTO_APPLY_MIN_CONFIDENCE &&
      !hasValue(review.currentValues[path]) &&
      (pathCounts.get(path) ?? 0) === 1
    );
  });
  return { accepted, needsReview: unapplied.length - accepted.length };
};

export function useAutoApply(
  proposalId: string | null,
  runId: string | null,
  onApplied: () => void,
) {
  const [status, setStatus] = useState<AutoApplyStatus | null>(null);
  const onAppliedRef = useRef(onApplied);
  useEffect(() => { onAppliedRef.current = onApplied; }, [onApplied]);

  useEffect(() => {
    if (!proposalId || !runId || typeof window === "undefined") return;
    // Exactly once per run: the guard is claimed before any work starts and is
    // only released if the effect tears down before anything was written.
    try {
      if (window.sessionStorage.getItem(autoApplyKey(runId))) return;
      window.sessionStorage.setItem(autoApplyKey(runId), "started");
    } catch {
      return;
    }
    let active = true;
    let committed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pollCount = 0;
    const fail = (message: string) => { if (active) setStatus({ phase: "failed", runId, message }); };

    void (async () => {
      const [run, reviewResult] = await Promise.all([
        getProposalContextAction(proposalId, runId),
        getCandidateReviewAction(proposalId, runId),
      ]);
      // A run or review that cannot be loaded leaves the manual flow untouched.
      if (!active || !run.success || !reviewResult.success) return;
      const review = reviewResult.data;
      const { accepted, needsReview } = selectAutoAccepted(review);
      if (accepted.length === 0) return;
      const acceptedIds = new Set(accepted.map(op => op.id));
      committed = true;
      setStatus({ phase: "applying", runId, count: accepted.length });
      // Conflicting and already-filled fields keep their existing decision
      // (pending on a fresh run) so the manual review flow stays untouched.
      const saved = await saveCandidateReviewAction(
        proposalId,
        runId,
        review.revision,
        review.operations.map(op => ({
          operationId: op.id,
          decision: acceptedIds.has(op.id) ? "accepted" : op.decision,
        })),
      );
      if (!active) return;
      if (!saved.success) { fail(GENERIC_FAILURE_MESSAGE); return; }
      // Only empty fields were accepted, so no overwrite is ever confirmed.
      const applied = await applyCandidatesAction(
        proposalId,
        runId,
        review.proposalVersion,
        [...acceptedIds],
        [],
      );
      if (!active) return;
      if (!applied.success) {
        fail(applied.code === "PROPOSAL_VERSION_CONFLICT" ? CONFLICT_MESSAGE : GENERIC_FAILURE_MESSAGE);
        return;
      }
      const jobId = applied.data.jobId;
      const poll = async () => {
        if (!active) return;
        if (document.hidden) { timer = setTimeout(poll, 2_000); return; }
        const job = await getDurableJob(jobId);
        if (!active) return;
        if (!job.success) { fail(GENERIC_FAILURE_MESSAGE); return; }
        if (presentJob(job.data).terminal) {
          if (job.data.status === "succeeded") {
            setStatus({ phase: "applied", runId, added: accepted.length, needsReview });
            onAppliedRef.current();
          } else {
            fail(job.data.errorCode === "PROPOSAL_VERSION_CONFLICT" ? CONFLICT_MESSAGE : GENERIC_FAILURE_MESSAGE);
          }
          return;
        }
        pollCount += 1;
        timer = setTimeout(poll, nextPollDelay(pollCount));
      };
      void poll();
    })();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      if (!committed) {
        try { window.sessionStorage.removeItem(autoApplyKey(runId)); } catch { /* reload-resume only */ }
      }
    };
  }, [proposalId, runId]);

  return status;
}
