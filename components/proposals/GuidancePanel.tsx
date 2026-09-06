"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  generateGuidanceAction,
  getLatestGuidanceAction,
  type GuidanceFinding,
  type GuidanceReport,
  type GuidanceSeverity,
} from "@/app/actions/guidance";
import { proposalFieldLabel } from "@/lib/proposals/proposalFieldLabel";
import {
  isStandaloneVideoRecordingPath,
  STANDALONE_VIDEO_RECORDING_STEP_ENABLED,
  STANDALONE_VIDEO_RECORDING_STEP_ID,
} from "@/lib/proposals/proposalExperience";
import { formatAppDateTime } from "@/lib/dateFormat";

const severityOrder: GuidanceSeverity[] = ["blocking", "warning", "info"];
const severityPresentation: Record<
  GuidanceSeverity,
  {
    heading: string;
    container: string;
    icon: typeof CircleAlert;
    iconClass: string;
  }
> = {
  blocking: {
    heading: "Must fix before publishing",
    container: "border-red-200 bg-red-50/70",
    icon: CircleAlert,
    iconClass: "text-red-700",
  },
  warning: {
    heading: "Worth reviewing",
    container: "border-amber-200 bg-amber-50/70",
    icon: AlertTriangle,
    iconClass: "text-amber-700",
  },
  info: {
    heading: "Helpful to know",
    container: "border-slate-200 bg-slate-50",
    icon: Info,
    iconClass: "text-slate-600",
  },
};

export const stepForPath = (path: string) => {
  const isStandaloneRecordingPath = isStandaloneVideoRecordingPath(path);
  if (isStandaloneRecordingPath && !STANDALONE_VIDEO_RECORDING_STEP_ENABLED) {
    return undefined;
  }
  if (path.includes("/event/")) return { step: 1, label: "Event Overview" };
  if (path.includes("/venueSchedule/"))
    return { step: 2, label: "Venue & Schedule" };
  if (path.includes("/roomByRoom/"))
    return { step: 3, label: "Room Specifications" };
  if (path.includes("/hybridVirtual/"))
    return { step: 4, label: "Hybrid & Virtual" };
  if (path.includes("/contentCreative/"))
    return { step: 5, label: "Content & Creative" };
  if (isStandaloneRecordingPath)
    return {
      step: STANDALONE_VIDEO_RECORDING_STEP_ID,
      label: "Video Recording",
    };
  if (path.includes("/venue/")) return { step: 7, label: "Venue & Technical" };
  if (path.includes("/budget/"))
    return { step: 8, label: "Investment & Evaluation" };
  if (path.includes("/uploads/"))
    return { step: 9, label: "Uploads & Co-Vendors" };
  if (path.includes("/contact/"))
    return { step: 10, label: "Contact & Submit" };
  return undefined;
};

export const isRetiredStandaloneRecordingFinding = (
  finding: GuidanceFinding,
) => {
  if (STANDALONE_VIDEO_RECORDING_STEP_ENABLED) return false;

  const nonemptyPaths = finding.paths.filter((path) => path.trim().length > 0);
  return (
    nonemptyPaths.length > 0 &&
    nonemptyPaths.some(isStandaloneVideoRecordingPath)
  );
};

const stepForFinding = (finding: GuidanceFinding) => {
  const message = finding.message.toLowerCase();
  if (message.includes("room-by-room"))
    return { step: 3, label: "Room Specifications" };
  if (message.includes("hybrid") || message.includes("virtual"))
    return { step: 4, label: "Hybrid & Virtual" };
  if (message.includes("content") || message.includes("creative"))
    return { step: 5, label: "Content & Creative" };
  if (message.includes("video") || message.includes("recording"))
    return STANDALONE_VIDEO_RECORDING_STEP_ENABLED
      ? {
          step: STANDALONE_VIDEO_RECORDING_STEP_ID,
          label: "Video Recording",
        }
      : undefined;
  if (message.includes("venue technical"))
    return { step: 7, label: "Venue & Technical" };
  if (message.includes("budget") || message.includes("timeline"))
    return { step: 8, label: "Investment & Evaluation" };
  return undefined;
};

