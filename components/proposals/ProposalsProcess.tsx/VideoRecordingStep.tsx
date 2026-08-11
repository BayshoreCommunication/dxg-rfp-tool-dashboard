"use client";

import { InfoTooltip, PillCheckbox, toggleItem } from "./shared";
import { ArrowLeft, ArrowRight } from "lucide-react";
import GlobalSelect from "@/components/shared/GlobalSelect";
import { useState } from "react";

type ProposalSettings = {
  branding: { linkPrefix: string; defaultFont: "Inter" | "Poppins" | "Roboto" };
  proposals: {
    proposalLanguage: string; defaultCurrency: string; expiryDate: string;
    priceSeparator: string; dateFormat: string; decimalPrecision: string;
  };
};

export type VideoRecordingData = {
  videoRecordingRequired: "YES" | "NO" | "";
  /* Camera Plan */
  numberOfCameras: string;
  cameraPositions: string[];
  imagRequired: "YES" | "NO" | "";
  cameraOperators: string;
  isoRecordings: string;
  recordingCodec: "H.264" | "H.265" | "ProRes" | "";
  recordIn4k: "YES" | "NO" | "";
  /* Recording & Deliverables */
  recordingResolution: string;
  recordingMedia: string;
  editedDeliverable: {
    needed: "YES" | "NO" | "";
    deliverableType: string[];
    turnaroundTime: string;
    reelLengthPreference: string;
  };
  rawFootageTurnover: "YES" | "NO" | "";
  deliverableFormat: string[];
  deliveryMethod: string[];
};

export const defaultVideoRecording = (): VideoRecordingData => ({
  videoRecordingRequired: "",
  numberOfCameras: "",
  cameraPositions: [],
  imagRequired: "",
  cameraOperators: "",
  isoRecordings: "",
  recordingCodec: "",
  recordIn4k: "",
  recordingResolution: "",
  recordingMedia: "",
  editedDeliverable: {
    needed: "",
    deliverableType: [],
    turnaroundTime: "",
    reelLengthPreference: "",
  },
  rawFootageTurnover: "",
  deliverableFormat: [],
  deliveryMethod: [],
});

/* ─── Style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#222628] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1DBFD3] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#969798] border-b border-[#e4e4e4] pb-2";
const subPanelClass =
  "mt-3 rounded-xl border border-[#eeeeee] bg-[#f9f9f9] p-4 space-y-4";

/* ─── Yes/No buttons ─── */
const yesNoCls = (opt: "YES" | "NO", value: string): string => {
  const base =
    "flex h-10 min-w-[72px] cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all";
  if (value !== opt)
    return `${base} border-[#e4e4e4] bg-white text-[#969798] hover:border-slate-300`;
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
    <button type="button" className={yesNoCls("YES", value)} onClick={() => onChange("YES")}>
      ✓ Yes
    </button>
    <button type="button" className={yesNoCls("NO", value)} onClick={() => onChange("NO")}>
      ✗ No
    </button>
  </div>
);

/* ─── Gateway card (same pattern as Page 4) ─── */
const GatewayCard = ({
  isSelected,
  title,
  description,
  onClick,
}: {
  isSelected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full flex-col rounded-xl border-2 p-5 text-left transition-all ${
      isSelected
        ? "border-[#1DBFD3] bg-[#1DBFD3]/5"
        : "border-[#e4e4e4] bg-white hover:border-[#1DBFD3]/40"
    }`}
  >
    <div className="flex items-center gap-3 mb-2">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          isSelected ? "border-[#1DBFD3] bg-[#1DBFD3]" : "border-[#e4e4e4]"
        }`}
      >
        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
      <span
        className={`text-sm font-bold ${isSelected ? "text-[#1DBFD3]" : "text-[#222628]"}`}
      >
        {title}
      </span>
    </div>
    <p className="ml-8 text-xs leading-relaxed text-[#969798]">{description}</p>
  </button>
);

