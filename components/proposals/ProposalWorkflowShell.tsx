"use client";

// The assisted workflow inside the DETAILED EDITOR: the five-step stepper and
// the field-level review panels behind it. The assistant conversation itself
// lives on one surface only (/proposals/{id}/assistant), so this shell links
// out to it instead of embedding a second copy of the same conversation.

import { getProposalWorkflowAction, setProposalWorkflowStepAction, type ProposalWorkflow } from "@/app/actions/proposalWorkflow";
import Link from "next/link";
import { useEffect, useState } from "react";
import GuidancePanel from "./GuidancePanel";
import InvestmentGuidancePanel from "./InvestmentGuidancePanel";
import KeyQuestionsPanel from "./KeyQuestionsPanel";
import ProposalContextPanel from "./ProposalContextPanel";
import ProposalDraftPanel from "./ProposalDraftPanel";

const labels = ["Provide Information", "Review the Draft", "Answer Key Questions", "See Guidance", "Publish"];
const tones = { complete: "border-emerald-500 bg-emerald-50", in_progress: "border-cyan-500 bg-cyan-50", available: "border-slate-300 bg-white", gated: "border-slate-200 bg-slate-50" };

export default function ProposalWorkflowShell({
  proposalId,
  estimatedAvBudget,
  onNavigateToFormStep,
  onQuestionResolved,
}: {
  proposalId: string;
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
  // Was local state that nothing ever assigned, so the step-3 summary below
  // silently never used it. The server already derives this count alongside
  // the phase and next action, so read it from there — one definition of
  // "answered" rather than a second one free to drift from it.
  const openQuestionCount = data?.facts?.openQuestionCount ?? null;
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

  const steps = (data?.steps ?? ([1, 2, 3, 4, 5] as const).map((id) => ({ id, key: "", label: labels[id - 1], status: "available" as const, summary: "Loading…" })))
    .map((item) =>
      item.id === 3 && openQuestionCount !== null
        ? {
            ...item,
            summary:
              openQuestionCount === 0
                ? "All key questions answered"
                : `${openQuestionCount} key ${openQuestionCount === 1 ? "question" : "questions"} remaining`,
          }
        : item,
    );
  return <section aria-label="Assisted proposal workflow" className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
    {/* The conversation itself lives on one surface only: this editor links out
        to it rather than embedding a second copy. */}
    {conversationsEnabled && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#087f69]/30 bg-emerald-50/60 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{data?.state?.headline ?? "Build your proposal with the assistant"}</p>
        <p className="mt-0.5 text-xs text-slate-600">The assistant is the easiest place to answer questions, review the draft, and decide what to improve.</p>
      </div>
      <Link href={`/proposals/${proposalId}/assistant`} className="rounded-lg bg-[#087f69] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#066553]">{data?.state?.nextActionLabel ?? "Open the assistant"} →</Link>
    </div>}
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-xs text-slate-500">Advanced editor · all proposal fields</p>
      <a href="#manual-proposal-details" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Open advanced editor</a>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <ol aria-label="Proposal creation steps" className="mt-5 grid gap-3 md:grid-cols-5">{steps.map((item) => <li key={item.id}><button type="button" disabled={busy} aria-current={step === item.id ? "step" : undefined} onClick={() => void choose(item.id)} className={`h-full w-full rounded-xl border-2 p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 ${step === item.id ? "ring-2 ring-[#087f69] ring-offset-2" : tones[item.status]}`}><span className="text-xs font-bold text-slate-500">0{item.id}</span><span className="mt-2 block font-semibold text-slate-900">{item.label}</span><span className="mt-2 block text-xs text-slate-600">{item.summary}</span></button></li>)}</ol>
    <div className="mt-5" aria-live="polite">
      {conversationsEnabled && step <= 3 && <div className="space-y-5">
        <h2 className="text-lg font-semibold">{labels[step - 1]}</h2>
        <details open={detailsOpen} onToggle={(event) => setDetailsOpen((event.target as HTMLDetailsElement).open)} className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-700">Technical details</summary>
          <div className="space-y-5 p-5 pt-0">
            {/* Files are added and monitored on the assistant surface; this
                editor no longer carries a second upload/status panel. */}
            {step === 1 && <><p className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-slate-700">You can upload more than one source. Each file is privately quarantined and checked independently. Pasted notes and previous-proposal reuse will be enabled only through the same approved source boundary.</p></>}
            {step === 2 && <><ProposalContextPanel proposalId={proposalId} /><ProposalDraftPanel proposalId={proposalId} /></>}
            {/* The panel no longer reports its own count up: answering a question
                already refreshes the workflow, and the server fact is what the
                summary reads, so a second count here could only disagree. */}
            {step === 3 && <KeyQuestionsPanel proposalId={proposalId} onQuestionResolved={handleQuestionResolved} />}
          </div>
        </details>
      </div>}
      {!conversationsEnabled && step === 1 && <div><h2 className="mb-3 text-lg font-semibold">Provide information</h2><p className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-slate-700">You can upload more than one source. Each file is privately quarantined and checked independently. Pasted notes and previous-proposal reuse will be enabled only through the same approved source boundary.</p></div>}
      {!conversationsEnabled && step === 2 && <div className="space-y-5"><ProposalContextPanel proposalId={proposalId} /><ProposalDraftPanel proposalId={proposalId} /></div>}
      {!conversationsEnabled && step === 3 && <div><h2 className="text-lg font-semibold">Answer key questions</h2><p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">Key questions are available when the assisted proposal workflow is enabled.</p></div>}
      {step === 4 && <div className="space-y-3"><h2 className="text-lg font-semibold">See Guidance</h2>{conversationsEnabled && data?.steps.some((item) => item.id === 4 && item.status !== "gated") ? <><InvestmentGuidancePanel proposalId={proposalId} estimatedAvBudget={estimatedAvBudget} /><GuidancePanel proposalId={proposalId} onNavigateToStep={onNavigateToFormStep} /></> : <p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700"><strong>Investment guidance is not enabled.</strong> It requires separate DXG approval, pricing methodology, and evidence controls. No price or equipment recommendation is being generated.</p>}</div>}
      {step === 5 && <div><h2 className="text-lg font-semibold">Publish</h2><p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">Complete the detailed proposal form and use the existing final validation and publish controls below. This workflow cannot automatically publish or send a proposal.</p><a href="#manual-proposal-details" className="mt-3 inline-block rounded-lg bg-[#087f69] px-4 py-2 text-sm font-semibold text-white">Continue to final details</a></div>}
    </div>
  </section>;
}
