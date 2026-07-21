"use client";
import { useEffect, useState } from "react";
import { getLatestProposalContextAction } from "@/app/actions/proposalContext";
import { getCandidateReviewAction } from "@/app/actions/candidateApplication";
import {
  createProposalDraftAction,
  getLatestProposalDraftAction,
  getProposalDraftAction,
  type ProposalDraft,
} from "@/app/actions/proposalDraft";
import { getDurableJob } from "@/app/actions/durableJobs";
import AiRunEvidence from "./AiRunEvidence";
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
      }
    })();
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
        if (d.success) setDraft(d.data);
        else setError(d.message);
      }
      if (["failed", "dead_letter", "cancelled"].includes(j.data.status)) {
        setError(j.data.errorCode === "LIVE_AI_KILLED" ? "Live AI was blocked by the emergency kill switch. No provider call was made." : ["PROPOSAL_VERSION_CONFLICT", "PROPOSAL_VERSION_OR_LIFECYCLE_CONFLICT"].includes(String(j.data.errorCode)) ? "Drafting was blocked because the proposal changed or is no longer an eligible draft. No new AI draft was created." : "Live proposal drafting did not complete safely. Try again after checking pilot readiness.");
      }
      if (
        ["failed", "dead_letter", "cancelled", "succeeded"].includes(
          j.data.status,
        )
      )
        clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
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
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Live AI proposal draft</h2>
      <p className="mt-1 text-sm text-slate-600">
        OpenAI generates a cited, read-only candidate from non-confidential
        proposal fields. It does not change or publish the proposal.
      </p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={busy || ["queued", "running"].includes(status)}
          onClick={generate}
          className="rounded bg-[#087f69] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Starting…" : "Draft with OpenAI"}
        </button>
        <span role="status" className="py-2 text-sm text-slate-600">
          {status !== "idle" ? `Status: ${status}` : ""}
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
          {draft.sections.map((s) => (
            <article key={s.id}>
              <h3 className="font-semibold">{s.heading}</h3>
              {s.paragraphs.map((p, i) => (
                <div key={i} className="mt-2 rounded bg-slate-50 p-3">
                  <p>{p.text}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Evidence: {p.citations.join(", ")}
                  </p>
                </div>
              ))}
            </article>
          ))}
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
            Read-only AI candidate — proposal content was not changed.
          </p>
        </div>
      )}
    </section>
  );
}