const percent = (score: number) => Math.round(score * 100);
const scopeLabel = (value: string) => {
  const label = value.replace(/_/g, " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const friendlyNextStep = (finding: GuidanceFinding) => {
  if (!finding.suggestedNextStep) return undefined;
  return finding.paths.reduce((copy, path) => {
    const fieldKey = path.split("/").filter(Boolean).pop() ?? path;
    return copy.replaceAll(fieldKey, proposalFieldLabel(path).toLowerCase());
  }, finding.suggestedNextStep);
};

const Bar = ({ score, tone }: { score: number; tone: string }) => (
  <div
    aria-hidden="true"
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
        .filter((destination): destination is NonNullable<typeof destination> =>
          Boolean(destination),
        )
        .map((destination) => [destination.step, destination]),
    ).values(),
  );
  const presentation = severityPresentation[finding.severity];
  const FindingIcon = presentation.icon;
  const nextStep = friendlyNextStep(finding);

  return (
    <li className={`rounded-xl border p-4 ${presentation.container}`}>
      <div className="flex items-start gap-3">
        <FindingIcon
          aria-hidden="true"
          className={`mt-0.5 size-5 shrink-0 ${presentation.iconClass}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-6 text-slate-900">
            {finding.message}
          </p>
          {finding.question && (
            <p className="mt-1 text-sm leading-5 text-slate-700">
              <span className="font-semibold">Confirm:</span> {finding.question}
            </p>
          )}
          {nextStep && (!onNavigateToStep || destinations.length === 0) && (
            <p className="mt-1 text-sm leading-5 text-slate-600">{nextStep}</p>
          )}
          {onNavigateToStep && destinations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {destinations.map((destination) => (
                <button
                  key={destination.step}
                  type="button"
                  onClick={() => onNavigateToStep(destination.step)}
                  className="rounded-lg border border-[#087f69]/25 bg-white px-3 py-1.5 text-xs font-semibold text-[#087f69] shadow-sm transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f69]"
                >
                  Update {destination.label}
                </button>
              ))}
            </div>
          )}
          {(finding.paths.length > 0 || finding.scopeSeverity) && (
            <details className="group mt-3 text-xs text-slate-600">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-medium marker:hidden">
                <ChevronRight
                  aria-hidden="true"
                  className="size-3.5 transition-transform group-open:rotate-90"
                />
                Details involved
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5 pl-5">
                {finding.scopeSeverity && (
                  <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-1">
                    {scopeLabel(finding.scopeSeverity)}
                  </span>
                )}
                {finding.paths.map((path) => (
                  <span
                    key={path}
                    className="rounded-full border border-slate-200 bg-white/80 px-2 py-1"
                  >
                    {proposalFieldLabel(path)}
                  </span>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
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

  const visibleFindings = (report?.findings ?? []).filter(
    (finding) => !isRetiredStandaloneRecordingFinding(finding),
  );
  const grouped = severityOrder
    .map((severity) => ({
      severity,
      findings: visibleFindings.filter(
        (finding) => finding.severity === severity,
      ),
    }))
    .filter((group) => group.findings.length > 0);
  const priorityGroups = grouped.filter((group) => group.severity !== "info");
  const helpfulFindings = grouped.find(
    (group) => group.severity === "info",
  )?.findings;
  const blockingCount = visibleFindings.filter(
    (finding) => finding.severity === "blocking",
  ).length;
  const warningCount = visibleFindings.filter(
    (finding) => finding.severity === "warning",
  ).length;
  const priorityCount = blockingCount + warningCount;
  const readinessState = !report
    ? undefined
    : blockingCount > 0
      ? "Not ready to publish"
      : warningCount > 0 || report.overallCompleteness < 0.8
        ? "Needs more information"
        : "Ready for final review";

  return (
    <section
      aria-labelledby="guidance-panel-title"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h3
              id="guidance-panel-title"
              className="text-lg font-semibold text-slate-900"
            >
              Proposal readiness
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              See what is ready, what needs attention, and where to update it
              before sending the proposal to vendors.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => void run()}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" className="size-4" />
          )}
          {running ? "Checking…" : report ? "Check again" : "Check readiness"}
        </button>
      </div>

      <div className="p-5">
        {loading && (
          <p role="status" className="text-sm text-slate-600">
            Loading your latest readiness check…
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {report?.stale && (
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            Your proposal changed after this check. Run it again to see the
            latest guidance.
          </div>
        )}
        {!loading && !report && !error && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
            <CheckCircle2
              aria-hidden="true"
              className="mx-auto size-7 text-slate-400"
            />
            <p className="mt-2 text-sm font-semibold text-slate-800">
              Check whether your proposal is ready for vendors
            </p>
            <p className="mt-1 text-sm text-slate-600">
              You will get a short list of the most useful next actions.
            </p>
          </div>
        )}

        {report && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)]">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Overall readiness
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {readinessState}
                    </p>
                  </div>
                  <p className="text-3xl font-bold tracking-tight text-slate-900">
                    {percent(report.overallCompleteness)}%
                  </p>
                </div>
                <div className="mt-3">
                  <Bar score={report.overallCompleteness} tone="bg-[#087f69]" />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Based on the details vendors need to understand and quote the
                  work.
                </p>
              </div>
              <div
                className={`rounded-xl border p-4 ${blockingCount > 0 ? "border-red-200 bg-red-50" : priorityCount > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Next focus
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {priorityCount}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {priorityCount === 1 ? "priority action" : "priority actions"}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {blockingCount > 0
                    ? `${blockingCount} must be fixed before publishing.`
                    : priorityCount > 0
                      ? "Review these before sending to vendors."
                      : "No urgent issues were found."}
                </p>
              </div>
            </div>

            {(report.summary?.eventName ||
              report.summary?.eventFormat ||
              report.summary?.dateRange ||
              report.summary?.attendeeCount != null ||
              report.summary?.roomCount != null) && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <span className="mr-1 font-semibold text-slate-800">
                  {report.summary?.eventName ?? "Current proposal"}
                </span>
                {report.summary?.eventFormat && (
                  <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                    {report.summary.eventFormat}
                  </span>
                )}
                {report.summary?.dateRange && (
                  <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                    {report.summary.dateRange}
                  </span>
                )}
                {report.summary?.attendeeCount != null && (
                  <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                    {report.summary.attendeeCount.toLocaleString()} attendees
                  </span>
                )}
                {report.summary?.roomCount != null && (
                  <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                    {report.summary.roomCount} rooms
                  </span>
                )}
              </div>
            )}

            <div>
              <h4 className="text-base font-semibold text-slate-900">
                {priorityCount > 0
                  ? "Focus on these next"
                  : "No urgent changes"}
              </h4>
              <p className="mt-1 text-sm text-slate-600">
                {priorityCount > 0
                  ? "Start with the items below. Each button takes you to the right part of the proposal."
                  : "Your proposal has no blocking or warning-level findings."}
              </p>
              {priorityCount === 0 ? (
                <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  No urgent issues were found. Review the optional details below
                  before publishing.
                </p>
              ) : (
                <div className="mt-3 space-y-4">
                  {priorityGroups.map((group) => (
                    <div key={group.severity}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {severityPresentation[group.severity].heading} ·{" "}
                        {group.findings.length}
                      </p>
                      <ul className="space-y-2">
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
              )}
            </div>

            <details className="group rounded-xl border border-slate-200 bg-slate-50/60">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 marker:hidden">
                <span>More readiness details</span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-open:rotate-90"
                />
              </summary>
              <div className="space-y-5 border-t border-slate-200 p-4">
                {report.completeness.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-slate-900">
                      Progress by section
                    </h5>
                    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                      {report.completeness.map((section) => (
                        <li
                          key={section.section}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-slate-700">
                              {section.label}
                            </span>
                            <span className="text-xs text-slate-500">
                              {section.filled} of {section.total}
                            </span>
                          </div>
                          <div className="mt-2">
                            <Bar score={section.score} tone="bg-cyan-600" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.roomSchedule && report.roomSchedule.roomCount > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-sm font-semibold text-slate-900">
                          Room and schedule check
                        </h5>
                        <p className="mt-1 text-xs text-slate-600">
                          {report.roomSchedule.roomCount} room
                          {report.roomSchedule.roomCount === 1 ? "" : "s"}{" "}
                          reviewed
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize text-slate-600">
                        {report.roomSchedule.confidence} confidence
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">
                        {report.roomSchedule.scheduleConflictIds.length +
                          report.roomSchedule.crewConflictIds.length}{" "}
                        conflicts
                      </span>
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                        {report.roomSchedule.missingInputIds.length +
                          report.roomSchedule.roomLevelGapIds.length}{" "}
                        missing details
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                        {
                          report.roomSchedule.reusableEquipmentOpportunityIds
                            .length
                        }{" "}
                        {report.roomSchedule.reusableEquipmentOpportunityIds
                          .length === 1
                          ? "reuse opportunity"
                          : "reuse opportunities"}
                      </span>
                    </div>
                  </div>
                )}

                {helpfulFindings && helpfulFindings.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-slate-900">
                      Helpful checks
                    </h5>
                    <ul className="mt-2 space-y-2">
                      {helpfulFindings.map((finding) => (
                        <FindingItem
                          key={`${finding.code}-${finding.paths.join(",")}`}
                          finding={finding}
                          onNavigateToStep={onNavigateToStep}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>

            {report.createdAt && (
              <p className="text-xs text-slate-500">
                Last checked {formatAppDateTime(report.createdAt)}.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
