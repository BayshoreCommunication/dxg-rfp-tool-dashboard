import { getComparisonWorkspaceAction, listComparisonsAction } from "@/app/actions/comparisonOrchestration";
import { getEvidenceExtractionsAction } from "@/app/actions/evidenceExtraction";
import { getLatestEvaluationAction } from "@/app/actions/evaluationEngine";
import { getProposalByIdAction } from "@/app/actions/proposals";
import { listRequirementSetsAction } from "@/app/actions/requirementRegistry";
import { getLatestVendorIntelligenceAction } from "@/app/actions/vendorIntelligence";
import { getVendorResponsesAction, type VendorResponseItem } from "@/app/actions/vendorResponse";
import ProposalIntelligenceLiveRun, { type ProposalAnalysisParticipant } from "@/components/proposalIntelligence/ProposalIntelligenceLiveRun";
import ProposalComparisonMatrix from "@/components/proposalIntelligence/ProposalComparisonMatrix";
import ProposalReweighting from "@/components/proposalIntelligence/ProposalReweighting";
import ProposalVerdict from "@/components/proposalIntelligence/ProposalVerdict";
import VendorComparisonPanel from "@/components/vendor/VendorComparisonPanel";
import { requirementRegistryHref } from "@/lib/proposalIntelligence/requirementRegistryNavigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, FileStack, History, Scale, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const maxDuration = 60;
export const metadata: Metadata = { title: "Proposal Intelligence | RFPilot" };

const label = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const hasComparableEvidence = (response: VendorResponseItem) =>
  response.documents.length > 0 || response.message.trim().length > 0;

