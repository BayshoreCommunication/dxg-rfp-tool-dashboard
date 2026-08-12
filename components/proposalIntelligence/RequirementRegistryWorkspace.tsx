"use client";

import {
  approveRequirementSetAction,
  generateRequirementSetAction,
  getRequirementSetAction,
  RegistryRequirement,
  RequirementCriterion,
  RequirementRegistryView,
  RequirementSetSummary,
  supersedeRequirementSetAction,
  updateRegistryRequirementAction,
} from "@/app/actions/requirementRegistry";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, FileSearch, LockKeyhole, RefreshCw, Save, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type Props = {
  proposalId: string;
  initialRegistry: RequirementRegistryView | null;
  initialSets: RequirementSetSummary[];
};
const groupNames: Record<string, string> = {
  event: "Event & audience",
  venueSchedule: "Venue & schedule",
  roomByRoom: "Room requirements",
  production: "Production",
  hybridVirtual: "Hybrid & virtual",
  contentCreative: "Content & creative",
  videoRecordingStep: "Recording",
  venue: "Venue technical",
  budget: "Commercial & submission",
  vendor_terms: "Vendor terms",
};
const statusTone = {
  draft: "bg-slate-100 text-slate-700",
  in_review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  superseded: "bg-violet-100 text-violet-800",
} as const;
const label = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const sourceLabel = (requirement: RegistryRequirement) => {
  if (requirement.source_kind === "rendered_rfp") {
    return `Rendered RFP · ${String(requirement.source_locator.sectionKey ?? "section").replaceAll("_", " ")}`;
  }
  return String(requirement.source_locator.path ?? "Canonical proposal").replace(/^\/content\//, "Proposal · ").replaceAll("/", " › ");
};

function RequirementEditor({
  proposalId,
  registry,
  requirement,
  criteria,
  onChanged,
}: {
  proposalId: string;
  registry: RequirementRegistryView;
  requirement: RegistryRequirement;
  criteria: RequirementCriterion[];
  onChanged: (next: RequirementRegistryView) => void;
}) {
  const [title, setTitle] = useState(requirement.title);
  const [text, setText] = useState(requirement.normalized_text);
  const [mandatoryStatus, setMandatoryStatus] = useState(requirement.mandatory_status);
  const [criterionId, setCriterionId] = useState(requirement.criterion_id ?? "");
  const [importance, setImportance] = useState(requirement.importance);
  const [verification, setVerification] = useState(requirement.verification_method);
  const [eligibility, setEligibility] = useState(requirement.eligibility);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const editable = registry.set.status === "draft" || registry.set.status === "in_review";

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const result = await updateRegistryRequirementAction(
      proposalId,
      registry.set.id,
      requirement.id,
      registry.set.lock_version,
      {
        title,
        text,
        mandatoryStatus,
        mandatoryReviewed: mandatoryStatus !== "pending",
        eligibility,
        criterionId: criterionId || null,
        criterionReviewed: Boolean(criterionId),
        importance,
        verificationMethod: verification,
      },
    );
    setSaving(false);
    if (result.success) {
      setMessage("Saved and marked reviewed.");
      onChanged(result.data);
    } else setMessage(result.message);
  };

  const unresolved = !requirement.mandatory_reviewed || !requirement.criterion_reviewed || requirement.verification_method === "pending";
  return (
    <details className={`group rounded-2xl border bg-white ${unresolved ? "border-amber-200" : "border-slate-200"}`}>
      <summary className="cursor-pointer list-none p-4 marker:hidden">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${unresolved ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {unresolved ? <ClipboardCheck size={15} /> : <CheckCircle2 size={15} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-slate-900">{requirement.title}</h3>
              {requirement.mandatory_status === "mandatory" && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-rose-700">Mandatory</span>}
              {unresolved && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-800">Review needed</span>}
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{requirement.normalized_text}</p>
            <p className="mt-2 text-[11px] font-semibold text-slate-400">{sourceLabel(requirement)}</p>
          </div>
          <span aria-hidden className="text-lg text-slate-400 transition group-open:rotate-45">＋</span>
        </div>
      </summary>
      <form onSubmit={save} className="border-t border-slate-100 p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="text-xs font-extrabold text-slate-700 lg:col-span-2">
            Requirement title
            <input disabled={!editable} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-[#008ad2] disabled:bg-slate-50" />
          </label>
          <label className="text-xs font-extrabold text-slate-700 lg:col-span-2">
            Normalized requirement
            <textarea disabled={!editable} value={text} onChange={(event) => setText(event.target.value)} rows={4} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm font-normal leading-6 outline-none focus:border-[#008ad2] disabled:bg-slate-50" />
          </label>
          <label className="text-xs font-extrabold text-slate-700">
            Mandatory status
            <select disabled={!editable} value={mandatoryStatus} onChange={(event) => setMandatoryStatus(event.target.value as RegistryRequirement["mandatory_status"])} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal disabled:bg-slate-50">
              <option value="pending">Needs review</option><option value="mandatory">Mandatory</option><option value="not_mandatory">Not mandatory</option>
            </select>
          </label>
          <label className="text-xs font-extrabold text-slate-700">
            Evaluation criterion
            <select disabled={!editable} value={criterionId} onChange={(event) => setCriterionId(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal disabled:bg-slate-50">
              <option value="">Needs review</option>
              {criteria.map((criterion) => <option key={criterion.id} value={criterion.id}>{criterion.name} · {Number(criterion.weight)}%</option>)}
            </select>
          </label>
          <label className="text-xs font-extrabold text-slate-700">
            Importance
            <select disabled={!editable} value={importance} onChange={(event) => setImportance(event.target.value as RegistryRequirement["importance"])} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal disabled:bg-slate-50">
              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </label>
          <label className="text-xs font-extrabold text-slate-700">
            Verification method
            <select disabled={!editable} value={verification} onChange={(event) => setVerification(event.target.value as RegistryRequirement["verification_method"])} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal disabled:bg-slate-50">
              <option value="pending">Needs review</option><option value="document">Document</option><option value="narrative">Narrative response</option><option value="demonstration">Demonstration</option><option value="reference">Reference check</option><option value="commercial">Commercial review</option><option value="administrative">Administrative check</option>
            </select>
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-700">
          <input disabled={!editable} type="checkbox" checked={eligibility} onChange={(event) => setEligibility(event.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Failure makes the vendor ineligible
        </label>
        {editable && <div className="mt-4 flex flex-wrap items-center gap-3"><button disabled={saving} type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#008ad2] px-4 text-xs font-extrabold text-white disabled:opacity-50"><Save size={14} />{saving ? "Saving…" : "Save review"}</button>{message && <p role="status" className={`text-xs font-semibold ${message.startsWith("Saved") ? "text-emerald-700" : "text-rose-700"}`}>{message}</p>}</div>}
      </form>
    </details>
  );
}

export default function RequirementRegistryWorkspace({ proposalId, initialRegistry, initialSets }: Props) {
  const [registry, setRegistry] = useState(initialRegistry);
  const [sets, setSets] = useState(initialSets);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const criteria = registry?.matrix?.criteria ?? [];
  const groups = useMemo(() => Array.from(new Set(registry?.requirements.map((item) => item.group_key) ?? [])), [registry]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (registry?.requirements ?? []).filter((item) => {
      const unresolved = !item.mandatory_reviewed || !item.criterion_reviewed || item.verification_method === "pending";
      return (group === "all" || item.group_key === group) && (!unresolvedOnly || unresolved) && (!query || `${item.title} ${item.normalized_text} ${item.criterion_name ?? ""}`.toLowerCase().includes(query));
    });
  }, [group, registry, search, unresolvedOnly]);
  const blocking = registry?.set.validation?.blocking ?? [];

  const generate = async () => {
    setWorking(true); setMessage(null);
    const result = await generateRequirementSetAction(proposalId);
    setWorking(false);
    if (result.success) {
      setRegistry(result.data);
      setSets((previous) => [{ ...result.data.set, requirement_count: result.data.requirements.length, freshness: result.data.freshness }, ...previous.filter((item) => item.id !== result.data.set.id)]);
    } else setMessage(result.message);
  };
  const chooseSet = async (setId: string) => {
    setWorking(true); setMessage(null);
    const result = await getRequirementSetAction(proposalId, setId);
    setWorking(false);
    if (result.success) setRegistry(result.data); else setMessage(result.message);
  };
  const approve = async () => {
    if (!registry) return;
    setWorking(true); setMessage(null);
    const result = await approveRequirementSetAction(proposalId, registry.set.id, registry.set.lock_version);
    setWorking(false);
    if (result.success) setRegistry(result.data); else setMessage(result.message);
  };
  const supersede = async () => {
    if (!registry) return;
    setWorking(true); setMessage(null);
    const result = await supersedeRequirementSetAction(proposalId, registry.set.id);
    setWorking(false);
    if (result.success) {
      setRegistry(result.data);
      setSets((previous) => [{ ...result.data.set, requirement_count: result.data.requirements.length, freshness: result.data.freshness }, ...previous]);
    } else setMessage(result.message);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/vendor-responses" className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-500 hover:text-[#008ad2]"><ArrowLeft size={14} /> Back to vendor responses</Link>
        <header className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#008ad2]"><Sparkles size={14} /> Proposal intelligence</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Requirement Registry</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Review the complete RFP requirement set, confirm what is mandatory, map each item to a criterion, and freeze the exact version used for vendor evaluation.</p>
            </div>
            {registry && <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${statusTone[registry.set.status]}`}>Version {registry.set.version} · {label(registry.set.status)}</span>
              {registry.freshness.stale && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-extrabold text-rose-800"><AlertTriangle size={13} /> Proposal changed</span>}
            </div>}
          </div>
          {sets.length > 0 && <label className="mt-5 block max-w-sm text-xs font-extrabold text-slate-700">Registry version<select disabled={working} value={registry?.set.id ?? ""} onChange={(event) => void chooseSet(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">{sets.map((set) => <option key={set.id} value={set.id}>Version {set.version} · {label(set.status)}{set.freshness.stale ? " · stale" : ""}</option>)}</select></label>}
        </header>

        {message && <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{message}</div>}
        {!registry ? (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <FileSearch className="mx-auto text-[#008ad2]" size={34} />
            <h2 className="mt-4 text-xl font-extrabold text-slate-900">Build the first requirement registry</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">This reads the current proposal and accepted RFP narrative. It does not analyze vendor responses or change the proposal.</p>
            <button disabled={working} onClick={() => void generate()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#008ad2] px-5 text-sm font-extrabold text-white disabled:opacity-50"><Sparkles size={16} />{working ? "Building registry…" : "Generate requirement registry"}</button>
          </section>
        ) : (
          <>
            {registry.freshness.stale && <section className="mt-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold text-rose-900">This registry no longer matches the proposal</p><p className="mt-1 text-sm text-rose-700">The existing record stays unchanged. Create a new version from the current proposal before using it for evaluation.</p></div>{registry.set.status === "approved" ? <button disabled={working} onClick={() => void supersede()} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-xs font-extrabold text-white"><RefreshCw size={14} /> Supersede with current proposal</button> : <button disabled={working} onClick={() => void generate()} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-xs font-extrabold text-white"><RefreshCw size={14} /> Create current version</button>}</section>}

            <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
              <article className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between"><h2 className="font-extrabold text-slate-900">Evaluation matrix</h2><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${registry.matrix?.weightsConfirmed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{registry.matrix?.weightsConfirmed ? "Weights confirmed" : "Confirmation needed"}</span></div>
                <ul className="mt-4 space-y-2">{criteria.map((criterion) => <li key={criterion.id} className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-700">{criterion.name}</span><span className="font-extrabold text-slate-900">{Number(criterion.weight)}%</span></li>)}</ul>
                <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-sm font-extrabold"><span>Total</span><span>{registry.matrix?.totalWeight ?? 0}%</span></div>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between"><h2 className="font-extrabold text-slate-900">Approval readiness</h2><span className="text-xs font-bold text-slate-500">{registry.requirements.length} requirements</span></div>
                {blocking.length ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{blocking.map((item) => <li key={item.code} className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><span className="font-extrabold">{item.count ? `${item.count} · ` : ""}</span>{item.message}</li>)}</ul> : <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800"><ShieldCheck size={20} /> All blocking reviews are complete.</div>}
                <div className="mt-4 flex flex-wrap gap-3">{(registry.set.status === "draft" || registry.set.status === "in_review") && <button disabled={working || blocking.length > 0 || registry.freshness.stale} onClick={() => void approve()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"><LockKeyhole size={14} /> Approve and freeze</button>}<span className="self-center text-xs text-slate-500">Checksum {registry.set.content_checksum.slice(0, 12)}…</span></div>
              </article>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <label className="relative"><span className="sr-only">Search requirements</span><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requirements" className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#008ad2]" /></label>
                <select aria-label="Filter requirement group" value={group} onChange={(event) => setGroup(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">All groups</option>{groups.map((item) => <option key={item} value={item}>{groupNames[item] ?? label(item)}</option>)}</select>
                <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"><input type="checkbox" checked={unresolvedOnly} onChange={(event) => setUnresolvedOnly(event.target.checked)} /> Review needed only</label>
              </div>
            </section>

            <div className="mt-5 space-y-6">{groups.filter((item) => group === "all" || group === item).map((item) => {
              const rows = visible.filter((requirement) => requirement.group_key === item);
              if (!rows.length) return null;
              return <section key={item}><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-extrabold text-slate-900">{groupNames[item] ?? label(item)}</h2><span className="text-xs font-semibold text-slate-400">{rows.length} items</span></div><div className="space-y-2">{rows.map((requirement) => <RequirementEditor key={requirement.id} proposalId={proposalId} registry={registry} requirement={requirement} criteria={criteria} onChanged={setRegistry} />)}</div></section>;
            })}</div>
          </>
        )}
      </div>
    </main>
  );
}
