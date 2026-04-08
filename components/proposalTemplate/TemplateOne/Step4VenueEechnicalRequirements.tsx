import type { TemplateOneData } from "../TemplateOne";

type Step4VenueEechnicalRequirementsProps = {
  proposalData?: any;
};

export default function Step4VenueEechnicalRequirements({
  proposalData,
}: Step4VenueEechnicalRequirementsProps) {
  const data = proposalData || {};
  
  const extractNested = (field: any, valKey: string, specKey?: string) => {
    if (!field) return { enabled: false, text: "", spec: "" };
    if (typeof field === "object") {
       const isYes = field[valKey] && field[valKey].toLowerCase() !== "no";
       const specStr = specKey ? field[specKey] : "";
       return { enabled: isYes, text: field[valKey] || "", spec: specStr || "" };
    }
    const isYes = typeof field === "string" && field.toLowerCase() !== "no";
    return { enabled: isYes, text: field, spec: "" };
  };

  const rigging = extractNested(data.needRiggingForFlown, "needRiggingForFlown", "riggingPlotOrSpecs");
  const power = extractNested(data.needDedicatedPowerDrops, "needDedicatedPowerDrops", "standardAmpWall");
  const powerDropsCount = data.powerDropsHowMany?.trim();

  const hasRiggingSection = rigging.enabled || rigging.spec;
  const hasPowerSection = power.enabled || powerDropsCount;

  if (!hasRiggingSection && !hasPowerSection) {
    return null;
  }

  return (
    <section className="bg-slate-50 py-24 border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col items-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div
            className="h-[2px] w-10 rounded-full"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
          <span
            className="font-bold tracking-[0.14em] text-sm uppercase"
            style={{ color: "var(--color-primary)" }}
          >
            Step 4: Infrastructure
          </span>
          <div
            className="h-[2px] w-10 rounded-full"
            style={{ backgroundColor: "var(--color-primary)" }}
          />
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          {hasRiggingSection && (
            <div className="p-8 md:p-10 rounded-[2.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40 hover:-translate-y-0.5 transition-transform duration-300">
              <h3 className="text-2xl font-black mb-8 uppercase text-slate-800 tracking-[0.04em]">
                Rigging & Hoist
              </h3>
              
              {rigging.spec && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
                  <p className="text-xs uppercase font-bold text-slate-500 mb-2 tracking-[0.1em]">
                    Plot / Specs
                  </p>
                  <p className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                    {rigging.spec}
                  </p>
                </div>
              )}
              
              {rigging.enabled && (
                <p className="text-base font-bold text-slate-600 uppercase tracking-[0.08em] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Rigging Required: YES
                </p>
              )}
            </div>
          )}

          {hasPowerSection && (
            <div
              className="p-8 md:p-10 rounded-[2.5rem] border shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-300 relative overflow-hidden"
              style={{
                backgroundColor: "white",
                borderColor:
                  "color-mix(in srgb, var(--color-primary) 30%, transparent)",
              }}
            >
              <div
                className="absolute top-0 left-0 w-full h-2"
                style={{
                  background:
                    "linear-gradient(to right, var(--color-primary-start), var(--color-primary-end))",
                }}
              />

              <h3 className="text-2xl font-black mb-8 uppercase text-slate-800 tracking-[0.04em]">
                Electrical Usage
              </h3>
              
              {powerDropsCount && (
                <div
                  className="p-6 rounded-2xl border mb-6"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--color-primary) 4%, transparent)",
                    borderColor:
                      "color-mix(in srgb, var(--color-primary) 15%, transparent)",
                  }}
                >
                  <p
                    className="text-xs uppercase font-bold mb-2 tracking-[0.1em]"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Power Drops / Amount
                  </p>
                  <p className="text-4xl font-black italic text-slate-900">
                    {powerDropsCount}
                  </p>
                </div>
              )}
              
              {power.spec && (
                <p className="text-base mt-4 font-bold text-slate-600 uppercase tracking-[0.08em] flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  />
                  Amp Requirements: {power.spec}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
