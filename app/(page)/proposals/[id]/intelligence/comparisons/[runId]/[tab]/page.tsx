import { getComparisonWorkspaceAction, listComparisonsAction } from "@/app/actions/comparisonOrchestration";
import { getProposalByIdAction } from "@/app/actions/proposals";
import ProposalIntelligenceWorkspace, { type IntelligenceTab } from "@/components/proposalIntelligence/ProposalIntelligenceWorkspace";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const maxDuration = 60;
export const metadata: Metadata = { title: "Vendor Comparison | RFPilot" };
const intelligenceTabs: readonly IntelligenceTab[] = ["overview", "requirements", "technical", "commercial", "evaluation", "reports"];
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export default async function ComparisonViewPage({ params }: { params: Promise<{ id: string; runId: string; tab: string }> }) {
  const { id, runId, tab } = await params;
  if (!/^[0-9a-f]{24}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(runId) || !intelligenceTabs.includes(tab as IntelligenceTab)) notFound();
  const [proposal, workspace, runs] = await Promise.all([
    getProposalByIdAction(id),
    getComparisonWorkspaceAction(id, runId),
    listComparisonsAction(id),
  ]);
  if (!proposal.success || !record(proposal.data)) notFound();
  if (!workspace.success) {
    if (workspace.code === "COMPARISON_NOT_FOUND") notFound();
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <section role="alert" className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-7 shadow-sm">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-700">Proposal intelligence</p>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">Comparison workspace is temporarily unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{workspace.message} Your saved comparison has not been deleted or replaced.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/proposals/${id}/intelligence/comparisons/${runId}/${tab}`} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-extrabold text-white">Try again</Link>
            <Link href={`/proposals/${id}/intelligence`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700">Back to proposal intelligence</Link>
          </div>
        </section>
      </main>
    );
  }
  const event = record(proposal.data.event) ? proposal.data.event : {};
  const proposalTitle = typeof event.eventName === "string" ? event.eventName : "Proposal intelligence";
  return <ProposalIntelligenceWorkspace proposalId={id} proposalTitle={proposalTitle} tab={tab as IntelligenceTab} initialWorkspace={workspace.data} runs={runs.success ? runs.data : [workspace.data]} />;
}
