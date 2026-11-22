import { Check } from "lucide-react";
import type { ProposalExperienceMode } from "@/lib/proposals/proposalExperience";

interface Step {
  id: number;       // numeric id used for activeStep comparison
  label: string;
  sub: string;      // subtitle shown below the label
}

const steps: Step[] = [
  { id: 1, label: "Event Overview", sub: "Identity & narrative" },
  { id: 2, label: "Venue & Schedule", sub: "Dates, rooms, union" },
  { id: 3, label: "Room Specifications", sub: "AV per room" },
  { id: 4, label: "Hybrid & Virtual", sub: "Conditional" },
  { id: 5, label: "Content & Creative", sub: "Ownership matrix" },
  { id: 6, label: "Video Recording", sub: "Recording & deliverables" },
  { id: 7, label: "Venue & Technical", sub: "Power, rigging, COI" },
  { id: 8, label: "Investment & Evaluation", sub: "Scoring & timeline" },
  { id: 9, label: "Uploads & Co-Vendors", sub: "Files & partners" },
  { id: 10, label: "Contact & Publish", sub: "Review and publish" },
];

const circleClass = (isActive: boolean, isCompleted: boolean, notApplicable: boolean): string => {
  const base = "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-200";
  if (notApplicable) return `${base} border-dashed border-line-strong bg-surface-muted text-muted`;
  if (isCompleted) return `${base} border-success bg-success text-on-action`;
  if (isActive)    return `${base} border-action bg-action text-on-action shadow-card`;
  return `${base} border-line-strong bg-surface text-body`;
};

const labelClass = (isActive: boolean, isCompleted: boolean, notApplicable: boolean): string => {
  if (notApplicable) return "text-[13px] font-semibold leading-[18px] text-muted";
  if (isCompleted)   return "text-[13px] font-bold leading-[18px] text-success-strong";
  if (isActive)      return "text-[13px] font-bold leading-[18px] text-heading";
  return "text-[13px] font-semibold leading-[18px] text-body";
};

const subClass = (isCompleted: boolean, notApplicable: boolean): string => {
  if (isCompleted && !notApplicable) return "mt-0.5 text-xs leading-[17px] text-success-strong";
  return "mt-0.5 text-xs leading-[17px] text-muted";
};

const lineClass = (isCompleted: boolean, isActive: boolean): string => {
  const base = "pointer-events-none absolute left-6 top-1/2 z-[1] hidden h-[calc(100%+0.25rem)] w-px transition-colors duration-200 @min-[1000px]:block";
  if (isCompleted) return `${base} bg-success/60`;
  if (isActive)    return `${base} bg-action/50`;
  return `${base} bg-line`;
};

