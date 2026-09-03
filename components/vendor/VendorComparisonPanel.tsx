"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, CircleStop, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { VendorResponseItem } from "@/app/actions/vendorResponse";
import { cancelComparisonAction, getComparisonStatusAction, listComparisonsAction, prepareComparisonPrerequisitesAction, retryComparisonAction, startComparisonAction, type ComparisonView } from "@/app/actions/comparisonOrchestration";
import { getDurableJob } from "@/app/actions/durableJobs";
import { describeFreshnessReasons, describeJobError, describeRunStatus, describeStage } from "@/lib/proposalIntelligence/plainLanguage";
import { RERUN_QUERY_FLAG, START_COMPARISON_EVENT } from "@/lib/proposalIntelligence/rerun";

const terminal = new Set(["succeeded", "succeeded_with_warnings", "failed", "cancelled"]);
const terminalPreparation = new Set(["succeeded", "failed", "cancelled", "dead_letter"]);

export default function VendorComparisonPanel({ responses, proposalId, requirementsApproved = false, preparedResponseIds, comparisonReadyResponseIds }: { responses: VendorResponseItem[]; proposalId: string; requirementsApproved?: boolean; preparedResponseIds?: string[]; comparisonReadyResponseIds?: string[]; returnTo?: string }) {
  const versionedResponses = useMemo(() => responses.filter((response) => response.proposalId === proposalId && response.submissionId && response.currentVersionId), [proposalId, responses]);
  const candidates = useMemo(() => versionedResponses.filter((response) => response.documents.length > 0 || response.message.trim().length > 0), [versionedResponses]);
  const excludedEmptyCount = versionedResponses.length - candidates.length;
  const [prepared, setPrepared] = useState<Set<string>>(() => new Set(preparedResponseIds ?? candidates.map((candidate) => candidate._id)));
  const comparisonReady = useMemo(() => new Set(comparisonReadyResponseIds ?? candidates.map((candidate) => candidate._id)), [candidates, comparisonReadyResponseIds]);
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const includedCandidates = useMemo(() => candidates.filter((candidate) => !excluded.has(candidate._id)), [candidates, excluded]);
  const [view, setView] = useState<ComparisonView>(); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [busyLabel, setBusyLabel] = useState("Preparing vendors…"); const [error, setError] = useState<string>(); const [visible, setVisible] = useState(true); const pollAttempt = useRef(0); const cancelled = useRef(false);
  const missingPreparationCount = candidates.reduce((count, candidate) => count + (prepared.has(candidate._id) ? 0 : 1), 0);
  const preparationComplete = candidates.length >= 2 && missingPreparationCount === 0;
  const missingEvaluationCount = candidates.reduce((count, candidate) => count + (comparisonReady.has(candidate._id) ? 0 : 1), 0);
  const loadLatest = useCallback(async () => { const result = await listComparisonsAction(proposalId); if (cancelled.current) return; setLoading(false); if (result.success) { setView(result.data[0]); setError(undefined); } else setError(result.message); }, [proposalId]);
  const refresh = useCallback(async (runId: string) => { const result = await getComparisonStatusAction(proposalId, runId); if (cancelled.current) return; if (result.success) { setView(result.data); setError(undefined); } else setError(result.message); }, [proposalId]);
  useEffect(() => { cancelled.current = false; const timer = window.setTimeout(() => void loadLatest(), 0); return () => { cancelled.current = true; window.clearTimeout(timer); }; }, [loadLatest]);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ responseId?: string; ready?: boolean }>).detail;
      if (!detail?.responseId) return;
      const responseId = detail.responseId;
      setPrepared((current) => {
        const next = new Set(current);
        if (detail.ready) next.add(responseId);
        else next.delete(responseId);
        return next;
      });
    };
    window.addEventListener("proposal-intelligence:readiness", update);
    return () => window.removeEventListener("proposal-intelligence:readiness", update);
  }, []);
  useEffect(() => { const update = () => setVisible(document.visibilityState === "visible"); update(); document.addEventListener("visibilitychange", update); return () => document.removeEventListener("visibilitychange", update); }, []);
  useEffect(() => {
    if (!view || !visible || terminal.has(view.run.status)) return;
    const delay = Math.min(8000, 1500 * (2 ** Math.min(pollAttempt.current, 3)));
    const timer = window.setTimeout(() => { pollAttempt.current += 1; void refresh(view.run.runId); }, delay);
    return () => window.clearTimeout(timer);
  }, [refresh, view, visible]);
  const mutate = async (operation: () => Promise<{ success: boolean; data?: unknown; message?: string }>) => { setBusy(true); setError(undefined); const result = await operation(); if (cancelled.current) return; setBusy(false); if (!result.success) { setError(result.message ?? "Comparison operation failed."); return; } pollAttempt.current = 0; await loadLatest(); };
  const start = async () => {
    const participants = includedCandidates.map((item) => ({ submissionId: item.submissionId!, versionId: item.currentVersionId! }));
    setBusy(true); setError(undefined); setBusyLabel("Preparing requirements…");
    const preparation = await prepareComparisonPrerequisitesAction(proposalId, participants);
    if (cancelled.current) return;
    if (!preparation.success) {
      setBusy(false); setError(preparation.message); return;
    }

    let pending = preparation.data.jobs;
    if (pending.length > 0) setBusyLabel("Mapping vendor responses…");
    for (let attempt = 0; pending.length > 0 && attempt < 120; attempt += 1) {
      const statuses = await Promise.all(pending.map(async (item) => ({ item, result: await getDurableJob(item.jobId) })));
      if (cancelled.current) return;
      const lookupFailure = statuses.find(({ result }) => !result.success);
      if (lookupFailure && !lookupFailure.result.success) {
        setBusy(false); setError(lookupFailure.result.message); return;
      }
      const failed = statuses.find(({ result }) => result.success && ["failed", "cancelled", "dead_letter"].includes(result.data.status));
      if (failed && failed.result.success) {
        setBusy(false);
        setError(`Automatic vendor mapping could not finish. ${describeJobError(failed.result.data.errorCode)}`.trim());
        return;
      }
      pending = statuses.flatMap(({ item, result }) => result.success && !terminalPreparation.has(result.data.status) ? [item] : []);
      if (pending.length > 0) await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }
    if (pending.length > 0) {
      setBusy(false); setError("Vendor preparation is still running. Try Start comparison again shortly."); return;
    }

    setBusyLabel("Reviewing evidence and scoring…");
    const result = await startComparisonAction(proposalId, participants);
    if (cancelled.current) return;
    setBusy(false); setBusyLabel("Preparing vendors…");
    if (!result.success) { setError(result.message); return; }
    pollAttempt.current = 0;
    setView(result.data);
  };
  // Once a comparison exists the saved result stays readable, but the reader
  // must still be able to start another one — the stale banner told them to
  // "run a new comparison" while this panel offered no way to do it.
  const canStartNew = !loading && candidates.length >= 2 && (!view || terminal.has(view.run.status));
  const startLabel = view ? "Run a new comparison" : `Compare ${includedCandidates.length} vendors`;
  // Out-of-date banners elsewhere on the page ask for a run through this
  // event; banners on other pages arrive with ?rerun=1. Both start exactly one
  // run, and the flag is removed from the address so a refresh does not repeat it.
  const startRef = useRef(start);
  const canStartRef = useRef(false);
  useEffect(() => {
    startRef.current = start;
    canStartRef.current = canStartNew && !busy;
  });
  useEffect(() => {
    const onRequest = () => { if (canStartRef.current) void startRef.current(); };
    window.addEventListener(START_COMPARISON_EVENT, onRequest);
    return () => window.removeEventListener(START_COMPARISON_EVENT, onRequest);
  }, []);
  const rerunHandled = useRef(false);
  useEffect(() => {
    if (loading || rerunHandled.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(RERUN_QUERY_FLAG) !== "1") return;
    rerunHandled.current = true;
    url.searchParams.delete(RERUN_QUERY_FLAG);
    window.history.replaceState(window.history.state, "", url.toString());
    if (canStartRef.current) void startRef.current();
  }, [loading]);
  const cancel = () => view ? mutate(() => cancelComparisonAction(proposalId, view.run.runId)) : Promise.resolve();
  const retry = () => view ? mutate(() => retryComparisonAction(proposalId, view.run.runId)) : Promise.resolve();
  return <section className="mb-5 rounded-2xl border border-violet-200 bg-violet-50/70 p-4" aria-labelledby="comparison-progress-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="comparison-progress-title" className="flex items-center gap-2 text-sm font-extrabold text-violet-950"><BarChart3 size={17}/>Compare vendors</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-violet-800">Line up the vendor responses side by side. RFPilot prepares evidence review and scorecards automatically, excludes vendors that miss a must-pass requirement, and suggests a ranking &mdash; the final decision remains yours.</p></div>
      {canStartNew && <button type="button" disabled={busy || includedCandidates.length < 2} onClick={() => void start()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"><RefreshCw size={14} className={busy ? "animate-spin" : ""}/>{busy ? busyLabel : startLabel}</button>}
    </div>
    {canStartNew && (
      <fieldset className="mt-4">
        <legend className="text-xs font-extrabold text-violet-950">Vendors to compare</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {candidates.map((candidate) => (
            <label key={candidate._id} className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-bold ${excluded.has(candidate._id) ? "border-slate-200 bg-white text-slate-500" : "border-violet-300 bg-white text-violet-950"}`}>
              <input
                type="checkbox"
                checked={!excluded.has(candidate._id)}
                onChange={() => setExcluded((current) => { const next = new Set(current); if (next.has(candidate._id)) next.delete(candidate._id); else next.add(candidate._id); return next; })}
              />
              {candidate.vendorName || candidate.submittedBy || "Unnamed respondent"}
            </label>
          ))}
        </div>
        {includedCandidates.length < 2 && <p className="mt-2 text-xs text-violet-900">Select at least two vendors to compare.</p>}
      </fieldset>
    )}
    {loading && <p role="status" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-violet-800"><RefreshCw size={14} className="animate-spin"/>Loading comparison status…</p>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
    {!view && !loading && excludedEmptyCount > 0 && <p className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">{excludedEmptyCount} vendor {excludedEmptyCount === 1 ? "response was" : "responses were"} left out because {excludedEmptyCount === 1 ? "it has" : "they have"} no message or attached document to read.</p>}
    {!view && !loading && candidates.length < 2 ? <p className="mt-4 rounded-xl bg-white p-3 text-xs text-violet-900">{candidates.length === 0 ? "No vendor responses have arrived for this proposal yet." : "Only one vendor response so far. RFPilot needs at least two to compare them."} <Link href="/vendor-responses" className="font-bold underline">Go to vendor responses</Link></p> : !view && !loading && (!requirementsApproved || !preparationComplete || missingEvaluationCount > 0) ? <p role="status" className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">Requirements, vendor mapping, evidence review, and scorecards will be prepared automatically when you start the comparison.</p> : null}
    {error?.includes("proposal intelligence and evaluation for") && <div className="mt-3 flex flex-wrap items-center gap-2">{candidates.map((candidate) => <Link key={candidate._id} href={`/vendor-responses/${candidate._id}`} className="inline-flex min-h-9 items-center rounded-lg border border-violet-200 bg-white px-3 text-xs font-extrabold text-violet-900 hover:border-violet-500">Open {candidate.vendorName || candidate.submittedBy || "vendor"} evaluation</Link>)}</div>}
    {view && <div className="mt-4 rounded-xl border border-violet-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-extrabold uppercase tracking-wide text-violet-700">{describeStage(view.run.progressStage)}</p><p className="mt-1 text-sm font-bold text-slate-800">{view.run.completedParticipantCount} of {view.run.participantCount} vendors analyzed</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${view.run.status.startsWith("succeeded") ? "bg-emerald-100 text-emerald-800" : view.run.status === "failed" ? "bg-red-100 text-red-800" : "bg-violet-100 text-violet-800"}`}>{describeRunStatus(view.run.status)}</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100" role="progressbar" aria-label="Comparison progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.run.progress)}><div className="h-full rounded-full bg-violet-600 transition-[width]" style={{ width: `${view.run.progress}%` }}/></div><p className="mt-1 text-right text-[10px] font-bold text-violet-700">{Math.round(view.run.progress)}%</p>
      {view.freshness.state === "stale" && <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle size={15} className="mt-0.5 shrink-0"/><span><strong>Out of date.</strong> {describeFreshnessReasons(view.freshness.reasons) || "The proposal inputs changed after this comparison ran."} The results stay readable; run a new comparison for an up-to-date view.</span>{canStartNew && <button type="button" disabled={busy || includedCandidates.length < 2} onClick={() => void start()} className="ml-auto inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg bg-amber-700 px-3 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"><RefreshCw size={12} className={busy ? "animate-spin" : ""}/>{busy ? busyLabel : "Run a new comparison"}</button>}</div>}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">{view.participants.map((item) => <li key={item.participantId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><div><p className="text-xs font-bold text-slate-800">{item.vendorLabel}</p><p className="text-[10px] uppercase text-slate-500">{describeStage(item.stage)}</p></div>{item.status === "succeeded" ? <CheckCircle2 size={16} className="text-emerald-600"/> : <RefreshCw size={15} className={item.status === "running" ? "animate-spin text-violet-600" : "text-slate-400"}/>}</li>)}</ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">{!terminal.has(view.run.status) && <button type="button" disabled={busy} onClick={() => void cancel()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700"><CircleStop size={13}/>Cancel</button>}{view.run.status === "failed" && <button type="button" disabled={busy} onClick={() => void retry()} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-violet-700 px-3 text-xs font-bold text-white"><RotateCcw size={13}/>Retry failed steps</button>}{view.run.status.startsWith("succeeded") && <><p className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700"><ShieldCheck size={14}/>Saved results loaded &mdash; nothing was rerun.</p><Link href={`/proposals/${proposalId}/intelligence/comparisons/${view.run.runId}/overview`} className="ml-auto inline-flex min-h-9 items-center rounded-lg bg-violet-700 px-3 text-xs font-extrabold text-white">Open comparison results</Link></>}</div>
    </div>}
  </section>;
}
