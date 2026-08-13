"use client";

import { approveClarificationSetAction, createClarificationSetAction, getIntelligenceOperationsBundleAction, placeIntelligenceLegalHoldAction, recordClarificationDispatchAction, releaseIntelligenceLegalHoldAction, updateClarificationQuestionAction, updateIntelligenceRetentionPolicyAction, type ClarificationSet, type IntelligenceOperationsBundle } from "@/app/actions/proposalIntelligenceOperations";
import { formatIntelligenceTimestamp } from "@/lib/proposalIntelligence/formatTimestamp";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, FileArchive, FileJson, FileSpreadsheet, FileText, Gavel, History, LockKeyhole, MailCheck, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

const label = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const formatBytes = (bytes: number) => (bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);
const reportDefinitions = [
  {
    type: "executive_pdf",
    name: "Executive report",
    detail: "Polished PDF summary with frozen provenance, risks, evaluations, and human decisions.",
    icon: FileText,
  },
  {
    type: "comparison_xlsx",
    name: "Comparison schedule",
    detail: "Full requirement matrix, permitted commercial values, risks, evaluation, decisions, and clarifications.",
    icon: FileSpreadsheet,
  },
  {
    type: "executive_html",
    name: "Accessible executive HTML",
    detail: "Responsive, printable executive report with the same permission boundary.",
    icon: FileArchive,
  },
  {
    type: "evaluator_html",
    name: "Evaluator report",
    detail: "Human score contribution and completion state without vendor ranking.",
    icon: ClipboardCheck,
  },
  {
    type: "decision_html",
    name: "Decision record",
    detail: "Human selection history, rationale, and frozen context.",
    icon: Gavel,
  },
  {
    type: "clarification_html",
    name: "Clarification pack",
    detail: "Evidence-backed risks and approved questions for separately authorized dispatch.",
    icon: MailCheck,
  },
  {
    type: "audit_json",
    name: "Audit archive",
    detail: "Machine-readable manifest, export, decision, clarification, and governance history.",
    icon: FileJson,
  },
] as const;

