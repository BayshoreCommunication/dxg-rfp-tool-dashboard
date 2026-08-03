import { Check } from "lucide-react";

interface Step {
  id: number;       // numeric id used for activeStep comparison
  badge: string;    // displayed in the circle: "1", "2", "2B", etc.
  label: string;
  sub: string;      // subtitle shown below the label
}

const steps: Step[] = [
  { id: 1,  badge: "1",  label: "Event Overview",      sub: "Identity & narrative" },
  { id: 2,  badge: "2",  label: "Venue & Schedule",    sub: "Dates, rooms, union" },
  { id: 3,  badge: "2B", label: "Room Specifications", sub: "AV per room" },
  { id: 4,  badge: "3",  label: "Hybrid & Virtual",    sub: "Conditional" },
  { id: 5,  badge: "4",  label: "Content & Creative",  sub: "Ownership matrix" },
  { id: 6,  badge: "5",  label: "Video Recording",     sub: "Cameras & deliverables" },
  { id: 7,  badge: "6",  label: "Venue & Technical",   sub: "Power, rigging, COI" },
  { id: 8,  badge: "7",  label: "Investment & Evaluation", sub: "Scoring & timeline" },
  { id: 9,  badge: "8",  label: "Uploads & Co-Vendors",sub: "Files & partners" },
  { id: 10, badge: "9",  label: "Contact & Submit",    sub: "Generate RFP" },
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
  if (isCompleted) return "absolute bottom-[-11px] left-[17px] top-9 w-px bg-[#49cfa4] transition-colors duration-200";
  if (isActive)    return "absolute bottom-[-11px] left-[17px] top-9 w-px bg-[#8ac9ed] transition-colors duration-200";
  return "absolute bottom-[-11px] left-[17px] top-9 w-px bg-[#dfe6ea] transition-colors duration-200";
};

const ProcessList = ({
  activeStep = 1,
  hideStepIds = [],
  onStepChange,
  completedStepIds,
}: {
  activeStep?: number;
  hideStepIds?: number[];
  onStepChange?: (step: number) => void;
  /** Steps whose required fields are actually filled. Omit for positional. */
  completedStepIds?: number[];
}) => {
  const visibleSteps = steps.filter((s) => !hideStepIds.includes(s.id));

  let counter = 2;
  const badgedSteps = visibleSteps.map((step) => {
    if (step.id === 1) return { ...step, badge: "1" };
    if (step.id === 2) return { ...step, badge: "2" };
    if (step.id === 3) return { ...step, badge: "2B" };
    counter++;
    return { ...step, badge: String(counter) };
  });

  const completedCount = badgedSteps.filter((step) =>
    completedStepIds
      ? completedStepIds.includes(step.id) && step.id !== activeStep
      : activeStep > step.id,
  ).length;
  const progress = Math.round((completedCount / badgedSteps.length) * 100);

  return (
    <aside className="min-h-screen w-full border-l border-[#e1e8ed] bg-[#fbfdfe] px-5 py-7 font-sans shadow-[-10px_0_30px_rgba(15,42,67,0.025)]">
      <div className="mb-7 rounded-2xl border border-[#e5edf2] bg-white p-4 shadow-[0_6px_20px_rgba(15,42,67,0.05)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#647582]">
              Intake form
            </p>
            <p className="mt-1 text-xs text-[#8a98a3]">Proposal progress</p>
          </div>
          <span className="rounded-full bg-[#eef8fd] px-2.5 py-1 text-[10px] font-bold text-[#0786cf]">
            {completedCount}/{badgedSteps.length} done
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#edf2f5]" aria-hidden="true">
          <div
            className="h-full rounded-full bg-[#10B981] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="relative flex flex-col gap-2">
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
            <div key={step.id} className="relative flex items-start">
              {/* Connecting Line */}
              {!isLast && (
                <div className={lineClass(isCompleted, isActive)} />
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
