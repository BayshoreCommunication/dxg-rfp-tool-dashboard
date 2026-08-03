"use client";

// The assisted workflow inside the DETAILED EDITOR: the five-step stepper and
// the field-level review panels behind it. The assistant conversation itself
// lives on one surface only (/proposals/{id}/assistant), so this shell links
// out to it instead of embedding a second copy of the same conversation.

import { getProposalWorkflowAction, setProposalWorkflowStepAction, type ProposalWorkflow } from "@/app/actions/proposalWorkflow";
import Link from "next/link";
import { ArrowRight, MoreHorizontal, Send } from "lucide-react";
import { useEffect, useState } from "react";
import GuidancePanel from "./GuidancePanel";
import InvestmentGuidancePanel from "./InvestmentGuidancePanel";
import HistoricalInsightsPanel from "./HistoricalInsightsPanel";
import KeyQuestionsPanel from "./KeyQuestionsPanel";
import ProposalContextPanel from "./ProposalContextPanel";
import ProposalDraftPanel from "./ProposalDraftPanel";

const labels = ["Provide Information", "Review the Draft", "Answer Key Questions", "See Guidance", "Publish"];
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
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  // The disclosure used to be expanded by ConversationWorkspace's onOpenRun.
  // That conversation now lives on its own route and reaches these panels by
  // navigation ("View draft", "Review & apply N extracted fields"), so the
  // disclosure starts OPEN: arriving from one of those links has to land on the
  // panel it pointed at. It stays a disclosure so it can be collapsed again.
  const [detailsOpen, setDetailsOpen] = useState(true);

  useEffect(() => {
    let active = true;
    void getProposalWorkflowAction(proposalId).then((result) => {
      if (!active) return;
      if (!result.success) { setError(result.message); return; }
      setData(result.data);
      setStep(result.data.workflow.currentStep);
    });
    return () => { active = false; };
  }, [proposalId]);

  const choose = async (next: 1 | 2 | 3 | 4 | 5) => {
    setStep(next); setBusy(true); setError(undefined);
    const result = await setProposalWorkflowStepAction(proposalId, next);
    setBusy(false);
    if (!result.success) { setError(result.message); return; }
    setData(result.data);
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
  return <section aria-label="Assisted proposal workflow" className="mb-0 border-b border-[#e5eaee] bg-white">
    <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-[#edf0f2] px-8 py-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-bold tracking-tight text-[#172b3a]">{proposalName || "Proposal"}</h1>
          {isPublished && <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">Published</span>}
        </div>
        <p className="mt-1 text-sm text-[#687782]">{isPublished ? "Sent to vendors" : "Build and review your proposal"}</p>
      </div>
      <div className="flex items-center gap-4">
        <button type="button" aria-label="More proposal actions" className="grid h-10 w-10 place-items-center rounded-full border border-[#e5eaee] bg-white text-[#687782] shadow-sm transition hover:bg-[#f4f7f9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0786cf]"><MoreHorizontal size={20} /></button>
        <a href="#manual-proposal-details" className="rounded-lg bg-[#0786cf] px-5 py-3 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(7,134,207,0.22)] transition hover:bg-[#066fae] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0786cf]">Open advanced editor</a>
      </div>
    </header>
    {/* The conversation itself lives on one surface only: this editor links out
        to it rather than embedding a second copy. */}
    {conversationsEnabled && <div className="mx-8 mt-6 grid gap-6 rounded-2xl border border-[#dceef8] bg-[#f1f9fd] px-6 py-6 shadow-[0_8px_24px_rgba(7,134,207,0.06)] lg:grid-cols-[72px_1.3fr_1fr_.65fr] lg:items-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-[#0786cf] shadow-[0_6px_18px_rgba(7,134,207,0.12)]"><Send size={34} strokeWidth={1.7} /></div>
      <div>
        <p className="text-lg font-semibold text-[#222628]">{isPublished ? "Your proposal is live." : "Build your proposal with confidence."}</p>
        <p className="mt-2 text-sm font-semibold text-[#222628]">{data?.state?.headline ?? "Your assistant is ready."}</p>
        <p className="mt-1 text-sm text-[#565859]">{isPublished ? "Vendors can view and submit their proposals." : "The assistant is the easiest place to answer questions, review the draft, and decide what to improve."}</p>
      </div>
      <div className="border-l border-[#cbdde6] pl-8">
        <p className="text-base font-semibold text-[#222628]">Next action</p>
        <p className="mt-1 max-w-xs text-sm leading-5 text-[#565859]">Monitor responses and answer vendor questions to keep your event on track.</p>
      {/* A published RFP has no next action. Offering one that still reads
          "Answer the next question" would invite work that is already over. */}
        <Link href={`/proposals/${proposalId}/assistant`} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0786cf] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#066fae]">{data?.state?.nextAction !== "none" ? (data?.state?.nextActionLabel ?? "Open the assistant") : "Go to Key Questions"}<ArrowRight size={15} /></Link>
      </div>
      <div className="border-l border-[#cbdde6] pl-8">
        <p className="text-sm font-semibold text-[#222628]">Status</p>
        <p className="mt-2 text-sm text-[#565859]">{isPublished ? "Sent to vendors" : "In progress"}</p>
      </div>
    </div>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <ol aria-label="Proposal creation steps" className="mx-8 my-6 grid gap-2 md:grid-cols-5">{steps.map((item) => <li key={item.id}><button type="button" disabled={busy} aria-current={step === item.id ? "step" : undefined} onClick={() => void choose(item.id)} className={`relative flex h-full w-full gap-3 rounded-xl border px-3 py-4 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0786cf] ${step === item.id ? "border-[#b9def2] bg-[#f1f9fd] text-[#0786cf] shadow-[0_4px_14px_rgba(7,134,207,0.08)]" : "border-transparent bg-white text-[#263744] hover:border-[#e5eaee] hover:bg-[#fafcfd]"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-semibold ${step === item.id ? "border-[#0786cf] bg-[#0786cf] text-white" : item.status === "complete" ? "border-emerald-500 bg-emerald-500 text-white" : "border-[#d6dfe4] bg-white text-[#687782]"}`}>{item.id}</span><span className="min-w-0"><span className="block text-sm font-semibold leading-snug">{item.label}</span><span className="mt-1 block text-[11px] leading-4 text-[#687782]">{item.summary}</span></span></button></li>)}</ol>
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
