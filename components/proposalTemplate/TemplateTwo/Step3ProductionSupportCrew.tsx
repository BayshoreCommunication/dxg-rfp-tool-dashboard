import type { TemplateOneData } from "../TemplateOne";

type Step3ProductionSupportCrewProps = {
  proposalData?: any;
};

export default function Step3ProductionSupportCrew({
  proposalData,
}: Step3ProductionSupportCrewProps) {
  const data = proposalData || {};
  
  const crewRoles = Array.isArray(data?.showCrewNeeded) ? data.showCrewNeeded : [];
  const scenicStageDesign = data?.scenicStageDesign?.trim();
  const unionLabor = data?.unionLabor?.trim();
  const otherRoles = data?.otherRolesNeeded?.trim();
  
  const hasCrewSection = Boolean(
    (scenicStageDesign && scenicStageDesign !== "No") ||
      (unionLabor && unionLabor !== "No") ||
      crewRoles.length > 0 ||
      otherRoles
  );

  if (!hasCrewSection) return null;

  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(135deg, var(--color-primary-start) 0%, var(--color-primary-end) 100%)",
      }}
    >
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-15 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[70%] rounded-full blur-[120px] bg-white"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[70%] rounded-full blur-[120px] bg-white"></div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 flex flex-col items-center relative z-10 text-white">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-[2px] w-10 rounded-full bg-white/50" />
          <span className="font-bold tracking-[0.14em] text-sm uppercase text-white/90">
            Step 3: Production Support
          </span>
          <div className="h-[2px] w-10 rounded-full bg-white/50" />
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-white mb-12 text-center">
          Show Crew & Labor Strategy
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mb-12">
          {scenicStageDesign && scenicStageDesign !== "No" && (
            <div className="flex items-center justify-between p-6 bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl hover:bg-white/15 transition-colors duration-300">
              <span className="text-white/90 font-bold uppercase text-sm md:text-base tracking-[0.04em]">
                Scenic / Stage Design
              </span>
              <span className="px-4 py-1.5 bg-white text-emerald-600 rounded-full text-sm font-black uppercase shadow-sm">
                {scenicStageDesign}
              </span>
            </div>
          )}
          {unionLabor && unionLabor !== "No" && (
            <div className="flex items-center justify-between p-6 bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl hover:bg-white/15 transition-colors duration-300">
              <span className="text-white/90 font-bold uppercase text-sm md:text-base tracking-[0.04em]">
                Union Labor
              </span>
              <span className="px-4 py-1.5 bg-amber-400 text-amber-950 rounded-full text-sm font-black uppercase shadow-sm">
                {unionLabor}
              </span>
            </div>
          )}
        </div>

        {(crewRoles.length > 0 || otherRoles) && (
          <div className="w-full max-w-5xl p-8 md:p-10 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/25 shadow-2xl">
            <h3 className="text-xl font-bold text-center mb-8 uppercase tracking-[0.1em] text-white/85">
              Assigned Crew Roster
            </h3>
            {crewRoles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                {crewRoles.map((role: string) => (
                  <div
                    key={role}
                    className="bg-white/10 hover:bg-white py-4 px-2 rounded-xl text-center border border-white/25 shadow-sm transition-all duration-300 hover:scale-[1.03] group"
                  >
                    <span className="text-xs md:text-sm font-black text-white group-hover:text-slate-900 uppercase tracking-[0.04em] transition-colors duration-300">
                      {role}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {otherRoles && (
              <div className="mt-6 p-6 rounded-2xl bg-black/20 border border-white/10">
                <p className="text-xs uppercase tracking-[0.08em] text-white/60 mb-2 font-bold">
                  Additional Roles / Notes
                </p>
                <p className="text-white/95 text-lg leading-relaxed">
                  {otherRoles}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
