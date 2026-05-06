type Step4VenueEechnicalRequirementsProps = {
  proposalData?: any;
};

export default function Step4VenueEechnicalRequirements({
  proposalData,
}: Step4VenueEechnicalRequirementsProps) {
  const data = proposalData || {};

  // ── Helper: extract YES/NO + optional detail from nested or flat field ────
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

  const rigging     = extractNested(data.needRiggingForFlown,    "needRiggingForFlown",    "riggingPlotOrSpecs");
  const power       = extractNested(data.needDedicatedPowerDrops, "needDedicatedPowerDrops", "standardAmpWall");
  const hardline    = extractNested(data.hardlineInternet,        "hardlineInternet",        "hardlineInternetPurpose");
  const livestream  = extractNested(data.livestreamVirtual,       "livestreamVirtual",       "livestreamPlatform");

  const powerDropsCount        = data.powerDropsHowMany?.trim();
  const wirelessEnabled        = data.wirelessInternetAttendees &&
                                  data.wirelessInternetAttendees.toUpperCase() !== "NO";

  const hasRiggingSection    = rigging.enabled   || rigging.spec;
  const hasPowerSection      = power.enabled     || powerDropsCount;
  const hasHardlineSection   = hardline.enabled  || hardline.spec;
  const hasLivestreamSection = livestream.enabled || livestream.spec;
  const hasWirelessSection   = wirelessEnabled;

  if (
    !hasRiggingSection &&
    !hasPowerSection   &&
    !hasHardlineSection &&
    !hasLivestreamSection &&
    !hasWirelessSection
  ) {
    return null;
  }

  // ── Shared card primitives ────────────────────────────────────────────────
  const WhiteCard = ({ children }: { children: React.ReactNode }) => (
    <div className="p-8 md:p-10 rounded-[2.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40 hover:-translate-y-0.5 transition-transform duration-300">
      {children}
    </div>
  );

  const AccentCard = ({ children }: { children: React.ReactNode }) => (
    <div
      className="p-8 md:p-10 rounded-[2.5rem] border shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-300 relative overflow-hidden"
      style={{
        backgroundColor: "white",
        borderColor: "color-mix(in srgb, var(--color-primary) 30%, transparent)",
      }}
    >
      <div
        className="absolute top-0 left-0 w-full h-2"
        style={{
          background: "linear-gradient(to right, var(--color-primary-start), var(--color-primary-end))",
        }}
      />
      {children}
    </div>
  );

  const CardTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-2xl font-black mb-6 uppercase text-slate-800 tracking-[0.04em]">
      {children}
    </h3>
  );

  const YesBadge = ({ label }: { label?: string }) => (
    <p className="text-base font-bold text-slate-600 uppercase tracking-[0.08em] flex items-center gap-2 mt-4">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: "var(--color-primary)" }}
      />
      {label ?? "YES"}
    </p>
  );

  const SpecBlock = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) =>
    accent ? (
      <div
        className="p-5 rounded-2xl border mb-4"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-primary) 4%, transparent)",
          borderColor: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
        }}
      >
        <p
          className="text-xs uppercase font-bold mb-1 tracking-[0.1em]"
          style={{ color: "var(--color-primary)" }}
        >
          {label}
        </p>
        <p className="text-lg font-black text-slate-900 leading-snug break-words">{value}</p>
      </div>
    ) : (
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-4">
        <p className="text-xs uppercase font-bold text-slate-500 mb-1 tracking-[0.1em]">{label}</p>
        <p className="text-lg font-black text-slate-900 leading-snug break-words">{value}</p>
      </div>
    );

  return (
    <section className="bg-slate-50 py-24 border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col items-center">

        {/* Section header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-[2px] w-10 rounded-full" style={{ backgroundColor: "var(--color-primary)" }} />
          <span
            className="font-bold tracking-[0.14em] text-sm uppercase"
            style={{ color: "var(--color-primary)" }}
          >
            Step 4: Infrastructure
          </span>
          <div className="h-[2px] w-10 rounded-full" style={{ backgroundColor: "var(--color-primary)" }} />
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">

          {/* ── Rigging ── */}
          {hasRiggingSection && (
            <WhiteCard>
              <CardTitle>Rigging &amp; Hoist</CardTitle>
              {rigging.spec && <SpecBlock label="Plot / Specs" value={rigging.spec} />}
              {rigging.enabled && <YesBadge label="Rigging Required: YES" />}
            </WhiteCard>
          )}

          {/* ── Power / Electrical ── */}
          {hasPowerSection && (
            <AccentCard>
              <CardTitle>Electrical Usage</CardTitle>
              {powerDropsCount && (
                <SpecBlock label="Power Drops / Amount" value={powerDropsCount} accent />
              )}
              {power.spec && <YesBadge label={`Amp Requirements: ${power.spec}`} />}
            </AccentCard>
          )}

          {/* ── Hardline Internet ── */}
          {hasHardlineSection && (
            <AccentCard>
              <CardTitle>Hardline Internet</CardTitle>
              {hardline.spec && (
                <SpecBlock label="Purpose" value={hardline.spec} accent />
              )}
              {hardline.enabled && !hardline.spec && (
                <YesBadge label="Hardline Access: Required" />
              )}
            </AccentCard>
          )}

          {/* ── Livestream / Virtual ── */}
          {hasLivestreamSection && (
            <WhiteCard>
              <CardTitle>Livestream &amp; Virtual</CardTitle>
              {livestream.spec && (
                <SpecBlock label="Platform" value={livestream.spec} />
              )}
              {livestream.enabled && !livestream.spec && (
                <YesBadge label="Livestream: Included" />
              )}
            </WhiteCard>
          )}

          {/* ── Wireless Internet ── */}
          {hasWirelessSection && (
            <WhiteCard>
              <CardTitle>Wireless Internet</CardTitle>
              <YesBadge label="Attendee Wi-Fi: Required" />
            </WhiteCard>
          )}

        </div>
      </div>
    </section>
  );
}
