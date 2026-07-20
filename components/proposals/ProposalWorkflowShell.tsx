"use client";

import { getProposalWorkflowAction, setProposalWorkflowStepAction, type ProposalWorkflow } from "@/app/actions/proposalWorkflow";
import { useEffect, useState } from "react";
import PrivateDocumentStatusPanel from "./PrivateDocumentStatusPanel";
import ProposalContextPanel from "./ProposalContextPanel";
import ProposalDraftPanel from "./ProposalDraftPanel";

const labels = ["Provide Information", "Review the Draft", "Answer Key Questions", "See Guidance", "Publish"];
const tones = { complete: "border-emerald-500 bg-emerald-50", in_progress: "border-cyan-500 bg-cyan-50", available: "border-slate-300 bg-white", gated: "border-slate-200 bg-slate-50" };

export default function ProposalWorkflowShell({ proposalId }: { proposalId: string }) {
  const [data, setData] = useState<ProposalWorkflow>();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

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

  const steps = data?.steps ?? ([1, 2, 3, 4, 5] as const).map((id) => ({ id, key: "", label: labels[id - 1], status: "available" as const, summary: "Loading…" }));
  return <section aria-labelledby="assisted-workflow-title" className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#087f69]">Assisted proposal · isolated test</p><h1 id="assisted-workflow-title" className="mt-1 text-2xl font-bold text-slate-900">Create your proposal in five steps</h1><p className="mt-1 text-sm text-slate-600">You control every saved change. Generated prose remains read-only.</p></div><a href="#manual-proposal-details" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">Edit all details</a></div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <ol aria-label="Proposal creation steps" className="mt-5 grid gap-3 md:grid-cols-5">{steps.map((item) => <li key={item.id}><button type="button" disabled={busy} aria-current={step === item.id ? "step" : undefined} onClick={() => void choose(item.id)} className={`h-full w-full rounded-xl border-2 p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 ${step === item.id ? "ring-2 ring-[#087f69] ring-offset-2" : tones[item.status]}`}><span className="text-xs font-bold text-slate-500">0{item.id}</span><span className="mt-2 block font-semibold text-slate-900">{item.label}</span><span className="mt-2 block text-xs text-slate-600">{item.summary}</span></button></li>)}</ol>
    <div className="mt-5" aria-live="polite">
      {step === 1 && <div><h2 className="mb-3 text-lg font-semibold">Provide information</h2><PrivateDocumentStatusPanel proposalId={proposalId} /><p className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-slate-700">You can upload more than one source. Each file is privately quarantined and checked independently. Pasted notes and previous-proposal reuse will be enabled only through the same approved source boundary.</p></div>}
      {step === 2 && <div className="space-y-5"><ProposalContextPanel proposalId={proposalId} /><ProposalDraftPanel proposalId={proposalId} /></div>}
      {step === 3 && <div><h2 className="text-lg font-semibold">Answer key questions</h2><p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">Known information gaps appear in the cited draft under Review the Draft. Complete them in the detailed editor, then regenerate the read-only draft. AI-generated questions are not enabled in this slice.</p></div>}
      {step === 4 && <div><h2 className="text-lg font-semibold">See guidance</h2><p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700"><strong>Investment guidance is not enabled.</strong> It requires separate DXG approval, pricing methodology, and evidence controls. No price or equipment recommendation is being generated.</p></div>}
      {step === 5 && <div><h2 className="text-lg font-semibold">Publish</h2><p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">Complete the detailed proposal form and use the existing final validation and publish controls below. This workflow cannot automatically publish or send a proposal.</p><a href="#manual-proposal-details" className="mt-3 inline-block rounded-lg bg-[#087f69] px-4 py-2 text-sm font-semibold text-white">Continue to final details</a></div>}
    </div>
  </section>;
}