/* ─── Props ─── */
interface Props {
  data: VideoRecordingData;
  onChange: (updates: Partial<VideoRecordingData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors: boolean;
  proposalSettings: ProposalSettings;
  onDemandRecording?: "YES" | "NO" | "";
  sizzleRecapOwner?: string;
}

const VideoRecordingStep = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors,
  proposalSettings,
  onDemandRecording = "",
  sizzleRecapOwner = "",
}: Props) => {
  const def = defaultVideoRecording();
  const safeData: VideoRecordingData = {
    ...def,
    ...data,
    editedDeliverable: { ...def.editedDeliverable, ...(data.editedDeliverable ?? {}) },
    cameraPositions: data.cameraPositions ?? [],
    deliverableFormat: data.deliverableFormat ?? [],
    deliveryMethod: data.deliveryMethod ?? [],
  };

  const needsRecording = safeData.videoRecordingRequired === "YES";
  const [attemptedContinue, setAttemptedContinue] = useState(false);
  const recordingFormatMissing = needsRecording && (!safeData.recordingCodec || !safeData.recordIn4k);
  const revealRecordingErrors = showErrors || attemptedContinue;
  /* Cross-page suggestion: sizzle/recap owned by AV Vendor → suggest edited deliverable */
  const suggestEdited = sizzleRecapOwner === "AV Vendor" && safeData.editedDeliverable.needed !== "YES";

  /* Cross-page warning: on-demand recording selected on Page 3 */
  const onDemandWarning =
    onDemandRecording === "YES" && safeData.videoRecordingRequired !== "YES";

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#e4e4e4] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-[#e4e4e4]">
        <h2 className="text-[22px] font-bold text-[#222628]">Video Recording &amp; Broadcast</h2>
        <p className="mt-1 text-sm text-[#969798]">
          Cameras, recording specs, deliverables, and post-production requirements.
        </p>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-8 py-8 space-y-8">

        {/* Cross-page on-demand warning (shown before gateway) */}
        {onDemandWarning && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-bold shrink-0">⚠</span>
            <span>
              You indicated on-demand recording of the stream is needed in Hybrid &amp; Virtual. Recording must be enabled here as well.
            </span>
          </div>
        )}

        {/* Field 1 — Gateway */}
        <div>
          <label className={labelClass}>
            Video Recording Required?{" "}
            <span className="text-red-500">*</span>
            <InfoTooltip text="Do you need any sessions recorded during this event? Recording requires cameras, operators, recording media, and post-production deliverables. Even simple 'record the keynote for archival' requires planning. Select No only if absolutely no video capture is needed." />
          </label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <GatewayCard
              isSelected={safeData.videoRecordingRequired === "YES"}
              title="Yes — Record sessions during the event"
              description="You'll specify camera positions, recording format, and deliverables. Most professional events record at minimum the keynote."
              onClick={() => onChange({ videoRecordingRequired: "YES" })}
            />
            <GatewayCard
              isSelected={safeData.videoRecordingRequired === "NO"}
              title="No — No recording needed"
              description="The AV vendor will only execute the live show. Section 5 will be omitted from your RFP."
              onClick={() => onChange({
                videoRecordingRequired: "NO",
                recordingCodec: "",
                recordIn4k: "",
              })}
            />
          </div>
        </div>

        {/* NO state info panel */}
        {safeData.videoRecordingRequired === "NO" && (
          <div className="rounded-xl border border-[#e4e4e4] bg-[#f9f9f9] px-6 py-5">
            <p className="text-sm font-semibold text-[#222628]">Section 5 will be omitted from your RFP</p>
            <p className="mt-1 text-xs text-[#969798]">
              The AV vendor will execute the live show only. No cameras or recording equipment will be scoped.
            </p>
          </div>
        )}

        {/* YES: Full recording scope */}
        {needsRecording && (
          <>
            {/* ── Recording & Deliverables ── */}
            <div>
              <p className={groupLabelClass}>Recording &amp; Deliverables</p>
              <div className="space-y-6">

                <div>
                  <label className={labelClass}>
                    ISO Recording Strategy <span className="text-red-500">*</span>
                    <InfoTooltip text="Choose whether the vendor records the switched program, isolated camera feeds, or both. Camera types and quantities are configured per room." />
                  </label>
                  <GlobalSelect
                    className={`${inputClass} appearance-none`}
                    value={safeData.isoRecordings}
                    onChange={(e) => onChange({ isoRecordings: e.target.value })}
                  >
                    <option value="">Select ISO strategy…</option>
                    <option>Switched Program Cut Only</option>
                    <option>ISO Per Camera Only</option>
                    <option>Both ISO + Switched Program Cut</option>
                    <option>Vendor Recommendation</option>
                  </GlobalSelect>
                </div>

                <div className="grid grid-cols-3 gap-5">
                  <div>
                    <label className={labelClass}>
                      Recording Codec <span className="text-red-500">*</span>
                      <InfoTooltip text="Choose the acquisition codec the vendor must use. H.264 is broadly compatible, H.265 is more efficient, and ProRes is optimized for professional post-production." />
                    </label>
                    <GlobalSelect
                      className={`${inputClass} appearance-none ${revealRecordingErrors && !safeData.recordingCodec ? "border-red-400" : ""}`}
                      value={safeData.recordingCodec}
                      onChange={(e) => onChange({ recordingCodec: e.target.value as VideoRecordingData["recordingCodec"] })}
                    >
                      <option value="">Select codec…</option>
                      <option>H.264</option><option>H.265</option><option>ProRes</option>
                    </GlobalSelect>
                  </div>

                  <div>
                    <label className={labelClass}>Record in 4K? <span className="text-red-500">*</span></label>
                    <YesNo value={safeData.recordIn4k} onChange={(value) => onChange({ recordIn4k: value })} />
                    {revealRecordingErrors && !safeData.recordIn4k && <p className="mt-2 text-xs text-red-500">Choose Yes or No.</p>}
                  </div>

                  <div>
                    <label className={labelClass}>
                      Recording Media / Backup <span className="text-red-500">*</span>
                      <InfoTooltip text="Who provides and manages recording media (SD cards, SSDs)? Cloud backup is strongly recommended — media failures happen, and losing a CEO keynote is unacceptable. Vendor-managed with cloud backup is the safest option but adds cost." />
                    </label>
                    <GlobalSelect
                      className={`${inputClass} appearance-none`}
                      value={safeData.recordingMedia}
                      onChange={(e) => onChange({ recordingMedia: e.target.value })}
                    >
                      <option value="">Select media strategy…</option>
                      <option>Vendor-Managed</option>
                      <option>Client-Provided Media</option>
                      <option>Vendor-Managed with Cloud Backup</option>
                      <option>Client-Provided + Cloud Backup</option>
                    </GlobalSelect>
                  </div>
                </div>

                {/* Field 9 — Edited Deliverable */}
                <div>
                  <label className={labelClass}>
                    Edited Deliverable Required? <span className="text-red-500">*</span>
                    <InfoTooltip text="Do you need edited video deliverables — highlight reels or polished session edits — in addition to raw footage? Edited deliverables require a video editor, time, and an approval workflow." />
                  </label>
                  {suggestEdited && (
                    <p className="mb-2 text-xs font-medium text-[#1DBFD3]">
                      ⚡ You assigned Sizzle/Recap Video to the AV vendor under Content &amp; Creative — enabling an edited deliverable here is recommended.
                    </p>
                  )}
                  <YesNo
                    value={safeData.editedDeliverable.needed}
                    onChange={(v) =>
                      onChange({
                        editedDeliverable: {
                          ...safeData.editedDeliverable,
                          needed: v,
                          ...(v === "NO" && {
                            deliverableType: [],
                            turnaroundTime: "",
                            reelLengthPreference: "",
                          }),
                        },
                      })
                    }
                  />

                  {safeData.editedDeliverable.needed === "YES" && (
                    <div className={subPanelClass}>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#969798]">
                        Edited Deliverable Details
                      </p>

                      {/* 9a — Deliverable Type */}
                      <div>
                        <label className={labelClass}>
                          Deliverable Type <span className="text-red-500">*</span>
                          <InfoTooltip text="Highlight reels are 3–5 minute recap videos showing event energy and key moments. Full session edits are color-corrected, audio-mixed full presentations ready for on-demand viewing." />
                        </label>
                        <div className="flex flex-wrap gap-3">
                          {["Highlight Reel Per Day", "Full Session Edits", "Both"].map((opt) => (
                            <PillCheckbox
                              key={opt}
                              label={opt}
                              checked={safeData.editedDeliverable.deliverableType.includes(opt)}
                              onChange={() =>
                                onChange({
                                  editedDeliverable: {
                                    ...safeData.editedDeliverable,
                                    deliverableType: toggleItem(
                                      safeData.editedDeliverable.deliverableType,
                                      opt,
                                    ),
                                  },
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>

                      {/* 9b + 9c — Turnaround + Reel Length */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>
                            Turnaround Time <span className="text-red-500">*</span>
                            <InfoTooltip text="Same-day editing requires an on-site editor working in parallel with the live show — significantly increases cost. 48-hour turnaround is the sweet spot for fast-but-polished." />
                          </label>
                          <GlobalSelect
                            className={`${inputClass} appearance-none`}
                            value={safeData.editedDeliverable.turnaroundTime}
                            onChange={(e) =>
                              onChange({
                                editedDeliverable: {
                                  ...safeData.editedDeliverable,
                                  turnaroundTime: e.target.value,
                                },
                              })
                            }
                          >
                            <option value="">Select turnaround…</option>
                            <option>Same-Day</option>
                            <option>48 Hours</option>
                            <option>1 Week</option>
                            <option>Post-Event (2–4 weeks)</option>
                          </GlobalSelect>
                          {safeData.editedDeliverable.turnaroundTime === "Same-Day" && (
                            <p className="mt-1 text-xs font-medium text-amber-600">
                              ⚡ Same-day editing requires an on-site editor — adds significant cost.
                            </p>
                          )}
                        </div>

                        <div>
                          <label className={labelClass}>
                            Reel Length Preference
                            <span className="ml-2 text-xs font-normal normal-case tracking-normal text-slate-400">(Recommended)</span>
                            <InfoTooltip text="Approximate length for highlight reels. Standard ranges: 60–90 seconds for social media, 3–5 minutes for closing sessions/internal share, 5–10 minutes for marketing recap videos." />
                          </label>
                          <input
                            type="text"
                            className={inputClass}
                            placeholder="e.g. 3–5 min"
                            value={safeData.editedDeliverable.reelLengthPreference}
                            onChange={(e) =>
                              onChange({
                                editedDeliverable: {
                                  ...safeData.editedDeliverable,
                                  reelLengthPreference: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Field 10 — Raw Footage Turnover */}
                <div>
                  <label className={labelClass}>
                    Raw Footage Turnover? <span className="text-red-500">*</span>
                    <InfoTooltip text="Do you want full turnover of all raw ISO files in addition to any edited deliverable? Raw turnover gives you complete editing flexibility. Files can be very large for multi-camera 4K events — confirm your storage and transfer capability." />
                  </label>
                  <YesNo
                    value={safeData.rawFootageTurnover}
                    onChange={(v) => onChange({ rawFootageTurnover: v })}
                  />
                </div>

                {/* Fields 11 + 12 — Format + Delivery Method */}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>
                      Deliverable Format <span className="text-red-500">*</span>
                      <InfoTooltip text="MP4 (H.264) is the universal format — plays everywhere, smaller files, good for distribution. ProRes is the broadcast editing standard — much larger files but preserves quality through editing. Most events need both: ProRes for archival, MP4 for distribution." />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {["MP4 (H.264)", "ProRes (Raw)", "Both", "Platform-Specific"].map((opt) => (
                        <PillCheckbox
                          key={opt}
                          label={opt}
                          checked={safeData.deliverableFormat.includes(opt)}
                          onChange={() =>
                            onChange({ deliverableFormat: toggleItem(safeData.deliverableFormat, opt) })
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Delivery Method <span className="text-red-500">*</span>
                      <InfoTooltip text="Hard drive on-site is fastest for very large files (multi-camera 4K events can produce 1–5TB of footage) — you walk away with everything at strike. Cloud upload is more convenient but requires vendor time and bandwidth post-event." />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {["Hard Drive (On-Site)", "Cloud Upload (Client Link)", "Both"].map((opt) => (
                        <PillCheckbox
                          key={opt}
                          label={opt}
                          checked={safeData.deliveryMethod.includes(opt)}
                          onChange={() =>
                            onChange({ deliveryMethod: toggleItem(safeData.deliveryMethod, opt) })
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}

      </div>

      {/* ── Footer Nav ── */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#e4e4e4]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-200"
        >
          <ArrowLeft size={15} className="shrink-0" />
          Content &amp; Creative
        </button>
        <button
          type="button"
          onClick={() => {
            setAttemptedContinue(true);
            if (!recordingFormatMissing) onContinue();
          }}
          className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(14,165,233,0.6)] active:translate-y-0"
          style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #1DBFD3 100%)" }}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
          Venue &amp; Technical
          <ArrowRight size={15} className="shrink-0" />
        </button>
      </div>
    </section>
  );
};

export default VideoRecordingStep;
