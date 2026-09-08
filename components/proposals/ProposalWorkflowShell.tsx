"use client";

// The assisted workflow inside the DETAILED EDITOR: the five-step stepper and
// the field-level review panels behind it. The assistant conversation itself
// lives on one surface only (/proposals/{id}/assistant), so this shell links
// out to it instead of embedding a second copy of the same conversation.

import { getProposalWorkflowAction, setProposalWorkflowStepAction, type ProposalWorkflow } from "@/app/actions/proposalWorkflow";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Lock,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import GuidancePanel from "./GuidancePanel";
import KeyQuestionsPanel from "./KeyQuestionsPanel";
import ProposalContextPanel from "./ProposalContextPanel";
import ProposalDraftPanel from "./ProposalDraftPanel";

const labels = ["Provide Information", "Review the Draft", "Answer Key Questions", "See Guidance", "Publish"];
type WorkflowStep = 1 | 2 | 3 | 4 | 5;
export default function ProposalWorkflowShell({
  proposalId,
  proposalName,
  proposalIsPublished = false,
  onNavigateToFormStep,
  onQuestionResolved,
}: {
  proposalId: string;
  proposalName?: string;
  proposalIsPublished?: boolean;
  onNavigateToFormStep?: (step: number) => void;
  onQuestionResolved?: () => void | Promise<void>;
}) {
  // Read per render (as AddProposalUpload does) so the flagged and unflagged
  // shapes can both be exercised in tests; NEXT_PUBLIC_* is inlined at build.
  const conversationsEnabled = process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED === "true";
  const [data, setData] = useState<ProposalWorkflow>();
  const [step, setStep] = useState<WorkflowStep>(1);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const selectionRevision = useRef(0);
  const selectionSaveInFlight = useRef(false);
  const queuedSelection = useRef<WorkflowStep | null>(null);
  // The disclosure used to be expanded by ConversationWorkspace's onOpenRun.
  // That conversation now lives on its own route and reaches these panels by
  // navigation ("View draft", "Review & apply N extracted fields"), so the
  // disclosure starts OPEN: arriving from one of those links has to land on the
  // panel it pointed at. It stays a disclosure so it can be collapsed again.
  const [detailsOpen, setDetailsOpen] = useState(true);

  useEffect(() => {
    let active = true;
    const loadRevision = ++selectionRevision.current;
    void getProposalWorkflowAction(proposalId).then((result) => {
      if (!active) return;
      if (!result.success) {
        if (selectionRevision.current === loadRevision) setBusy(false);
        setError(result.message);
        return;
      }
      setData(result.data);
      // A late initial response must not undo a stage the user already chose.
      if (selectionRevision.current === loadRevision) {
        setBusy(false);
        setStep(result.data.workflow.currentStep);
      }
    });
    return () => { active = false; };
  }, [proposalId]);

  const persistSelection = async (next: WorkflowStep, revision: number) => {
    selectionSaveInFlight.current = true;
    setBusy(true);
    const result = await setProposalWorkflowStepAction(proposalId, next);
    const queued = queuedSelection.current;
    const shouldApplyResult = selectionRevision.current === revision || queued === next;

    if (shouldApplyResult) {
      if (!result.success) setError(result.message);
      else {
        setData(result.data);
        // Keep the optimistic selection even if the response was derived from
        // a snapshot that still carries the previously persisted workflow step.
        setStep(next);
      }
    }

    queuedSelection.current = null;
    if (queued !== null && queued !== next) {
      await persistSelection(queued, selectionRevision.current);
      return;
    }

    selectionSaveInFlight.current = false;
    setBusy(false);
  };

  const choose = (next: WorkflowStep) => {
    const chooseRevision = ++selectionRevision.current;
    setStep(next);
    setError(undefined);

    // Keep every stage clickable while persistence is in flight. If the user
    // chooses another stage, save only the latest intent after the current
    // request finishes instead of silently dropping that first click.
    if (selectionSaveInFlight.current) {
      queuedSelection.current = next;
      return;
    }

    void persistSelection(next, chooseRevision);
  };

  const handleQuestionResolved = async () => {
    await onQuestionResolved?.();
    const result = await getProposalWorkflowAction(proposalId);
    if (result.success) setData(result.data);
  };

  const continueToFinalDetails = () => {
    onNavigateToFormStep?.(10);
    window.setTimeout(() => {
      const target = document.getElementById("contact-publish-section");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      target?.focus({ preventScroll: true });
    }, 0);
  };

  // Rendered exactly as the server derived them. The step summaries used to be
  // patched here for step 3, which restated a count the server already computes
  // — a second definition of "answered" whose only possible contribution was to
  // disagree. Every status and summary now comes from one place.
  const steps = data?.steps ?? ([1, 2, 3, 4, 5] as const).map((id) => ({ id, key: "", label: labels[id - 1], status: "available" as const, summary: "Loading…" }));
  const isPublished = proposalIsPublished || data?.state?.phase === "published";
  // When the next step IS generating the draft, deep-link so the assistant
  // starts generation on arrival — one click instead of two.
  const nextActionHref = isPublished
    ? "/vendor-responses"
    : `/proposals/${proposalId}/assistant${data?.state?.nextAction === "generate_draft" ? "?task=generate_draft" : ""}`;
  const nextActionLabel = isPublished
    ? "View vendor responses"
    : data?.state?.nextAction !== "none"
      ? (data?.state?.nextActionLabel ?? "Open the assistant")
      : "Review key questions";
  return <section aria-label="Proposal assistance" className="@container mb-0 border-b border-[#e5eaee] bg-white">
    <header className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-[#edf0f2] px-5 py-3 sm:px-6 lg:px-7">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-extrabold tracking-[-0.025em] text-[#172b3a]">{proposalName || "Proposal"}</h1>
          {isPublished && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700"><Radio size={12} aria-hidden="true" />Published</span>}
        </div>
        <p className="mt-1 text-xs text-[#687782]">{isPublished ? "Live vendor-facing proposal" : "Build, review, and prepare your proposal"}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <a href="#manual-proposal-details" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0069a0] px-3.5 py-2 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(0,105,160,0.18)] transition hover:bg-[#172b3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0069a0] sm:px-4">Edit form directly<ArrowDown size={14} aria-hidden="true" /></a>
      </div>
    </header>
    {/* The conversation itself lives on one surface only: this editor links out
        to it rather than embedding a second copy. */}
    {conversationsEnabled && <div data-testid="proposal-guidance-card" className="mx-5 mt-3 overflow-hidden rounded-2xl border border-[#c9e4f2] bg-[linear-gradient(135deg,#f2fbff_0%,#f8fcfe_58%,#ffffff_100%)] shadow-[0_8px_22px_rgba(16,78,112,0.07)] sm:mx-6 lg:mx-7">
      <div className="grid @min-[880px]:grid-cols-[minmax(0,1fr)_minmax(380px,430px)]">
        <div className="p-3.5 @min-[880px]:p-4">
          <div className="flex items-center gap-3">
            <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#0069a0] text-white shadow-[0_5px_14px_rgba(0,105,160,0.2)]">
              <Send size={18} strokeWidth={1.9} aria-hidden="true" />
              {!isPublished && <span className="theme-preserve-white absolute -right-1.5 -top-1.5 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-[#f2fbff] bg-white text-[#0786cf]"><Sparkles size={10} strokeWidth={2.2} aria-hidden="true" /></span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#0069a0]">{isPublished ? "Published and live" : "AI-guided workspace"}</p>
              <p className="mt-1 text-[15px] font-extrabold leading-5 tracking-[-0.02em] text-[#172b3a]">{isPublished ? "Your proposal is live." : "Build a vendor-ready proposal with AI."}</p>
              <p className="mt-0.5 max-w-2xl text-[11px] leading-4 text-[#566a78]">{isPublished ? "Monitor vendor activity and keep questions moving." : "Draft from what you know, find gaps, and review every change."}</p>
            </div>
          </div>
        </div>

        <aside className="grid gap-3 border-t border-[#d8eaf4] bg-white/80 p-3.5 @min-[520px]:grid-cols-[minmax(0,1fr)_auto] @min-[520px]:items-center @min-[880px]:border-l @min-[880px]:border-t-0 @min-[880px]:px-4 @min-[880px]:py-3" aria-label="Recommended next action">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#0069a0]"><Sparkles size={11} aria-hidden="true" />Recommended next step</div>
            <p className="mt-1 text-sm font-extrabold leading-5 tracking-[-0.015em] text-[#172b3a]">{isPublished ? "Review vendor activity" : (data?.state?.nextActionLabel ?? "Open the assistant")}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-[#687782]">{isPublished ? "Monitor responses and questions." : (data?.state?.headline ?? "Continue from the most useful next step.")}</p>
          </div>
          <div className="flex min-w-[148px] max-w-[200px] flex-col items-stretch">
            {/* A published RFP has no next action. Offering one that still reads
                "Answer the next question" would invite work that is already over. */}
            <Link href={nextActionHref} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0069a0] px-3 py-1.5 text-center text-xs font-bold leading-4 text-white shadow-[0_4px_12px_rgba(0,105,160,0.17)] transition-all motion-reduce:transition-none hover:-translate-y-px hover:bg-[#172b3a] hover:shadow-[0_6px_14px_rgba(0,105,160,0.2)] motion-reduce:hover:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0069a0]">{nextActionLabel}<ArrowRight size={13} className="shrink-0" aria-hidden="true" /></Link>
            {!isPublished && <p className="mt-1 flex items-center justify-center gap-1 text-center text-[10px] font-semibold leading-[14px] text-[#566a78]"><ShieldCheck size={10} className="shrink-0" aria-hidden="true" />Nothing is published automatically.</p>}
          </div>
        </aside>
      </div>
    </div>}
    {error && <p role="alert" className="mx-6 mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800 sm:mx-8">{error}</p>}
    <div className="mx-5 mb-2 mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 sm:mx-6 lg:mx-7">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#566a78]">Proposal journey</p>
        <p className="text-xs text-[#566a78]">Select a stage to review its details.</p>
      </div>
      {isPublished && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Check size={13} strokeWidth={2.5} aria-hidden="true" />Sent to vendors</span>}
    </div>
    <ol aria-label="Proposal creation steps" aria-busy={busy} className="mx-5 mb-5 grid snap-x snap-mandatory grid-flow-col auto-cols-[168px] gap-1.5 overflow-x-auto rounded-2xl border border-[#e7edf1] bg-[#f8fafb] p-1.5 [scrollbar-width:thin] sm:mx-6 lg:mx-7 @min-[820px]:grid-flow-row @min-[820px]:grid-cols-5 @min-[820px]:auto-cols-auto @min-[820px]:overflow-visible">{steps.map((item, index) => {
      const isActive = step === item.id;
      const hasNext = index < steps.length - 1;
      return <li key={item.id} className="relative min-w-0 snap-start">
        {hasNext && <span aria-hidden="true" className="pointer-events-none absolute left-[calc(50%+16px)] right-[calc(-50%+16px)] top-6 z-0 hidden h-px bg-[#dfe7ec] @min-[820px]:block" />}
        <button type="button" aria-current={isActive ? "step" : undefined} onClick={() => choose(item.id)} className={`relative z-[1] flex h-full min-h-16 w-full items-start gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0069a0] @min-[820px]:min-h-[78px] @min-[820px]:flex-col @min-[820px]:items-center @min-[820px]:gap-1.5 @min-[820px]:px-2 @min-[820px]:text-center ${isActive ? "border-[#b9def2] bg-[#f3faff] text-[#0069a0] shadow-[0_4px_14px_rgba(0,105,160,0.07)]" : "border-transparent bg-[#f8fafb] text-[#263744] hover:border-[#dce7ed] hover:bg-white"}`}>
          <span className={`relative z-[2] grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-bold shadow-sm ${
            isActive
              ? "border-[#0069a0] bg-[#0069a0] text-white shadow-[0_0_0_3px_rgba(0,105,160,0.10)]"
              : item.status === "complete"
                ? "border-[#087f69] bg-[#087f69] text-white"
                : "border-[#d6dfe4] bg-white text-[#687782]"
          }`}>
            {item.status === "complete" ? <Check size={15} strokeWidth={3} aria-label={`${item.label} complete`} /> : item.status === "gated" ? <Lock size={13} aria-label={`${item.label} locked`} /> : item.id}
          </span>
          <span className="min-w-0 @min-[820px]:w-full"><span className="block text-[13px] font-bold leading-4">{item.label}</span><span className="mt-0.5 block text-[11px] leading-[15px] text-[#566a78]">{item.summary}</span></span>
        </button>
      </li>;
    })}</ol>
    <div className={step === 1 ? "" : "px-8 py-5"} aria-live="polite">
      {conversationsEnabled && step >= 2 && step <= 3 && <div className="space-y-5">
        <h2 className="text-lg font-semibold">{labels[step - 1]}</h2>
        <details open={detailsOpen} onToggle={(event) => setDetailsOpen((event.target as HTMLDetailsElement).open)} className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-700">Technical details</summary>
          <div className="space-y-5 p-5 pt-0">
            {/* Files are added and monitored on the assistant surface; this
                editor no longer carries a second upload/status panel. */}
            {step === 2 && <><ProposalContextPanel proposalId={proposalId} /><ProposalDraftPanel proposalId={proposalId} /></>}
            {/* The panel no longer reports its own count up: answering a question
                already refreshes the workflow, and the server fact is what the
                summary reads, so a second count here could only disagree. */}
            {step === 3 && <KeyQuestionsPanel proposalId={proposalId} onQuestionResolved={handleQuestionResolved} />}
          </div>
        </details>
      </div>}
      {!conversationsEnabled && step === 2 && <div className="space-y-5"><ProposalContextPanel proposalId={proposalId} /><ProposalDraftPanel proposalId={proposalId} /></div>}
      {!conversationsEnabled && step === 3 && <div><h2 className="text-lg font-semibold">Answer key questions</h2><p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">Key questions are available when the assisted proposal workflow is enabled.</p></div>}
      {step === 4 && !isPublished && <div className="space-y-3"><div><h2 className="text-lg font-semibold">See Guidance</h2><p className="mt-1 text-sm text-slate-600">Review the most important changes before you send this proposal to vendors.</p></div>{conversationsEnabled && data?.steps.some((item) => item.id === 4 && item.status !== "gated") ? <GuidancePanel proposalId={proposalId} onNavigateToStep={onNavigateToFormStep} /> : <p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700"><strong>Proposal readiness is not available yet.</strong> Continue completing the proposal and check again before publishing.</p>}</div>}
      {step === 5 && <div><h2 className="text-lg font-semibold">Publish</h2><p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">Complete the detailed proposal form and use the existing final validation and publish controls below. This workflow cannot automatically publish or send a proposal.</p><button type="button" onClick={continueToFinalDetails} className="mt-3 inline-block rounded-lg bg-[#087f69] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#076b59] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f69]">Continue to final details</button></div>}
    </div>
  </section>;
}
