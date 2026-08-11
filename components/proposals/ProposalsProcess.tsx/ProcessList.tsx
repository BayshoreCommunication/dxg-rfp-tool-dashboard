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
  const base = "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-200";
  if (isCompleted) return `${base} border-[#10B981] bg-[#10B981] text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)]`;
  if (isActive)    return `${base} border-[#0786cf] bg-[#0786cf] text-white shadow-[0_0_0_4px_rgba(7,134,207,0.12),0_5px_14px_rgba(7,134,207,0.22)]`;
  return `${base} border-[#dce3e8] bg-white text-[#66727d] shadow-sm`;
};

const labelClass = (isActive: boolean, isCompleted: boolean): string => {
  if (isCompleted) return "text-[13px] font-semibold text-[#10B981] leading-tight";
  if (isActive)    return "text-[13px] font-bold text-[#102a43] leading-tight";
  return "text-[13px] font-semibold text-[#596773] leading-tight";
};

const subClass = (isActive: boolean, isCompleted: boolean): string => {
  if (isCompleted) return "mt-1 text-[11px] leading-tight text-[#10B981]/80";
  if (isActive)    return "mt-1 text-[11px] leading-tight text-[#527089]";
  return "mt-1 text-[11px] leading-tight text-[#98a2aa]";
};

const lineClass = (isCompleted: boolean, isActive: boolean): string => {
  const base = "pointer-events-none absolute left-7 top-1/2 z-[1] hidden h-[calc(100%+0.5rem)] w-px transition-colors duration-200 @min-[1000px]:block";
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
}: {
  activeStep?: number;
  hideStepIds?: number[];
  onStepChange?: (step: number) => void;
  /** Steps whose required fields are actually filled. Omit for positional. */
  completedStepIds?: number[];
  mode?: ProposalExperienceMode;
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
    <aside data-testid="proposal-process-list" className="w-full border-b border-[#e1e8ed] bg-[#fbfdfe] px-3 py-4 font-sans shadow-[0_8px_24px_rgba(15,42,67,0.035)] sm:px-4 @min-[1000px]:min-h-screen @min-[1000px]:border-b-0 @min-[1000px]:border-l @min-[1000px]:px-5 @min-[1000px]:py-7 @min-[1000px]:shadow-[-10px_0_30px_rgba(15,42,67,0.025)]">
      <div className="mb-3 px-1 @min-[1000px]:mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#647582]">
          Workflow sections
        </p>
        <p className="mt-1 text-xs text-[#8a98a3]">Select any section to review or edit.</p>
      </div>

      <div data-testid="proposal-step-scroller" className="relative flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:thin] @min-[1000px]:flex-col @min-[1000px]:overflow-visible @min-[1000px]:pb-0">
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
            <div key={step.id} className="relative flex min-w-[180px] snap-start items-start @min-[1000px]:min-w-0">
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
                aria-label={`Go to ${step.label}`}
                disabled={!isNavigable}
                onClick={() => onStepChange?.(step.id)}
                className={`group flex min-h-[60px] flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all duration-200 ${
                  isActive ? "bg-white shadow-[0_4px_16px_rgba(15,42,67,0.08)] ring-1 ring-[#dcebf4]" : ""}
                  ${
                  isNavigable
                    ? "cursor-pointer hover:bg-white hover:shadow-[0_3px_12px_rgba(15,42,67,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0786cf]"
                    : "cursor-default"
                }`}
              >
                <div className={circleClass(isActive, isCompleted)}>
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : step.badge}
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