const ProcessList = ({
  activeStep = 1,
  hideStepIds = [],
  notApplicableStepIds = [],
  onStepChange,
  completedStepIds,
  mode = "advanced",
  autosaveStatus,
  autosaveError = false,
  onAutosaveRetry,
}: {
  activeStep?: number;
  hideStepIds?: number[];
  /** Sections that are listed but need nothing from the planner (e.g. Hybrid & Virtual on an in-person event). */
  notApplicableStepIds?: number[];
  onStepChange?: (step: number) => void;
  /** Steps whose required fields are actually filled. Omit for positional. */
  completedStepIds?: number[];
  mode?: ProposalExperienceMode;
  autosaveStatus?: string;
  autosaveError?: boolean;
  /** Shown as a Retry button next to a failed autosave. */
  onAutosaveRetry?: () => void;
}) => {
  const visibleSteps = steps
    .filter((s) => !hideStepIds.includes(s.id))
    .map((step) => mode === "basic"
      ? ({
          ...step,
          label: step.id === 8 ? "Investment & Timeline" : step.label,
          sub: step.id === 1
            ? "Event essentials"
            : step.id === 2
              ? "Location details"
              : step.id === 3
                ? "Schedule & vendor guidance"
                : step.id === 8
                  ? "Budget & procurement"
                  : step.sub,
        })
      : step);
  const badgedSteps = visibleSteps.map((step, index) => ({
    ...step,
    badge: String(index + 1),
  }));

  return (
    <aside data-testid="proposal-process-list" className="w-full overflow-hidden rounded-2xl border border-line bg-surface px-3 py-3 font-sans shadow-card sm:px-4 @min-[1000px]:max-h-[calc(100vh-1.5rem)] @min-[1000px]:px-3.5 @min-[1000px]:py-4 @min-[1000px]:shadow-[-8px_0_24px_rgba(15,42,67,0.02)]">
      <div className="mb-2 flex items-start justify-between gap-2 px-0.5 @min-[1000px]:mb-2.5">
        <div className="min-w-0">
          <p className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] text-body">
            Workflow sections
          </p>
          <p className="mt-1 text-xs leading-4 text-muted">Select any section to review or edit.</p>
        </div>
        {autosaveStatus && (
          <p
            role="status"
            aria-live="polite"
            className={`shrink-0 text-right text-xs leading-4 ${autosaveError ? "text-danger-strong" : "text-body"}`}
          >
            {autosaveStatus}
          </p>
        )}
        {autosaveStatus && autosaveError && onAutosaveRetry && (
          <button
            type="button"
            onClick={onAutosaveRetry}
            className="shrink-0 rounded-md border border-danger-strong bg-surface px-2 py-0.5 text-xs font-semibold text-danger-strong hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Retry save
          </button>
        )}
      </div>

      <div data-testid="proposal-step-scroller" className="relative flex snap-x snap-mandatory gap-1 overflow-x-auto rounded-xl border border-line bg-surface-muted/70 p-1 pb-2 [scrollbar-width:thin] @min-[1000px]:max-h-[calc(100vh-5.75rem)] @min-[1000px]:flex-col @min-[1000px]:overflow-x-hidden @min-[1000px]:overflow-y-auto @min-[1000px]:border-transparent @min-[1000px]:bg-transparent @min-[1000px]:p-0 @min-[1000px]:pr-0.5">
        {badgedSteps.map((step, index) => {
          const isActive    = activeStep === step.id;
          // A green check reads as "this is done". Derived from position alone,
          // jumping to the last page marked every earlier step complete —
          // including steps whose required fields were still empty.
          const isCompleted = notApplicableStepIds.includes(step.id)
            ? false
            : completedStepIds
              ? completedStepIds.includes(step.id) && !isActive
              : activeStep > step.id;
          const isLast      = index === badgedSteps.length - 1;
          const notApplicable = notApplicableStepIds.includes(step.id);
          const isNavigable = typeof onStepChange === "function";

          return (
            <div key={step.id} className="relative flex min-w-[calc((100%-0.25rem)/2)] snap-start items-start min-[520px]:min-w-[calc((100%-0.5rem)/3)] @min-[1000px]:!min-w-0">
              {/* Connecting Line */}
              {!isLast && (
                <div
                  data-step-connector
                  aria-hidden="true"
                  className={lineClass(isCompleted, isActive)}
                />
              )}

              <button
                type="button"
                aria-current={isActive ? "step" : undefined}
                aria-label={`Go to ${step.label}${notApplicable ? ", not applicable" : isCompleted ? ", complete" : ""}`}
                disabled={!isNavigable}
                onClick={() => onStepChange?.(step.id)}
                className={`group flex min-h-[62px] flex-1 items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none ${
                  isActive ? "border-action/40 bg-surface shadow-card" : "border-transparent"}
                  ${
                  isNavigable
                    ? "cursor-pointer hover:bg-surface hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
                    : "cursor-default"
                }`}
              >
                <div className={circleClass(isActive, isCompleted, notApplicable)}>
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : step.badge}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={labelClass(isActive, isCompleted, notApplicable)}>{step.label}</span>
                  <span className={subClass(isCompleted, notApplicable)}>{notApplicable ? "Not applicable" : step.sub}</span>
                </div>
              </button>

              {/* Right-side checkmark for completed steps */}
              {/* {isCompleted && (
                <div className="ml-auto mt-0.5 shrink-0">
                  <CheckBadge />
                </div>
              )} */}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default ProcessList;