export default async function ProposalIntelligencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{24}$/i.test(id)) notFound();
  const [proposalResult, responsesResult, setsResult, comparisonsResult] = await Promise.all([
    getProposalByIdAction(id),
    getVendorResponsesAction({ proposalId: id, page: 1, limit: 100 }),
    listRequirementSetsAction(id),
    listComparisonsAction(id),
  ]);
  if (!proposalResult.success || !record(proposalResult.data)) notFound();
  const proposal = proposalResult.data;
  const event = record(proposal.event) ? proposal.event : {};
  const title = typeof event.eventName === "string" ? event.eventName : "Untitled proposal";
  const status = typeof proposal.status === "string" ? proposal.status : "unsubmitted";
  const responses = Array.isArray(responsesResult?.data) ? responsesResult.data as VendorResponseItem[] : [];
  const analysisResponses = responses.filter((response) =>
    response.submissionId && response.currentVersionId && hasComparableEvidence(response));
  const sets = setsResult.success ? setsResult.data : [];
  const approvedSet = sets.find((item) => item.status === "approved" && !item.freshness.stale);
  const comparisons = comparisonsResult.success ? comparisonsResult.data : [];
  const currentRun = comparisons.find((item) => item.freshness.state === "current") ?? comparisons[0];
  const workspacePromise = currentRun?.run.status.startsWith("succeeded")
    ? getComparisonWorkspaceAction(id, currentRun.run.runId)
    : Promise.resolve(null);
  const readyResponses = analysisResponses.length;
  const analysisPromise = Promise.all(analysisResponses.flatMap((response) =>
    response.submissionId && response.currentVersionId ? [Promise.all([
      getEvidenceExtractionsAction(id, response.submissionId, response.currentVersionId),
      getLatestVendorIntelligenceAction(id, response.submissionId, response.currentVersionId),
      getLatestEvaluationAction(id, response.submissionId, response.currentVersionId),
    ]).then(([extraction, intelligence, evaluation]) => ({
      participant: {
        responseId: response._id,
        vendorLabel: response.vendorName || response.submittedBy || "Unnamed respondent",
        submissionId: response.submissionId!,
        versionId: response.currentVersionId!,
        documentNames: response.documents.map((document) => document.name),
        extraction: extraction.success ? extraction.data : { status: "not_started", runs: [] },
        intelligence: intelligence.success ? intelligence.data : null,
        error: !extraction.success
          ? extraction.message
          : !intelligence.success && intelligence.code !== "INTELLIGENCE_RUN_NOT_FOUND"
            ? intelligence.message
            : undefined,
      } satisfies ProposalAnalysisParticipant,
      evaluationReady: evaluation.success
        && evaluation.data.run.status === "ready"
        && evaluation.data.assignments.some((assignment) => assignment.role !== "observer")
        && evaluation.data.assignments.filter((assignment) => assignment.role !== "observer")
          .every((assignment) => assignment.complete && assignment.conflictStatus === "clear"),
    }))] : []));
  const [workspaceResult, analysisResults] = await Promise.all([workspacePromise, analysisPromise]);
  const analysisParticipants = analysisResults.map((result) => result.participant);
  const comparisonReadyResponseIds = analysisResults.filter((result) => result.evaluationReady)
    .map((result) => result.participant.responseId);
  const evaluationsComplete = readyResponses >= 2 && comparisonReadyResponseIds.length === readyResponses;
  const readiness = !approvedSet
    ? "Requirements need approval"
    : readyResponses < 2
      ? "More responses needed"
      : evaluationsComplete
        ? "Ready to compare"
        : "Evaluation needed";
  const currentWorkspace = workspaceResult?.success ? workspaceResult.data : null;
  const intelligencePath = `/proposals/${id}/intelligence`;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/proposals" className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-500 hover:text-[#008ad2]"><ArrowLeft size={14} />Back to proposals</Link>
        <header className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#008ad2]">Proposal intelligence</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Review frozen vendor versions against approved requirements, inspect cited evidence, and use an eligibility-gated advisory ranking after completed human scoring. Reviewers retain the final vendor decision.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-700">{label(status)}</span>
                <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${approvedSet && evaluationsComplete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{readiness}</span>
              </div>
            </div>
          </div>
          <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, value: readyResponses, label: "Versioned responses" },
              { icon: ClipboardList, value: approvedSet ? `v${approvedSet.version}` : "Not approved", label: "Requirement registry" },
              { icon: History, value: comparisons.length, label: "Comparison runs" },
              { icon: Scale, value: currentRun ? label(currentRun.run.status) : "Not started", label: "Current comparison" },
            ].map((item) => <div key={item.label} className="bg-white p-4 sm:p-5"><item.icon size={17} className="text-[#008ad2]" /><p className="mt-3 text-xl font-extrabold text-slate-950">{item.value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{item.label}</p></div>)}
          </div>
        </header>

        <ProposalIntelligenceLiveRun
          proposalId={id}
          initialParticipants={analysisParticipants}
          comparison={currentRun}
        />
        {currentWorkspace && <><ProposalComparisonMatrix workspace={currentWorkspace} /><ProposalReweighting workspace={currentWorkspace} /><ProposalVerdict workspace={currentWorkspace} proposalId={id} /></>}

        <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${approvedSet ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{approvedSet ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}</span><div><h2 className="font-extrabold text-slate-950">Requirement readiness</h2><p className="mt-1 text-sm leading-6 text-slate-600">{approvedSet ? `Approved version ${approvedSet.version} contains ${approvedSet.requirement_count} frozen requirements.` : "Review and approve the proposal requirement registry before comparing vendors."}</p></div></div>
            <Link href={requirementRegistryHref(id, intelligencePath)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-800 hover:border-[#008ad2] hover:text-[#008ad2]"><FileStack size={15} />Open requirement registry</Link>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-extrabold text-slate-950">Historical runs</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Every run remains tied to its manifest and vendor versions. Stale results stay readable as historical evidence.</p>
            {comparisons.length ? <ul className="mt-3 space-y-2">{comparisons.slice(0, 3).map((item) => <li key={item.run.runId}><Link href={`/proposals/${id}/intelligence/comparisons/${item.run.runId}/overview`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"><span>{new Date(item.run.createdAt).toLocaleString()} · {item.run.participantCount} vendors</span><span className={item.freshness.state === "stale" ? "text-amber-700" : "text-emerald-700"}>{item.freshness.state}</span></Link></li>)}</ul> : <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">No comparison has been created yet.</p>}
            <Link href={`/proposals/${id}/intelligence/submissions`} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-800 hover:border-[#008ad2] hover:text-[#008ad2]"><Users size={15} />Browse submission versions</Link>
          </article>
        </section>

        <section className="mt-5" aria-label="Comparison setup and recovery">
          <VendorComparisonPanel
            responses={responses}
            proposalId={id}
            requirementsApproved={Boolean(approvedSet)}
            preparedResponseIds={analysisParticipants.filter((participant) => participant.intelligence?.run.status === "succeeded").map((participant) => participant.responseId)}
            comparisonReadyResponseIds={comparisonReadyResponseIds}
            returnTo={intelligencePath}
          />
        </section>
      </div>
    </main>
  );
}
