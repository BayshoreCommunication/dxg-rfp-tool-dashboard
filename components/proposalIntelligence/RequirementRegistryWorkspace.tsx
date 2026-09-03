"use client";

import { formatIntelligenceTimestamp } from "@/lib/proposalIntelligence/formatTimestamp";
import {
  approveRequirementSetAction,
  generateRequirementSetAction,
  getRequirementSetAction,
  prepareRequirementSetAction,
  RegistryRequirement,
  RequirementCriterion,
  RequirementRegistryView,
  RequirementSetSummary,
  supersedeRequirementSetAction,
  updateRegistryRequirementAction,
} from "@/app/actions/requirementRegistry";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, FileSearch, LockKeyhole, RefreshCw, Save, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  isStandaloneVideoRecordingPath,
  STANDALONE_VIDEO_RECORDING_STEP_ENABLED,
} from "@/lib/proposals/proposalExperience";

type Props = {
  proposalId: string;
  initialRegistry: RequirementRegistryView | null;
  initialSets: RequirementSetSummary[];
  returnTo?: string;
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
const freshnessLabel = (reasons: string[]) => reasons.includes("requirement_policy_changed") ? "Generation policy changed" : "Proposal changed";
const freshnessDetail = (reasons: string[]) => reasons.includes("requirement_policy_changed")
  ? "The requirement-generation policy has changed, so this historical registry may include descriptive metadata or lack current scoring anchors."
  : "The proposal version or content has changed since this registry was generated.";
const sourceLabel = (requirement: RegistryRequirement) => {
  if (requirement.source_kind === "rendered_rfp") {
    return `Rendered RFP · ${String(requirement.source_locator.sectionKey ?? "section").replaceAll("_", " ")}`;
  }
  return String(requirement.source_locator.path ?? "Canonical proposal").replace(/^\/content\//, "Proposal · ").replaceAll("/", " › ");
};
/** Generated from a planner instruction (due date, format, budget) rather than an ask; excluded by default. */
const isPlannerInstruction = (requirement: RegistryRequirement) =>
  requirement.source_locator?.role === "planner_instruction";
const needsReview = (requirement: RegistryRequirement) =>
  !requirement.inclusion_reviewed || (requirement.included && (!requirement.mandatory_reviewed || !requirement.criterion_reviewed || requirement.verification_method === "pending"));
const isRetiredStandaloneRecordingRequirement = (
  requirement: RegistryRequirement,
) => {
  if (STANDALONE_VIDEO_RECORDING_STEP_ENABLED) return false;
  const sourcePath = requirement.source_locator.path;
  const sourceSection = requirement.source_locator.sectionKey;
  return (
    requirement.group_key === "videoRecordingStep" ||
    (typeof sourcePath === "string" &&
      isStandaloneVideoRecordingPath(sourcePath)) ||
    sourceSection === "videoRecordingStep" ||
    sourceSection === "video_recording"
  );
};
const blockerLabel = (code: string) => ({
  WEIGHTS_NOT_CONFIRMED: "Confirm the scoring balance",
  WEIGHTS_MUST_TOTAL_100: "Balance scoring weights to 100%",
  INCLUSION_REVIEW_REQUIRED: "Confirm what vendors will be scored on",
  MANDATORY_REVIEW_REQUIRED: "Confirm must-have requirements",
  CRITERION_REVIEW_REQUIRED: "Map requirements to scoring categories",
  VERIFICATION_REVIEW_REQUIRED: "Choose how vendors prove compliance",
  DUPLICATE_REQUIREMENTS: "Remove repeated requirements",
  MANDATORY_SOURCE_REQUIRED: "Reconnect mandatory source references",
  CRITERIA_REQUIRED: "Add an evaluation criterion",
  REQUIREMENTS_REQUIRED: "Add a vendor requirement",
}[code] ?? "Complete a required review");

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
  const [included, setIncluded] = useState(requirement.included);
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
        included,
        inclusionReviewed: true,
      },
    );
    setSaving(false);
    if (result.success) {
      setMessage("Saved and marked reviewed.");
      onChanged(result.data);
    } else setMessage(result.message);
  };

  const unresolved = needsReview(requirement);
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
              {!requirement.included && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-600">{isPlannerInstruction(requirement) ? "Left out · instruction to vendors" : "Left out"}</span>}
              {unresolved && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-800">Review needed</span>}
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">{requirement.normalized_text}</p>
            <p className="mt-2 text-[11px] font-semibold text-slate-400">{sourceLabel(requirement)}</p>
          </div>
          <span aria-hidden className="text-lg text-slate-400 transition group-open:rotate-45">＋</span>
        </div>
      </summary>
      <form onSubmit={save} className="border-t border-slate-100 p-4 sm:p-5">
        <label className="mb-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700">
          <input disabled={!editable} type="checkbox" checked={included} onChange={(event) => setIncluded(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
          <span>Include in vendor evaluation<span className="mt-0.5 block font-normal text-slate-500">{isPlannerInstruction(requirement) ? "This is something you told vendors (a deadline, a format, a budget), not something they answer, so it is left out unless you include it." : "Leave out planning details, repeated narrative, and anything that should not affect vendor scoring."}</span></span>
        </label>
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
            <select disabled={!editable || !included} value={mandatoryStatus} onChange={(event) => setMandatoryStatus(event.target.value as RegistryRequirement["mandatory_status"])} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal disabled:bg-slate-50">
              <option value="pending">Needs review</option><option value="mandatory">Mandatory</option><option value="not_mandatory">Not mandatory</option>
            </select>
          </label>
          <label className="text-xs font-extrabold text-slate-700">
            Evaluation criterion
            <select disabled={!editable || !included} value={criterionId} onChange={(event) => setCriterionId(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal disabled:bg-slate-50">
              <option value="">Needs review</option>
              {criteria.map((criterion) => <option key={criterion.id} value={criterion.id}>{criterion.name} · {Number(criterion.weight)}%</option>)}
            </select>
          </label>
          <label className="text-xs font-extrabold text-slate-700">
            Importance
            <select disabled={!editable || !included} value={importance} onChange={(event) => setImportance(event.target.value as RegistryRequirement["importance"])} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal disabled:bg-slate-50">
              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </label>
          <label className="text-xs font-extrabold text-slate-700">
            Verification method
            <select disabled={!editable || !included} value={verification} onChange={(event) => setVerification(event.target.value as RegistryRequirement["verification_method"])} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal disabled:bg-slate-50">
              <option value="pending">Needs review</option><option value="document">Document</option><option value="narrative">Narrative response</option><option value="demonstration">Demonstration</option><option value="reference">Reference check</option><option value="commercial">Commercial review</option><option value="administrative">Administrative check</option>
            </select>
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-700">
          <input disabled={!editable || !included} type="checkbox" checked={eligibility} onChange={(event) => setEligibility(event.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Failure makes the vendor ineligible
        </label>
        {editable && <div className="mt-4 flex flex-wrap items-center gap-3"><button disabled={saving} type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#008ad2] px-4 text-xs font-extrabold text-white disabled:opacity-50"><Save size={14} />{saving ? "Saving…" : "Save review"}</button>{message && <p role="status" className={`text-xs font-semibold ${message.startsWith("Saved") ? "text-emerald-700" : "text-rose-700"}`}>{message}</p>}</div>}
      </form>
    </details>
  );
}

export default function RequirementRegistryWorkspace({ proposalId, initialRegistry, initialSets, returnTo = `/proposals/${proposalId}/intelligence` }: Props) {
  const router = useRouter();
  const [registry, setRegistry] = useState(initialRegistry);
  const [sets, setSets] = useState(initialSets);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  // The checklist is the page; it opens by default and a reader can fold it away.
  const [showRequirementReview, setShowRequirementReview] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const criteria = registry?.matrix?.criteria ?? [];
  const activeRequirements = useMemo(
    () =>
      (registry?.requirements ?? []).filter(
        (item) => !isRetiredStandaloneRecordingRequirement(item),
      ),
    [registry],
  );
  const groups = useMemo(
    () => Array.from(new Set(activeRequirements.map((item) => item.group_key))),
    [activeRequirements],
  );
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeRequirements.filter((item) => {
      const unresolved = needsReview(item);
      return (group === "all" || item.group_key === group) && (!unresolvedOnly || unresolved) && (!query || `${item.title} ${item.normalized_text} ${item.criterion_name ?? ""}`.toLowerCase().includes(query));
    });
  }, [activeRequirements, group, search, unresolvedOnly]);
  const blocking = registry?.set.validation?.blocking ?? [];
  const requirementCount = activeRequirements.length;
  const includedCount = activeRequirements.filter((item) => item.included).length;
  const excludedCount = requirementCount - includedCount;
  const unresolvedCount = activeRequirements.filter(needsReview).length;
  const matrixReady = Boolean(registry?.matrix?.weightsConfirmed) && Math.abs((registry?.matrix?.totalWeight ?? 0) - 100) <= 0.001;
  const readyForApproval = Boolean(registry) && blocking.length === 0 && matrixReady && !registry?.freshness.stale;
  const editable = registry?.set.status === "draft" || registry?.set.status === "in_review";
  const applyRegistry = (next: RequirementRegistryView) => {
    setRegistry(next);
    setSets((previous) => [{
      ...next.set,
      requirement_count: next.requirements.length,
      freshness: next.freshness,
    }, ...previous.filter((item) => item.id !== next.set.id)]);
  };

  const generate = async () => {
    setWorking(true); setMessage(null); setSuccessMessage(null);
    const result = await generateRequirementSetAction(proposalId);
    setWorking(false);
    if (result.success) {
      applyRegistry(result.data);
    } else setMessage(result.message);
  };
  const chooseSet = async (setId: string) => {
    setWorking(true); setMessage(null); setSuccessMessage(null);
    const result = await getRequirementSetAction(proposalId, setId);
    setWorking(false);
    if (result.success) applyRegistry(result.data); else setMessage(result.message);
  };
  const approve = async () => {
    if (!registry) return;
    setWorking(true); setMessage(null); setSuccessMessage(null);
    const result = await approveRequirementSetAction(proposalId, registry.set.id, registry.set.lock_version);
    setWorking(false);
    if (result.success) {
      applyRegistry(result.data);
      router.replace(returnTo);
    } else setMessage(result.message);
  };
  const prepare = async () => {
    if (!registry) return;
    setWorking(true); setMessage(null); setSuccessMessage(null);
    const result = await prepareRequirementSetAction(proposalId, registry.set.id, registry.set.lock_version);
    setWorking(false);
    if (result.success) {
      applyRegistry(result.data);
      setUnresolvedOnly(true);
      setSuccessMessage(result.data.set.validation.blocking.length
        ? "Automatic preparation is complete. Review the remaining exceptions below."
        : "Automatic preparation is complete. The registry is ready for approval.");
    } else setMessage(result.message);
  };
  const supersede = async () => {
    if (!registry) return;
    setWorking(true); setMessage(null); setSuccessMessage(null);
    const result = await supersedeRequirementSetAction(proposalId, registry.set.id);
    setWorking(false);
    if (result.success) {
      applyRegistry(result.data);
    } else setMessage(result.message);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href={returnTo} className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-500 hover:text-[#008ad2]"><ArrowLeft size={14} /> Back to vendor evaluation</Link>
        <header className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#008ad2]"><Sparkles size={14} /> Step 1 of 4 · Approve your requirements</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Prepare vendor evaluation</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Turn the proposal into one clear, approved checklist so every vendor is compared against the same requirements.</p>
            </div>
            {registry && <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${statusTone[registry.set.status]}`}>Version {registry.set.version} · {label(registry.set.status)}</span>
              {registry.set.status === "approved" && !registry.freshness.stale && (
                // An approved list is locked so every vendor is judged alike. To
                // pick up generator improvements without editing the proposal,
                // start a new version; the old one stays readable.
                <button type="button" disabled={working} onClick={() => { if (window.confirm(`Start a new version of the requirements list from the current proposal? Version ${registry.set.version} stays readable, and comparisons keep using it until you approve the new one.`)) void supersede(); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-xs font-extrabold text-slate-700 hover:border-[#008ad2] hover:text-[#0076b4] disabled:opacity-50"><RefreshCw size={13} aria-hidden="true" /> Start a new version</button>
              )}
              {registry.freshness.stale && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-extrabold text-rose-800"><AlertTriangle size={13} /> {freshnessLabel(registry.freshness.reasons)}</span>}
            </div>}
          </div>
          {sets.length > 0 && <label className="mt-5 block max-w-sm text-xs font-extrabold text-slate-700">Registry version<select disabled={working} value={registry?.set.id ?? ""} onChange={(event) => void chooseSet(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">{sets.map((set) => <option key={set.id} value={set.id}>Version {set.version} · {label(set.status)}{set.freshness.stale ? " · stale" : ""}</option>)}</select></label>}
        </header>

        {message && <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{message}</div>}
        {successMessage && <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{successMessage}</div>}
        {!registry ? (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <FileSearch className="mx-auto text-[#008ad2]" size={34} />
            <h2 className="mt-4 text-xl font-extrabold text-slate-900">Build the first requirement registry</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">This reads the current proposal and accepted RFP narrative. It does not analyze vendor responses or change the proposal.</p>
            <button disabled={working} onClick={() => void generate()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#008ad2] px-5 text-sm font-extrabold text-white disabled:opacity-50"><Sparkles size={16} />{working ? "Building registry…" : "Generate requirement registry"}</button>
          </section>
        ) : (
          <>
            {registry.freshness.stale && <section className="mt-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold text-rose-900">This registry is historical</p><p className="mt-1 text-sm text-rose-700">{freshnessDetail(registry.freshness.reasons)} The existing record stays unchanged; create a new version before evaluation.</p></div>{registry.set.status === "approved" ? <button disabled={working} onClick={() => void supersede()} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-xs font-extrabold text-white"><RefreshCw size={14} /> Supersede with current proposal</button> : <button disabled={working} onClick={() => void generate()} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-xs font-extrabold text-white"><RefreshCw size={14} /> Create current version</button>}</section>}

            <section className={`mt-5 overflow-hidden rounded-3xl border ${readyForApproval || registry.set.status === "approved" ? "border-emerald-200 bg-emerald-50" : "border-cyan-200 bg-gradient-to-br from-cyan-50 to-white"}`}>
              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex items-center gap-2"><Sparkles size={18} className={readyForApproval || registry.set.status === "approved" ? "text-emerald-700" : "text-[#008ad2]"} /><h2 className="text-xl font-extrabold text-slate-900">{registry.set.status === "approved" ? "Evaluation checklist approved" : readyForApproval ? "Ready for your approval" : "Prepare this registry automatically"}</h2></div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{registry.set.status === "approved"
                    ? `Approved${registry.set.approved_at ? ` on ${formatIntelligenceTimestamp(registry.set.approved_at)}` : ""} from this page. This exact checklist is locked and will be used for consistent vendor comparison.`
                    : readyForApproval
                      ? "The scoring balance and requirement checks are complete. Approve the checklist to start vendor comparison."
                      : "RFPilot will balance scoring to 100%, map requirements to criteria, choose verification methods, and exclude repeated narrative. You can still review every decision before approval."}</p>
                  {editable && !readyForApproval && <div className="mt-4 flex flex-wrap gap-2">{blocking.map((item) => <span key={item.code} className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-bold text-amber-900">{item.count ? `${item.count} · ` : ""}{blockerLabel(item.code)}</span>)}</div>}
                </div>
                {editable && !readyForApproval && <button disabled={working || registry.freshness.stale} onClick={() => void prepare()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#008ad2] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0073ad] disabled:cursor-not-allowed disabled:opacity-40"><Sparkles size={16} />{working ? "Preparing…" : "Prepare automatically"}</button>}
                {editable && readyForApproval && <button disabled={working} onClick={() => void approve()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"><LockKeyhole size={16} />{working ? "Approving…" : "Approve and freeze"}</button>}
                {registry.set.status === "approved" && <span className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-extrabold text-white"><ShieldCheck size={18} /> Approved</span>}
              </div>
              <div className="grid grid-cols-2 border-t border-black/5 bg-white/70 sm:grid-cols-4">
                <div className="p-4"><p className="text-2xl font-extrabold text-slate-900">{includedCount}</p><p className="text-xs font-bold text-slate-500">Included</p></div>
                <div className="border-l border-black/5 p-4"><p className="text-2xl font-extrabold text-slate-900">{excludedCount}</p><p className="text-xs font-bold text-slate-500">Left out</p><p className="text-[11px] text-slate-400">Instructions to vendors and duplicates</p></div>
                <div className="border-t border-black/5 p-4 sm:border-l sm:border-t-0"><p className="text-2xl font-extrabold text-slate-900">{unresolvedCount}</p><p className="text-xs font-bold text-slate-500">Need attention</p></div>
                <div className="border-l border-t border-black/5 p-4 sm:border-t-0"><p className={`text-2xl font-extrabold ${matrixReady ? "text-emerald-700" : "text-amber-700"}`}>{registry.matrix?.totalWeight ?? 0}%</p><p className="text-xs font-bold text-slate-500">Scoring balance</p></div>
              </div>
            </section>

            <details open={showRequirementReview} onToggle={(event) => setShowRequirementReview(event.currentTarget.open)} className="mt-5 rounded-2xl border border-slate-200 bg-white">
              <summary className="cursor-pointer list-none p-5 marker:hidden">
                <div className="flex items-center justify-between gap-4"><div><h2 className="font-extrabold text-slate-900">Your requirement checklist</h2><p className="mt-1 text-sm text-slate-500">Everything RFPilot found in the RFP, grouped by type. Open an item to see where it came from or to change whether it counts.</p></div><span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">{unresolvedCount} need attention</span></div>
              </summary>
              {showRequirementReview && <div className="border-t border-slate-100 p-4 sm:p-5">
                <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                  <label className="relative"><span className="sr-only">Search requirements</span><Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requirements" className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#008ad2]" /></label>
                  <select aria-label="Filter requirement group" value={group} onChange={(event) => setGroup(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">All groups</option>{groups.map((item) => <option key={item} value={item}>{groupNames[item] ?? label(item)}</option>)}</select>
                  <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"><input type="checkbox" checked={unresolvedOnly} onChange={(event) => setUnresolvedOnly(event.target.checked)} /> Attention only</label>
                </div>
                {visible.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto text-emerald-700" size={24} /><p className="mt-2 text-sm font-extrabold text-emerald-900">No requirements need manual review.</p><button type="button" onClick={() => setUnresolvedOnly(false)} className="mt-3 text-xs font-extrabold text-emerald-800 underline underline-offset-2">Show the full registry</button></div> : <div className="mt-5 space-y-6">{groups.filter((item) => group === "all" || group === item).map((item) => {
                  const rows = visible.filter((requirement) => requirement.group_key === item);
                  if (!rows.length) return null;
                  return <section key={item}><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-extrabold text-slate-900">{groupNames[item] ?? label(item)}</h2><span className="text-xs font-semibold text-slate-400">{rows.length} items</span></div><div className="space-y-2">{rows.map((requirement) => <RequirementEditor key={requirement.id} proposalId={proposalId} registry={registry} requirement={requirement} criteria={criteria} onChanged={applyRegistry} />)}</div></section>;
                })}</div>}
              </div>}
            </details>
          </>
        )}
      </div>
    </main>
  );
}
