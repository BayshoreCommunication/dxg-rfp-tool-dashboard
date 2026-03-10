

interface Step {
  id: number;
  label: string;
}

const steps: Step[] = [
  { id: 1, label: 'Event Overview' },
  { id: 2, label: 'Room-by-Room AV Needs' },
  { id: 3, label: 'Production Support & Crew' },
  { id: 4, label: 'Venue & Technical Requirements' },
  { id: 5, label: 'Uploads & Reference Materials' },
  { id: 6, label: 'Budget & Proposal Preferences' },
  { id: 7, label: 'Contact Info' },
];

const ProcessList = ({ activeStep = 1 }: { activeStep?: number }) =>{
  return (
    <div className="w-80 min-h-screen bg-[#0F1113] p-8 font-sans  ">
      <div className="relative flex flex-col gap-10">
        {steps.map((step, index) => {
          const isActive = activeStep === step.id;
          const isCompleted = activeStep > step.id;

          return (
            <div key={step.id} className="relative flex items-center gap-6 group">
              {/* Connecting Line */}
              {index !== steps.length - 1 && (
                <div 
                  className={`absolute left-[19px] top-10 w-[2px] h-10 transition-colors duration-300 ${
                    isCompleted ? 'bg-[#10B981]' : 'bg-[#22D3EE]'
                  }`} 
                />
              )}

              {/* Step Circle */}
              <div 
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 font-bold ${
                  isActive 
                    ? 'bg-white border-white text-black scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                    : 'bg-[#22D3EE] border-[#22D3EE] text-white'
                }`}
              >
                {step.id}
              </div>

              {/* Label */}
              <span 
                className={`text-[15px] font-semibold transition-colors duration-300 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProcessList