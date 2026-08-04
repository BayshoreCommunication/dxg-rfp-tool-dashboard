"use client";

// The assisted workflow inside the DETAILED EDITOR: the five-step stepper and
// the field-level review panels behind it. The assistant conversation itself
// lives on one surface only (/proposals/{id}/assistant), so this shell links
// out to it instead of embedding a second copy of the same conversation.

import { getProposalWorkflowAction, setProposalWorkflowStepAction, type ProposalWorkflow } from "@/app/actions/proposalWorkflow";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink, MoreHorizontal, Radio, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import GuidancePanel from "./GuidancePanel";
import InvestmentGuidancePanel from "./InvestmentGuidancePanel";
import HistoricalInsightsPanel from "./HistoricalInsightsPanel";
import KeyQuestionsPanel from "./KeyQuestionsPanel";
import ProposalContextPanel from "./ProposalContextPanel";
import ProposalDraftPanel from "./ProposalDraftPanel";

const labels = ["Provide Information", "Review the Draft", "Answer Key Questions", "See Guidance", "Publish"];
type WorkflowStep = 1 | 2 | 3 | 4 | 5;
export default function ProposalWorkflowShell({
  proposalId,
  proposalName,
  estimatedAvBudget,
  onNavigateToFormStep,
  onQuestionResolved,
}: {
  proposalId: string;
  proposalName?: string;
  estimatedAvBudget?: string;
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

  // Rendered exactly as the server derived them. The step summaries used to be
  // patched here for step 3, which restated a count the server already computes
  // — a second definition of "answered" whose only possible contribution was to
  // disagree. Every status and summary now comes from one place.
  const steps = data?.steps ?? ([1, 2, 3, 4, 5] as const).map((id) => ({ id, key: "", label: labels[id - 1], status: "available" as const, summary: "Loading…" }));
  const isPublished = data?.state?.headline?.toLowerCase().includes("sent to vendors") ?? false;
  const nextActionHref = isPublished ? "/vendor-responses" : `/proposals/${proposalId}/assistant`;
  const nextActionLabel = isPublished
    ? "View vendor responses"
    : data?.state?.nextAction !== "none"
      ? (data?.state?.nextActionLabel ?? "Open the assistant")
      : "Review key questions";
  return <section aria-label="Assisted proposal workflow" className="@container mb-0 border-b border-[#e5eaee] bg-white">
    <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-[#edf0f2] px-6 py-5 sm:px-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-[#172b3a]">{proposalName || "Proposal"}</h1>
          {isPublished && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><Radio size={13} aria-hidden="true" />Published</span>}
        </div>
        <p className="mt-1.5 text-sm text-[#687782]">{isPublished ? "Live vendor-facing proposal" : "Build, review, and prepare your proposal"}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <button type="button" aria-label="More proposal actions" className="grid h-11 w-11 place-items-center rounded-xl border border-[#dfe7ec] bg-white text-[#687782] shadow-sm transition hover:border-[#cbd8df] hover:bg-[#f7fafb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0786cf]"><MoreHorizontal size={20} /></button>
        <a href="#manual-proposal-details" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0786cf] px-4 py-2.5 text-sm font-bold text-white shadow-[0_5px_14px_rgba(7,134,207,0.2)] transition hover:bg-[#066fae] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0786cf] sm:px-5">Open advanced editor<ExternalLink size={15} aria-hidden="true" /></a>
      </div>
    </header>
    {/* The conversation itself lives on one surface only: this editor links out
        to it rather than embedding a second copy. */}
    {conversationsEnabled && <div className="mx-6 mt-6 overflow-hidden rounded-2xl border border-[#cfe6f3] bg-[#f3faff] shadow-[0_10px_28px_rgba(7,134,207,0.07)] sm:mx-8">
      <div className="grid @min-[800px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex items-start gap-4 p-5 sm:gap-5 sm:p-6">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white bg-white text-[#0786cf] shadow-[0_6px_18px_rgba(7,134,207,0.12)] sm:h-14 sm:w-14"><Send size={27} strokeWidth={1.8} aria-hidden="true" /></div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0786cf]">{isPublished ? "Published and live" : "Proposal workspace"}</p>
            <p className="mt-2 text-lg font-bold tracking-[-0.015em] text-[#172b3a] sm:text-xl">{isPublished ? "Your proposal is live and accepting responses." : "Build your proposal with confidence."}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#566a78]">{isPublished ? "Vendors can review the RFP and submit their proposals. Keep an eye on incoming activity and answer questions as they arrive." : "The assistant is the easiest place to answer questions, review the draft, and decide what to improve."}</p>
          </div>
        </div>
        <div className="border-t border-[#d8eaf4] bg-white/70 p-5 sm:p-6 @min-[800px]:border-l @min-[800px]:border-t-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#718592]">Next best action</p>
          <p className="mt-2 text-base font-bold text-[#172b3a]">{isPublished ? "Review vendor activity" : (data?.state?.nextActionLabel ?? "Open the assistant")}</p>
          <p className="mt-1.5 text-sm leading-5 text-[#687782]">{isPublished ? "Monitor responses and keep vendor questions moving." : (data?.state?.headline ?? "Continue from the most useful next step.")}</p>
          {/* A published RFP has no next action. Offering one that still reads
              "Answer the next question" would invite work that is already over. */}
          <Link href={nextActionHref} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0786cf] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(7,134,207,0.18)] transition-colors hover:bg-[#066fae] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0786cf]">{nextActionLabel}<ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </div>
    </div>}
    {error && <p role="alert" className="mx-6 mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800 sm:mx-8">{error}</p>}
    <div className="mx-6 mb-3 mt-6 flex flex-wrap items-end justify-between gap-2 sm:mx-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#718592]">Proposal journey</p>
        <p className="mt-1 text-sm text-[#687782]">Select a stage to review its details.</p>
      </div>
      {isPublished && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Check size={13} strokeWidth={2.5} aria-hidden="true" />Sent to vendors</span>}
    </div>
    <ol aria-label="Proposal creation steps" aria-busy={busy} className="mx-6 mb-6 grid gap-2 sm:mx-8 sm:grid-cols-5">{steps.map((item, index) => {
      const isActive = step === item.id;
      const hasNext = index < steps.length - 1;
      return <li key={item.id} className="relative min-w-0">
        {hasNext && <span aria-hidden="true" className="pointer-events-none absolute left-8 top-8 z-0 h-[calc(100%+0.5rem)] w-px bg-[#dfe7ec] sm:bottom-auto sm:left-[calc(50%+20px)] sm:right-[calc(-50%+20px)] sm:top-8 sm:h-px sm:w-auto" />}
        <button type="button" aria-current={isActive ? "step" : undefined} onClick={() => choose(item.id)} className={`relative z-[1] flex h-full min-h-[76px] w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0786cf] sm:min-h-[112px] sm:flex-col sm:items-center sm:px-2 sm:text-center ${isActive ? "border-[#b9def2] bg-[#f3faff] text-[#0786cf] shadow-[0_6px_18px_rgba(7,134,207,0.08)]" : "border-[#edf2f5] bg-[#f8fafb] text-[#263744] hover:border-[#dce7ed] hover:bg-white"}`}>
          <span className={`relative z-[2] grid h-10 w-10 shrink-0 place-items-center rounded-full border text-sm font-bold shadow-sm ${isActive ? "border-[#0786cf] bg-[#0786cf] text-white shadow-[0_0_0_4px_rgba(7,134,207,0.10)]" : "border-[#d6dfe4] bg-white text-[#687782]"}`}>{item.id}</span>
          <span className="min-w-0 sm:max-w-[150px]"><span className="block text-sm font-bold leading-snug">{item.label}</span><span className="mt-1 block text-[11px] leading-4 text-[#71818d]">{item.summary}</span></span>
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
      {step === 4 && <div className="space-y-3"><h2 className="text-lg font-semibold">See Guidance</h2>{conversationsEnabled && data?.steps.some((item) => item.id === 4 && item.status !== "gated") ? <><GuidancePanel proposalId={proposalId} onNavigateToStep={onNavigateToFormStep} /><InvestmentGuidancePanel proposalId={proposalId} estimatedAvBudget={estimatedAvBudget} /><HistoricalInsightsPanel proposalId={proposalId} /></> : <p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700"><strong>Investment guidance is not enabled.</strong> It requires separate DXG approval, pricing methodology, and evidence controls. No price or equipment recommendation is being generated.</p>}</div>}
      {step === 5 && <div><h2 className="text-lg font-semibold">Publish</h2><p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">Complete the detailed proposal form and use the existing final validation and publish controls below. This workflow cannot automatically publish or send a proposal.</p><a href="#manual-proposal-details" className="mt-3 inline-block rounded-lg bg-[#087f69] px-4 py-2 text-sm font-semibold text-white">Continue to final details</a></div>}
    </div>
  </section>;
}
