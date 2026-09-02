"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, CircleAlert, Pencil, RefreshCw, ShieldAlert, X } from "lucide-react";
import EvidenceExcerpt from "@/components/proposalIntelligence/EvidenceExcerpt";
import { coverageFromRelationship, coveragePresentation } from "@/lib/proposalIntelligence/coverageVocabulary";
import {
  createVendorIntelligenceAction,
  getLatestVendorIntelligenceAction,
  reviewVendorIntelligenceAction,
  type ExtractedFact,
  type HumanReview,
  type IntelligenceEvidence,
  type VendorIntelligenceResult,
} from "@/app/actions/vendorIntelligence";

const coverage = (relationship: string) => coveragePresentation[coverageFromRelationship(relationship)];
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const locatorLabel = (locator: Record<string, string | number>) => Object.entries(locator)
  .filter(([key]) => ["page", "sheet", "row", "column", "characterStart", "characterEnd"].includes(key))
  .map(([key, value]) => `${key.replace(/([A-Z])/g, " $1").toLowerCase()} ${value}`).join(" · ");

export const factCorrectionPayload = (fact: ExtractedFact, value: string): Record<string, unknown> | null => {
  const corrected = value.trim();
  if (!corrected) return null;
  if (fact.valueKind === "money") {
    const match = /^(?:([a-z]{3})\s+)?(-?\d+(?:\.\d+)?)$/i.exec(corrected.replaceAll(",", ""));
    const currency = (match?.[1] ?? fact.currency ?? "").toUpperCase();
    const amount = Number(match?.[2]);
    return match && /^[A-Z]{3}$/.test(currency) && Number.isFinite(amount)
      ? { normalizedValue: `${currency} ${amount}`, typedValue: { kind: "money", number: amount, currency } }
      : null;
  }
  if (["number", "quantity"].includes(fact.valueKind)) {
    const number = Number(corrected.replaceAll(",", ""));
    return Number.isFinite(number)
      ? { normalizedValue: String(number), typedValue: { kind: fact.valueKind, number } }
      : null;
  }
  if (fact.valueKind === "boolean") {
    const normalized = corrected.toLowerCase();
    if (!["true", "false", "yes", "no"].includes(normalized)) return null;
    const boolean = normalized === "true" || normalized === "yes";
    return { normalizedValue: String(boolean), typedValue: { kind: "boolean", boolean } };
  }
  if (fact.valueKind === "list") {
    const list = corrected.split(/[\n,]/).map((item) => item.trim()).filter(Boolean).slice(0, 30);
    return list.length ? { normalizedValue: list.join(" | "), typedValue: { kind: "list", list } } : null;
  }
  return {
    normalizedValue: corrected,
    typedValue: { kind: fact.valueKind, text: corrected },
  };
};

function EvidenceList({ evidence, context }: { evidence: IntelligenceEvidence[]; context: string[] }) {
  if (!evidence.length) return <p className="mt-2 text-xs italic text-slate-500">No supporting passage was identified.</p>;
  return <details className="mt-3">
    <summary className="cursor-pointer text-xs font-bold text-[#0076b4]">Show cited evidence ({evidence.length})</summary>
    <ul className="mt-2 space-y-2">{evidence.map((item) => <li key={item.fragmentId} className="rounded-lg border-l-2 border-sky-200 bg-sky-50/50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.sourceLabel}{locatorLabel(item.locator) ? ` · ${locatorLabel(item.locator)}` : ""}</p>
      <EvidenceExcerpt content={item.content} context={context}/>
    </li>)}</ul>
  </details>;
}

