"use client";
import { useEffect, useState } from "react";
import {
  generateGuidanceAction,
  getLatestGuidanceAction,
  type GuidanceFinding,
  type GuidanceReport,
  type GuidanceSeverity,
} from "@/app/actions/guidance";

const severityOrder: GuidanceSeverity[] = ["blocking", "warning", "info"];
const severityPresentation: Record<
  GuidanceSeverity,
  { heading: string; container: string; badge: string }
> = {
  blocking: {
    heading: "Must fix before publishing",
    container: "border-red-200 bg-red-50",
    badge: "bg-red-100 text-red-800",
  },
  warning: {
    heading: "Worth reviewing",
    container: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
  },
  info: {
    heading: "Helpful to know",
    container: "border-slate-200 bg-slate-50",
    badge: "bg-slate-100 text-slate-700",
  },
};

// "/content/venueSchedule/loadInDate" -> "load in date"
const humanizePath = (path: string) => {
  const segment = path.split("/").filter(Boolean).pop() ?? path;
  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
};

const stepForPath = (path: string) => {
  if (path.includes("/event/")) return { step: 1, label: "Event Overview" };
  if (path.includes("/venueSchedule/")) return { step: 2, label: "Venue & Schedule" };
  if (path.includes("/roomByRoom/")) return { step: 3, label: "Room Specifications" };
  if (path.includes("/hybridVirtual/")) return { step: 4, label: "Hybrid & Virtual" };
  if (path.includes("/contentCreative/")) return { step: 5, label: "Content & Creative" };
  if (path.includes("/videoRecordingStep/")) return { step: 6, label: "Video Recording" };
  if (path.includes("/venue/")) return { step: 7, label: "Venue & Technical" };
  if (path.includes("/budget/")) return { step: 8, label: "Investment & Evaluation" };
  if (path.includes("/uploads/")) return { step: 9, label: "Uploads & Co-Vendors" };
  if (path.includes("/contact/")) return { step: 10, label: "Contact & Submit" };
  return undefined;
};

const stepForFinding = (finding: GuidanceFinding) => {
  const message = finding.message.toLowerCase();
  if (message.includes("room-by-room")) return { step: 3, label: "Room Specifications" };
  if (message.includes("hybrid") || message.includes("virtual"))
    return { step: 4, label: "Hybrid & Virtual" };
  if (message.includes("content") || message.includes("creative"))
    return { step: 5, label: "Content & Creative" };
  if (message.includes("video") || message.includes("recording"))
    return { step: 6, label: "Video Recording" };
  if (message.includes("venue technical"))
    return { step: 7, label: "Venue & Technical" };
  if (message.includes("budget") || message.includes("timeline"))
    return { step: 8, label: "Investment & Evaluation" };
  return undefined;
};

const percent = (score: number) => Math.round(score * 100);

const Bar = ({ score, tone }: { score: number; tone: string }) => (
  <div
    aria-hidden
    className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
  >
    <div
      className={`h-full rounded-full ${tone}`}
      style={{ width: `${percent(score)}%` }}
    />
  </div>
);

const FindingItem = ({
  finding,
  onNavigateToStep,
}: {
  finding: GuidanceFinding;
  onNavigateToStep?: (step: number) => void;
}) => {
  const pathDestinations = finding.paths.map(stepForPath);
  const inferredDestination = stepForFinding(finding);
  const destinations = Array.from(
    new Map(
      [...pathDestinations, inferredDestination]
        .filter((destination): destination is NonNullable<typeof destination> => Boolean(destination))
        .map((destination) => [destination.step, destination]),
    ).values(),
  );

  return (
    <li
      className={`rounded-lg border p-3 ${severityPresentation[finding.severity].container}`}
    >
      <p className="text-sm text-slate-800">{finding.message}</p>
      {finding.paths.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {finding.paths.map((path) => (
            <span
              key={path}
              className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600"
            >
              {humanizePath(path)}
            </span>
          ))}
          {onNavigateToStep &&
            destinations.map((destination) => (
              <button
                key={destination.step}
                type="button"
                onClick={() => onNavigateToStep(destination.step)}
                className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-[#087f69] shadow-sm ring-1 ring-inset ring-[#087f69]/30 hover:bg-emerald-50"
              >
                Fix in {destination.label}
              </button>
            ))}
        </div>
      )}
    </li>
  );
};

export default function GuidancePanel({
  proposalId,
  onNavigateToStep,
}: {
  proposalId: string;
  onNavigateToStep?: (step: number) => void;
}) {
  const [report, setReport] = useState<GuidanceReport>();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void getLatestGuidanceAction(proposalId).then((result) => {
      if (!active) return;
      setLoading(false);
      // No report yet is a normal empty state, not an error.
      if (result.success) setReport(result.data);
      else if (result.code !== "GUIDANCE_NOT_FOUND") setError(result.message);
    });
    return () => {
      active = false;
    };
  }, [proposalId]);

  const run = async () => {
    setRunning(true);
    setError(undefined);
    const result = await generateGuidanceAction(proposalId);
    setRunning(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setReport(result.data);
  };

  const grouped = severityOrder
    .map((severity) => ({
      severity,
      findings: (report?.findings ?? []).filter(
        (finding) => finding.severity === severity,
      ),
    }))
    .filter((group) => group.findings.length > 0);

  return (
    <section
      aria-labelledby="guidance-panel-title"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <h3 id="guidance-panel-title" className="text-lg font-semibold">
        Proposal readiness check
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        See how complete your proposal is and catch schedule, production, and
        budget issues before vendors do.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={running}
          onClick={() => void run()}
          className="flex items-center gap-2 rounded-lg bg-[#087f69] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running && (
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
            />
          )}
          {running ? "Checking…" : report ? "Refresh readiness" : "Run readiness check"}
        </button>
        {loading && (
          <span role="status" className="text-sm text-slate-600">
            Loading the latest check…
          </span>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {!loading && !report && !error && (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Run the readiness check to see completeness and risk findings.
        </p>
      )}
      {report && (
        <div className="mt-5 space-y-5">
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-slate-900">
                Overall completeness
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {percent(report.overallCompleteness)}%
              </p>
            </div>
            <Bar score={report.overallCompleteness} tone="bg-[#087f69]" />
          </div>
          {report.completeness.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                By section
              </h4>
              <ul className="mt-2 space-y-2">
                {report.completeness.map((section) => (
                  <li key={section.section}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{section.label}</span>
                      <span className="text-xs text-slate-500">
                        {section.filled} of {section.total} answered
                      </span>
                    </div>
                    <Bar score={section.score} tone="bg-cyan-600" />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Findings ({report.findings.length})
            </h4>
            {report.findings.length === 0 && (
              <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                No issues found. Your proposal fields look consistent.
              </p>
            )}
            {grouped.map((group) => (
              <div key={group.severity} className="mt-3">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <span
                    className={`rounded-full px-2 py-0.5 ${severityPresentation[group.severity].badge}`}
                  >
                    {group.findings.length}
                  </span>
                  {severityPresentation[group.severity].heading}
                </p>
                <ul className="mt-2 space-y-2">
                  {group.findings.map((finding) => (
                    <FindingItem
                      key={`${finding.code}-${finding.paths.join(",")}`}
                      finding={finding}
                      onNavigateToStep={onNavigateToStep}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            Deterministic checks based on your proposal fields — no
            AI-generated numbers. Updated{" "}
            {report.createdAt
              ? new Date(report.createdAt).toLocaleString()
              : ""}
          </p>
        </div>
      )}
    </section>
  );
}