function ClarificationQuestionEditor({ proposalId, runId, set, question, onChanged }: { proposalId: string; runId: string; set: ClarificationSet; question: ClarificationSet["questions"][number]; onChanged: (set: ClarificationSet) => void }) {
  const [text, setText] = useState(question.question);
  const [included, setIncluded] = useState(question.disposition === "included");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const save = async () => {
    setBusy(true);
    setMessage(undefined);
    const result = await updateClarificationQuestionAction(proposalId, runId, set.setId, question.questionId, set.lockVersion, { question: text, disposition: included ? "included" : "excluded" });
    setBusy(false);
    if (result.success) {
      onChanged(result.data);
      setMessage("Saved.");
    } else setMessage(result.message);
  };
  return (
    <li className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-extrabold text-slate-800">{question.vendorLabel}</p>
        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
          <input type="checkbox" checked={included} onChange={(event) => setIncluded(event.target.checked)} />
          Include
        </label>
      </div>
      <textarea aria-label={`Question for ${question.vendorLabel}`} value={text} onChange={(event) => setText(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-slate-200 p-2 text-xs leading-5 outline-none focus:border-[#008ad2]" />
      <div className="mt-2 flex items-center gap-2">
        <button type="button" disabled={busy} onClick={() => void save()} className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-slate-900 px-3 text-[11px] font-extrabold text-white">
          <Save size={12} />
          {busy ? "Saving…" : "Save"}
        </button>
        {message && (
          <span role="status" className={`text-[11px] font-semibold ${message === "Saved." ? "text-emerald-700" : "text-rose-700"}`}>
            {message}
          </span>
        )}
      </div>
    </li>
  );
}

function ClarificationCenter({ proposalId, runId, clarifications, onChanged }: { proposalId: string; runId: string; clarifications: ClarificationSet[]; onChanged: (sets: ClarificationSet[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [externalReference, setExternalReference] = useState("");
  const [recipientCount, setRecipientCount] = useState(1);
  const [channel, setChannel] = useState<"email_campaign" | "manual">("manual");
  const current = clarifications[0];
  const replace = (set: ClarificationSet) => onChanged([set, ...clarifications.filter((item) => item.setId !== set.setId)]);
  const create = async () => {
    setBusy(true);
    setMessage(undefined);
    const result = await createClarificationSetAction(proposalId, runId);
    setBusy(false);
    if (result.success) {
      replace(result.data);
      setMessage("Draft clarification set created from persisted risk questions.");
    } else setMessage(result.message);
  };
  const approve = async () => {
    if (!current) return;
    setBusy(true);
    setMessage(undefined);
    const result = await approveClarificationSetAction(proposalId, runId, current.setId, current.lockVersion);
    setBusy(false);
    if (result.success) {
      replace(result.data);
      setMessage("Clarification set approved and frozen.");
    } else setMessage(result.message);
  };
  const dispatch = async (event: FormEvent) => {
    event.preventDefault();
    if (!current) return;
    setBusy(true);
    setMessage(undefined);
    const result = await recordClarificationDispatchAction(proposalId, runId, current.setId, { channel, externalReference, recipientCount });
    setBusy(false);
    if (result.success) {
      replace(result.data);
      setMessage("Dispatch recorded. Proposal Intelligence did not send an email.");
    } else setMessage(result.message);
  };
  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="clarification-center-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="clarification-center-title" className="font-extrabold text-slate-950">
            Clarification approval center
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Questions originate from persisted risk records. Review and approve them here; sending remains a separately authorized campaign or manual action.</p>
        </div>
        {!current || current.status !== "draft" ? (
          <button type="button" disabled={busy} onClick={() => void create()} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-[#008ad2] px-4 text-xs font-extrabold text-white">
            <RefreshCw size={14} />
            Prepare new set
          </button>
        ) : null}
      </div>
      {message && (
        <p role="status" className={`mt-3 rounded-xl p-3 text-xs font-semibold ${message.includes("created") || message.includes("approved") || message.includes("recorded") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {message}
        </p>
      )}
      {!current ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No clarification set has been prepared.</p>
      ) : (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-extrabold text-sky-800">Set {current.setVersion}</span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${current.status === "draft" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{label(current.status)}</span>
            <span className="font-mono text-[10px] text-slate-400">{current.contentChecksum.slice(0, 12)}…</span>
          </div>
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {current.questions.map((question) =>
              current.status === "draft" ? (
                <ClarificationQuestionEditor key={question.questionId} proposalId={proposalId} runId={runId} set={current} question={question} onChanged={replace} />
              ) : (
                <li key={question.questionId} className={`rounded-xl p-3 text-xs leading-5 ${question.disposition === "included" ? "bg-slate-50 text-slate-700" : "bg-slate-100 text-slate-400 line-through"}`}>
                  <strong>{question.vendorLabel}:</strong> {question.question}
                </li>
              ),
            )}
          </ul>
          {current.status === "draft" && (
            <button type="button" disabled={busy || !current.questions.some((question) => question.disposition === "included")} onClick={() => void approve()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-extrabold text-white disabled:opacity-45">
              <LockKeyhole size={14} />
              Approve and freeze questions
            </button>
          )}
          {current.status === "approved" && (
            <form onSubmit={dispatch} className="mt-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-[180px_1fr_140px_auto]">
              <label className="text-xs font-extrabold text-emerald-950">
                Dispatch channel
                <select value={channel} onChange={(event) => setChannel(event.target.value as typeof channel)} className="mt-1 h-10 w-full rounded-lg border border-emerald-200 bg-white px-2 text-xs font-normal">
                  <option value="manual">Manual</option>
                  <option value="email_campaign">Email campaign</option>
                </select>
              </label>
              <label className="text-xs font-extrabold text-emerald-950">
                External dispatch reference
                <input required minLength={3} maxLength={300} value={externalReference} onChange={(event) => setExternalReference(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-emerald-200 px-3 text-xs font-normal" placeholder="Campaign ID or documented manual reference" />
              </label>
              <label className="text-xs font-extrabold text-emerald-950">
                Recipients
                <input required type="number" min={1} max={1000} value={recipientCount} onChange={(event) => setRecipientCount(Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border border-emerald-200 px-3 text-xs font-normal" />
              </label>
              <button disabled={busy} type="submit" className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-xs font-extrabold text-white">
                <MailCheck size={14} />
                Record dispatch
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

export function ReportCenter({ proposalId, runId, initialBundle, viewCommercial }: { proposalId: string; runId: string; initialBundle: IntelligenceOperationsBundle; viewCommercial: boolean }) {
  const [bundle, setBundle] = useState(initialBundle);
  const reportBase = `/api/proposal-intelligence/reports/${proposalId}/${runId}`;
  return (
    <div>
      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <h2 className="font-extrabold text-sky-950">Permission-safe report center</h2>
        <p className="mt-1 text-sm leading-6 text-sky-900">Every download is generated from this frozen run, records a checksum-only export event, and includes manifest, freshness, policy, and permission provenance. {viewCommercial ? "Your authorized exports may include commercial values." : "Commercial values are sealed and omitted from every export."}</p>
      </section>
      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {reportDefinitions.map((report) => (
          <article key={report.type} className="rounded-2xl border border-slate-200 bg-white p-5">
            <report.icon size={20} className="text-[#008ad2]" />
            <h2 className="mt-3 font-extrabold text-slate-950">{report.name}</h2>
            <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{report.detail}</p>
            <a href={`${reportBase}/${report.type}`} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-extrabold text-white">
              <Download size={14} />
              Download
            </a>
          </article>
        ))}
      </section>
      <ClarificationCenter proposalId={proposalId} runId={runId} clarifications={bundle.clarifications} onChanged={(clarifications) => setBundle((current) => ({ ...current, clarifications }))} />
    </div>
  );
}

export function AuditOperationsCenter({ proposalId, runId, initialBundle }: { proposalId: string; runId: string; initialBundle: IntelligenceOperationsBundle }) {
  const [bundle, setBundle] = useState(initialBundle);
  const [retentionDays, setRetentionDays] = useState(bundle.audit.retentionPolicy.procurement_record_retention_days);
  const [policyBasis, setPolicyBasis] = useState(bundle.audit.retentionPolicy.policy_basis);
  const [holdReason, setHoldReason] = useState("");
  const [releaseReason, setReleaseReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const activeHolds = useMemo(() => {
    const released = new Set(bundle.audit.legalHoldEvents.filter((event) => event.action === "released").map((event) => event.hold_id));
    return bundle.audit.legalHoldEvents.filter((event) => event.action === "placed" && !released.has(event.hold_id));
  }, [bundle.audit.legalHoldEvents]);
  const refresh = async () => {
    const result = await getIntelligenceOperationsBundleAction(proposalId, runId);
    if (result.success) {
      setBundle(result.data);
      setRetentionDays(result.data.audit.retentionPolicy.procurement_record_retention_days);
      setPolicyBasis(result.data.audit.retentionPolicy.policy_basis);
    }
    return result;
  };
  const savePolicy = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(undefined);
    const result = await updateIntelligenceRetentionPolicyAction(proposalId, runId, {
      retentionDays,
      policyBasis,
      expectedVersion: bundle.audit.retentionPolicy.version,
    });
    if (result.success) {
      await refresh();
      setMessage("Retention policy recorded. No records were deleted.");
    } else setMessage(result.message);
    setBusy(false);
  };
  const placeHold = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(undefined);
    const result = await placeIntelligenceLegalHoldAction(proposalId, runId, holdReason);
    if (result.success) {
      await refresh();
      setHoldReason("");
      setMessage("Legal hold placed as an append-only event.");
    } else setMessage(result.message);
    setBusy(false);
  };
  const releaseHold = async (holdId: string) => {
    setBusy(true);
    setMessage(undefined);
    const result = await releaseIntelligenceLegalHoldAction(proposalId, runId, holdId, releaseReason);
    if (result.success) {
      await refresh();
      setReleaseReason("");
      setMessage("Legal hold release recorded as an append-only event.");
    } else setMessage(result.message);
    setBusy(false);
  };
  const metrics = [
    {
      label: "Run duration",
      value: bundle.operations.durationMs === null ? "In progress" : `${(bundle.operations.durationMs / 60000).toFixed(1)} min`,
    },
    { label: "Report exports", value: bundle.operations.report_export_count },
    { label: "Decisions", value: bundle.operations.decision_count },
    {
      label: "Clarification sets",
      value: bundle.operations.clarification_set_count,
    },
    { label: "Failed jobs", value: bundle.operations.failed_job_count },
    {
      label: "Active legal holds",
      value: bundle.operations.active_legal_hold_count,
    },
  ];
  return (
    <div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xl font-extrabold text-slate-950">{item.value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{item.label}</p>
          </article>
        ))}
      </section>
      {message && (
        <p role="status" className={`mt-4 rounded-xl p-3 text-xs font-semibold ${message.includes("recorded") || message.includes("placed") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {message}
        </p>
      )}
      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 font-extrabold text-slate-950">
            <ShieldCheck size={18} className="text-[#008ad2]" />
            Frozen provenance
          </h2>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            {[
              ["Manifest", bundle.audit.manifest.content_checksum],
              ["Proposal", bundle.audit.manifest.proposal_checksum],
              ["Requirements", bundle.audit.manifest.requirement_checksum],
              ["Evaluation matrix", bundle.audit.manifest.matrix_checksum],
            ].map(([name, value]) => (
              <div key={name} className="rounded-xl bg-slate-50 p-3">
                <dt className="font-extrabold text-slate-700">{name}</dt>
                <dd className="mt-1 break-all font-mono text-[10px] text-slate-500">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Price visibility: <strong>{label(bundle.audit.manifest.price_visibility)}</strong> · Freshness: <strong>{label(bundle.audit.freshness.state)}</strong>
          </p>
        </article>
        <form onSubmit={savePolicy} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-extrabold text-slate-950">Procurement retention policy</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Policy records are additive governance controls. Task 10 does not run destructive cleanup.</p>
          <label className="mt-4 block text-xs font-extrabold text-slate-700">
            Retention days
            <input type="number" min={365} max={3650} value={retentionDays} onChange={(event) => setRetentionDays(Number(event.target.value))} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal" />
          </label>
          <label className="mt-3 block text-xs font-extrabold text-slate-700">
            Policy basis
            <textarea minLength={20} maxLength={2000} required rows={4} value={policyBasis} onChange={(event) => setPolicyBasis(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal leading-5" />
          </label>
          <button disabled={busy} type="submit" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-extrabold text-white">
            <Save size={14} />
            Save policy
          </button>
        </form>
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-extrabold text-slate-950">Legal hold</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">A hold prevents future purge decisions. Placement and release are separate immutable events.</p>
          <form onSubmit={placeHold} className="mt-3">
            <label className="text-xs font-extrabold text-slate-700">
              Placement reason
              <textarea required minLength={20} maxLength={2000} rows={3} value={holdReason} onChange={(event) => setHoldReason(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal" />
            </label>
            <button disabled={busy} type="submit" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-700 px-4 text-xs font-extrabold text-white">
              <LockKeyhole size={14} />
              Place legal hold
            </button>
          </form>
          {activeHolds.length ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <label className="text-xs font-extrabold text-slate-700">
                Release reason
                <textarea minLength={20} maxLength={2000} rows={2} value={releaseReason} onChange={(event) => setReleaseReason(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs font-normal" />
              </label>
              {activeHolds.map((hold) => (
                <div key={hold.hold_id} className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3">
                  <div>
                    <p className="text-xs font-extrabold text-amber-950">Hold {hold.hold_id.slice(0, 8)}</p>
                    <p className="mt-1 text-[11px] text-amber-800">{hold.reason}</p>
                  </div>
                  <button type="button" disabled={busy || releaseReason.trim().length < 20} onClick={() => void releaseHold(hold.hold_id)} className="shrink-0 rounded-lg border border-amber-300 px-3 py-2 text-[11px] font-extrabold text-amber-900 disabled:opacity-40">
                    Record release
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              <CheckCircle2 size={14} />
              No active legal hold.
            </p>
          )}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-slate-950">Export history</h2>
            <span className="text-xs font-bold text-slate-400">{bundle.audit.exports.length}</span>
          </div>
          {bundle.audit.exports.length ? (
            <ol className="mt-3 space-y-2">
              {bundle.audit.exports.map((item) => (
                <li key={item.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-extrabold text-slate-800">{label(item.report_type)}</p>
                    <span className="text-[10px] text-slate-400">{formatBytes(item.byte_size)}</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">{item.content_checksum}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {formatIntelligenceTimestamp(item.created_at)} · pricing {item.permission_snapshot.viewCommercial ? "included" : "sealed"}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">No reports exported yet.</p>
          )}
        </article>
      </section>
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-extrabold text-slate-950">
            <History size={17} />
            Append-only comparison audit
          </h2>
          <span className="text-xs font-bold text-slate-400">{bundle.audit.events.length} events</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr>
                <th className="bg-slate-50 p-3">Occurred</th>
                <th className="bg-slate-50 p-3">Action</th>
                <th className="bg-slate-50 p-3">Decision</th>
                <th className="bg-slate-50 p-3">Correlation</th>
              </tr>
            </thead>
            <tbody>
              {bundle.audit.events.map((event) => (
                <tr key={event.id}>
                  <td className="border-t border-slate-100 p-3 whitespace-nowrap">{formatIntelligenceTimestamp(event.occurred_at)}</td>
                  <td className="border-t border-slate-100 p-3 font-bold">{label(event.action)}</td>
                  <td className="border-t border-slate-100 p-3">{label(event.decision)}</td>
                  <td className="border-t border-slate-100 p-3 font-mono text-[10px]">{event.correlation_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bundle.audit.events.length === 250 && (
          <p className="mt-3 flex items-center gap-2 text-xs text-amber-800">
            <AlertTriangle size={13} />
            Showing the newest 250 audit events.
          </p>
        )}
      </section>
    </div>
  );
}
