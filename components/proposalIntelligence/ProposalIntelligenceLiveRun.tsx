"use client";

import type { ComparisonView } from "@/app/actions/comparisonOrchestration";
import { getDurableJob } from "@/app/actions/durableJobs";
import {
  createEvidenceExtractionAction,
  getEvidenceExtractionsAction,
  type EvidenceExtractionSummary,
} from "@/app/actions/evidenceExtraction";
import {
  createVendorIntelligenceAction,
  getLatestVendorIntelligenceAction,
  type VendorIntelligenceResult,
} from "@/app/actions/vendorIntelligence";
import IntelligenceStatusChip from "@/components/proposalIntelligence/IntelligenceStatusChip";
import { intelligenceSurfaceClasses } from "@/lib/proposalIntelligence/surfaces";
import {
  jobStatusToIntelligenceStatus,
  type IntelligenceStatus,
} from "@/lib/proposalIntelligence/statusVocabulary";
import type { DurableJob } from "@/lib/asyncOperations";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckSquare,
  Clock3,
  FileSearch,
  ListChecks,
  Scale,
  ScanSearch,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ProposalAnalysisParticipant = {
  responseId: string;
  vendorLabel: string;
  submissionId: string;
  versionId: string;
  documentNames: string[];
  extraction: EvidenceExtractionSummary;
  intelligence: VendorIntelligenceResult | null;
  error?: string;
};

type TrackedJob = {
  jobId: string;
  participantId: string;
  kind: "extraction" | "intelligence";
  job?: DurableJob;
  pollFailures?: number;
};

const terminalJobs = new Set(["succeeded", "failed", "cancelled", "dead_letter"]);
const MAX_JOB_POLL_FAILURES = 5;
const terminalExtraction = new Set(["ready", "partial", "unreadable", "failed"]);
const readableExtraction = new Set(["ready", "partial"]);
const label = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const locatorLabel = (locator: Record<string, string | number>) =>
  Object.entries(locator).map(([key, value]) => `${key.replaceAll("_", " ")} ${value}`).join(" · ") || "Location recorded";

const elapsedLabel = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  if (days > 0) return `${days}d ${Math.floor(totalSeconds % 86_400 / 3_600)}h`;
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const intelligenceComplete = (participant: ProposalAnalysisParticipant) =>
  participant.intelligence?.run.status === "succeeded";

const intelligenceFailureMessages: Record<string, string> = {
  CITATION_GROUNDING_FAILED: "One or more extracted claims could not be verified against the cited vendor text. Retry will safely omit unsupported claims.",
  CITATION_VALIDATION_FAILED: "Some generated citations did not point to this vendor’s current evidence. Retry will rebuild the mapping from the approved sources.",
  SCHEMA_VALIDATION_FAILED: "The generated mapping was incomplete. Retry will fill unsupported requirements as not evidenced instead of blocking the full response.",
  LIVE_AI_CLASSIFICATION_DENIED: "Vendor-response AI processing is not enabled in this environment. An administrator must enable the approved confidential-data policy before retrying.",
  LIVE_AI_PROVIDER_TEMPORARY: "The mapping service was temporarily unavailable.",
  AI_PROVIDER_TIMEOUT: "The mapping service timed out before the response could be completed.",
};

const intelligenceFailureMessage = (participant: ProposalAnalysisParticipant) => {
  const code = participant.intelligence?.run.safeErrorCode;
  return participant.error
    || (code ? intelligenceFailureMessages[code] : undefined)
    || (participant.extraction.status === "unreadable"
      ? "No readable text could be recovered from this response."
      : participant.extraction.status === "failed"
        ? "Document extraction failed."
        : "Requirement mapping failed before a complete vendor evaluation could be prepared.");
};

const phaseStatus = ({
  active,
  complete,
  partial,
  failed,
  queued,
  attention,
}: {
  active?: boolean;
  complete?: boolean;
  partial?: boolean;
  failed?: boolean;
  queued?: boolean;
  attention?: boolean;
}): IntelligenceStatus => {
  if (active) return "in_progress";
  if (failed) return "failed";
  if (partial) return "partial";
  if (attention) return "attention";
  if (complete) return "complete";
  if (queued) return "queued";
  return "not_started";
};

