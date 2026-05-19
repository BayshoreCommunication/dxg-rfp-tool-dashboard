"use client";

import type { ProposalSettings, VenueTechnicalData } from "../AddNewProposal";
import { InfoTooltip, PillCheckbox, toggleItem } from "./shared";

/* ─── Style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#35bdf2] focus:outline-none focus:ring-2 focus:ring-[#35bdf2]/20";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#8f98bf]";
const subPanelClass =
  "mt-3 rounded-xl border border-[#e0e7ff] bg-[#f5f7ff] p-4";
const subPanelHeader =
  "mb-3 text-xs font-bold uppercase tracking-widest text-[#8f98bf]";

/* ─── Yes/No buttons ─── */
const yesNoCls = (opt: "YES" | "NO", value: string): string => {
  const base =
    "flex h-10 min-w-[72px] cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all";
  if (value !== opt)
    return `${base} border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300`;
  if (opt === "YES") return `${base} border-emerald-400 bg-emerald-50 text-emerald-700`;
  return `${base} border-rose-400 bg-rose-50 text-rose-700`;
};

const YesNo = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "YES" | "NO") => void;
}) => (
  <div className="flex gap-3">
    <button
      type="button"
      className={yesNoCls("YES", value)}
      onClick={() => onChange("YES")}
    >
      ✓ Yes
    </button>
    <button
      type="button"
      className={yesNoCls("NO", value)}
      onClick={() => onChange("NO")}
    >
      ✗ No
    </button>
  </div>
);

const Group = ({ label }: { label: string }) => (
  <div className="mb-5 mt-8 border-t border-[#e8edf5] pt-6 first:mt-0 first:border-0 first:pt-0">
    <p className={groupLabelClass}>{label}</p>
  </div>
);

/* ─── Options ─── */
const POWER_AMPERAGE_OPTIONS = [
  "100A",
  "200A",
  "400A",
  "600A",
  "800A+",
  "Mixed",
  "Vendor Recommendation",
];

const amperagePillCls = (opt: string, selected: string): string => {
  const base =
    "rounded-full border px-4 py-1.5 text-xs font-semibold transition-all";
  if (selected === opt)
    return `${base} border-[#35bdf2] bg-[#35bdf2]/10 text-[#0f1b57]`;
  return `${base} border-[#d7dce3] bg-white text-slate-500 hover:border-slate-300`;
};

const INTERNET_USE_CASES = [
  "Attendee WiFi (General)",
  "Live Streaming / Encoding",
  "Remote Presenters (Zoom / Teams)",
  "Digital Signage",
  "Live Polling / Q&A Apps",
  "Event App / Registration Kiosks",
  "Backstage / Production Crew",
];

/* ─── Number stepper ─── */
const Stepper = ({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
}) => {
  const num = parseInt(value, 10) || min;
  return (
    <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-[#d7dce3] w-fit">
      <button
        type="button"
        onClick={() => onChange(String(Math.max(min, num - 1)))}
        className="flex h-10 w-10 items-center justify-center bg-[#f5f7ff] text-lg font-bold text-[#1f2d5d] hover:bg-[#e0e7ff] transition-colors"
      >
        −
      </button>
      <span className="flex h-10 w-14 items-center justify-center text-sm font-bold text-slate-800">
        {num}
      </span>
      <button
        type="button"
        onClick={() => onChange(String(Math.min(max, num + 1)))}
        className="flex h-10 w-10 items-center justify-center bg-[#f5f7ff] text-lg font-bold text-[#1f2d5d] hover:bg-[#e0e7ff] transition-colors"
      >
        +
      </button>
    </div>
  );
};

/* ─── Ref panel row ─── */
const RefRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
    <span className="text-sm font-semibold text-slate-700">{value || "—"}</span>
  </div>
);

