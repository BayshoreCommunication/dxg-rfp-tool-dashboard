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
  { id: 8,  badge: "7",  label: "Budget & Proposal",   sub: "Scoring & timeline" },
  { id: 9,  badge: "8",  label: "Uploads & Co-Vendors",sub: "Files & partners" },
  { id: 10, badge: "9",  label: "Contact & Submit",    sub: "Generate RFP" },
];

const circleClass = (isActive: boolean, isCompleted: boolean): string => {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300";
  if (isCompleted) return `${base} bg-[#10B981] border-[#10B981] text-white`;
  if (isActive)    return `${base} bg-white border-white text-black scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]`;
  return `${base} bg-transparent border-[#1F2937] text-slate-500`;
};

const labelClass = (isActive: boolean, isCompleted: boolean): string => {
  if (isCompleted) return "text-sm font-semibold text-[#10B981] leading-tight";
  if (isActive)    return "text-sm font-semibold text-white leading-tight";
  return "text-sm font-semibold text-slate-500 leading-tight";
};

const subClass = (isActive: boolean, isCompleted: boolean): string => {
  if (isCompleted) return "text-xs text-[#10B981]/70 mt-0.5";
  if (isActive)    return "text-xs text-slate-400 mt-0.5";
  return "text-xs text-slate-600 mt-0.5";
};

const lineClass = (isCompleted: boolean, isActive: boolean): string => {
  if (isCompleted) return "absolute left-[15px] top-9 w-[2px] h-8 bg-[#10B981] transition-colors duration-300";
  if (isActive)    return "absolute left-[15px] top-9 w-[2px] h-8 bg-[#22D3EE] transition-colors duration-300";
  return "absolute left-[15px] top-9 w-[2px] h-8 bg-[#1F2937] transition-colors duration-300";
};

const CheckIcon = () => (
  <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
    <path d="M1.5 5.5L5 9L12.5 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckBadge = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
    <circle cx="8" cy="8" r="8" fill="#10B981" />
    <path d="M4.5 8L6.8 10.5L11.5 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ProcessList = ({
  activeStep = 1,
  hideStepIds = [],
}: {
  activeStep?: number;
  hideStepIds?: number[];
}) => {
  const visibleSteps = steps.filter((s) => !hideStepIds.includes(s.id));
  return (
    <div className="w-full min-h-screen bg-[#0F1113] px-6 py-8 font-sans">
      {/* Intake Form label */}
      <p className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-500">
        Intake Form
      </p>

      <div className="relative flex flex-col gap-0">
        {visibleSteps.map((step, index) => {
          const isActive    = activeStep === step.id;
          const isCompleted = activeStep > step.id;
          const isLast      = index === visibleSteps.length - 1;

          return (
            <div key={step.id} className="relative flex items-start gap-4 pb-8">
              {/* Connecting Line */}
              {!isLast && (
                <div className={lineClass(isCompleted, isActive)} />
              )}

              {/* Circle badge */}
              <div className={circleClass(isActive, isCompleted)}>
                {isCompleted ? <CheckIcon /> : step.badge}
              </div>

              {/* Step info — grows to fill space */}
              <div className="flex flex-1 flex-col">
                <span className={labelClass(isActive, isCompleted)}>{step.label}</span>
                <span className={subClass(isActive, isCompleted)}>{step.sub}</span>
              </div>

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
    </div>
  );
};

export default ProcessList;
