import { getComparisonWorkspaceAction, listComparisonsAction } from "@/app/actions/comparisonOrchestration";
import { getIntelligenceOperationsBundleAction } from "@/app/actions/proposalIntelligenceOperations";
import { getProposalByIdAction } from "@/app/actions/proposals";
import ProposalIntelligenceWorkspace, { type IntelligenceTab } from "@/components/proposalIntelligence/ProposalIntelligenceWorkspace";
import { notFound } from "next/navigation";

export const maxDuration = 60;
const intelligenceTabs: readonly IntelligenceTab[] = ["overview", "requirements", "technical", "commercial", "risks", "evaluation", "reports"];
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export default async function ComparisonViewPage({ params }: { params: Promise<{ id: string; runId: string; tab: string }> }) {
  const { id, runId, tab } = await params;
  if (!/^[0-9a-f]{24}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(runId) || !intelligenceTabs.includes(tab as IntelligenceTab)) notFound();
  const needsOperations = tab === "reports";
  const [proposal, workspace, runs, operations] = await Promise.all([
    getProposalByIdAction(id),
    getComparisonWorkspaceAction(id, runId),
    listComparisonsAction(id),
    needsOperations ? getIntelligenceOperationsBundleAction(id, runId) : Promise.resolve(null),
  ]);
  if (!proposal.success || !record(proposal.data) || !workspace.success) notFound();
  const event = record(proposal.data.event) ? proposal.data.event : {};
  const proposalTitle = typeof event.eventName === "string" ? event.eventName : "Proposal intelligence";
  return <ProposalIntelligenceWorkspace proposalId={id} proposalTitle={proposalTitle} tab={tab as IntelligenceTab} initialWorkspace={workspace.data} runs={runs.success ? runs.data : [workspace.data]} operationsBundle={operations?.success ? operations.data : undefined} />;
}