/* ─── Props ─── */
interface Props {
  data: VenueTechnicalData;
  onChange: (updates: Partial<VenueTechnicalData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
  isUnionVenue?: "YES" | "NO" | "NOT_SURE" | "";
  loadInDate?: string;
  strikeDate?: string;
  numberOfEventRooms?: string;
  ledWallMaxWidth?: number;
}

const defaultVT = (): VenueTechnicalData => ({
  venueAvContactName: "",
  venueAvContactPhone: "",
  venueAvContactEmail: "",
  inHouseAvCompanyName: "",
  riggingRequired: "",
  maxWeightPerRiggingPoint: "",
  numberOfRiggingPoints: "",
  powerDropsRequired: "",
  powerDropAmperage: "",
  numberOfPowerDrops: "",
  wirelessInternetRequired: "",
  internetUseCases: [],
  coiRequirements: "",
  venueAccessRequirements: "",
});

const VenueTechnicalRequirements = ({
  data: rawData,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
  isUnionVenue,
  loadInDate,
  strikeDate,
  numberOfEventRooms,
  ledWallMaxWidth,
}: Props) => {
  const def = defaultVT();
  const data: VenueTechnicalData = {
    ...def,
    ...rawData,
    internetUseCases: rawData.internetUseCases ?? [],
  };

  const coiLen = data.coiRequirements.length;
  const accessLen = data.venueAccessRequirements.length;

  const showUnionBanner = isUnionVenue === "YES" || isUnionVenue === "NOT_SURE";
  const suggestHighPower =
    ledWallMaxWidth !== undefined && ledWallMaxWidth > 60;

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#35bdf2]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#35bdf2]">
            Page 6 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">
          Venue &amp; Technical Infrastructure
        </h2>
        <p className="mt-1 text-sm text-[#8f98bf]">
          Rigging, power, internet, COI, and venue access details — used to scope labor and logistics.
        </p>
      </div>

      <div className="flex-1 px-8 py-8 space-y-0">

        {/* ── Reference Panel (read-only) ── */}
        {(loadInDate || strikeDate || numberOfEventRooms || ledWallMaxWidth) && (
          <div className="mb-6 rounded-xl border border-[#d7dce3] bg-[#f8faff] px-5 py-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              From your venue &amp; room specs
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {loadInDate && <RefRow label="Load-In Date" value={loadInDate} />}
              {strikeDate && <RefRow label="Strike Date" value={strikeDate} />}
              {numberOfEventRooms && (
                <RefRow label="Event Rooms" value={numberOfEventRooms} />
              )}
              {ledWallMaxWidth !== undefined && ledWallMaxWidth > 0 && (
                <RefRow label="LED Wall (max width)" value={`${ledWallMaxWidth} ft`} />
              )}
            </div>
          </div>
        )}

        {/* ── Union Advisory Banner ── */}
        {showUnionBanner && (
          <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
            <div>
              <p className="text-sm font-bold text-amber-800">
                {isUnionVenue === "YES" ? "Union Venue Detected" : "Union Status Not Confirmed"}
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Union venues require certified riggers and IBEW-jurisdictioned electricians for power drops. Labor rates, call times, and crew minimums are set by the local. DXG will flag this in the RFP.
              </p>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────
            Block 1 — Venue AV Contact
        ───────────────────────────────────────── */}
        <Group label="Venue AV Contact" />

        <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label className={labelClass}>
              Contact Name
              <InfoTooltip text="The on-site venue coordinator or AV liaison. The AV company will contact this person for load-in logistics, power hookups, and rigging approvals." />
            </label>
            <input
              className={inputClass}
              placeholder="e.g. Jane Smith"
              value={data.venueAvContactName}
              onChange={(e) => onChange({ venueAvContactName: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>
              Phone
            </label>
            <input
              className={inputClass}
              placeholder="e.g. (555) 555-0100"
              value={data.venueAvContactPhone}
              onChange={(e) => onChange({ venueAvContactPhone: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>
              Email
            </label>
            <input
              type="email"
              className={inputClass}
              placeholder="e.g. jsmith@venue.com"
              value={data.venueAvContactEmail}
              onChange={(e) => onChange({ venueAvContactEmail: e.target.value })}
            />
          </div>
        </div>

        {/* ─────────────────────────────────────────
            Block 2 — In-House AV Company
        ───────────────────────────────────────── */}
        <div className="mb-6">
          <label className={labelClass}>
            In-House AV Company Name
            <InfoTooltip text="The name of the venue's preferred or exclusive in-house AV vendor. Knowing this upfront helps DXG determine whether coordination, a patch-in fee, or an exclusivity fee applies." />
          </label>
          <input
            className={inputClass}
            placeholder="e.g. PSAV, Encore, Freeman AV — or leave blank if none"
            value={data.inHouseAvCompanyName}
            onChange={(e) => onChange({ inHouseAvCompanyName: e.target.value })}
          />
        </div>

        {/* ─────────────────────────────────────────
            Block 3 — Rigging
        ───────────────────────────────────────── */}
        <Group label="Rigging" />

        <div className="mb-6">
          <label className={labelClass}>
            Rigging Required? <span className="text-red-500">*</span>
            <InfoTooltip text="Flown elements include speakers, lighting trusses, LED walls, or screens suspended from the ceiling. Most venues require certified riggers for any overhead load." />
          </label>
          <YesNo
            value={data.riggingRequired}
            onChange={(v) =>
              onChange({
                riggingRequired: v,
                maxWeightPerRiggingPoint: v !== "YES" ? "" : data.maxWeightPerRiggingPoint,
                numberOfRiggingPoints: v !== "YES" ? "" : data.numberOfRiggingPoints,
              })
            }
          />
          {showErrors && !data.riggingRequired && (
            <p className="mt-1 text-xs text-red-500">Required</p>
          )}

          {data.riggingRequired === "YES" && (
            <div className={subPanelClass}>
              <p className={subPanelHeader}>Rigging Details</p>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>
                    Max Weight Per Point (lbs)
                    <InfoTooltip text="The maximum load per certified rigging point. Venue structural engineers typically provide this. If unknown, indicate 'TBD' in the notes field and DXG will coordinate with the venue." />
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    placeholder="e.g. 1000"
                    value={data.maxWeightPerRiggingPoint}
                    onChange={(e) =>
                      onChange({ maxWeightPerRiggingPoint: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Number of Rigging Points
                    <InfoTooltip text="Total certified attachment points available in the ceiling structure for this event space." />
                  </label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    placeholder="e.g. 12"
                    value={data.numberOfRiggingPoints}
                    onChange={(e) =>
                      onChange({ numberOfRiggingPoints: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────
            Block 4 — Power & Connectivity
        ───────────────────────────────────────── */}
        <Group label="Power &amp; Connectivity" />

        {/* Smart power suggestion */}
        {suggestHighPower && (
          <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
            <span className="shrink-0 text-amber-500">⚡</span>
            <p className="text-xs text-amber-700">
              Your LED wall exceeds 60 ft wide — a 400A minimum power drop is strongly recommended. Select 400A or higher below.
            </p>
          </div>
        )}

        <div className="mb-6">
          <label className={labelClass}>
            Power Drops Required? <span className="text-red-500">*</span>
            <InfoTooltip text="Dedicated drops provide isolated electrical circuits for AV equipment, preventing interference and tripped breakers from shared venue power." />
          </label>
          <YesNo
            value={data.powerDropsRequired}
            onChange={(v) =>
              onChange({
                powerDropsRequired: v,
                powerDropAmperage: v !== "YES" ? "" : data.powerDropAmperage,
                numberOfPowerDrops: v !== "YES" ? "" : data.numberOfPowerDrops,
              })
            }
          />
          {showErrors && !data.powerDropsRequired && (
            <p className="mt-1 text-xs text-red-500">Required</p>
          )}

          {data.powerDropsRequired === "YES" && (
            <div className={subPanelClass}>
              <p className={subPanelHeader}>Power Drop Details</p>

              <div className="mb-4">
                <label className={labelClass}>
                  Amperage per Drop
                  <InfoTooltip text="The amperage of each dedicated circuit. Large LED walls and audio systems typically require 200–400A. The AV company will confirm exact requirements." />
                </label>
                <div className="flex flex-wrap gap-2">
                  {POWER_AMPERAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onChange({ powerDropAmperage: opt })}
                      className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                        data.powerDropAmperage === opt
                          ? "border-[#35bdf2] bg-[#35bdf2]/10 text-[#0f1b57]"
                          : "border-[#d7dce3] bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Number of Power Drops
                  <InfoTooltip text="Total number of dedicated circuits needed. Common breakdowns: 1–2 at stage, 1 at FOH mix position, 1 at video village." />
                </label>
                <Stepper
                  value={data.numberOfPowerDrops || "1"}
                  onChange={(v) => onChange({ numberOfPowerDrops: v })}
                  min={1}
                  max={20}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className={labelClass}>
            Wireless Internet Required? <span className="text-red-500">*</span>
            <InfoTooltip text="Indicates whether WiFi coverage is needed for attendees, crew, or AV systems. Required for live polling, digital Q&A, event apps, and streaming encoders." />
          </label>
          <YesNo
            value={data.wirelessInternetRequired}
            onChange={(v) =>
              onChange({
                wirelessInternetRequired: v,
                internetUseCases: v !== "YES" ? [] : data.internetUseCases,
              })
            }
          />
          {showErrors && !data.wirelessInternetRequired && (
            <p className="mt-1 text-xs text-red-500">Required</p>
          )}

          {data.wirelessInternetRequired === "YES" && (
            <div className={subPanelClass}>
              <p className={subPanelHeader}>Internet Use Cases</p>
              <p className="mb-3 text-xs text-slate-500">
                Select all that apply — DXG uses this to specify bandwidth requirements per use case.
              </p>
              <div className="flex flex-wrap gap-3">
                {INTERNET_USE_CASES.map((opt) => (
                  <PillCheckbox
                    key={opt}
                    label={opt}
                    checked={data.internetUseCases.includes(opt)}
                    onChange={() =>
                      onChange({
                        internetUseCases: toggleItem(data.internetUseCases, opt),
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────
            Block 5 — Compliance & Access
        ───────────────────────────────────────── */}
        <Group label="Compliance &amp; Access" />

        <div className="mb-6">
          <label className={labelClass}>
            COI Requirements
            <InfoTooltip text="Most venues require the AV company to provide a Certificate of Insurance naming the venue as an additional insured before load-in begins. Paste the venue's specific COI language or requirements here." />
          </label>
          <textarea
            rows={4}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#35bdf2] focus:outline-none focus:ring-2 focus:ring-[#35bdf2]/20"
            placeholder="Paste the venue's COI requirements, additional insured language, or submission deadline…"
            value={data.coiRequirements}
            onChange={(e) => onChange({ coiRequirements: e.target.value })}
          />
          <p className={`mt-1 text-right text-xs ${coiLen >= 450 ? "text-amber-500" : "text-slate-400"}`}>
            {coiLen}/500
          </p>
        </div>

        <div className="mb-6">
          <label className={labelClass}>
            Venue Access Requirements
            <InfoTooltip text="Any venue-specific restrictions on load-in times, freight elevator reservations, dock scheduling, security badge requirements, or areas requiring escort. This goes directly into the venue logistics section of the RFP." />
          </label>
          <textarea
            rows={3}
            maxLength={400}
            className="w-full resize-none rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#35bdf2] focus:outline-none focus:ring-2 focus:ring-[#35bdf2]/20"
            placeholder="e.g. Load-in after 6am only, freight elevator reservations required 48hrs in advance, all crew must badge in at security…"
            value={data.venueAccessRequirements}
            onChange={(e) =>
              onChange({ venueAccessRequirements: e.target.value })
            }
          />
          <p className={`mt-1 text-right text-xs ${accessLen >= 360 ? "text-amber-500" : "text-slate-400"}`}>
            {accessLen}/400
          </p>
        </div>

      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-[#d7dce3] px-5 py-2.5 text-sm font-semibold text-[#1f2d5d] hover:bg-[#f5f7ff] transition-colors"
        >
          ← Video Recording
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 rounded-lg bg-[#35bdf2]! px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(53,189,242,0.35)] hover:bg-[#20a9de] transition-colors active:scale-95"
        >
          Budget &amp; Proposal →
        </button>
      </div>
    </section>
  );
};

export default VenueTechnicalRequirements;
