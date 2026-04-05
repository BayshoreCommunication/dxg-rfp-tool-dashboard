/**
 * TemplateOne: Global Innovation Summit 2026
 * A comprehensive RFP/Proposal template for high-end corporate events.
 */
export type TemplateOneData = {
  badge?: string;
  brandName?: string;
  titleLineOne?: string;
  titleLineTwo?: string;
  heroText?: string;
  metaChips?: string[];
  ctaPrimary?: string;
  ctaSecondary?: string;
  aboutTitle?: string;
  aboutText?: string;
  summaryBullets?: string[];
  servicesTitle?: string;
  services?: Array<{ title: string; text: string }>;
  pricingTitle?: string;
  pricing?: Array<{ name: string; price: string; bullets: string[] }>;
  closingTitle?: string;
  closingSubtitle?: string;
  brandAddress?: string;
  brandEmail?: string;
  contactName?: string;
  contactPhone?: string;
  additionalNotes?: string;
  budgetDisplay?: string;
  proposalFormats?: string[];
  crewRoles?: string[];
  scenicStageDesignLabel?: string;
  unionLaborLabel?: string;
  riggingMaxPointWeight?: string;
  riggingMethod?: string;
  powerDropsLabel?: string;
  ampWallLabel?: string;
  avGroups?: Array<{
    title: string;
    items: Array<{ label: string; value: string }>;
  }>;
  ledHeadline?: string;
  ledDescription?: string;
  ledTags?: string[];
};

