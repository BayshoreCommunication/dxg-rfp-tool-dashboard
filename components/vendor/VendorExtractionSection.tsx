"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileSearch, RefreshCw } from "lucide-react";
import SectionLoadError from "@/components/vendor/SectionLoadError";
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

// Backend `ExtractionRun.method` is a closed enum; label it for planners
// instead of exposing the identifier. Unknown values fall back to the raw
// string so a new backend method is still visible rather than hidden.
const statusLabels: Record<string, string> = {
  succeeded: "Read",
  partial: "Partly read",
  unreadable: "Unreadable",
  failed: "Failed",
  queued: "Queued",
  running: "Reading",
};

const methodLabels: Record<string, string> = {
  native: "Text read directly",
  native_with_ocr: "Text plus OCR",
  ocr: "OCR only",
};

const methodLabel = (method: string | null) =>
  method ? (methodLabels[method] ?? method) : "Waiting";

/** How many passages are shown before the reader asks for more. */
const SPOT_CHECK_COUNT = 3;
const PASSAGE_PREVIEW_CHARS = 280;
const trimPassage = (content: string) =>
  content.length > PASSAGE_PREVIEW_CHARS ? `${content.slice(0, PASSAGE_PREVIEW_CHARS).trimEnd()}…` : content;
const pagesRead = (coverage: number, pageCount: number) => Math.min(pageCount, Math.round(coverage * pageCount));

const locatorLabel = (locator: Record<string, string | number>) =>
  Object.entries(locator)
    .filter(([key]) => ["page", "sheet", "row", "column", "characterStart", "characterEnd"].includes(key))
    .map(([key, value]) => `${key.replace(/([A-Z])/g, " $1").toLowerCase()} ${value}`)
    .join(" · ");

/**
 * A planner rarely needs the extracted text itself; the requirement and
 * value findings already cite the exact passages. This is a small spot check
 * that the reader was looking at the right document, collapsed by default
 * and never a wall of text: a few trimmed passages, more on request.
 */
function PassageSpotCheck({ runId, preview, fragmentCount }: {
  runId: string;
  preview: EvidenceExtractionSummary["runs"][number]["preview"];
  fragmentCount: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? preview : preview.slice(0, SPOT_CHECK_COUNT);
  const hidden = preview.length - visible.length;
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-semibold text-[#0076b4]">
        Spot-check the text ({Math.min(SPOT_CHECK_COUNT, preview.length)} of {fragmentCount} {fragmentCount === 1 ? "passage" : "passages"})
      </summary>
      <ul className="mt-2 space-y-2">
        {visible.map((fragment) => (
          <li key={`${runId}-${fragment.ordinal}`} className="border-l-2 border-slate-200 pl-3">
            {locatorLabel(fragment.locator) && <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{locatorLabel(fragment.locator)}</p>}
            <p className="mt-0.5 text-xs leading-5 text-slate-700">{trimPassage(fragment.content)}</p>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-xs font-semibold text-[#0076b4] hover:underline">
          Show {hidden} more loaded {hidden === 1 ? "passage" : "passages"}
        </button>
      )}
      {showAll && fragmentCount > preview.length && (
        <p className="mt-2 text-[11px] text-slate-500">
          Only the first {preview.length} passages are loaded here. Every finding below cites its own passage, and the original file is above.
        </p>
      )}
    </details>
  );
}

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
            <FileSearch size={17} className="text-[#008ad2]" /> Files read
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Whether each file could be read, and how much of it. Everything below in this response is built only from this text.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void start()}
          disabled={starting || loading || summary?.status === "processing"}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#087f69] px-3.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={13} className={starting || summary?.status === "processing" ? "animate-spin" : ""} />
          {starting || summary?.status === "processing" ? "Reading…" : summary?.runs.length ? "Re-check files" : "Extract evidence"}
        </button>
      </div>

      {error && (summary ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p> : <SectionLoadError what="the extracted evidence" message={error} onRetry={() => { setLoading(true); setError(undefined); void load(); }} retrying={loading}/>)}
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
                  {statusLabels[run.status] ?? run.status}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {methodLabel(run.method)}
                {run.pageCount > 0 ? ` · ${pagesRead(run.coverage, run.pageCount)} of ${run.pageCount} pages read` : ""}
                {` · ${run.fragmentCount} passages`}
                {run.tableCount ? ` · ${run.tableCount} tables` : ""}
                {run.reused ? " · checksum reused" : ""}
              </p>
              {run.warnings.map((warning, index) => (
                <p key={`${warning.code}-${index}`} className="mt-2 text-xs text-amber-700">{warning.message}</p>
              ))}
              {run.preview.length > 0 && (
                <PassageSpotCheck runId={run.runId} preview={run.preview} fragmentCount={run.fragmentCount} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
