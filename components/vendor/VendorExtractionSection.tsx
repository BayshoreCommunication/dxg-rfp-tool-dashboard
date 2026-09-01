"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileSearch, RefreshCw } from "lucide-react";
import {
  createEvidenceExtractionAction,
  getEvidenceExtractionsAction,
  type EvidenceExtractionSummary,
} from "@/app/actions/evidenceExtraction";

const statusStyle: Record<string, string> = {
  succeeded: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-800",
  unreadable: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
  queued: "bg-sky-100 text-sky-800",
  running: "bg-sky-100 text-sky-800",
};

const locatorLabel = (locator: Record<string, string | number>) =>
  Object.entries(locator)
    .filter(([key]) => ["page", "sheet", "row", "column", "characterStart", "characterEnd"].includes(key))
    .map(([key, value]) => `${key.replace(/([A-Z])/g, " $1").toLowerCase()} ${value}`)
    .join(" · ");

export default function VendorExtractionSection({
  proposalId,
  submissionId,
  versionId,
}: {
  proposalId: string;
  submissionId: string;
  versionId: string;
}) {
  const [summary, setSummary] = useState<EvidenceExtractionSummary>();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string>();
  const cancelled = useRef(false);

  const load = useCallback(async () => {
    const result = await getEvidenceExtractionsAction(proposalId, submissionId, versionId);
    if (cancelled.current) return;
    setLoading(false);
    if (result.success) {
      setSummary(result.data);
      setError(undefined);
    } else setError(result.message);
  }, [proposalId, submissionId, versionId]);

  useEffect(() => {
    cancelled.current = false;
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      cancelled.current = true;
    };
  }, [load]);

  useEffect(() => {
    if (summary?.status !== "processing") return;
    const timer = window.setTimeout(() => void load(), 2000);
    return () => window.clearTimeout(timer);
  }, [summary?.status, load]);

  const start = async () => {
    setStarting(true);
    setError(undefined);
    const result = await createEvidenceExtractionAction(proposalId, submissionId, versionId, crypto.randomUUID());
    if (cancelled.current) return;
    setStarting(false);
    if (!result.success) { setError(result.message); return; }
    await load();
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm" aria-labelledby="evidence-extraction-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="evidence-extraction-title" className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileSearch size={17} className="text-[#008ad2]" /> Proposal evidence
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            The readable text pulled from this version&rsquo;s files. Every excerpt keeps its page or row location so you can check the original.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void start()}
          disabled={starting || loading || summary?.status === "processing"}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#087f69] px-3.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={13} className={starting || summary?.status === "processing" ? "animate-spin" : ""} />
          {starting || summary?.status === "processing" ? "Extracting…" : summary?.runs.length ? "Check extraction" : "Extract evidence"}
        </button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
      {loading && <p className="mt-4 text-xs text-slate-500">Checking extraction status…</p>}
      {!loading && summary?.status === "not_started" && (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">No evidence has been extracted from this version yet.</p>
      )}
      {summary && summary.runs.length > 0 && (
        <ul className="mt-4 space-y-3">
          {summary.runs.map((run) => (
            <li key={run.runId} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{run.sourceLabel}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyle[run.status] ?? "bg-slate-100 text-slate-700"}`}>
                  {run.status}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {run.method ? run.method.replaceAll("_", " + ") : "Waiting"}
                {run.pageCount > 0 ? ` · ${Math.round(run.coverage * 100)}% of ${run.pageCount} pages` : ""}
                {` · ${run.fragmentCount} passages`}
                {run.tableCount ? ` · ${run.tableCount} tables` : ""}
                {run.reused ? " · checksum reused" : ""}
              </p>
              {run.warnings.map((warning, index) => (
                <p key={`${warning.code}-${index}`} className="mt-2 text-xs text-amber-700">{warning.message}</p>
              ))}
              {run.preview.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-[#0076b4]">Preview extracted evidence</summary>
                  <ul className="mt-2 space-y-2">
                    {run.preview.map((fragment) => (
                      <li key={`${run.runId}-${fragment.ordinal}`} className="border-l-2 border-slate-200 pl-3">
                        {locatorLabel(fragment.locator) && <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{locatorLabel(fragment.locator)}</p>}
                        <p className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-slate-700">{fragment.content}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
