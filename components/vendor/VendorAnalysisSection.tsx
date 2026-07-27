"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDurableJob } from "@/app/actions/durableJobs";
import {
  createVendorAnalysisJobAction,
  getLatestVendorAnalysisAction,
  type VendorAnalysisFinding,
  type VendorAnalysisEvidence,
  type VendorAnalysisResult,
} from "@/app/actions/vendorAnalysis";
import { nextPollDelay } from "@/lib/asyncOperations";

const storageKey = (responseId: string) => `rfpilot:vendor-analysis:${responseId}`;
const terminalStatuses = ["succeeded", "failed", "cancelled", "dead_letter"];

const failureMessages: Record<string, string> = {
  VENDOR_EVIDENCE_EMPTY:
    "This response has no analyzable text or scanned documents.",
};
const describeFailure = (safeErrorCode: string | null) =>
  failureMessages[safeErrorCode ?? ""] ??
  "The analysis could not be completed. You can run it again, or review the response manually.";

const verdictPresentation: Record<string, { label: string; chip: string }> = {
  addressed: { label: "Addressed", chip: "bg-emerald-100 text-emerald-800" },
  partial: { label: "Partial", chip: "bg-amber-100 text-amber-800" },
  missing: { label: "Missing", chip: "bg-red-100 text-red-800" },
  not_applicable: { label: "N/A", chip: "bg-slate-100 text-slate-600" },
};
const VerdictChip = ({ verdict }: { verdict: string | null }) => {
  const tone = verdictPresentation[verdict ?? ""] ?? {
    label: "Unrated",
    chip: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${tone.chip}`}>
      {tone.label}
    </span>
  );
};

/**
 * A finding's citations used to be ids like "vendor-fragment-3" that pointed
 * into an array living only for the run, so the reader saw the claim and never
 * its basis. The run now persists the cited fragments; this resolves them.
 */
type EvidenceIndex = Map<string, VendorAnalysisEvidence>;

const originLabel = (origin: string) =>
  origin === "message" ? "the vendor’s message" : origin.split("/").pop() || "an attached document";

const CitedEvidence = ({
  citations,
  evidence,
}: {
  citations: string[];
  evidence: EvidenceIndex;
}) => {
  const resolved = citations.flatMap((id) => {
    const item = evidence.get(id);
    return item ? [item] : [];
  });
  // Runs analyzed before the evidence table existed resolve to nothing. Showing
  // an empty "Show quoted text" would promise something that is not there.
  if (!resolved.length) return null;
  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-xs font-medium text-slate-500">
        Show the {resolved.length === 1 ? "quoted passage" : `${resolved.length} quoted passages`}
      </summary>
      <ul className="mt-1.5 space-y-1.5">
        {resolved.map((item) => (
          <li key={item.fragmentId} className="border-l-2 border-slate-300 pl-2.5">
            <p className="text-xs text-slate-500">From {originLabel(item.origin)}</p>
            <p className="whitespace-pre-wrap text-xs text-slate-700">{item.excerpt}</p>
          </li>
        ))}
      </ul>
    </details>
  );
};

const FlagCard = ({
  finding,
  evidence,
}: {
  finding: VendorAnalysisFinding;
  evidence: EvidenceIndex;
}) => (
  <li
    className={`rounded-lg border p-3 ${
      finding.kind === "pricing_flag"
        ? "border-amber-200 bg-amber-50"
        : "border-red-200 bg-red-50"
    }`}
  >
    <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
      {finding.kind === "pricing_flag" ? "Pricing flag" : "Production flag"}
      {finding.needsHumanReview && (
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
          Review recommended
        </span>
      )}
    </p>
    <p className="mt-1 text-sm text-slate-800">{finding.message}</p>
    {finding.requirementLabel && (
      <p className="mt-1 text-xs text-slate-500">Related to: {finding.requirementLabel}</p>
    )}
    <CitedEvidence citations={finding.citations} evidence={evidence} />
  </li>
);

function VendorAnalysisSectionInner({
  responseId,
  proposalId,
}: {
  responseId: string;
  proposalId: string;
}) {
  const [analysis, setAnalysis] = useState<VendorAnalysisResult>();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const tokenRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const loadLatest = useCallback(
    async (token: { cancelled: boolean }) => {
      const latest = await getLatestVendorAnalysisAction(responseId, proposalId);
      if (token.cancelled) return;
      setLoading(false);
      setAnalyzing(false);
      // No run yet is a normal empty state, not an error.
      if (latest.success) setAnalysis(latest.data);
      else if (latest.code !== "ANALYSIS_RUN_NOT_FOUND") setError(latest.message);
    },
    [responseId, proposalId],
  );

  const poll = useCallback(
    async (jobId: string, token: { cancelled: boolean }) => {
      setAnalyzing(true);
      for (let attempt = 0; attempt < 120; attempt++) {
        const job = await getDurableJob(jobId);
        if (token.cancelled) return;
        if (!job.success) {
          window.sessionStorage.removeItem(storageKey(responseId));
          setAnalyzing(false);
          setLoading(false);
          setError(job.message);
          return;
        }
        if (terminalStatuses.includes(job.data.status)) break;
        await new Promise((resolve) => setTimeout(resolve, nextPollDelay(attempt)));
        if (token.cancelled) return;
      }
      window.sessionStorage.removeItem(storageKey(responseId));
      // Failed runs still surface through the latest run's safe error code.
      await loadLatest(token);
    },
    [responseId, loadLatest],
  );

  useEffect(() => {
    const token = { cancelled: false };
    tokenRef.current = token;
    setAnalysis(undefined);
    setError(undefined);
    setLoading(true);
    setAnalyzing(false);
    setCopied(false);
    const pendingJobId = window.sessionStorage.getItem(storageKey(responseId));
    if (pendingJobId) void poll(pendingJobId, token);
    else void loadLatest(token);
    return () => {
      token.cancelled = true;
    };
  }, [responseId, loadLatest, poll]);

  const analyze = async () => {
    const token = tokenRef.current;
    setError(undefined);
    setAnalyzing(true);
    const created = await createVendorAnalysisJobAction(
      responseId,
      proposalId,
      crypto.randomUUID(),
    );
    if (token.cancelled) return;
    if (!created.success) {
      setAnalyzing(false);
      setError(created.message);
      return;
    }
    window.sessionStorage.setItem(storageKey(responseId), created.data.jobId);
    await poll(created.data.jobId, token);
  };

  const findings = analysis?.findings ?? [];
  const compliance = findings.filter((finding) => finding.kind === "compliance");
  const flags = findings.filter(
    (finding) => finding.kind === "pricing_flag" || finding.kind === "production_flag",
  );
  const questions = findings.filter((finding) => finding.kind === "vendor_question");
  // Built once per render: a finding cites by fragment id and every card
  // resolves against the same set.
  const evidenceIndex: EvidenceIndex = new Map(
    (analysis?.evidence ?? []).map((item) => [item.fragmentId, item]),
  );
  const verdictCount = (verdict: string) =>
    compliance.filter((finding) => finding.verdict === verdict).length;
  const failed = analysis && analysis.run.status !== "succeeded";

  const copyQuestions = async () => {
    try {
      await navigator.clipboard.writeText(
        questions.map((finding) => finding.message).join("\n"),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      aria-labelledby="vendor-analysis-title"
      className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
    >
      <h3 id="vendor-analysis-title" className="text-sm font-bold text-slate-900">
        AI analysis
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Checks this vendor response against your proposal requirements and
        flags anything worth a closer look. It never changes your proposal.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={analyzing || loading}
          onClick={() => void analyze()}
          className="flex items-center gap-2 rounded-xl bg-[#087f69] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {analyzing && (
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
            />
          )}
          {analyzing ? "Analyzing…" : analysis ? "Analyze again" : "Analyze this response"}
        </button>
        {loading && !analyzing && (
          <span role="status" className="text-sm text-slate-500">
            Loading the latest analysis…
          </span>
        )}
        {analyzing && (
          <span role="status" className="text-sm text-slate-500">
            This can take a minute. You can leave and come back.
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {!loading && !analyzing && !analysis && !error && (
        <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          No analysis has been run for this response yet.
        </p>
      )}

      {analysis && failed && (
        <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {describeFailure(analysis.run.safeErrorCode)}
        </p>
      )}

      {analysis && !failed && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              Compliance summary
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              {verdictCount("addressed")} addressed
            </span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              {verdictCount("partial")} partial
            </span>
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
              {verdictCount("missing")} missing
            </span>
            <span className="text-xs text-slate-500">
              of {analysis.run.requirementCount} requirements reviewed
            </span>
          </div>

          {compliance.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">Requirement</th>
                    <th className="py-2 pr-3">Verdict</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {compliance.map((finding) => (
                    <tr key={finding.ordinal} className="border-b align-top">
                      <td className="py-2 pr-3 font-medium text-slate-900">
                        {finding.requirementLabel ?? finding.requirementPath ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <VerdictChip verdict={finding.verdict} />
                        {finding.needsHumanReview && (
                          <span className="ml-1.5 inline-block rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                            Review recommended
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-slate-700">
                        {finding.message}
                        <CitedEvidence citations={finding.citations} evidence={evidenceIndex} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {flags.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Flags ({flags.length})
              </h4>
              <ul className="mt-2 space-y-2">
                {flags.map((finding) => (
                  <FlagCard key={finding.ordinal} finding={finding} evidence={evidenceIndex} />
                ))}
              </ul>
            </div>
          )}

          {questions.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  Questions to ask this vendor ({questions.length})
                </h4>
                <button
                  type="button"
                  onClick={() => void copyQuestions()}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {copied ? "Copied" : "Copy questions"}
                </button>
              </div>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                {questions.map((finding) => (
                  <li key={finding.ordinal} className="text-sm text-slate-700">
                    {finding.message}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            AI-assisted review of vendor-provided material — verify before
            relying on it commercially.
            {analysis.run.completedAt &&
              ` Completed ${new Date(analysis.run.completedAt).toLocaleString()}.`}
          </p>
        </div>
      )}
    </section>
  );
}

export default function VendorAnalysisSection(props: {
  responseId: string;
  proposalId: string;
}) {
  if (process.env.NEXT_PUBLIC_VENDOR_ANALYSIS_ENABLED !== "true") return null;
  return <VendorAnalysisSectionInner {...props} />;
}
