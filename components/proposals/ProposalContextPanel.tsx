"use client";
import {
  createProposalContextAction,
  createSourceProposalContextAction,
  getLatestProposalContextAction,
  getProposalContextAction,
  type ProposalContextRun,
} from "@/app/actions/proposalContext";
import {
  getDurableJob,
  listPrivateDocumentSources,
  type PrivateDocumentSource,
} from "@/app/actions/durableJobs";
import {
  applyCandidatesAction,
  getCandidateReviewAction,
  saveCandidateReviewAction,
  type CandidateReview,
} from "@/app/actions/candidateApplication";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  FileSearch,
  FileText,
  PencilLine,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import AiRunEvidence from "./AiRunEvidence";
import { proposalFieldLabel } from "@/lib/proposals/proposalFieldLabel";
type Decision = {
  decision: "pending" | "accepted" | "modified" | "rejected";
  value?: unknown;
  overwrite?: boolean;
  reason?: string;
};
const displayValue = (value: unknown) => {
  if (value === undefined || value === null || value === "")
    return "Not provided";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};
const hasMaterialValue = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  !(
    typeof value === "string" &&
    value.trim().toLowerCase() === "untitled proposal"
  );
const confidenceLabel = (confidence: number) => {
  if (confidence >= 0.9) return "High confidence";
  if (confidence >= 0.7) return "Medium confidence";
  return "Low confidence";
};
const statusLabel = (status: string) =>
  ({
    idle: "Ready",
    queued: "Starting…",
    running: "Reviewing sources…",
    retry_scheduled: "Trying again…",
    succeeded: "Suggestions ready",
    failed: "Needs attention",
    dead_letter: "Needs attention",
    cancelled: "Cancelled",
  })[status] ?? status.replaceAll("_", " ");
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
    [busy, setBusy] = useState(false),
    [confirming, setConfirming] = useState(false);
  const applicationKey = useRef<string | null>(null);
  const router = useRouter();
  const [sources, setSources] = useState<PrivateDocumentSource[]>([]),
    [sourceIds, setSourceIds] = useState<string[]>([]);
  const loadReview = useCallback(
    async (id: string) => {
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
              reason: x.reason ?? "",
            },
          ]),
        ),
      );
    },
    [proposalId],
  );
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
  }, [loadReview, proposalId]);
  useEffect(() => {
    let active = true;
    void listPrivateDocumentSources(proposalId).then((response) => {
      if (!active || !response.success) return;
      const eligible = response.data.filter(
        (x) => x.status === "ready" && x.confidentiality === "non_confidential",
      );
      setSources(eligible);
      setSourceIds((current) =>
        current.length ? current : eligible[0] ? [eligible[0].id] : [],
      );
    });
    return () => {
      active = false;
    };
  }, [proposalId]);
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
        setNotice(
          jobPurpose === "apply"
            ? "Your selected details were added to the proposal."
            : "Suggestions are ready. Review them below.",
        );
        const context = await getProposalContextAction(proposalId, runId);
        if (context.success) {
          setResult(context.data);
          await loadReview(runId);
        } else setError(context.message);
        // After a successful application the proposal version advanced, so
        // "Applied" badges refresh above and server components re-render here
        // without a full page reload.
        if (jobPurpose === "apply") router.refresh();
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
  }, [jobId, jobPurpose, loadReview, proposalId, router, runId, status]);
  const start = async () => {
    setJobPurpose("extract");
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    setResult(undefined);
    setReview(undefined);
    setConfirming(false);
    applicationKey.current = null;
    const response = sourceIds.length
      ? await createSourceProposalContextAction(proposalId, sourceIds)
      : await createProposalContextAction(proposalId, fixture);
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
        ...(decisions[x.id]?.reason?.trim()
          ? { reason: decisions[x.id].reason?.trim() }
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
    setNotice("Your review was saved.");
    await loadReview(runId);
  };
  const selectedForApplication = () => {
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
    if (
      review.invalidOperations?.some((operation) =>
        ids.includes(operation.operationId),
      )
    ) {
      setError(
        "One or more selected suggestions are not valid for their fields.",
      );
      return;
    }
    const selectedPaths = selected.map((x) => review.canonicalPaths[x.id]);
    if (new Set(selectedPaths).size !== selectedPaths.length) {
      setError(
        "Select only one candidate for each conflicting proposal field.",
      );
      return;
    }
    const missingConfirmation = selected.some((x) => {
      const current = review.currentValues[review.canonicalPaths[x.id]];
      const proposed =
        decisions[x.id]?.decision === "modified"
          ? decisions[x.id]?.value
          : x.value;
      return (
        hasMaterialValue(current) &&
        displayValue(current) !== displayValue(proposed) &&
        !decisions[x.id]?.overwrite
      );
    });
    if (missingConfirmation) {
      setError(
        "Confirm overwrite for every selected field that already has a value.",
      );
      return;
    }
    return selected;
  };
  const reviewApplication = () => {
    setError(undefined);
    if (selectedForApplication()) setConfirming(true);
  };
  const apply = async () => {
    if (!runId || !review) return;
    const selected = selectedForApplication();
    if (!selected) return;
    const ids = selected.map((item) => item.id);
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
        ...(decisions[x.id]?.reason?.trim()
          ? { reason: decisions[x.id].reason?.trim() }
          : {}),
      })),
    );
    if (!saved.success) {
      setBusy(false);
      setError(saved.message);
      return;
    }
    applicationKey.current ??= crypto.randomUUID();
    const response = await applyCandidatesAction(
      proposalId,
      runId,
      review.proposalVersion,
      ids,
      ids.filter((id) => decisions[id]?.overwrite),
      applicationKey.current,
    );
    setBusy(false);
    if (!response.success) {
      if (response.code !== "NETWORK_ERROR") applicationKey.current = null;
      setError(response.message);
      return;
    }
    setJobId(response.data.jobId);
    setJobPurpose("apply");
    setStatus(response.data.status);
    setConfirming(false);
    setNotice("Updating your proposal…");
  };
  // The API reports candidates whose value could not be normalized onto their
  // target field, with a human-readable reason. Nothing consumed it, so those
  // suggestions silently vanished from the review — the planner never learned
  // the AI had proposed something the system rejected.
  const invalid = review?.invalidOperations ?? [];
  const invalidById = new Set(invalid.map((item) => item.operationId));
  const validOperations = (review?.operations ?? []).filter(
    (item) => !invalidById.has(item.id),
  );
  const matchingOperations = validOperations.filter((item) => {
    if (!review || review.appliedOperationIds.includes(item.id)) return false;
    const canonical = review.canonicalPaths[item.id];
    return (
      displayValue(review.currentValues[canonical]) === displayValue(item.value)
    );
  });
  const appliedOperations = validOperations.filter((item) =>
    review?.appliedOperationIds.includes(item.id),
  );
  const actionableOperations = validOperations.filter((item) => {
    if (!review || review.appliedOperationIds.includes(item.id)) return false;
    const canonical = review.canonicalPaths[item.id];
    return (
      displayValue(review.currentValues[canonical]) !== displayValue(item.value)
    );
  });
  const reviewedCount = actionableOperations.filter(
    (item) => (decisions[item.id]?.decision ?? "pending") !== "pending",
  ).length;
  const selectedCount = actionableOperations.filter((item) =>
    ["accepted", "modified"].includes(decisions[item.id]?.decision),
  ).length;
  return (
    <section
      aria-labelledby="proposal-context-title"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-[#087f69]">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2
              id="proposal-context-title"
              className="text-lg font-semibold text-slate-950"
            >
              Review AI suggestions
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Choose a source and let RFPilot suggest proposal details it finds.
              Nothing is added until you review and confirm it.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          {sources.length ? (
            <fieldset>
              <legend className="text-sm font-semibold text-slate-900">
                Source files
              </legend>
              <p className="mt-1 text-xs text-slate-500">
                Choose up to five files to review.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {sources.map((source) => {
                  const checked = sourceIds.includes(source.id);
                  return (
                    <label
                      key={source.id}
                      className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${checked ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && sourceIds.length >= 5}
                        onChange={(event) =>
                          setSourceIds((current) =>
                            event.target.checked
                              ? [...current, source.id].slice(0, 5)
                              : current.filter((id) => id !== source.id),
                          )
                        }
                        className="size-4 accent-[#087f69]"
                      />
                      <FileText
                        aria-hidden="true"
                        className="size-4 shrink-0 text-slate-500"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                        {source.originalFilename}
                      </span>
                      <span className="text-xs font-medium text-emerald-700">
                        Ready
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <label className="block text-sm font-semibold text-slate-900">
              Example source
              <select
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 sm:max-w-sm"
                value={fixture}
                onChange={(event) =>
                  setFixture(event.target.value as typeof fixture)
                }
              >
                <option value="synthetic-conference-simple">
                  Conference example — basic
                </option>
                <option value="synthetic-conference-medium">
                  Conference example — detailed
                </option>
              </select>
            </label>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={
                busy ||
                ["queued", "running"].includes(status) ||
                (sources.length > 0 && sourceIds.length === 0)
              }
              onClick={start}
              className="inline-flex items-center gap-2 rounded-lg bg-[#087f69] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#066b59] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSearch aria-hidden="true" className="size-4" />
              {busy
                ? "Reviewing…"
                : result
                  ? "Review again"
                  : "Find proposal details"}
            </button>
            <span
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {status === "succeeded" && (
                <CheckCircle2
                  aria-hidden="true"
                  className="size-3.5 text-emerald-600"
                />
              )}
              {statusLabel(status)}
            </span>
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}
        {result?.issues.some(
          (issue) => issue.code === "CROSS_SOURCE_CONFLICT",
        ) && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          >
            Some sources disagree. Review the affected suggestions carefully;
            RFPilot did not choose a value for you.
          </div>
        )}
        {result && review && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">
                  {actionableOperations.length
                    ? `${actionableOperations.length} suggestion${actionableOperations.length === 1 ? "" : "s"} to review`
                    : "Your proposal is up to date"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {actionableOperations.length
                    ? "Compare each suggestion with your current proposal, then choose what to use."
                    : "The details found in this source already match your proposal."}
                </p>
              </div>
              {matchingOperations.length > 0 && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {matchingOperations.length} already match
                </span>
              )}
            </div>
            {invalid.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h4 className="text-sm font-semibold text-slate-800">
                  {invalid.length} detail
                  {invalid.length === 1 ? " needs" : "s need"} manual review
                </h4>
                <p className="mt-1 text-xs text-slate-600">
                  RFPilot could not safely fit these into the proposal. Nothing
                  was changed.
                </p>
                <ul className="mt-2 space-y-2">
                  {invalid.map((item) => (
                    <li
                      key={item.operationId}
                      className="text-sm text-slate-700"
                    >
                      <span className="font-semibold">
                        {proposalFieldLabel(item.path)}
                      </span>
                      <div className="mt-0.5 text-xs text-slate-600">
                        {item.reason}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ul className="mt-4 space-y-4">
              {actionableOperations.map((item) => {
                const d = decisions[item.id] ?? { decision: "pending" };
                const canonical = review.canonicalPaths[item.id],
                  current = review.currentValues[canonical];
                const choose = (decision: Decision["decision"]) => {
                  const value =
                    decision === "modified"
                      ? (d.value ?? item.value)
                      : item.value;
                  const overwrite =
                    ["accepted", "modified"].includes(decision) &&
                    hasMaterialValue(current) &&
                    displayValue(current) !== displayValue(value);
                  setConfirming(false);
                  applicationKey.current = null;
                  setDecisions((existing) => ({
                    ...existing,
                    [item.id]: { ...d, decision, value, overwrite },
                  }));
                };
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-slate-950">
                        {proposalFieldLabel(canonical)}
                      </h4>
                      <span
                        aria-label={`${confidenceLabel(item.confidence)}, ${Math.round(item.confidence * 100)} percent`}
                        className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                      >
                        {confidenceLabel(item.confidence)}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Current value
                        </dt>
                        <dd className="mt-1 break-words text-slate-800">
                          {displayValue(current)}
                        </dd>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Suggested value
                        </dt>
                        <dd className="mt-1 break-words font-medium text-slate-950">
                          {displayValue(item.value)}
                        </dd>
                      </div>
                    </dl>
                    <details className="mt-3 text-xs text-slate-600">
                      <summary className="cursor-pointer font-medium text-slate-600">
                        Why this was suggested
                      </summary>
                      <p className="mt-1.5 leading-5">
                        Found in {item.evidence_ids.length || "no"} selected
                        source{" "}
                        {item.evidence_ids.length === 1
                          ? "reference"
                          : "references"}
                        .
                        {item.evidence_ids.length === 0 &&
                          " Keep this pending or keep your current value."}
                      </p>
                    </details>
                    <fieldset className="mt-4">
                      <legend className="text-xs font-semibold text-slate-700">
                        Choose an action
                      </legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          aria-pressed={d.decision === "accepted"}
                          onClick={() => choose("accepted")}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${d.decision === "accepted" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-700"}`}
                        >
                          <Check aria-hidden="true" className="size-4" /> Use
                          suggestion
                        </button>
                        <button
                          type="button"
                          aria-pressed={d.decision === "modified"}
                          onClick={() => choose("modified")}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${d.decision === "modified" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700"}`}
                        >
                          <PencilLine aria-hidden="true" className="size-4" />{" "}
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-pressed={d.decision === "rejected"}
                          onClick={() => choose("rejected")}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${d.decision === "rejected" ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"}`}
                        >
                          <RotateCcw aria-hidden="true" className="size-4" />{" "}
                          Keep current
                        </button>
                      </div>
                    </fieldset>
                    {d.decision === "modified" && (
                      <label className="mt-3 block text-xs font-semibold text-slate-700">
                        Your value
                        <input
                          className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                          value={String(d.value ?? "")}
                          onChange={(event) => {
                            const value = event.target.value;
                            setConfirming(false);
                            applicationKey.current = null;
                            setDecisions((existing) => ({
                              ...existing,
                              [item.id]: {
                                ...d,
                                value,
                                overwrite:
                                  hasMaterialValue(current) &&
                                  displayValue(current) !== displayValue(value),
                              },
                            }));
                          }}
                        />
                      </label>
                    )}
                    {d.decision === "rejected" && (
                      <label className="mt-3 block text-xs font-semibold text-slate-700">
                        Note for your team{" "}
                        <span className="font-normal text-slate-500">
                          (optional)
                        </span>
                        <input
                          className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                          maxLength={500}
                          value={d.reason ?? ""}
                          onChange={(event) => {
                            setConfirming(false);
                            applicationKey.current = null;
                            setDecisions((existing) => ({
                              ...existing,
                              [item.id]: { ...d, reason: event.target.value },
                            }));
                          }}
                        />
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
            {matchingOperations.length > 0 && (
              <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
                  {matchingOperations.length} detail
                  {matchingOperations.length === 1 ? "" : "s"} already match
                  your proposal
                </summary>
                <ul className="grid gap-2 border-t border-slate-200 p-4 sm:grid-cols-2">
                  {matchingOperations.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <CheckCircle2
                        aria-hidden="true"
                        className="size-4 shrink-0 text-emerald-600"
                      />
                      {proposalFieldLabel(review.canonicalPaths[item.id])}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {appliedOperations.length > 0 && (
              <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
                  {appliedOperations.length} previously applied suggestion
                  {appliedOperations.length === 1 ? "" : "s"}
                </summary>
                <ul className="grid gap-2 border-t border-slate-200 p-4 sm:grid-cols-2">
                  {appliedOperations.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <CheckCircle2
                        aria-hidden="true"
                        className="size-4 shrink-0 text-emerald-600"
                      />
                      {proposalFieldLabel(review.canonicalPaths[item.id])}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {actionableOperations.length > 0 && (
              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  {selectedCount
                    ? `${selectedCount} change${selectedCount === 1 ? "" : "s"} selected`
                    : "Choose which suggestions you want to use."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || reviewedCount === 0}
                    onClick={save}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save for later
                  </button>
                  <button
                    type="button"
                    disabled={busy || selectedCount === 0}
                    onClick={reviewApplication}
                    className="rounded-lg bg-[#087f69] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Review {selectedCount || "selected"} change
                    {selectedCount === 1 ? "" : "s"}
                  </button>
                </div>
              </div>
            )}
            {confirming && review && (
              <div
                role="region"
                aria-labelledby="field-change-confirmation-title"
                className="mt-5 rounded-xl border-2 border-emerald-300 bg-emerald-50/60 p-4"
              >
                <h4
                  id="field-change-confirmation-title"
                  className="font-semibold text-slate-900"
                >
                  Review before updating your proposal
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  Check the values below. Your proposal will only change when
                  you apply them.
                </p>
                <ul className="mt-3 space-y-2">
                  {review.operations
                    .filter(
                      (item) =>
                        !review.appliedOperationIds.includes(item.id) &&
                        ["accepted", "modified"].includes(
                          decisions[item.id]?.decision,
                        ),
                    )
                    .map((item) => {
                      const canonical = review.canonicalPaths[item.id];
                      const proposed =
                        decisions[item.id]?.decision === "modified"
                          ? decisions[item.id]?.value
                          : item.value;
                      return (
                        <li
                          key={item.id}
                          className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                        >
                          <h5 className="font-semibold text-slate-900">
                            {proposalFieldLabel(canonical)}
                          </h5>
                          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                            <div>
                              <dt className="text-xs font-semibold text-slate-500">
                                Current
                              </dt>
                              <dd className="break-words text-slate-800">
                                {displayValue(review.currentValues[canonical])}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold text-emerald-700">
                                New value
                              </dt>
                              <dd className="break-words text-slate-800">
                                {displayValue(proposed)}
                              </dd>
                            </div>
                          </dl>
                        </li>
                      );
                    })}
                </ul>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirming(false)}
                    className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
                  >
                    Back to review
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void apply()}
                    className="rounded bg-[#087f69] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy
                      ? "Applying…"
                      : `Apply ${selectedCount} change${selectedCount === 1 ? "" : "s"}`}
                  </button>
                </div>
              </div>
            )}
            <AiRunEvidence run={result.run} />
          </div>
        )}
      </div>
    </section>
  );
}