function ReviewControls({ targetType, review, saving, onReview }: {
  targetType: "fact" | "mapping"; review?: HumanReview; saving: boolean;
  onReview: (decision: "accepted" | "rejected" | "corrected" | "escalated", correctedValue?: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  if (review) {
    if (review.decision === "accepted" && review.note?.startsWith("Automatically acknowledged")) return null;
    return <p className="mt-3 text-[11px] font-semibold text-slate-500">Latest review: <span className="text-slate-800">{label(review.decision)}</span>{review.note ? ` · ${review.note}` : ""}</p>;
  }
  return <div className="mt-3 border-t border-slate-100 pt-3">
    {editing && <div className="mb-2 flex gap-2">
      <input aria-label="Corrected value" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Enter the verified corrected value" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-[#008ad2]" />
      <button type="button" disabled={saving || !value.trim()} onClick={() => void onReview("corrected", value.trim())} className="rounded-lg bg-[#087f69] px-3 text-xs font-bold text-white disabled:opacity-50">Save correction</button>
    </div>}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={saving} onClick={() => void onReview("accepted")} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 disabled:opacity-50"><Check size={12}/>Accept</button>
      <button type="button" disabled={saving} onClick={() => void onReview("rejected")} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-bold text-red-700 disabled:opacity-50"><X size={12}/>Reject</button>
      {targetType === "fact" && <button type="button" disabled={saving} onClick={() => setEditing((current) => !current)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-50"><Pencil size={12}/>Correct</button>}
      <button type="button" disabled={saving} onClick={() => void onReview("escalated")} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 disabled:opacity-50"><ShieldAlert size={12}/>Escalate</button>
    </div>
  </div>;
}

export default function VendorFactsSection({ proposalId, submissionId, versionId }: { proposalId: string; submissionId: string; versionId: string }) {
  const [result, setResult] = useState<VendorIntelligenceResult>();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [savingTarget, setSavingTarget] = useState<string>();
  const [error, setError] = useState<string>();
  const [tab, setTab] = useState<"mappings" | "facts">("mappings");
  const cancelled = useRef(false);

  const load = useCallback(async () => {
    const response = await getLatestVendorIntelligenceAction(proposalId, submissionId, versionId);
    if (cancelled.current) return;
    setLoading(false);
    if (response.success) { setResult(response.data); setError(undefined); }
    else if (response.code === "INTELLIGENCE_RUN_NOT_FOUND") { setResult(undefined); setError(undefined); }
    else setError(response.message);
  }, [proposalId, submissionId, versionId]);

  useEffect(() => { cancelled.current = false; const timer = window.setTimeout(() => void load(), 0); return () => { cancelled.current = true; window.clearTimeout(timer); }; }, [load]);
  useEffect(() => { if (!result || !["queued", "running"].includes(result.run.status)) return; const timer = window.setTimeout(() => void load(), 2000); return () => window.clearTimeout(timer); }, [result, load]);

  const latestReviews = useMemo(() => {
    const reviews = new Map<string, HumanReview>();
    result?.reviews.forEach((review) => reviews.set(`${review.targetType}:${review.targetId}`, review));
    return reviews;
  }, [result?.reviews]);

  const start = async () => {
    setStarting(true); setError(undefined);
    const response = await createVendorIntelligenceAction(proposalId, submissionId, versionId, crypto.randomUUID());
    if (cancelled.current) return;
    setStarting(false);
    if (!response.success) { setError(response.message); return; }
    await load();
  };
  const review = async (targetType: "fact" | "mapping", targetId: string, decision: "accepted" | "rejected" | "corrected" | "escalated", correctedPayload?: Record<string, unknown> | null) => {
    if (!result) return;
    if (decision === "corrected" && !correctedPayload) {
      setError("The corrected value does not match this fact’s type. Use a valid number, currency amount, boolean, or text value.");
      return;
    }
    setSavingTarget(`${targetType}:${targetId}`); setError(undefined);
    const response = await reviewVendorIntelligenceAction(proposalId, submissionId, versionId, result.run.runId, {
      targetType, targetId, decision, reasonCode: decision === "corrected" ? "human_verified_correction" : "human_review",
      note: decision === "corrected" ? "Value corrected by the proposal owner." : "", correctedPayload: correctedPayload ?? null,
    }, crypto.randomUUID());
    if (cancelled.current) return;
    setSavingTarget(undefined);
    if (!response.success) { setError(response.message); return; }
    await load();
  };

  const processing = starting || result?.run.status === "queued" || result?.run.status === "running";
  // A succeeded run is never redone for the same inputs (the backend returns
  // the saved result), so present the button as an up-to-date state instead
  // of implying a rerun.
  const upToDate = !processing && result?.run.status === "succeeded";
  return <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm" aria-labelledby="vendor-intelligence-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div>
      <h3 id="vendor-intelligence-title" className="flex items-center gap-2 text-sm font-bold text-slate-900"><Bot size={17} className="text-[#008ad2]"/>Proposal intelligence</h3>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Shows where this response answers each of your requirements, with the vendor&rsquo;s own words as proof. It does not rank or select the vendor.</p>
    </div>{upToDate
      ? <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-800"><Check size={13}/>Analysis up to date</span>
      : <button type="button" onClick={() => void start()} disabled={processing || loading} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#087f69] px-3.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={13} className={processing ? "animate-spin" : ""}/>{processing ? "Analyzing…" : result ? "Retry analysis" : "Analyze response"}</button>}</div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
    {loading && <p className="mt-4 text-xs text-slate-500">Checking proposal intelligence…</p>}
    {!loading && !result && !error && <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">No requirement mapping or typed facts have been generated for this response version.</p>}
    {result?.run.status === "failed" && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">The run failed safely{result.run.safeErrorCode ? ` (${result.run.safeErrorCode})` : ""}. No unsupported findings were saved.</p>}
    {result && ["queued", "running"].includes(result.run.status) && <p className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-800">The response is being analyzed in a durable background job. This page will update automatically.</p>}
    {result?.run.status === "succeeded" && <>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Requirements", result.run.requirementCount], ["Mapped", result.run.mappedRequirementCount], ["Facts", result.run.factCount], ["Contradictions", result.run.contradictionCount]].map(([name, count]) => <div key={String(name)} className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] font-bold uppercase text-slate-400">{name}</p><p className="text-lg font-extrabold text-slate-800">{count}</p></div>)}</div>
      {result.run.warnings.length > 0 && <div role="alert" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-900"><p className="font-bold">Source coverage is incomplete. Evaluation and vendor comparison are blocked.</p><ul className="mt-2 list-disc space-y-1 pl-5">{result.run.warnings.map((warning, index) => <li key={`${String(warning.code ?? "warning")}-${index}`}>{typeof warning.sourceLabel === "string" ? `${warning.sourceLabel}: ` : ""}{String(warning.message ?? "Some response evidence was unavailable.")}</li>)}</ul></div>}
      {result.run.contradictionCount > 0 && <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800"><CircleAlert size={14}/>Conflicting values are preserved and marked for human review.</p>}
      <div className="mt-4 flex gap-2 border-b border-slate-200"><button type="button" onClick={() => setTab("mappings")} className={`border-b-2 px-3 py-2 text-xs font-bold ${tab === "mappings" ? "border-[#008ad2] text-[#0076b4]" : "border-transparent text-slate-500"}`}>Requirement mappings</button><button type="button" onClick={() => setTab("facts")} className={`border-b-2 px-3 py-2 text-xs font-bold ${tab === "facts" ? "border-[#008ad2] text-[#0076b4]" : "border-transparent text-slate-500"}`}>Key facts</button></div>
      {tab === "mappings" ? <ul className="mt-3 space-y-3">{result.mappings.map((mapping) => { const key = `mapping:${mapping.mappingId}`; return <li key={mapping.mappingId} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-slate-800">{mapping.requirementTitle}</p><p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{[mapping.mandatory ? "Mandatory" : null, mapping.confidence < 0.7 ? `Low AI confidence (${Math.round(mapping.confidence * 100)}%) — verify the source` : null].filter(Boolean).join(" · ")}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${coverage(mapping.relationship).className}`} title={coverage(mapping.relationship).description}>{coverage(mapping.relationship).label}</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{coverage(mapping.relationship).description}</p><EvidenceList evidence={mapping.evidence} context={[mapping.requirementTitle]}/><ReviewControls targetType="mapping" review={latestReviews.get(key)} saving={savingTarget === key} onReview={(decision) => review("mapping", mapping.mappingId, decision, null)}/></li>; })}</ul>
      : <ul className="mt-3 space-y-3">{result.facts.map((fact) => { const key = `fact:${fact.factId}`; return <li key={fact.factId} className={`rounded-xl border p-4 ${fact.contradictionGroup ? "border-amber-300 bg-amber-50/30" : "border-slate-200"}`}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-slate-800">{fact.statement}</p><p className="mt-1 text-xs font-semibold text-[#0076b4]">{fact.normalizedValue || "Unspecified value"}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{[label(fact.family), fact.confidence < 0.7 ? `Low AI confidence (${Math.round(fact.confidence * 100)}%) — verify the source` : null].filter(Boolean).join(" · ")}</p></div>{fact.contradictionGroup && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-800">Contradiction</span>}</div><EvidenceList evidence={fact.citations} context={[fact.statement, fact.normalizedValue]}/><ReviewControls targetType="fact" review={latestReviews.get(key)} saving={savingTarget === key} onReview={(decision, value) => review("fact", fact.factId, decision, value === undefined ? null : factCorrectionPayload(fact, value))}/></li>; })}</ul>}
    </>}
  </section>;
}
