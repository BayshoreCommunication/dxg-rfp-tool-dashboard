"use client";

import { completePrivateUpload, createPrivateUploadSession, createSourceScanJob, getDurableJob, listPrivateDocumentSources, type PrivateDocumentSource } from "@/app/actions/durableJobs";
import { nextPollDelay, presentJob, type DurableJob } from "@/lib/asyncOperations";
import { useEffect, useRef, useState } from "react";

const storageKey = (proposalId: string) => `rfpilot:source-scan:${proposalId}`;

export default function PrivateDocumentStatusPanel({ proposalId }: { proposalId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<DurableJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [delayed, setDelayed] = useState(false);
  const [trackedJobId, setTrackedJobId] = useState<string | null>(null);
  const [sources, setSources] = useState<PrivateDocumentSource[]>([]);
  const [approvedForAi,setApprovedForAi]=useState(false);
  const pollCount = useRef(0);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(storageKey(proposalId));
    if (!saved || !/^[0-9a-f-]{36}$/i.test(saved)) return;
    setTrackedJobId(saved);
  }, [proposalId]);

  useEffect(() => {
    let active = true;
    void listPrivateDocumentSources(proposalId).then(result => {
      if (active && result.success) setSources(result.data);
    });
    return () => { active = false; };
  }, [proposalId, trackedJobId]);

  useEffect(() => {
    if (!trackedJobId) return;
    let active = true; let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      if (document.hidden) { timer = setTimeout(poll, 2_000); return; }
      const result = await getDurableJob(trackedJobId);
      if (!active) return;
      if (!result.success) { setMessage(result.message); setCorrelationId(result.correlationId); return; }
      setJob(result.data); setCorrelationId(result.correlationId);
      const presentation = presentJob(result.data);
      if (presentation.terminal) { window.sessionStorage.removeItem(storageKey(proposalId)); setTrackedJobId(null); return; }
      pollCount.current += 1;
      setDelayed(Date.now() - Date.parse(result.data.createdAt) > 60_000);
      timer = setTimeout(poll, nextPollDelay(pollCount.current));
    };
    void poll();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [proposalId, trackedJobId]);

  const start = async () => {
    if (!file || busy) return;
    setBusy(true); setMessage(null); setJob(null); setDelayed(false);
    const operationKey = crypto.randomUUID();
    const session = await createPrivateUploadSession(proposalId, { name: file.name, type: file.type, size: file.size }, operationKey,approvedForAi?"non_confidential":"confidential");
    setCorrelationId(session.correlationId);
    if (!session.success) { setMessage(session.message); setBusy(false); return; }
    try {
      const upload = await fetch(session.data.uploadUrl, { method: "PUT", headers: session.data.requiredHeaders, body: file });
      if (!upload.ok) throw new Error("upload failed");
    } catch {
      setMessage("The private upload could not be completed. Check your connection and try again."); setBusy(false); return;
    }
    const completed = await completePrivateUpload(session.data.sourceId);
    setCorrelationId(completed.correlationId);
    if (!completed.success) { setMessage(completed.message); setBusy(false); return; }
    const queued = await createSourceScanJob(session.data.sourceId, operationKey);
    setCorrelationId(queued.correlationId);
    if (!queued.success) { setMessage(queued.message); setBusy(false); return; }
    window.sessionStorage.setItem(storageKey(proposalId), queued.data.id);
    setJob(queued.data); setTrackedJobId(queued.data.id); setBusy(false); setFile(null); pollCount.current = 0;
  };

  const presentation = job ? presentJob(job, delayed) : null;
  const tone = presentation?.tone === "success" ? "border-emerald-300 bg-emerald-50" : presentation?.tone === "error" ? "border-red-300 bg-red-50" : presentation?.tone === "warning" ? "border-amber-300 bg-amber-50" : "border-cyan-200 bg-cyan-50";

  return (
    <section aria-labelledby="private-document-title" className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 id="private-document-title" className="text-lg font-semibold text-slate-900">Private document security check</h2>
      <p className="mt-1 text-sm text-slate-600">Attach an approved reference file to this saved proposal. It remains quarantined until validation and malware scanning pass.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-medium text-slate-800">
          Reference file
          <input aria-describedby="private-file-help" type="file" accept=".pdf,.docx,.xlsx,.csv,.txt" disabled={busy || (!!job && !presentJob(job).terminal)} onChange={event => setFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm" />
        </label>
        <button type="button" onClick={() => void start()} disabled={!file || busy || (!!job && !presentJob(job).terminal)} className="rounded-lg bg-[#103B4C] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600">
          {busy ? "Uploading securely…" : "Upload and check"}
        </button>
      </div>
      <p id="private-file-help" className="mt-2 text-xs text-slate-500">PDF, DOCX, XLSX, CSV, or TXT. The configured private-storage limit applies.</p>
      <label className="mt-3 flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={approvedForAi} onChange={e=>setApprovedForAi(e.target.checked)} className="mt-1"/><span>I confirm this source is non-confidential and approved for live AI processing.</span></label>
      {presentation && <div role={presentation.tone === "error" ? "alert" : "status"} aria-live={presentation.tone === "error" ? "assertive" : "polite"} className={`mt-4 rounded-lg border p-4 ${tone}`}>
        <p className="font-semibold text-slate-900">{presentation.title}</p><p className="mt-1 text-sm text-slate-700">{presentation.detail}</p>
        {!presentation.terminal && <div className="mt-3 h-2 overflow-hidden rounded bg-white" aria-label={`Processing ${job?.progress ?? 0}%`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job?.progress ?? 0}><div className="h-full bg-cyan-600 transition-[width] motion-reduce:transition-none" style={{ width: `${Math.max(job?.progress ?? 0, 8)}%` }} /></div>}
      </div>}
      {message && <div role="alert" tabIndex={-1} className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">{message}</div>}
      {(message || presentation?.tone === "error") && correlationId && <p className="mt-2 text-xs text-slate-600">Support reference: <code>{correlationId}</code></p>}
      {sources.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold text-slate-900">Attached sources ({sources.length})</h3><ul className="mt-2 space-y-2">{sources.map(source => <li key={source.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><span className="max-w-[60%] truncate" title={source.originalFilename}>{source.originalFilename}</span><span className="text-xs text-slate-600">{source.confidentiality.replaceAll("_"," ")}</span><span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700">{source.status.replaceAll("_", " ")}</span></li>)}</ul></div>}
    </section>
  );
}
