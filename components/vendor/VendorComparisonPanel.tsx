"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, CircleStop, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import type { VendorResponseItem } from "@/app/actions/vendorResponse";
import { cancelComparisonAction, getComparisonStatusAction, listComparisonsAction, retryComparisonAction, startComparisonAction, type ComparisonView } from "@/app/actions/comparisonOrchestration";

const terminal = new Set(["succeeded", "succeeded_with_warnings", "failed", "cancelled"]);
const label = (value: string) => value.replaceAll("_", " ");

export default function VendorComparisonPanel({ responses, proposalId }: { responses: VendorResponseItem[]; proposalId: string }) {
  const candidates = useMemo(() => responses.filter((response) => response.proposalId === proposalId && response.submissionId && response.currentVersionId), [proposalId, responses]);
  const [view, setView] = useState<ComparisonView>(); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string>(); const [visible, setVisible] = useState(true); const pollAttempt = useRef(0); const cancelled = useRef(false);
  const loadLatest = useCallback(async () => { const result = await listComparisonsAction(proposalId); if (cancelled.current) return; setLoading(false); if (result.success) { setView(result.data[0]); setError(undefined); } else setError(result.message); }, [proposalId]);
  const refresh = useCallback(async (runId: string) => { const result = await getComparisonStatusAction(proposalId, runId); if (cancelled.current) return; if (result.success) { setView(result.data); setError(undefined); } else setError(result.message); }, [proposalId]);
  useEffect(() => { cancelled.current = false; const timer = window.setTimeout(() => void loadLatest(), 0); return () => { cancelled.current = true; window.clearTimeout(timer); }; }, [loadLatest]);
  useEffect(() => { const update = () => setVisible(document.visibilityState === "visible"); update(); document.addEventListener("visibilitychange", update); return () => document.removeEventListener("visibilitychange", update); }, []);
  useEffect(() => {
    if (!view || !visible || terminal.has(view.run.status)) return;
    const delay = Math.min(8000, 1500 * (2 ** Math.min(pollAttempt.current, 3)));
    const timer = window.setTimeout(() => { pollAttempt.current += 1; void refresh(view.run.runId); }, delay);
    return () => window.clearTimeout(timer);
  }, [refresh, view, visible]);
  const mutate = async (operation: () => Promise<{ success: boolean; data?: unknown; message?: string }>) => { setBusy(true); setError(undefined); const result = await operation(); if (cancelled.current) return; setBusy(false); if (!result.success) { setError(result.message ?? "Comparison operation failed."); return; } pollAttempt.current = 0; await loadLatest(); };
  const start = () => mutate(() => startComparisonAction(proposalId, candidates.map((item) => ({ submissionId: item.submissionId!, versionId: item.currentVersionId! }))));
  const cancel = () => view ? mutate(() => cancelComparisonAction(proposalId, view.run.runId)) : Promise.resolve();
  const retry = () => view ? mutate(() => retryComparisonAction(proposalId, view.run.runId)) : Promise.resolve();
  return <section className="mb-5 rounded-2xl border border-violet-200 bg-violet-50/70 p-4" aria-labelledby="comparison-progress-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="comparison-progress-title" className="flex items-center gap-2 text-sm font-extrabold text-violet-950"><BarChart3 size={17}/>Comparison orchestration</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-violet-800">Freeze the selected vendor versions into one durable comparison run. This surface reports persisted progress and does not rank or select vendors.</p></div>
      {!view && <button type="button" disabled={busy || loading || candidates.length < 2} onClick={() => void start()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"><RefreshCw size={14} className={busy ? "animate-spin" : ""}/>{busy ? "Starting…" : `Start comparison (${candidates.length})`}</button>}
    </div>
    {loading && <p role="status" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-violet-800"><RefreshCw size={14} className="animate-spin"/>Restoring comparison status…</p>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
    {!view && !loading && candidates.length < 2 && <p className="mt-4 rounded-xl bg-white p-3 text-xs text-violet-900">At least two versioned responses to this proposal are required.</p>}
    {view && <div className="mt-4 rounded-xl border border-violet-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-extrabold uppercase tracking-wide text-violet-700">{label(view.run.progressStage)}</p><p className="mt-1 text-sm font-bold text-slate-800">{view.run.completedParticipantCount} of {view.run.participantCount} vendor snapshots complete</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${view.run.status.startsWith("succeeded") ? "bg-emerald-100 text-emerald-800" : view.run.status === "failed" ? "bg-red-100 text-red-800" : "bg-violet-100 text-violet-800"}`}>{label(view.run.status)}</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100" role="progressbar" aria-label="Comparison progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.run.progress)}><div className="h-full rounded-full bg-violet-600 transition-[width]" style={{ width: `${view.run.progress}%` }}/></div><p className="mt-1 text-right text-[10px] font-bold text-violet-700">{Math.round(view.run.progress)}%</p>
      {view.freshness.state === "stale" && <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle size={15} className="mt-0.5 shrink-0"/><span><strong>Historical comparison:</strong> {view.freshness.reasons.map(label).join(", ")}. Existing results remain readable; refresh requires a new run.</span></div>}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">{view.participants.map((item) => <li key={item.participantId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><div><p className="text-xs font-bold text-slate-800">{item.vendorLabel}</p><p className="text-[10px] uppercase text-slate-500">{label(item.stage)}</p></div>{item.status === "succeeded" ? <CheckCircle2 size={16} className="text-emerald-600"/> : <RefreshCw size={15} className={item.status === "running" ? "animate-spin text-violet-600" : "text-slate-400"}/>}</li>)}</ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">{!terminal.has(view.run.status) && <button type="button" disabled={busy} onClick={() => void cancel()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700"><CircleStop size={13}/>Cancel</button>}{view.run.status === "failed" && <button type="button" disabled={busy} onClick={() => void retry()} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-violet-700 px-3 text-xs font-bold text-white"><RotateCcw size={13}/>Retry failed branches</button>}{view.run.status.startsWith("succeeded") && <p className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700"><ShieldCheck size={14}/>Persisted result restored without rerunning analysis.</p>}</div>
    </div>}
  </section>;
}
