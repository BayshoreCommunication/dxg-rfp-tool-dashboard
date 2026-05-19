"use client";

import type { HybridVirtualData, ProposalSettings } from "../AddNewProposal";
import { InfoTooltip } from "./shared";
import { ArrowLeft, ArrowRight } from "lucide-react";

/* ─── Shared style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#8f98bf] border-b border-[#d7dce3] pb-2";

const streamingPlatformOptions = [
  "Client-Owned Platform",
  "Attendee Hub (Cvent)",
  "Zoom Webinar",
  "ON24",
  "Hopin",
  "Webex Events",
  "YouTube Live",
  "Vendor Recommendation Needed",
  "Other",
];

const streamOwnershipOptions = [
  "AV Vendor Owns Full Stream",
  "Client Owns Platform / Vendor Provides Feed",
  "Third-Party Broadcast Partner",
  "TBD",
];

const remoteFeedPlatformOptions = [
  "Zoom",
  "Microsoft Teams",
  "StreamYard",
  "Riverside",
  "LiveU/SRT Feed",
  "Other",
];

const techRehearsalOwnerOptions = [
  "DXG Runs Rehearsal",
  "Client Runs Rehearsal",
  "Shared / Joint Rehearsal",
  "TBD",
];

const captionLanguageOptions = [
  "English",
  "Spanish",
  "French",
  "Mandarin",
  "Portuguese",
  "German",
  "Japanese",
  "Arabic",
  "Other",
];

/* ─── Yes/No button pair ─── */
const yesNoCls = (opt: "YES" | "NO", value: string): string => {
  const base =
    "flex h-10 min-w-18 cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all";
  if (value !== opt)
    return `${base} border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300`;
  if (opt === "YES") return `${base} border-emerald-400 bg-emerald-50 text-emerald-700`;
  return `${base} border-rose-400 bg-rose-50 text-rose-700`;
};

const YesNo = ({
  name,
  value,
  onChange,
}: {
  name: string;
  value: "YES" | "NO" | "";
  onChange: (v: "YES" | "NO") => void;
}) => (
  <div className="flex gap-3">
    {(["YES", "NO"] as const).map((opt) => (
      <label key={opt} className={yesNoCls(opt, value)}>
        <input
          type="radio"
          name={name}
          checked={value === opt}
          onChange={() => onChange(opt)}
          className="sr-only"
        />
        {opt === "YES" ? "✓ Yes" : "✗ No"}
      </label>
    ))}
  </div>
);

/* ─── Conditional sub-panel wrapper ─── */
const SubPanel = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-3 rounded-md border border-[#d7dce3] bg-slate-50 p-4 space-y-4">
    <p className="text-xs font-bold uppercase tracking-wide text-[#8f98bf]">
      Sub-Questions — Triggered
    </p>
    {children}
  </div>
);