export default function ProposalIntelligenceLiveRun({
  proposalId,
  initialParticipants,
  comparison,
  autoStart = true,
}: {
  proposalId: string;
  initialParticipants: ProposalAnalysisParticipant[];
  comparison?: ComparisonView;
  autoStart?: boolean;
}) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [retryingParticipants, setRetryingParticipants] = useState<Set<string>>(() => new Set());
  const [jobs, setJobs] = useState<Record<string, TrackedJob>>(() =>
    Object.fromEntries(initialParticipants.flatMap((participant) => [
      ...participant.extraction.runs.flatMap((run) => run.jobId && ["queued", "running", "retry_scheduled"].includes(run.status)
        ? [[run.jobId, { jobId: run.jobId, participantId: participant.responseId, kind: "extraction" as const }]] as const
        : []),
      ...(participant.intelligence?.run.jobId && ["queued", "running"].includes(participant.intelligence.run.status)
        ? [[participant.intelligence.run.jobId, { jobId: participant.intelligence.run.jobId, participantId: participant.responseId, kind: "intelligence" as const }]] as const
        : []),
    ])),
  );
  const comparisonFinished = Boolean(comparison?.run.status.startsWith("succeeded"));
  const comparisonCurrent = comparison?.freshness.state === "current";
  const [runActive, setRunActive] = useState(
    autoStart && initialParticipants.length >= 2 && !comparisonFinished,
  );
  const [startedAt, setStartedAt] = useState(() => {
    const dates = initialParticipants.flatMap((participant) => [
      ...participant.extraction.runs.map((run) => Date.parse(run.createdAt)),
      ...(participant.intelligence ? [Date.parse(participant.intelligence.run.createdAt)] : []),
    ]).filter(Number.isFinite);
    return dates.length ? Math.min(...dates) : Date.now();
  });
  const [clock, setClock] = useState(() => Date.now());
  const started = useRef(new Set<string>());
  const cancelled = useRef(false);

  const updateParticipant = useCallback((responseId: string, update: Partial<ProposalAnalysisParticipant>) => {
    setParticipants((current) => current.map((participant) =>
      participant.responseId === responseId ? { ...participant, ...update } : participant));
  }, []);

  const refreshParticipant = useCallback(async (participant: ProposalAnalysisParticipant) => {
    const [extraction, intelligence] = await Promise.all([
      getEvidenceExtractionsAction(proposalId, participant.submissionId, participant.versionId),
      getLatestVendorIntelligenceAction(proposalId, participant.submissionId, participant.versionId),
    ]);
    if (cancelled.current) return;
    updateParticipant(participant.responseId, {
      ...(extraction.success ? { extraction: extraction.data } : { error: extraction.message }),
      ...(intelligence.success
        ? { intelligence: intelligence.data }
        : intelligence.code === "INTELLIGENCE_RUN_NOT_FOUND"
          ? { intelligence: null }
          : { error: intelligence.message }),
      ...(extraction.success && (intelligence.success || intelligence.code === "INTELLIGENCE_RUN_NOT_FOUND")
        ? { error: undefined }
        : {}),
    });
    if (intelligence.success) {
      window.dispatchEvent(new CustomEvent("proposal-intelligence:readiness", {
        detail: {
          responseId: participant.responseId,
          ready: intelligence.data.run.status === "succeeded",
        },
      }));
    }
  }, [proposalId, updateParticipant]);

  const startExtraction = useCallback(async (participant: ProposalAnalysisParticipant) => {
    const key = `extraction:${participant.responseId}`;
    if (started.current.has(key)) return;
    started.current.add(key);
    const result = await createEvidenceExtractionAction(
      proposalId,
      participant.submissionId,
      participant.versionId,
      crypto.randomUUID(),
    );
    if (cancelled.current) return;
    if (!result.success) {
      updateParticipant(participant.responseId, { error: result.message });
      return;
    }
    updateParticipant(participant.responseId, {
      extraction: { status: "processing", runs: result.data.runs },
      error: undefined,
    });
    setJobs((current) => ({
      ...current,
      ...Object.fromEntries(result.data.runs.flatMap((run) => run.jobId && !terminalJobs.has(run.status)
        ? [[run.jobId, { jobId: run.jobId, participantId: participant.responseId, kind: "extraction" as const }]]
        : [])),
    }));
    if (result.data.runs.every((run) => !run.jobId || terminalJobs.has(run.status))) {
      await refreshParticipant(participant);
    }
  }, [proposalId, refreshParticipant, updateParticipant]);

  const startIntelligence = useCallback(async (participant: ProposalAnalysisParticipant) => {
    const key = `intelligence:${participant.responseId}`;
    if (started.current.has(key)) return;
    started.current.add(key);
    const result = await createVendorIntelligenceAction(
      proposalId,
      participant.submissionId,
      participant.versionId,
      crypto.randomUUID(),
    );
    if (cancelled.current) return;
    if (!result.success) {
      updateParticipant(participant.responseId, { error: result.message });
      return;
    }
    updateParticipant(participant.responseId, {
      intelligence: { run: result.data, mappings: [], facts: [], reviews: [] },
      error: undefined,
    });
    if (result.data.jobId) setJobs((current) => ({
      ...current,
      [result.data.jobId]: {
        jobId: result.data.jobId,
        participantId: participant.responseId,
        kind: "intelligence",
      },
    }));
  }, [proposalId, updateParticipant]);

  const retryParticipant = useCallback(async (participant: ProposalAnalysisParticipant) => {
    const retryExtraction = !readableExtraction.has(participant.extraction.status);
    setRetryingParticipants((current) => new Set(current).add(participant.responseId));
    started.current.delete(`${retryExtraction ? "extraction" : "intelligence"}:${participant.responseId}`);
    setJobs((current) => Object.fromEntries(Object.entries(current).filter(([, job]) => job.participantId !== participant.responseId)));
    updateParticipant(participant.responseId, { error: undefined });
    setStartedAt(Date.now());
    setRunActive(true);
    try {
      if (retryExtraction) await startExtraction(participant);
      else await startIntelligence(participant);
    } finally {
      setRetryingParticipants((current) => {
        const next = new Set(current);
        next.delete(participant.responseId);
        return next;
      });
    }
  }, [startExtraction, startIntelligence, updateParticipant]);

  useEffect(() => {
    cancelled.current = false;
    return () => { cancelled.current = true; };
  }, []);

  useEffect(() => {
    if (!runActive) return;
    participants.forEach((participant) => {
      if (participant.extraction.status === "not_started") void startExtraction(participant);
      else if (readableExtraction.has(participant.extraction.status) && !participant.intelligence)
        void startIntelligence(participant);
    });
  }, [participants, runActive, startExtraction, startIntelligence]);

  useEffect(() => {
    const pending = Object.values(jobs).filter((item) => !item.job || !terminalJobs.has(item.job.status));
    if (pending.length === 0) return;
    const timer = window.setTimeout(async () => {
      const results = await Promise.all(pending.map(async (tracked) => ({
        tracked,
        result: await getDurableJob(tracked.jobId),
      })));
      if (cancelled.current) return;
      const completedParticipants = new Set(results.flatMap(({ tracked, result }) =>
        result.success && terminalJobs.has(result.data.status) ? [tracked.participantId] : []));
      const exhaustedLookups = new Map(results.flatMap(({ tracked, result }) =>
        !result.success && (tracked.pollFailures ?? 0) + 1 >= MAX_JOB_POLL_FAILURES
          ? [[tracked.participantId, result.message] as const]
          : []));
      setJobs((current) => {
        const next = { ...current };
        results.forEach(({ tracked, result }) => {
          if (result.success) {
            next[tracked.jobId] = { ...tracked, job: result.data, pollFailures: 0 };
          } else {
            const pollFailures = (tracked.pollFailures ?? 0) + 1;
            if (pollFailures >= MAX_JOB_POLL_FAILURES) {
              delete next[tracked.jobId];
            } else next[tracked.jobId] = { ...tracked, pollFailures };
          }
        });
        return next;
      });
      exhaustedLookups.forEach((message, responseId) => updateParticipant(responseId, {
        error: `The background job stopped reporting status. ${message}`,
      }));
      await Promise.all([...completedParticipants].flatMap((responseId) => {
        const participant = participants.find((item) => item.responseId === responseId);
        return participant ? [refreshParticipant(participant)] : [];
      }));
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [jobs, participants, refreshParticipant, updateParticipant]);

  const activeJobs = Object.values(jobs).filter((item) => !item.job || !terminalJobs.has(item.job.status));
  const extractionDone = participants.every((participant) =>
    Boolean(participant.error) || terminalExtraction.has(participant.extraction.status));
  const usableParticipants = participants.filter((participant) => readableExtraction.has(participant.extraction.status));
  const intelligenceDone = usableParticipants.length > 0
    ? usableParticipants.every((participant) =>
      participant.error || (participant.intelligence && ["succeeded", "failed"].includes(participant.intelligence.run.status)))
    : participants.length > 0 && participants.every((participant) => Boolean(participant.error));
  const live = runActive && (!extractionDone || !intelligenceDone || activeJobs.length > 0);

  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [live]);

  const counts = useMemo(() => {
    const runs = participants.flatMap((participant) => participant.extraction.runs);
    const results = participants.flatMap((participant) => participant.intelligence ? [participant.intelligence] : []);
    const mappings = results.flatMap((result) => result.mappings);
    return {
      sources: runs.length || participants.reduce((total, participant) => total + Math.max(1, participant.documentNames.length), 0),
      readableSources: runs.filter((run) => run.status === "succeeded" || run.status === "partial").length,
      pages: runs.reduce((total, run) => total + run.pageCount, 0),
      requirements: results.reduce((total, result) => total + result.run.requirementCount, 0),
      located: mappings.filter((mapping) => mapping.relationship !== "none" && mapping.evidence.length > 0).length,
      facts: results.reduce((total, result) => total + result.run.factCount, 0),
      contradictions: results.reduce((total, result) => total + result.run.contradictionCount, 0),
      missing: mappings.filter((mapping) => mapping.relationship === "none").length,
      failed: participants.filter((participant) => ["unreadable", "failed"].includes(participant.extraction.status) || participant.intelligence?.run.status === "failed" || participant.error).length,
    };
  }, [participants]);

  const extractionActive = participants.some((participant) => participant.extraction.status === "processing") || Object.values(jobs).some((item) => item.kind === "extraction" && (!item.job || !terminalJobs.has(item.job.status)));
  const intelligenceActive = participants.some((participant) => !participant.error && participant.intelligence && ["queued", "running"].includes(participant.intelligence.run.status)) || Object.values(jobs).some((item) => item.kind === "intelligence" && (!item.job || !terminalJobs.has(item.job.status)));
  const comparisonReadyCount = participants.filter((participant) =>
    readableExtraction.has(participant.extraction.status) && intelligenceComplete(participant)).length;
  const phases = [
    {
      key: "reading",
      icon: FileSearch,
      title: "Reading documents",
      status: phaseStatus({ active: extractionActive, complete: extractionDone && counts.failed === 0, partial: extractionDone && counts.failed > 0, queued: runActive }),
      summary: `${counts.readableSources} of ${counts.sources} sources readable · ${counts.pages} pages`,
    },
    {
      key: "locating",
      icon: ScanSearch,
      title: "Locating required fields",
      status: phaseStatus({ active: intelligenceActive, complete: intelligenceDone && counts.failed === 0, partial: intelligenceDone && counts.failed > 0, queued: !extractionDone && runActive }),
      summary: `${counts.located} of ${counts.requirements || "unavailable"} requirement mappings have cited evidence`,
    },
    {
      key: "normalizing",
      icon: ListChecks,
      title: "Normalizing values",
      status: phaseStatus({ active: intelligenceActive, complete: intelligenceDone && counts.failed === 0, partial: intelligenceDone && counts.failed > 0, queued: !extractionDone && runActive }),
      summary: `${counts.facts} typed values normalized from vendor evidence`,
    },
    {
      key: "cross_checking",
      icon: ShieldAlert,
      title: "Cross-checking conflicts and gaps",
      status: phaseStatus({ active: intelligenceActive, complete: intelligenceDone && counts.failed === 0 && counts.contradictions + counts.missing === 0, partial: intelligenceDone && counts.failed > 0, attention: intelligenceDone && counts.failed === 0 && counts.contradictions + counts.missing > 0, queued: !extractionDone && runActive }),
      summary: `${counts.contradictions} contradictions · ${counts.missing} requirements not stated`,
    },
    {
      key: "scoring",
      icon: Scale,
      title: "Scoring against criteria",
      status: comparison
        ? comparisonFinished && !comparisonCurrent ? "attention" : jobStatusToIntelligenceStatus(comparison.run.status)
        : intelligenceDone
          ? comparisonReadyCount >= 2 ? "attention" as const : "unavailable" as const
          : "not_started" as const,
      summary: comparison
        ? `${comparison.run.completedParticipantCount} of ${comparison.run.participantCount} persisted vendor snapshots complete${comparisonFinished && !comparisonCurrent ? " · historical inputs" : ""}`
        : intelligenceDone
          ? comparisonReadyCount >= 2
            ? "Reviewer scorecards and critical evidence dispositions are required before ranking"
            : "Fewer than two responses survived extraction; scoring and ranking are unavailable"
          : "Starts only after evidence extraction and requirement mapping",
    },
  ];
  const overallStatus: IntelligenceStatus = comparisonFinished
    ? comparisonCurrent ? "complete" : "attention"
    : live
      ? "in_progress"
      : counts.failed > 0
        ? "partial"
        : intelligenceDone
          ? "attention"
          : "not_started";
  const overallProgress = comparison
    ? comparison.run.progress
    : phases.filter((phase) => ["complete", "partial", "attention"].includes(phase.status)).length / phases.length * 100;
  const facts = participants.flatMap((participant) => (participant.intelligence?.facts ?? []).flatMap((fact) => {
    const citation = fact.citations.find((item) => item.role === "supports");
    return citation && fact.normalizedValue ? [{ participant, fact, citation }] : [];
  }));
  const completedTimes = participants.flatMap((participant) => [
    ...participant.extraction.runs.flatMap((run) => run.completedAt ? [Date.parse(run.completedAt)] : []),
    ...(participant.intelligence?.run.completedAt ? [Date.parse(participant.intelligence.run.completedAt)] : []),
  ]).filter(Number.isFinite);
  const persistedEnd = comparison?.run.completedAt
    ? Date.parse(comparison.run.completedAt)
    : completedTimes.length
      ? Math.max(...completedTimes)
      : clock;
  const problemParticipants = participants.filter((participant) => participant.error || ["unreadable", "failed"].includes(participant.extraction.status) || participant.intelligence?.run.status === "failed");

  return (
    <section className={cn(intelligenceSurfaceClasses.card, "mt-5")} aria-labelledby="live-analysis-title">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">State A · Extraction</p>
          <h2 id="live-analysis-title" className="mt-2 text-2xl font-extrabold text-navy">Proposal analysis run</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray">
            Progress below comes from persisted extraction, fact-mapping, and comparison jobs. The page never advances a phase on a decorative timer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IntelligenceStatusChip status={overallStatus} />
          <span className={cn(intelligenceSurfaceClasses.chip, "gap-1.5 border-gray-border bg-gray-panel font-mono text-navy")}>
            <Clock3 size={14} aria-hidden="true" /> {elapsedLabel((live ? clock : persistedEnd) - startedAt)}
          </span>
          <span className={cn(intelligenceSurfaceClasses.chip, "border-gray-border bg-white font-mono text-navy")}>{counts.failed} failed items</span>
        </div>
      </header>

      <div className="mt-5" role="progressbar" aria-label="Proposal analysis progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(overallProgress)}>
        <div className="h-2 overflow-hidden rounded-full bg-gray-border"><div className="h-full bg-brand" style={{ width: `${Math.max(0, Math.min(100, overallProgress))}%` }} /></div>
        <p className="mt-1 text-right font-mono text-xs font-bold text-gray">{Math.round(overallProgress)}%</p>
      </div>

      {initialParticipants.length < 2 && (
        <div className={cn(intelligenceSurfaceClasses.block, "mt-5 flex items-start gap-3 bg-gray-panel")} role="alert">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-navy" aria-hidden="true" />
          <p className="text-sm text-gray">At least two versioned responses are required. Return to responses and invite another vendor.</p>
        </div>
      )}

      <ol className="mt-5 space-y-3">
        {phases.map((phase, index) => (
          <li key={phase.key} className={intelligenceSurfaceClasses.block}>
            <details>
              <summary className="cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                <span className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex min-w-0 items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gray-panel text-brand-dark"><phase.icon size={17} aria-hidden="true" /></span>
                    <span><span className="block text-sm font-extrabold text-navy">{index + 1}. {phase.title}</span><span className="mt-1 block font-mono text-xs text-gray">{phase.summary}</span></span>
                  </span>
                  <IntelligenceStatusChip status={phase.status} />
                </span>
              </summary>
              <div className="mt-4 border-t border-gray-border pt-4">
                {phase.key === "reading" && participants.map((participant) => (
                  <div key={participant.responseId} className="mb-3 last:mb-0">
                    <p className="text-xs font-extrabold text-navy">{participant.vendorLabel}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {participant.extraction.runs.length > 0 ? participant.extraction.runs.map((run) => (
                        <span key={run.runId} className={cn(intelligenceSurfaceClasses.chip, "gap-1.5 border-gray-border bg-gray-panel font-mono text-gray")}>
                          {run.method ? label(run.method) : "Extraction"} · {run.sourceLabel} · {run.pageCount} pages · {label(run.status)}
                        </span>
                      )) : participant.documentNames.map((name) => (
                        <span key={name} className={cn(intelligenceSurfaceClasses.chip, "border-gray-border bg-gray-panel font-mono text-gray")}>{name} · Waiting</span>
                      ))}
                    </div>
                  </div>
                ))}
                {phase.key !== "reading" && (
                  <div className="flex flex-wrap gap-2">
                    {phase.key !== "scoring" && participants.flatMap((participant) => participant.intelligence ? [{ participant, run: participant.intelligence.run }] : []).map(({ participant, run }) => (
                      <span key={`${participant.responseId}-${run.runId}`} className={cn(intelligenceSurfaceClasses.chip, "border-gray-border bg-gray-panel font-mono text-gray")}>
                        Fact mapping · {participant.vendorLabel} · {run.factCount} facts · {label(run.status)}
                      </span>
                    ))}
                    {Object.values(jobs).filter((item) => phase.key !== "scoring" && item.kind === "intelligence").map((item) => (
                      <span key={item.jobId} className={cn(intelligenceSurfaceClasses.chip, "border-gray-border bg-gray-panel font-mono text-gray")}>
                        {item.job ? label(item.job.progressStage ?? item.job.type) : "Loading job"} · {item.job?.progress ?? 0}% · {item.job ? label(item.job.status) : "Queued"}
                      </span>
                    ))}
                    {phase.key === "scoring" && comparison?.jobs.map((job) => <span key={job.key} className={cn(intelligenceSurfaceClasses.chip, "border-gray-border bg-gray-panel font-mono text-gray")}>{label(job.type)} · {label(job.status)}</span>)}
                    {phase.key === "scoring" && !comparison?.jobs.length && <span className={cn(intelligenceSurfaceClasses.chip, "border-gray-border bg-gray-panel text-gray")}>Human scorecards · {comparison ? label(comparison.run.status) : "Not started"}</span>}
                    {phase.key !== "scoring" && participants.every((participant) => !participant.intelligence) && Object.values(jobs).filter((item) => item.kind === "intelligence").length === 0 && <span className="text-xs text-gray">No persisted operation has started for this phase.</span>}
                  </div>
                )}
              </div>
            </details>
          </li>
        ))}
      </ol>

      {problemParticipants.length > 0 && (
        <div className={cn(intelligenceSurfaceClasses.block, "mt-5 bg-gray-panel")} role="alert">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-navy">Items requiring action</h3>
              <p className="mt-1 text-xs leading-5 text-gray">
                {problemParticipants.some((participant) => !readableExtraction.has(participant.extraction.status))
                  ? "Some responses could not be prepared. Retry the failed extraction; already uploaded files will be reused when available."
                  : "Document reading is complete. Retry only the failed requirement-mapping step; files do not need to be uploaded again."}
              </p>
            </div>
            {problemParticipants.length > 1 && (
              <button
                type="button"
                disabled={problemParticipants.some((participant) => retryingParticipants.has(participant.responseId))}
                onClick={() => void Promise.all(problemParticipants.map((participant) => retryParticipant(participant)))}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs font-extrabold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <RotateCcw size={14} aria-hidden="true" />Retry all failed steps
              </button>
            )}
          </div>
          <ul className="mt-3 space-y-3">
            {problemParticipants.map((participant) => <li key={participant.responseId} className={cn(intelligenceSurfaceClasses.block, "bg-white")}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-extrabold text-navy">{participant.vendorLabel}</p><p className="mt-1 text-sm leading-6 text-gray">{intelligenceFailureMessage(participant)}</p><ul className="mt-2 space-y-1 font-mono text-xs text-gray">{participant.extraction.runs.flatMap((run) => [<li key={`${run.runId}-status`}>{run.sourceLabel} · {label(run.status)}</li>, ...run.warnings.map((warning, index) => <li key={`${run.runId}-warning-${index}`}>{run.sourceLabel} · {label(warning.code)} · {warning.message}</li>)])}{participant.extraction.runs.length === 0 && participant.documentNames.map((name) => <li key={name}>{name} · no extraction result</li>)}</ul></div><button type="button" disabled={retryingParticipants.has(participant.responseId)} onClick={() => void retryParticipant(participant)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-border px-4 text-xs font-extrabold text-navy disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"><RotateCcw size={14} className={retryingParticipants.has(participant.responseId) ? "animate-spin" : undefined} aria-hidden="true" />{retryingParticipants.has(participant.responseId) ? "Retrying…" : `Retry ${readableExtraction.has(participant.extraction.status) ? "requirement mapping" : "extraction"}`}</button></div></li>)}
          </ul>
        </div>
      )}

      {facts.length > 0 && (
        <details className={cn(intelligenceSurfaceClasses.block, "mt-6")}>
          <summary className="cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <span className="flex items-end justify-between gap-3"><span><span id="grounded-values-title" className="block text-lg font-extrabold text-navy">Grounded extracted values</span><span className="mt-1 block text-xs text-gray">Every value keeps the exact vendor source and locator returned by the backend.</span></span><span className="font-mono text-xs text-gray">{facts.length} values</span></span>
          </summary>
          <div className="mt-4 grid gap-3 border-t border-gray-border pt-4 sm:grid-cols-2 xl:grid-cols-3">
            {facts.map(({ participant, fact, citation }) => (
              <div key={`${participant.responseId}-${fact.factId}`} className={cn(intelligenceSurfaceClasses.block, "bg-gray-panel")}>
                <p className="text-xs font-bold text-gray">{participant.vendorLabel} · {label(fact.factType)}</p>
                <p className="mt-2 break-words font-mono text-sm font-extrabold text-navy">{fact.normalizedValue}</p>
                <details className="mt-3 text-xs text-gray"><summary className="cursor-pointer font-bold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">View source</summary><div className="mt-2 border-l-2 border-brand pl-3"><p className="font-mono font-semibold text-navy">{citation.sourceLabel}</p><p className="mt-1 font-mono">{locatorLabel(citation.locator)}</p><p className="mt-2 line-clamp-5 leading-5">{citation.content}</p></div></details>
              </div>
            ))}
          </div>
        </details>
      )}

      {!comparisonFinished && !live && initialParticipants.length >= 2 && !intelligenceDone && (
        <button type="button" onClick={() => setRunActive(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
          <CheckSquare size={16} aria-hidden="true" /> Run extraction and mapping
        </button>
      )}
    </section>
  );
}
