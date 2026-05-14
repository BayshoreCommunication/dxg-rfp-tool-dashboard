"use client";

import type { ProposalSettings, VenueTechnicalData } from "../AddNewProposal";
import { InfoTooltip, PillCheckbox, PillRadio, toggleItem } from "./shared";

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

/* ─── Tailwind-safe YES/NO buttons ─── */
const yesNoCls = (opt: "YES" | "NO", value: string): string => {
  const base =
    "flex h-10 min-w-[72px] cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all";
  if (value !== opt) return `${base} border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300`;
  if (opt === "YES") return `${base} border-emerald-400 bg-emerald-50 text-emerald-700`;
  return `${base} border-rose-400 bg-rose-50 text-rose-700`;
};

const YesNo = ({ value, onChange }: { value: string; onChange: (v: "YES" | "NO") => void }) => (
  <div className="flex gap-3">
    <button type="button" className={yesNoCls("YES", value)} onClick={() => onChange("YES")}>✓ Yes</button>
    <button type="button" className={yesNoCls("NO", value)} onClick={() => onChange("NO")}>✗ No</button>
  </div>
);

const Group = ({ label }: { label: string }) => (
  <div className="mb-5 mt-8 border-t border-[#e8edf5] pt-6 first:mt-0 first:border-0 first:pt-0">
    <p className={groupLabelClass}>{label}</p>
  </div>
);

/* ─── Options ─── */
const RIGGING_TYPES = [
  "Chain Motor (electric)",
  "Dead Hang (static)",
  "Beam Clamp",
  "Span Set / Basket",
  "Ground Support Structure",
];

const AMP_OPTIONS = ["15amp", "20amp", "30amp", "100amp", "200amp", "400amp"];

const COI_COVERAGE_TYPES = [
  "General Liability",
  "Workers' Compensation",
  "Auto Liability",
  "Umbrella / Excess",
  "Professional Liability",
];

const LIVESTREAM_PLATFORMS = ["Zoom", "Teams", "Vimeo", "YouTube Live", "Hopin", "Cvent", "Other"];

