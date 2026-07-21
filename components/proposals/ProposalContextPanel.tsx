"use client";
import {
  createProposalContextAction,
  createSourceProposalContextAction,
  getLatestProposalContextAction,
  getProposalContextAction,
  type ProposalContextRun,
} from "@/app/actions/proposalContext";
import { getDurableJob, listPrivateDocumentSources, type PrivateDocumentSource } from "@/app/actions/durableJobs";
import {
  applyCandidatesAction,
  getCandidateReviewAction,
  saveCandidateReviewAction,
  type CandidateReview,
} from "@/app/actions/candidateApplication";
import { useEffect, useState } from "react";
import AiRunEvidence from "./AiRunEvidence";
type Decision = {
  decision: "pending" | "accepted" | "modified" | "rejected";
  value?: unknown;
  overwrite?: boolean;
};
export default function ProposalContextPanel({
  proposalId,
}: {
  proposalId: string;
}) {
  const [fixture, setFixture] = useState<
      "synthetic-conference-simple" | "synthetic-conference-medium"
    >("synthetic-conference-medium"),
    [jobId, setJobId] = useState<string>(),
    [runId, setRunId] = useState<string>(),
    [status, setStatus] = useState("idle"),
    [result, setResult] = useState<ProposalContextRun>(),
    [review, setReview] = useState<CandidateReview>(),
    [decisions, setDecisions] = useState<Record<string, Decision>>({}),
    [error, setError] = useState<string>(),
    [notice, setNotice] = useState<string>(),
    [jobPurpose, setJobPurpose] = useState<"extract" | "apply">("extract"),
    [busy, setBusy] = useState(false);
  const [sources,setSources]=useState<PrivateDocumentSource[]>([]),[sourceIds,setSourceIds]=useState<string[]>([]);
  const loadReview = async (id: string) => {
    const response = await getCandidateReviewAction(proposalId, id);
    if (!response.success) {
      setError(response.message);
      return;
    }
    setReview(response.data);
    setDecisions(
      Object.fromEntries(
        response.data.operations.map((x) => [
          x.id,
          {
            decision: x.decision,
            value: x.modified_value ?? x.value,
            overwrite: false,
          },
        ]),
      ),
    );
  };
  useEffect(() => {
    let active = true;
    void (async () => {
      const response = await getLatestProposalContextAction(proposalId);
      if (!active || !response.success) return;
      const id =
        typeof response.data.run.id === "string" ? response.data.run.id : "";
      if (!id) return;
      setResult(response.data);
      setRunId(id);
      setStatus("succeeded");
      await loadReview(id);
    })();
    return () => {
      active = false;
    };
  }, [proposalId]);
  useEffect(()=>{let active=true;void listPrivateDocumentSources(proposalId).then(response=>{if(!active||!response.success)return;const eligible=response.data.filter(x=>x.status==="ready"&&x.confidentiality==="non_confidential");setSources(eligible);setSourceIds(current=>current.length?current:eligible[0]?[eligible[0].id]:[]);});return()=>{active=false;};},[proposalId]);
  useEffect(() => {
    if (!jobId || !["queued", "running", "retry_scheduled"].includes(status))
      return;
    const timer = setInterval(async () => {
      const response = await getDurableJob(jobId);
      if (!response.success) {
        setError(response.message);
        clearInterval(timer);
        return;
      }
      setStatus(response.data.status);
      if (response.data.status === "succeeded" && runId) {
        setNotice(jobPurpose === "apply" ? "Selected fields applied successfully." : "Requirements extracted successfully. Review the cited candidates below.");
        const context = await getProposalContextAction(proposalId, runId);
        if (context.success) {
          setResult(context.data);
          await loadReview(runId);
        } else setError(context.message);
      }
      if (
        ["failed", "dead_letter", "cancelled"].includes(response.data.status)
      ) {
        setNotice(undefined);
        setError(
          response.data.errorCode === "LIVE_AI_KILLED"
            ? "Live AI was blocked by the emergency kill switch. No provider call was made."
            : response.data.errorCode === "LIVE_AI_CLASSIFICATION_DENIED"
              ? "Live AI is disabled for this data classification."
              : response.data.errorCode === "OVERWRITE_CONFIRMATION_REQUIRED"
            ? "Confirm overwrite for every selected field that already has a value."
            : response.data.errorCode === "PROPOSAL_VERSION_CONFLICT"
              ? "The proposal changed. Refresh before applying the review."
              : jobPurpose === "extract"
                ? "Requirement extraction did not complete. Try again or contact an administrator with the run time."
                : "The controlled application did not complete. Review the selections and try again.",
        );
      }
      if (
        ["succeeded", "failed", "dead_letter", "cancelled"].includes(
          response.data.status,
        )
      )
        clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [jobId, jobPurpose, proposalId, runId, status]);
  const start = async () => {
    setJobPurpose("extract");
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    setResult(undefined);
    setReview(undefined);
    const response = sourceIds.length ? await createSourceProposalContextAction(proposalId,sourceIds) : await createProposalContextAction(proposalId, fixture);
    setBusy(false);
    if (!response.success) {
      setError(response.message);
      return;
    }
    setJobId(response.data.jobId);
    setRunId(response.data.runId);
    setStatus(response.data.status);
  };
  const save = async () => {
    if (!runId || !review) return;
    setBusy(true);
    const payload = review.operations.map((x) => ({
        operationId: x.id,
        decision: decisions[x.id]?.decision ?? "pending",
        ...(decisions[x.id]?.decision === "modified"
          ? { value: decisions[x.id].value }
          : {}),
      })),
      response = await saveCandidateReviewAction(
        proposalId,
        runId,
        review.revision,
        payload,
      );
    setBusy(false);
    if (!response.success) {
      setError(response.message);
      return;
    }
    setNotice("Review saved.");
    await loadReview(runId);
  };
  const apply = async () => {
    if (!runId || !review) return;
    const selected = review.operations.filter(
        (x) =>
          !review.appliedOperationIds.includes(x.id) &&
          ["accepted", "modified"].includes(decisions[x.id]?.decision),
      ),
      ids = selected.map((x) => x.id);
    if (!ids.length) {
      setError("Choose a new, unapplied suggestion first.");
      return;
    }
    const selectedPaths=selected.map(x=>review.canonicalPaths[x.id]);
    if(new Set(selectedPaths).size!==selectedPaths.length){setError("Select only one candidate for each conflicting proposal field.");return;}
    const missingConfirmation = selected.some((x) => {
      const current = review.currentValues[review.canonicalPaths[x.id]];
      return (
        current !== undefined &&
        current !== null &&
        current !== "" &&
        !decisions[x.id]?.overwrite
      );
    });
    if (missingConfirmation) {
      setError(
        "Confirm overwrite for every selected field that already has a value.",
      );
      return;
    }
    setBusy(true);
    setError(undefined);
    const saved = await saveCandidateReviewAction(
      proposalId,
      runId,
      review.revision,
      review.operations.map((x) => ({
        operationId: x.id,
        decision: decisions[x.id]?.decision ?? "pending",
        ...(decisions[x.id]?.decision === "modified"
          ? { value: decisions[x.id].value }
          : {}),
      })),
    );
    if (!saved.success) {
      setBusy(false);
      setError(saved.message);
      return;
    }
    const response = await applyCandidatesAction(
      proposalId,
      runId,
      review.proposalVersion,
      ids,
      ids.filter((id) => decisions[id]?.overwrite),
    );
    setBusy(false);
    if (!response.success) {
      setError(response.message);
      return;
    }
    setJobId(response.data.jobId);
    setJobPurpose("apply");
    setStatus(response.data.status);
    setNotice("Selected fields queued for controlled application.");
  };
  return (
    <section
      aria-labelledby="proposal-context-title"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2
        id="proposal-context-title"
        className="text-lg font-semibold text-slate-900"
      >
        Live AI requirement extraction
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        OpenAI extracts cited candidates from an explicitly approved, non-confidential proposal source. Synthetic evidence remains available when no eligible source exists.
        Review is required before any separate structured-field application.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">
          {sources.length?"Approved proposal source":"Synthetic example"}
          <select
            className="mt-1 block rounded-md border px-3 py-2"
            multiple={sources.length>0}
            size={sources.length?Math.min(sources.length,5):1}
            value={sources.length?sourceIds:fixture}
            onChange={(e) => sources.length?setSourceIds([...e.target.selectedOptions].map(option=>option.value).slice(0,5)):setFixture(e.target.value as typeof fixture)}
          >
            {sources.map(source=><option key={source.id} value={source.id}>{source.originalFilename}</option>)}
            {!sources.length&&<>
            <option value="synthetic-conference-simple">
              Simple conference
            </option>
            <option value="synthetic-conference-medium">
              Detailed conference
            </option>
            </>}
          </select>
          {sources.length>0&&<span className="mt-1 block text-xs font-normal text-slate-500">Select up to five sources. Use Ctrl/Cmd to select multiple.</span>}
        </label>
        <button
          type="button"
          disabled={busy || ["queued", "running"].includes(status)}
          onClick={start}
          className="rounded-md bg-[#087f69] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Working…" : "Extract with OpenAI"}
        </button>
        <span
          role="status"
          aria-live="polite"
          className="text-sm text-slate-600"
        >
          {status !== "idle" ? `Status: ${status.replaceAll("_", " ")}` : ""}
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      {result?.issues.some(issue=>issue.code==="CROSS_SOURCE_CONFLICT")&&<div role="alert" className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Sources disagree on one or more fields. Review each conflicting candidate; no value was selected or applied automatically.</div>}
      {result && review && (
        <div className="mt-5">
          <AiRunEvidence run={result.run} />
          <h3 className="font-semibold">Review suggested information</h3>
          <ul className="mt-2 space-y-3">
            {review.operations.map((item) => {
              const d = decisions[item.id] ?? { decision: "pending" },
                applied = review.appliedOperationIds.includes(item.id);
              const canonical = review.canonicalPaths[item.id],
                current = review.currentValues[canonical];
              return (
                <li
                  key={item.id}
                  className="rounded-md bg-slate-50 p-3 text-sm"
                >
                  <div className="flex justify-between gap-2">
                    <div className="font-mono text-xs text-slate-500">
                      {canonical}
                    </div>
                    {applied && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                        Applied
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <strong>Suggested:</strong> {String(item.value)}
                  </div>
                  <div>
                    <strong>Current:</strong>{" "}
                    {current === undefined || current === ""
                      ? "Not provided"
                      : String(current)}
                  </div>
                  {!applied && (
                    <div className="mt-2 flex flex-wrap gap-3">
                      <label>
                        Decision{" "}
                        <select
                          className="ml-1 rounded border p-1"
                          value={d.decision}
                          onChange={(e) =>
                            setDecisions((v) => ({
                              ...v,
                              [item.id]: {
                                ...d,
                                decision: e.target
                                  .value as Decision["decision"],
                              },
                            }))
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="accepted">Accept</option>
                          <option value="modified">Edit</option>
                          <option value="rejected">Reject</option>
                        </select>
                      </label>
                      {d.decision === "modified" && (
                        <label>
                          Value{" "}
                          <input
                            className="ml-1 rounded border p-1"
                            value={String(d.value ?? "")}
                            onChange={(e) =>
                              setDecisions((v) => ({
                                ...v,
                                [item.id]: { ...d, value: e.target.value },
                              }))
                            }
                          />
                        </label>
                      )}
                      {current !== undefined &&
                        current !== "" &&
                        ["accepted", "modified"].includes(d.decision) && (
                          <label>
                            <input
                              type="checkbox"
                              checked={d.overwrite ?? false}
                              onChange={(e) =>
                                setDecisions((v) => ({
                                  ...v,
                                  [item.id]: {
                                    ...d,
                                    overwrite: e.target.checked,
                                  },
                                }))
                              }
                            />{" "}
                            Confirm overwrite
                          </label>
                        )}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-slate-500">
                    Confidence {Math.round(item.confidence * 100)}% ·{" "}
                    {item.evidence_ids.length} citation(s)
                  </div>
                </li>
              );
            })}
          </ul>
          {review.operations.some(
            (item) => !review.appliedOperationIds.includes(item.id),
          ) && (
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={save}
                className="rounded border px-4 py-2 text-sm font-semibold"
              >
                Save review
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={apply}
                className="rounded bg-[#087f69] px-4 py-2 text-sm font-semibold text-white"
              >
                Apply selected fields
              </button>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Applied suggestions remain visible for audit but cannot be applied
            again.
          </p>
        </div>
      )}
    </section>
  );
}