export default function TemplateOne({
  data,
  onPrimaryAction,
  onSecondaryAction,
  showPrimaryAction = true,
  isPrimaryLoading = false,
  isSecondaryLoading = false,
  isPrimaryDisabled = false,
  fontFamily = "Poppins",
}: {
  data?: Partial<TemplateOneData>;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  showPrimaryAction?: boolean;
  isPrimaryLoading?: boolean;
  isSecondaryLoading?: boolean;
  isPrimaryDisabled?: boolean;
  fontFamily?: "Inter" | "Poppins" | "Roboto";
}) {
  const avGroups = data?.avGroups || [
    {
      title: "Room & Logistics",
      items: [
        { label: "Function", value: "Keynote Pavilion" },
        { label: "Ceiling Height", value: "45 ft" },
        { label: "Room Setup", value: "Banquet Rounds" },
        { label: "Chairs on Stage", value: "8 Panelists" },
      ],
    },
    {
      title: "Audio Infrastructure",
      items: [
        { label: "System Provider", value: "d&b audiotechnik" },
        { label: "Audio Spec", value: "J-Series Line Array" },
        { label: "Max Output", value: "95 dB Limit" },
        { label: "Recording", value: "Multi-Track" },
      ],
    },
    {
      title: "Accessibility & Support",
      items: [
        { label: "Hearing Support", value: "Required (Yes)" },
        { label: "PA System", value: "Integrated" },
        { label: "Translation", value: "Live Support" },
        { label: "Remote", value: "PiP Support" },
      ],
    },
  ];

  const crewRoles = data?.crewRoles || [
    "A1 (Audio)",
    "A2 (Audio Assist)",
    "V1 (Video)",
    "V2 (Video Assist)",
    "TD (Tech Director)",
    "L1 (Lighting)",
    "Graphics Op",
    "Camera Operator",
    "Showcaller",
    "Producer",
  ];

  const proposalFormats = data?.proposalFormats || [
    "Gear Itemization",
    "Labor Breakdown",
    "All-in Estimate",
  ];

  const toLabelValue = (entry: string) => {
    const idx = entry.indexOf(":");
    if (idx === -1) {
      return { label: "Detail", value: entry.trim() };
    }
    return {
      label: entry.slice(0, idx).trim(),
      value: entry.slice(idx + 1).trim(),
    };
  };

  const infoItems =
    data?.summaryBullets && data.summaryBullets.length > 0
      ? data.summaryBullets.slice(0, 3).map(toLabelValue)
      : [
          { label: "Event Format", value: "Hybrid Event" },
          { label: "Venue", value: "Las Vegas, NV" },
          { label: "Timeline", value: "Mar 10 - 12, 2026" },
        ];

  return (
    <div
      className="proposal-print-root antialiased text-slate-900 text-[17px] md:text-[18px]"
      style={{ fontFamily: `"${fontFamily}", var(--font-sans)` }}
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          html,
          body {
            background: #fff !important;
          }

          .proposal-print-root * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .proposal-print-root section {
            min-height: auto !important;
            height: auto !important;
            padding-top: 24px !important;
            padding-bottom: 24px !important;
            overflow: visible !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .proposal-print-root .pointer-events-none,
          .proposal-print-root [class*="backdrop-blur"],
          .proposal-print-root [class*="blur-"] {
            display: none !important;
          }

          .proposal-print-root [class*="shadow"] {
            box-shadow: none !important;
          }
        }
      `}</style>
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 no-print">
        {/* Actions */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/85 p-2 shadow-xl backdrop-blur-md">
          {showPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              disabled={isPrimaryDisabled || isPrimaryLoading}
              className="w-auto px-6 py-2.5 rounded-xl text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 active:scale-95 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-primary-start), var(--color-primary-end))",
                boxShadow: `0 15px 30px -10px color-mix(in srgb, var(--color-primary) 50%, transparent)`,
                outlineColor: "var(--color-primary)",
              }}
            >
              {isPrimaryLoading
                ? "Accepting..."
                : data?.ctaPrimary || "Approve Proposal"}
            </button>
          )}
          <button
            type="button"
            onClick={onSecondaryAction}
            disabled={isSecondaryLoading}
            className="w-auto px-6 py-2.5 rounded-xl text-base font-semibold transition-all duration-300 border-2 bg-white hover:bg-slate-50 hover:-translate-y-0.5 active:scale-95 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              borderColor: "var(--color-secondary)",
              color: "var(--color-secondary)",
              outlineColor: "var(--color-secondary)",
            }}
          >
            {isSecondaryLoading
              ? "Generating PDF..."
              : data?.ctaSecondary || "Download Deck"}
          </button>
        </div>
      </div>
      {/* --- STEP 1: EVENT OVERVIEW (HERO) --- */}
      <section
        className="font-sans min-h-[90vh] flex items-center justify-center relative overflow-hidden"
        style={{
          backgroundColor: "#ffffff",
          backgroundImage: `
            radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--color-primary-start) 15%, transparent) 0%, transparent 40%),
            radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--color-primary-end) 12%, transparent) 0%, transparent 45%)
          `,
        }}
      >
        <div className="max-w-[1280px] w-full mx-auto px-6 py-20 flex flex-col items-center text-center relative z-10">
          {/* Kicker */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className="h-[2px] w-12 rounded-full"
              style={{ backgroundColor: "var(--color-primary)" }}
            />
            <span
              className="font-bold tracking-[0.14em] text-sm md:text-base uppercase"
              style={{ color: "var(--color-primary)" }}
            >
              {data?.badge || "Multi-Day Corporate Retreat & Expo"}
            </span>
            <div
              className="h-[2px] w-12 rounded-full"
              style={{ backgroundColor: "var(--color-primary)" }}
            />
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-[6rem] font-black tracking-tight leading-[1.05] mb-8 text-slate-900">
            {data?.titleLineOne || "Global Innovation"} <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, var(--color-primary-start), var(--color-primary-end))`,
              }}
            >
              {data?.titleLineTwo || "Summit 2026"}
            </span>
          </h1>

          <p className="text-slate-700 text-xl md:text-2xl max-w-3xl mb-14 leading-relaxed font-medium">
            {data?.heroText ||
              "The definitive proposal for 1,000+ industry leaders. Experience the future of collaboration at the Las Vegas Convention Center."}
          </p>

          {/* Info Boxes */}
          <div
            className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-16 p-4 md:p-5 rounded-[2rem] border border-slate-200/90 backdrop-blur-md relative overflow-hidden shadow-xl shadow-slate-200/45"
            style={{
              backgroundImage:
                "linear-gradient(120deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.96) 100%)",
            }}
          >
            {infoItems.map((item, index) => (
              <div
                key={index}
                className="relative z-10 rounded-2xl px-6 py-6 bg-white border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group"
              >
                <p className="inline-flex items-center gap-2 text-slate-600 text-xs md:text-sm uppercase tracking-[0.1em] mb-3 font-bold group-hover:text-slate-800 transition-colors">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: "var(--color-primary)" }}
                  />
                  {item.label}
                </p>
                <p className="text-2xl md:text-[1.85rem] font-extrabold text-slate-950 leading-tight">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- STEP 2: ROOM-BY-ROOM AV NEEDS --- */}
      <section className="bg-white py-24 relative">
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
              Step 2: Technical Specifications
            </span>
            <div
              className="h-[2px] w-10 rounded-full"
              style={{ backgroundColor: "var(--color-primary)" }}
            />
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-12 text-center">
            Room-by-Room{" "}
            <span style={{ color: "var(--color-primary)" }}>AV Needs</span>
          </h2>

          <div
            className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-[2.5rem] mb-12 shadow-sm"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--color-primary) 3%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--color-primary) 10%, transparent)",
            }}
          >
            {avGroups
              .flatMap((g) => g.items)
              .map((item, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-[1.5rem] border border-slate-200/70 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300 transition-all duration-300"
                >
                  <p className="text-xs uppercase tracking-[0.08em] mb-2 font-bold text-slate-500">
                    {item.label}
                  </p>
                  <p className="text-xl font-bold text-slate-800 leading-tight">
                    {item.value}
                  </p>
                </div>
              ))}
          </div>

          {/* LED Special Section */}
          <div
            className="w-full p-8 md:p-12 rounded-[2.5rem] border shadow-xl shadow-slate-200/40 transition-transform duration-300 hover:-translate-y-0.5"
            style={{
              backgroundImage: `linear-gradient(135deg, color-mix(in srgb, var(--color-primary-start) 6%, white), color-mix(in srgb, var(--color-primary-end) 6%, white))`,
              borderColor:
                "color-mix(in srgb, var(--color-primary) 20%, transparent)",
            }}
          >
            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start text-center lg:text-left">
              <div className="flex-1">
                <div
                  className="inline-block px-5 py-2 rounded-full text-xs font-bold uppercase tracking-[0.1em] mb-6 bg-white shadow-sm border border-slate-200"
                  style={{ color: "var(--color-primary)" }}
                >
                  Premium Upgrade Added
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
                  {data?.ledHeadline || "Full 120ft Curved LED Experience"}
                </h3>
                <p className="text-slate-600 text-lg md:text-xl leading-relaxed max-w-4xl font-medium">
                  {data?.ledDescription ||
                    "Native 4K switching via Barco E2 with 3 discrete camera feeds. Features include PiP for remote speakers and full live translation support."}
                </p>
              </div>
              <div className="flex flex-wrap justify-center lg:justify-end gap-3 mt-4 lg:mt-0">
                {(data?.ledTags && data.ledTags.length > 0
                  ? data.ledTags
                  : ["Native 4K", "Barco E2", "3-Cam Feed"]
                ).map((tag) => (
                  <span
                    key={tag}
                    className="px-5 py-3 bg-white rounded-xl text-sm font-black border border-slate-200 shadow-sm uppercase tracking-[0.08em]"
                    style={{ color: "var(--color-primary-end)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- STEP 3: PRODUCTION & CREW (NEW PRIMARY BG SECTION) --- */}
      <section
        className="py-24 relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, var(--color-primary-start) 0%, var(--color-primary-end) 100%)`,
        }}
      >
        {/* Decorative Background Elements */}
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
            <div className="flex items-center justify-between p-6 bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl hover:bg-white/15 transition-colors duration-300">
              <span className="text-white/90 font-bold uppercase text-sm md:text-base tracking-[0.04em]">
                Scenic / Stage Design
              </span>
              <span className="px-4 py-1.5 bg-white text-emerald-600 rounded-full text-sm font-black uppercase shadow-sm">
                {data?.scenicStageDesignLabel || "Required (Yes)"}
              </span>
            </div>
            <div className="flex items-center justify-between p-6 bg-white/10 backdrop-blur-md border border-white/25 rounded-2xl hover:bg-white/15 transition-colors duration-300">
              <span className="text-white/90 font-bold uppercase text-sm md:text-base tracking-[0.04em]">
                Union Labor
              </span>
              <span className="px-4 py-1.5 bg-amber-400 text-amber-950 rounded-full text-sm font-black uppercase shadow-sm">
                {data?.unionLaborLabel || "TBD / Not Sure"}
              </span>
            </div>
          </div>

          <div className="w-full max-w-5xl p-8 md:p-10 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/25 shadow-2xl">
            <h3 className="text-xl font-bold text-center mb-8 uppercase tracking-[0.1em] text-white/85">
              Assigned Crew Roster
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {crewRoles.map((role) => (
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
          </div>
        </div>
      </section>

      {/* --- STEP 4: RIGGING & POWER --- */}
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
            <div className="p-8 md:p-10 rounded-[2.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/40 hover:-translate-y-0.5 transition-transform duration-300">
              <h3 className="text-2xl font-black mb-8 uppercase text-slate-800 tracking-[0.04em]">
                Rigging & Hoist
              </h3>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
                <p className="text-xs uppercase font-bold text-slate-500 mb-2 tracking-[0.1em]">
                  Max Point Weight
                </p>
                <p className="text-4xl font-black text-slate-900">
                  {data?.riggingMaxPointWeight || "1,500 lbs"}
                </p>
              </div>
              <p className="text-base font-bold text-slate-600 uppercase tracking-[0.08em] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                {data?.riggingMethod || "High Steel / Venue Motors"}
              </p>
            </div>

            <div
              className="p-8 md:p-10 rounded-[2.5rem] border shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-300 relative overflow-hidden"
              style={{
                backgroundColor: "white",
                borderColor:
                  "color-mix(in srgb, var(--color-primary) 30%, transparent)",
              }}
            >
              {/* Subtle accent line inside the card */}
              <div
                className="absolute top-0 left-0 w-full h-2"
                style={{
                  background:
                    "linear-gradient(to right, var(--color-primary-start), var(--color-primary-end))",
                }}
              />

              <h3 className="text-2xl font-black mb-8 uppercase text-slate-800 tracking-[0.04em]">
                Electrical Drops
              </h3>
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
                  Total Power Drops
                </p>
                <p className="text-4xl font-black italic text-slate-900">
                  {data?.powerDropsLabel || "12 Dedicated"}
                </p>
              </div>
              <p className="text-base font-bold text-slate-600 uppercase tracking-[0.08em] flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--color-primary)" }}
                ></span>
                {data?.ampWallLabel || "400A Main Amp Wall"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- STEP 6: BUDGET & TIMELINE --- */}
      <section className="bg-white py-24">
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
              Step 6: Financials
            </span>
            <div
              className="h-[2px] w-10 rounded-full"
              style={{ backgroundColor: "var(--color-primary)" }}
            />
          </div>

          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
            <div
              className="lg:col-span-7 p-10 md:p-14 rounded-[2.5rem] text-white flex flex-col justify-center relative overflow-hidden shadow-2xl"
              style={{
                backgroundImage: `linear-gradient(135deg, var(--color-primary-start), var(--color-primary-end))`,
              }}
            >
              {/* Decorative graphic */}
              <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                <svg
                  width="300"
                  height="300"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2L2 22H22L12 2Z" />
                </svg>
              </div>

              <p className="text-sm uppercase font-bold tracking-[0.14em] text-white/80 mb-4">
                Estimated AV Budget
              </p>
              <h3 className="text-6xl md:text-7xl font-black italic tracking-tighter drop-shadow-lg">
                {data?.budgetDisplay || "$50-100K"}
              </h3>
            </div>

            <div className="lg:col-span-5 p-8 md:p-10 rounded-[2.5rem] border border-slate-200 bg-slate-50 flex flex-col justify-center">
              <p className="text-slate-500 text-xs md:text-sm uppercase font-bold mb-6 tracking-[0.1em]">
                Preferred Formats
              </p>
              <div className="space-y-3">
                {proposalFormats.map((f) => (
                  <div
                    key={f}
                    className="bg-white p-4 rounded-xl border border-slate-100 text-sm md:text-base font-black uppercase text-slate-700 shadow-sm hover:border-slate-300 transition-colors flex items-center justify-between"
                  >
                    {f}
                    <svg
                      className="w-5 h-5 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- STEP 7: CONTACT & FOOTER --- */}
      <section className="bg-slate-50 py-24 border-t border-slate-200">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
              <p className="text-xs uppercase font-bold tracking-[0.1em] text-slate-500 mb-6">
                Point of Contact
              </p>
              <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-3">
                {data?.contactName || "Sarah Jennings"}
              </h3>
              <p
                className="text-lg md:text-xl font-bold mb-8"
                style={{ color: "var(--color-primary)" }}
              >
                {data?.closingSubtitle || "VP of Global Conferences - Apex Dynamics"}
              </p>
              <div className="space-y-4">
                <p className="text-base font-bold text-slate-600 flex items-center gap-3">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    ></path>
                  </svg>
                  {data?.brandEmail || "s.jennings@apexdynamics.com"}
                </p>
                <p className="text-base font-bold text-slate-600 flex items-center gap-3">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    ></path>
                  </svg>
                  {data?.contactPhone || "+1 (415) 555-8821"}
                </p>
              </div>
            </div>

            <div className="p-10 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden">
              {/* Accent line */}
              <div
                className="absolute top-0 left-0 w-full h-2"
                style={{
                  background:
                    "linear-gradient(to right, var(--color-primary-start), var(--color-primary-end))",
                }}
              />

              <h4 className="text-xl font-black mb-6 uppercase tracking-[0.05em] text-white flex items-center gap-3">
                <svg
                  className="w-6 h-6"
                  style={{ color: "var(--color-primary)" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                Additional Notes
              </h4>
              <p className="text-lg leading-relaxed text-slate-300">
                {data?.additionalNotes ||
                  "Please ensure the proposal includes line-item pricing for the curved LED wall separately. We are currently comparing 3 different vendors for this specific buildout."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 py-12 border-t border-slate-800">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-[0.1em]">
          <div>{data?.brandName || "DXG.RFP"} - 2026</div>
          <div className="flex gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--color-primary)" }}
            ></span>
            Ref: DXG-RFP-TOOL-TEST-2026
          </div>
        </div>
      </footer>
    </div>
  );
}