interface Props {
  data: VenueTechnicalData;
  onChange: (updates: Partial<VenueTechnicalData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
}

const VenueTechnicalRequirements = ({
  data: rawData,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
}: Props) => {
  /* guard against stale/legacy data missing new fields */
  const data: VenueTechnicalData = {
    riggingTypes: [],
    pointLoadLimitKnown: "",
    generatorBackup: "",
    wirelessInternetAttendees: "",
    streamingBandwidthRequired: "",
    streamingMbpsNeeded: "",
    coiRequiredByVenue: "",
    coiCoverageTypes: [],
    additionalInsured: "",
    coiSubmissionDeadline: "",
    venueContactName: "",
    loadingDockAccess: "",
    freightElevatorAvailable: "",
    ceilingHeight: "",
    inHouseAvExclusivity: "",
    inHouseAvCompanyName: "",
    ...rawData,
    needRiggingForFlown: rawData.needRiggingForFlown ?? { needRiggingForFlown: "", riggingPlotOrSpecs: "" },
    needDedicatedPowerDrops: rawData.needDedicatedPowerDrops ?? { needDedicatedPowerDrops: "", standardAmpWall: "" },
    hardlineInternet: rawData.hardlineInternet ?? { hardlineInternet: "", hardlineInternetPurpose: "" },
    livestreamVirtual: rawData.livestreamVirtual ?? { livestreamVirtual: "", livestreamPlatform: "" },
  };

  const errCls = (v: string) =>
    showErrors && !v.trim() ? "border-red-400 focus:border-red-400" : "";

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#35bdf2]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#35bdf2]">
            Page 6 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Venue &amp; Technical Requirements</h2>
        <p className="mt-1 text-sm text-[#8f98bf]">
          Power, rigging, internet, COI, and venue access requirements.
        </p>
      </div>

      <div className="flex-1 space-y-2 px-8 py-8">

        {/* ── Rigging ── */}
        <Group label="Rigging" />

        <div className="mb-6">
          <label className={labelClass}>
            Need Rigging for Flown Elements? <span className="text-red-500">*</span>
            <InfoTooltip text="Flown elements include speakers, lighting trusses, LED walls, or screens suspended from the ceiling. Most venues require certified riggers for any overhead load. This triggers a rigging labor and hardware line item in the RFP." />
          </label>
          <YesNo
            value={data.needRiggingForFlown.needRiggingForFlown}
            onChange={(v) =>
              onChange({ needRiggingForFlown: { ...data.needRiggingForFlown, needRiggingForFlown: v } })
            }
          />
          {showErrors && !data.needRiggingForFlown.needRiggingForFlown && (
            <p className="mt-1 text-xs text-red-500">Required</p>
          )}

          {data.needRiggingForFlown.needRiggingForFlown === "YES" && (
            <div className={subPanelClass}>
              <p className={subPanelHeader}>Rigging Sub-Questions</p>

              <div className="mb-4">
                <label className={labelClass}>
                  Rigging Method(s)
                  <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                  <InfoTooltip text="The type of rigging hardware determines certified weight loads, insurance requirements, and lead time for pre-rig. Chain motors are the most common for large events. Dead hang is for lighter static loads." />
                </label>
                <div className="flex flex-wrap gap-3">
                  {RIGGING_TYPES.map((opt) => (
                    <PillCheckbox
                      key={opt}
                      label={opt}
                      checked={(data.riggingTypes ?? []).includes(opt)}
                      onChange={() => onChange({ riggingTypes: toggleItem(data.riggingTypes ?? [], opt) })}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className={labelClass}>
                  Rigging Plot or Existing Specs Available?
                  <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                  <InfoTooltip text="A rigging plot shows certified attachment points, beam locations, and point-load limits. Sharing it early allows the AV company to design their hang without guessing and avoids costly on-site changes." />
                </label>
                <input
                  className={inputClass}
                  placeholder="Describe or paste a link to the rigging plot…"
                  value={data.needRiggingForFlown.riggingPlotOrSpecs}
                  onChange={(e) =>
                    onChange({ needRiggingForFlown: { ...data.needRiggingForFlown, riggingPlotOrSpecs: e.target.value } })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>
                  Point Load Limits Known?
                  <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                  <InfoTooltip text="Point load is the maximum weight the ceiling structure can bear at a single attachment point. Knowing these limits upfront prevents rigging redesigns that delay load-in. If unknown, the AV company will need to request them from the venue." />
                </label>
                <YesNo
                  value={data.pointLoadLimitKnown}
                  onChange={(v) => onChange({ pointLoadLimitKnown: v })}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Power ── */}
        <Group label="Power" />

        <div className="mb-6">
          <label className={labelClass}>
            Need Dedicated Power Drops? <span className="text-red-500">*</span>
            <InfoTooltip text="Dedicated drops provide isolated electrical circuits for AV equipment, preventing interference and tripped breakers from shared venue power. Required for large LED walls, power-hungry audio systems, and any event using 200A+ total load." />
          </label>
          <YesNo
            value={data.needDedicatedPowerDrops.needDedicatedPowerDrops}
            onChange={(v) =>
              onChange({ needDedicatedPowerDrops: { ...data.needDedicatedPowerDrops, needDedicatedPowerDrops: v } })
            }
          />
          {showErrors && !data.needDedicatedPowerDrops.needDedicatedPowerDrops && (
            <p className="mt-1 text-xs text-red-500">Required</p>
          )}

          {data.needDedicatedPowerDrops.needDedicatedPowerDrops === "YES" && (
            <div className={subPanelClass}>
              <p className={subPanelHeader}>Power Sub-Questions</p>

              <div className="mb-4">
                <label className={labelClass}>
                  Standard Amp Wall Available
                  <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                  <InfoTooltip text="The amperage of the venue's standard in-wall power service. Determines if AV can tap venue power or needs to bring a distro system. Most ballrooms have 100–200A service; smaller rooms may only have 20–30A circuits." />
                </label>
                <div className="flex flex-wrap gap-3">
                  {AMP_OPTIONS.map((opt) => (
                    <PillRadio
                      key={opt}
                      name="standardAmpWall"
                      value={opt}
                      checked={data.needDedicatedPowerDrops.standardAmpWall === opt}
                      onChange={() =>
                        onChange({ needDedicatedPowerDrops: { ...data.needDedicatedPowerDrops, standardAmpWall: opt } })
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  How Many Drops / Where?
                  <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                  <InfoTooltip text="Specify drop locations and quantities — e.g. '2 at stage, 1 at FOH mix position, 1 at upstage.' The AV company uses this to plan cable runs and coordinate with the venue electrician." />
                </label>
                <textarea
                  rows={3}
                  className={`w-full resize-none rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#35bdf2] focus:outline-none focus:ring-2 focus:ring-[#35bdf2]/20 ${errCls(data.powerDropsHowMany)}`}
                  placeholder="e.g. 2 at stage, 1 at FOH mix position…"
                  value={data.powerDropsHowMany}
                  onChange={(e) => onChange({ powerDropsHowMany: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className={labelClass}>
            Generator / Backup Power Needed?
            <InfoTooltip text="A generator provides independent power for mission-critical AV systems (confidence monitors, IEM systems, streaming encoders) in case of a venue power failure. Strongly recommended for outdoor events or venues with unreliable power history." />
          </label>
          <YesNo value={data.generatorBackup} onChange={(v) => onChange({ generatorBackup: v })} />
        </div>

        {/* ── Internet & Connectivity ── */}
        <Group label="Internet & Connectivity" />

        <div className="mb-6">
          <label className={labelClass}>
            Hardline Internet Required? <span className="text-red-500">*</span>
            <InfoTooltip text="Ethernet (hardline) internet provides a stable, dedicated connection for AV systems such as streaming encoders, video conferencing, or remote presenters. Unlike WiFi, it cannot be interrupted by competing traffic or signal interference." />
          </label>
          <YesNo
            value={data.hardlineInternet.hardlineInternet}
            onChange={(v) =>
              onChange({ hardlineInternet: { ...data.hardlineInternet, hardlineInternet: v } })
            }
          />
          {showErrors && !data.hardlineInternet.hardlineInternet && (
            <p className="mt-1 text-xs text-red-500">Required</p>
          )}

          {data.hardlineInternet.hardlineInternet === "YES" && (
            <div className={subPanelClass}>
              <p className={subPanelHeader}>Internet Sub-Questions</p>
              <label className={labelClass}>
                Purpose / Use Case
                <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                <InfoTooltip text="Describes what the hardline connection will drive — e.g. streaming encoder, Zoom/Teams for remote presenters, digital signage, or IPTV feeds. Helps the AV company specify the required bandwidth and coordinate with the venue's IT team." />
              </label>
              <textarea
                rows={2}
                className={`w-full resize-none rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#35bdf2] focus:outline-none focus:ring-2 focus:ring-[#35bdf2]/20 ${errCls(data.hardlineInternet.hardlineInternetPurpose)}`}
                placeholder="e.g. Livestream encoder, remote presenter via Zoom…"
                value={data.hardlineInternet.hardlineInternetPurpose}
                onChange={(e) =>
                  onChange({ hardlineInternet: { ...data.hardlineInternet, hardlineInternetPurpose: e.target.value } })
                }
              />
            </div>
          )}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>
              Wireless Internet for Attendees? <span className="text-red-500">*</span>
              <InfoTooltip text="Indicates whether the venue must provide WiFi coverage for the general audience. Required for live polling, digital Q&A, and attendee-facing event apps. Affects venue network capacity planning." />
            </label>
            <YesNo
              value={data.wirelessInternetAttendees}
              onChange={(v) => onChange({ wirelessInternetAttendees: v })}
            />
            {showErrors && !data.wirelessInternetAttendees && (
              <p className="mt-1 text-xs text-red-500">Required</p>
            )}
          </div>

          <div>
            <label className={labelClass}>
              Dedicated Streaming Bandwidth Required?
              <InfoTooltip text="For livestreamed events, the AV company needs guaranteed upload bandwidth separate from general venue WiFi. Typically 10–50 Mbps upload per stream. Venues must commit to this in writing for it to be reliable." />
            </label>
            <YesNo
              value={data.streamingBandwidthRequired}
              onChange={(v) =>
                onChange({ streamingBandwidthRequired: v, streamingMbpsNeeded: v !== "YES" ? "" : data.streamingMbpsNeeded })
              }
            />
          </div>
        </div>

        {data.streamingBandwidthRequired === "YES" && (
          <div className="mb-6">
            <div className={subPanelClass}>
              <p className={subPanelHeader}>Bandwidth Sub-Questions</p>
              <label className={labelClass}>
                Estimated Upload Speed Needed (Mbps)
                <InfoTooltip text="Rule of thumb: 1080p stream = 6–10 Mbps upload; 4K stream = 20–40 Mbps. Add overhead for redundancy. The AV company will confirm exact requirements based on your encoding setup." />
              </label>
              <input
                type="number"
                min={1}
                className={inputClass}
                placeholder="e.g. 20"
                value={data.streamingMbpsNeeded}
                onChange={(e) => onChange({ streamingMbpsNeeded: e.target.value })}
                style={{ maxWidth: 200 }}
              />
            </div>
          </div>
        )}

        {/* Livestream */}
        <div className="mb-6">
          <label className={labelClass}>
            Livestream or Virtual Component? <span className="text-red-500">*</span>
            <InfoTooltip text="Whether any part of the event will be broadcast live to a remote audience. This triggers encoder, streaming hardware, and dedicated internet coordination line items in Section 6 of the RFP." />
          </label>
          <YesNo
            value={data.livestreamVirtual.livestreamVirtual}
            onChange={(v) =>
              onChange({ livestreamVirtual: { ...data.livestreamVirtual, livestreamVirtual: v } })
            }
          />
          {showErrors && !data.livestreamVirtual.livestreamVirtual && (
            <p className="mt-1 text-xs text-red-500">Required</p>
          )}

          {data.livestreamVirtual.livestreamVirtual === "YES" && (
            <div className={subPanelClass}>
              <p className={subPanelHeader}>Livestream Sub-Questions</p>
              <label className={labelClass}>
                Streaming Platform
                <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                <InfoTooltip text="The platform receiving the encoded stream. Different platforms require different encoder settings (RTMP keys, resolution caps, latency modes). Selecting here lets the AV company pre-configure the encoder to spec." />
              </label>
              <div className="flex flex-wrap gap-3">
                {LIVESTREAM_PLATFORMS.map((opt) => (
                  <PillRadio
                    key={opt}
                    name="livestreamPlatform"
                    value={opt}
                    checked={data.livestreamVirtual.livestreamPlatform === opt}
                    onChange={() =>
                      onChange({ livestreamVirtual: { ...data.livestreamVirtual, livestreamPlatform: opt } })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Certificate of Insurance (COI) ── */}
        <Group label="Certificate of Insurance (COI)" />

        <div className="mb-6">
          <label className={labelClass}>
            COI Required by Venue? <span className="text-red-500">*</span>
            <InfoTooltip text="Most venues require the AV company to provide a Certificate of Insurance (COI) naming the venue as an additional insured before load-in begins. Missing a COI can delay or block entry. This triggers a COI coordination note in Section 6 of the RFP." />
          </label>
          <YesNo
            value={data.coiRequiredByVenue}
            onChange={(v) =>
              onChange({
                coiRequiredByVenue: v,
                coiCoverageTypes: v !== "YES" ? [] : data.coiCoverageTypes,
                additionalInsured: v !== "YES" ? "" : data.additionalInsured,
                coiSubmissionDeadline: v !== "YES" ? "" : data.coiSubmissionDeadline,
              })
            }
          />
          {showErrors && !data.coiRequiredByVenue && (
            <p className="mt-1 text-xs text-red-500">Required</p>
          )}

          {data.coiRequiredByVenue === "YES" && (
            <div className={subPanelClass}>
              <p className={subPanelHeader}>COI Sub-Questions</p>

              <div className="mb-4">
                <label className={labelClass}>
                  Coverage Types Required
                  <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                  <InfoTooltip text="The types of insurance coverage the venue requires the AV vendor to carry. General Liability is nearly universal. Workers' Comp is required when AV crew will be on-site. Umbrella coverage is often required for large events with high equipment values." />
                </label>
                <div className="flex flex-wrap gap-3">
                  {COI_COVERAGE_TYPES.map((opt) => (
                    <PillCheckbox
                      key={opt}
                      label={opt}
                      checked={(data.coiCoverageTypes ?? []).includes(opt)}
                      onChange={() =>
                        onChange({ coiCoverageTypes: toggleItem(data.coiCoverageTypes ?? [], opt) })
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>
                    Venue Listed as Additional Insured?
                    <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                    <InfoTooltip text="Most venues require to be named as an 'additional insured' on the AV vendor's GL policy. This extends liability coverage to the venue for incidents caused by the AV company. Required by virtually all hotel ballrooms and convention centers." />
                  </label>
                  <YesNo
                    value={data.additionalInsured}
                    onChange={(v) => onChange({ additionalInsured: v })}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    COI Submission Deadline
                    <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
                    <InfoTooltip text="When the COI must be submitted to the venue. Missing this deadline can trigger additional fees or access delays. The AV company needs this date to coordinate with their insurance broker." />
                  </label>
                  <select
                    className={inputClass}
                    value={data.coiSubmissionDeadline}
                    onChange={(e) => onChange({ coiSubmissionDeadline: e.target.value })}
                  >
                    <option value="">Select deadline…</option>
                    <option>At Contract Signing</option>
                    <option>30 Days Before Event</option>
                    <option>2 Weeks Before Event</option>
                    <option>1 Week Before Event</option>
                    <option>Before Load-In Day</option>
                    <option>TBD / Contact Venue</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Venue Access ── */}
        <Group label="Venue Access" />

        <div className="mb-6">
          <label className={labelClass}>
            Venue Contact Name
            <InfoTooltip text="The on-site venue coordinator the AV company should contact for load-in logistics, power hookups, and rigging approvals. Having a direct contact reduces day-of delays and ensures the right person is looped in before the AV team arrives." />
          </label>
          <input
            className={inputClass}
            placeholder="Full name and title (e.g. Jane Smith, Event Services Manager)"
            value={data.venueContactName}
            onChange={(e) => onChange({ venueContactName: e.target.value })}
          />
        </div>

        <div className="mb-6 grid grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>
              Loading Dock Access?
              <InfoTooltip text="Whether the venue has a dedicated freight / loading dock for AV truck deliveries. No dock means equipment must be hand-trucked through public entrances, which increases load-in time significantly and may require labor coordination." />
            </label>
            <YesNo value={data.loadingDockAccess} onChange={(v) => onChange({ loadingDockAccess: v })} />
          </div>

          <div>
            <label className={labelClass}>
              Freight Elevator Available?
              <InfoTooltip text="A freight elevator is required to move large AV cases (speakers, LED panels, cases on wheels) to upper floors. Without one, equipment must be broken down and carried via stairs or a limited-capacity passenger elevator, adding significant labor time." />
            </label>
            <YesNo value={data.freightElevatorAvailable} onChange={(v) => onChange({ freightElevatorAvailable: v })} />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>
              Ceiling Height (feet)
              <InfoTooltip text="Clear ceiling height determines what can be flown, how much throw distance projectors have, and whether LED walls will fit within sight lines. Sub-14ft ceilings typically restrict flying and require ground-supported structures." />
            </label>
            <input
              type="number"
              min={1}
              className={inputClass}
              placeholder="e.g. 30"
              value={data.ceilingHeight}
              onChange={(e) => onChange({ ceilingHeight: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>
              In-House AV Exclusivity?
              <InfoTooltip text="Some venues require you to use their in-house AV company exclusively or pay an exclusivity fee to bring an outside vendor. This is common at hotels and convention centers. Knowing this upfront avoids contract surprises." />
            </label>
            <YesNo
              value={data.inHouseAvExclusivity}
              onChange={(v) =>
                onChange({ inHouseAvExclusivity: v, inHouseAvCompanyName: v !== "YES" ? "" : data.inHouseAvCompanyName })
              }
            />
          </div>
        </div>

        {data.inHouseAvExclusivity === "YES" && (
          <div className="mb-6">
            <div className={subPanelClass}>
              <p className={subPanelHeader}>In-House AV Sub-Questions</p>
              <label className={labelClass}>
                In-House AV Company Name
                <InfoTooltip text="The name of the venue's preferred or exclusive in-house AV vendor. Helps the AV company determine whether they need to coordinate, negotiate a patch-in, or pay an exclusivity fee." />
              </label>
              <input
                className={inputClass}
                placeholder="e.g. PSAV, Encore, Freeman AV…"
                value={data.inHouseAvCompanyName}
                onChange={(e) => onChange({ inHouseAvCompanyName: e.target.value })}
              />
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
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
          className="flex items-center gap-2 rounded-lg bg-[#35bdf2] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(53,189,242,0.35)] hover:bg-[#20a9de] transition-colors active:scale-95"
        >
          Budget &amp; Proposal →
        </button>
      </div>
    </section>
  );
};

export default VenueTechnicalRequirements;