interface HybridVirtualStepProps {
  data: HybridVirtualData;
  onChange: (updates: Partial<HybridVirtualData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
  eventFormat?: string;
}

const HybridVirtualStep = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
  proposalSettings,
  eventFormat = "",
}: HybridVirtualStepProps) => {
  const isVirtualOnly = eventFormat === "Virtual Only";
  const hasRemoteSpeakers = data.remoteSpeakers.remoteSpeakers === "YES";
  const hasClosedCaptions = data.closedCaptions.closedCaptions === "YES";
  const defaultHV: HybridVirtualData = {
    virtualAttendeeEstimate: "",
    streamingPlatform: "",
    streamingPlatformOther: "",
    platformIntegrationWithAv: "",
    streamOwnership: "",
    remoteSpeakers: {
      remoteSpeakers: "",
      howManyRemoteSpeakers: "",
      remoteFeedPlatform: "",
      techRehearsalOwner: "",
    },
    liveVirtualQa: "",
    virtualOnlyBreakouts: "",
    dedicatedVirtualProducer: "",
    closedCaptions: {
      closedCaptions: "",
      captionLanguages: [],
      captionType: "",
    },
    onDemandRecording: "",
    sponsorOverlays: "",
    virtualNetworking: "",
  };
  const safeData: HybridVirtualData = {
    ...defaultHV,
    ...data,
    remoteSpeakers: { ...defaultHV.remoteSpeakers, ...data.remoteSpeakers },
    closedCaptions: { ...defaultHV.closedCaptions, ...data.closedCaptions },
  };

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{
        fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)`,
      }}
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#00c2c9]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#00c2c9]">
            Page 3 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">
          {isVirtualOnly ? "Virtual" : "Hybrid"} &amp; Virtual Production
        </h2>
        <p className="mt-1 text-sm text-[#8f98bf]">
          Conditional {isVirtualOnly ? "virtual" : "hybrid"} production requirements — active because you selected{" "}
          {isVirtualOnly ? "Virtual Only" : "Hybrid or Virtual"} format.
        </p>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-8 py-8 space-y-10">

        {/* ── Group: Virtual Audience ── */}
        <div>
          <p className={groupLabelClass}>Virtual Audience</p>
          <div className="space-y-6">

            {/* Row: Attendee Estimate + Streaming Platform */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>
                  Virtual Attendee Estimate
                  <InfoTooltip text="Expected number of remote viewers. Helps vendors size streaming infrastructure — CDN, encoding bandwidth, and platform licensing tiers." />
                </label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="e.g. 3500"
                  value={safeData.virtualAttendeeEstimate}
                  onChange={(e) =>
                    onChange({ virtualAttendeeEstimate: e.target.value })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>
                  Streaming Platform
                  <InfoTooltip text="The platform delivering the virtual experience to remote attendees. If unsure, select 'Vendor Recommendation Needed' — DXG will suggest the best fit based on your scope." />
                </label>
                <select
                  className={`${inputClass} appearance-none`}
                  value={safeData.streamingPlatform}
                  onChange={(e) =>
                    onChange({
                      streamingPlatform: e.target.value,
                      ...(e.target.value !== "Other" && {
                        streamingPlatformOther: "",
                      }),
                    })
                  }
                >
                  <option value="">Select platform...</option>
                  {streamingPlatformOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {safeData.streamingPlatform === "Other" && (
                  <input
                    type="text"
                    className={`${inputClass} mt-2`}
                    placeholder="Specify platform..."
                    value={safeData.streamingPlatformOther}
                    onChange={(e) =>
                      onChange({ streamingPlatformOther: e.target.value })
                    }
                  />
                )}
              </div>
            </div>

            {/* Row: Platform Integration + Stream Ownership */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>
                  Platform Integration with In-Room AV?
                  <InfoTooltip text="Whether the streaming platform connects directly with the in-room video signal chain. Deep integration requires additional switching and encoding gear — affects technical scope and crew count." />
                </label>
                <YesNo
                  name="platformIntegrationWithAv"
                  value={safeData.platformIntegrationWithAv}
                  onChange={(v) => onChange({ platformIntegrationWithAv: v })}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Stream Ownership
                  <InfoTooltip text="Clarifies who operates and manages the live stream. 'AV Vendor Owns Full Stream' means DXG handles everything end-to-end. 'Client Owns Platform' means DXG provides the feed but the client manages delivery." />
                </label>
                <select
                  className={`${inputClass} appearance-none`}
                  value={safeData.streamOwnership}
                  onChange={(e) =>
                    onChange({ streamOwnership: e.target.value })
                  }
                >
                  <option value="">Select ownership model...</option>
                  {streamOwnershipOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Group: Remote Speakers & Q&A ── */}
        <div>
          <p className={groupLabelClass}>Remote Speakers &amp; Q&amp;A</p>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-5">

              {/* Remote Speakers */}
              <div>
                <label className={labelClass}>
                  Remote Speakers Presenting Into Room?
                  <InfoTooltip text="Whether any presenters will join virtually and be displayed on screen in the physical room. Requires a dedicated encoder/decoder setup, confidence monitor for virtual feed, and an operator to manage the handoff." />
                </label>
                <YesNo
                  name="remoteSpeakers"
                  value={safeData.remoteSpeakers.remoteSpeakers}
                  onChange={(v) =>
                    onChange({
                      remoteSpeakers: {
                        ...safeData.remoteSpeakers,
                        remoteSpeakers: v,
                        ...(v === "NO" && {
                          howManyRemoteSpeakers: "",
                          remoteFeedPlatform: "",
                          techRehearsalOwner: "",
                        }),
                      },
                    })
                  }
                />
                {hasRemoteSpeakers && (
                  <SubPanel>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>
                          How Many Remote Speakers?
                          <InfoTooltip text="The number of virtual presenters who need to be brought into the room. Each additional speaker may require a separate encoding input and dedicated operator attention." />
                        </label>
                        <input
                          type="number"
                          className={inputClass}
                          placeholder="e.g. 3"
                          value={safeData.remoteSpeakers.howManyRemoteSpeakers}
                          onChange={(e) =>
                            onChange({
                              remoteSpeakers: {
                                ...safeData.remoteSpeakers,
                                howManyRemoteSpeakers: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>
                          Remote Feed Platform
                          <InfoTooltip text="The app remote speakers will use to connect. StreamYard and Riverside are most AV-friendly for broadcast integration; Zoom and Teams require NDI or hardware bridging." />
                        </label>
                        <select
                          className={`${inputClass} appearance-none`}
                          value={safeData.remoteSpeakers.remoteFeedPlatform}
                          onChange={(e) =>
                            onChange({
                              remoteSpeakers: {
                                ...safeData.remoteSpeakers,
                                remoteFeedPlatform: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">Select platform...</option>
                          {remoteFeedPlatformOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>
                        Tech Rehearsal Owner
                        <InfoTooltip text="Who is responsible for running the pre-event tech rehearsal with remote speakers. Affects producer scheduling and pre-show call sheet." />
                      </label>
                      <select
                        className={`${inputClass} appearance-none`}
                        value={safeData.remoteSpeakers.techRehearsalOwner}
                        onChange={(e) =>
                          onChange({
                            remoteSpeakers: {
                              ...safeData.remoteSpeakers,
                              techRehearsalOwner: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="">Select owner...</option>
                        {techRehearsalOwnerOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </SubPanel>
                )}
              </div>

              {/* Live Virtual Q&A */}
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>
                    Live Virtual Q&amp;A Integration?
                    <InfoTooltip text="Whether virtual attendees can submit questions in real time during sessions. Requires platform integration and a dedicated operator to moderate and display questions." />
                  </label>
                  <YesNo
                    name="liveVirtualQa"
                    value={safeData.liveVirtualQa}
                    onChange={(v) => onChange({ liveVirtualQa: v })}
                  />
                </div>

                {/* Virtual-Only Breakout Sessions */}
                <div>
                  <label className={labelClass}>
                    Virtual-Only Breakout Sessions?
                    <InfoTooltip text="Whether the event includes separate breakout rooms or tracks for virtual-only attendees. A platform capability that affects producer workload and platform configuration scope." />
                  </label>
                  <YesNo
                    name="virtualOnlyBreakouts"
                    value={safeData.virtualOnlyBreakouts}
                    onChange={(v) => onChange({ virtualOnlyBreakouts: v })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Group: Captions & Deliverables ── */}
        <div>
          <p className={groupLabelClass}>Captions &amp; Deliverables</p>
          <div className="space-y-6">

            {/* Row: Virtual Producer + Closed Captions */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>
                  Dedicated Virtual Producer?
                  <InfoTooltip text="A DXG producer whose sole focus is managing the virtual side of the show — monitoring stream health, managing remote speaker handoffs, moderating virtual Q&A, and troubleshooting platform issues in real time. Strongly recommended for events with 500+ virtual attendees or multiple remote speakers." />
                </label>
                <YesNo
                  name="dedicatedVirtualProducer"
                  value={safeData.dedicatedVirtualProducer}
                  onChange={(v) => onChange({ dedicatedVirtualProducer: v })}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Closed Captions / Translation?
                  <InfoTooltip text="Live closed captioning delivered to virtual attendees. Required for ADA compliance in many jurisdictions and for events with international audiences." />
                </label>
                <YesNo
                  name="closedCaptions"
                  value={safeData.closedCaptions.closedCaptions}
                  onChange={(v) =>
                    onChange({
                      closedCaptions: {
                        ...safeData.closedCaptions,
                        closedCaptions: v,
                        ...(v === "NO" && {
                          captionLanguages: [],
                          captionType: "",
                        }),
                      },
                    })
                  }
                />
                {hasClosedCaptions && (
                  <SubPanel>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>
                          Languages
                          <InfoTooltip text="Each language that needs to be captioned. Each additional language typically requires a separate captioner or AI processing stream — select all that apply." />
                        </label>
                        <div className="flex flex-col gap-2 mt-1">
                          {captionLanguageOptions.map((lang) => (
                            <label
                              key={lang}
                              className="flex items-center gap-2 text-sm text-[#1f2d5d] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={safeData.closedCaptions.captionLanguages.includes(
                                  lang,
                                )}
                                onChange={() => {
                                  const langs =
                                    safeData.closedCaptions.captionLanguages;
                                  onChange({
                                    closedCaptions: {
                                      ...safeData.closedCaptions,
                                      captionLanguages: langs.includes(lang)
                                        ? langs.filter((l) => l !== lang)
                                        : [...langs, lang],
                                    },
                                  });
                                }}
                                className="accent-[#00c2c9] h-4 w-4"
                              />
                              {lang}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>
                          Caption Source
                          <InfoTooltip text="AI auto-captions are fast and affordable but have accuracy limitations. 'AI with Human Review' balances cost and accuracy. Human CART captioners provide near-perfect accuracy — required for legal, medical, or government events." />
                        </label>
                        <select
                          className={`${inputClass} appearance-none`}
                          value={safeData.closedCaptions.captionType}
                          onChange={(e) =>
                            onChange({
                              closedCaptions: {
                                ...safeData.closedCaptions,
                                captionType: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">Select source...</option>
                          <option>AI Auto-Captions Acceptable</option>
                          <option>AI with Human Review</option>
                          <option>Human Captioner Required</option>
                        </select>
                      </div>
                    </div>
                  </SubPanel>
                )}
              </div>
            </div>

            {/* Row: On-Demand + Sponsor Overlays + Virtual Networking */}
            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className={labelClass}>
                  On-Demand Recording?
                  <InfoTooltip text="Whether the stream will be recorded and made available for viewing after the event. Requires cloud storage, post-event processing, and delivery setup." />
                </label>
                <YesNo
                  name="onDemandRecording"
                  value={safeData.onDemandRecording}
                  onChange={(v) => onChange({ onDemandRecording: v })}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Sponsor Overlays on Stream?
                  <InfoTooltip text="Branded lower-thirds, full-screen sponsor bumpers, or overlay graphics displayed during the virtual broadcast. Requires a graphics operator and pre-built assets." />
                </label>
                <YesNo
                  name="sponsorOverlays"
                  value={safeData.sponsorOverlays}
                  onChange={(v) => onChange({ sponsorOverlays: v })}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Virtual Networking?
                  <InfoTooltip text="Whether the platform includes virtual breakout rooms or structured networking sessions for remote attendees. Affects producer workload and platform configuration scope." />
                </label>
                <YesNo
                  name="virtualNetworking"
                  value={safeData.virtualNetworking}
                  onChange={(v) => onChange({ virtualNetworking: v })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer Nav ── */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-200"
        >
          <ArrowLeft size={15} className="shrink-0" />
          Room Specifications
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(14,165,233,0.6)] active:translate-y-0"
          style={{ background: "linear-gradient(135deg, #00c2c9 0%, #06b6d4 30%, #0ea5e9 60%, #2563eb 100%)" }}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
          Content &amp; Creative
          <ArrowRight size={15} className="shrink-0" />
        </button>
      </div>
    </section>
  );
};

export default HybridVirtualStep;
