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

const circleClass = (isActive: boolean, isCompleted: boolean): string => {
  const base = "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-all duration-200";
  if (isCompleted) return `${base} border-[#087f69] bg-[#087f69] text-white shadow-[0_3px_9px_rgba(8,127,105,0.18)]`;
  if (isActive)    return `${base} border-[#0069a0] bg-[#0069a0] text-white shadow-[0_0_0_3px_rgba(0,105,160,0.11),0_4px_11px_rgba(0,105,160,0.2)]`;
  return `${base} border-[#dce3e8] bg-white text-[#566a78] shadow-sm`;
};

const labelClass = (isActive: boolean, isCompleted: boolean): string => {
  if (isCompleted) return "text-[12px] font-bold leading-4 text-[#087f69]";
  if (isActive)    return "text-[12px] font-bold leading-4 text-[#172b3a]";
  return "text-[12px] font-semibold leading-4 text-[#31445a]";
};

const subClass = (isActive: boolean, isCompleted: boolean): string => {
  if (isCompleted) return "mt-0.5 text-[11px] leading-4 text-[#087f69]";
  if (isActive)    return "mt-0.5 text-[11px] leading-4 text-[#566a78]";
  return "mt-0.5 text-[11px] leading-4 text-[#687782]";
};

const lineClass = (isCompleted: boolean, isActive: boolean): string => {
  const base = "pointer-events-none absolute left-6 top-1/2 z-[1] hidden h-[calc(100%+0.25rem)] w-px transition-colors duration-200 @min-[1000px]:block";
  if (isCompleted) return `${base} bg-[#49cfa4]`;
  if (isActive)    return `${base} bg-[#8ac9ed]`;
  return `${base} bg-[#dfe6ea]`;
};

const ProcessList = ({
  activeStep = 1,
  hideStepIds = [],
  onStepChange,
  completedStepIds,
  mode = "advanced",
  autosaveStatus,
  autosaveError = false,
}: {
  activeStep?: number;
  hideStepIds?: number[];
  onStepChange?: (step: number) => void;
  /** Steps whose required fields are actually filled. Omit for positional. */
  completedStepIds?: number[];
  mode?: ProposalExperienceMode;
  autosaveStatus?: string;
  autosaveError?: boolean;
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
    <aside data-testid="proposal-process-list" className="w-full overflow-hidden rounded-2xl border border-[#dfe7ec] bg-[#fbfdfe] px-3 py-3 font-sans shadow-[0_6px_20px_rgba(15,42,67,0.04)] sm:px-4 @min-[1000px]:max-h-[calc(100vh-1.5rem)] @min-[1000px]:px-3.5 @min-[1000px]:py-4 @min-[1000px]:shadow-[-8px_0_24px_rgba(15,42,67,0.02)]">
      <div className="mb-2 flex items-start justify-between gap-2 px-0.5 @min-[1000px]:mb-2.5">
        <div className="min-w-0">
          <p className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.17em] text-[#566a78]">
            Workflow sections
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-[#687782]">Select any section to review or edit.</p>
        </div>
        {autosaveStatus && (
          <p
            role="status"
            aria-live="polite"
            className={`shrink-0 text-right text-[10px] leading-4 ${autosaveError ? "text-red-600" : "text-[#566a78]"}`}
          >
            {autosaveStatus}
          </p>
        )}
      </div>

      <div data-testid="proposal-step-scroller" className="relative flex snap-x snap-mandatory gap-1 overflow-x-auto rounded-xl border border-[#e7edf1] bg-white/70 p-1 pb-2 [scrollbar-width:thin] @min-[1000px]:max-h-[calc(100vh-5.75rem)] @min-[1000px]:flex-col @min-[1000px]:overflow-x-hidden @min-[1000px]:overflow-y-auto @min-[1000px]:border-transparent @min-[1000px]:bg-transparent @min-[1000px]:p-0 @min-[1000px]:pr-0.5">
        {badgedSteps.map((step, index) => {
          const isActive    = activeStep === step.id;
          // A green check reads as "this is done". Derived from position alone,
          // jumping to the last page marked every earlier step complete —
          // including steps whose required fields were still empty.
          const isCompleted = completedStepIds
            ? completedStepIds.includes(step.id) && !isActive
            : activeStep > step.id;
          const isLast      = index === badgedSteps.length - 1;
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
                aria-label={`Go to ${step.label}${isCompleted ? ", complete" : ""}`}
                disabled={!isNavigable}
                onClick={() => onStepChange?.(step.id)}
                className={`group flex min-h-[52px] flex-1 items-center gap-2.5 rounded-xl border px-2 py-1.5 text-left transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none ${
                  isActive ? "border-[#b9def2] bg-white shadow-[0_4px_14px_rgba(0,105,160,0.09)]" : "border-transparent"}
                  ${
                  isNavigable
                    ? "cursor-pointer hover:bg-white hover:shadow-[0_2px_10px_rgba(15,42,67,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0069a0]"
                    : "cursor-default"
                }`}
              >
                <div className={circleClass(isActive, isCompleted)}>
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : step.badge}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={labelClass(isActive, isCompleted)}>{step.label}</span>
                  <span className={subClass(isActive, isCompleted)}>{step.sub}</span>
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
