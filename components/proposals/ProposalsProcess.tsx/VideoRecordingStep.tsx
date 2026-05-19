"use client";

import { InfoTooltip, PillCheckbox, toggleItem } from "./shared";

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
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#35bdf2] focus:outline-none focus:ring-2 focus:ring-[#35bdf2]/20";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#8f98bf] border-b border-[#d7dce3] pb-2";
const subPanelClass =
  "mt-3 rounded-xl border border-[#e0e7ff] bg-[#f5f7ff] p-4 space-y-4";

/* ─── Camera position options ─── */
const CAMERA_POSITIONS = [
  "Stage Wide Shot",
  "Speaker Close-Up",
  "Audience Reaction",
  "Presenter POV",
  "Roaming / Handheld",
  "Overhead / Jib",
  "All of the Above",
  "Vendor Recommendation",
];
const REAL_POSITIONS = CAMERA_POSITIONS.slice(0, 6);

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
  name,
  value,
  onChange,
}: {
  name: string;
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
        ? "border-[#35bdf2] bg-[#35bdf2]/5"
        : "border-[#d7dce3] bg-white hover:border-[#35bdf2]/40"
    }`}
  >
    <div className="flex items-center gap-3 mb-2">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          isSelected ? "border-[#35bdf2] bg-[#35bdf2]" : "border-[#d7dce3]"
        }`}
      >
        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
      <span
        className={`text-sm font-bold ${isSelected ? "text-[#35bdf2]" : "text-[#1f2d5d]"}`}
      >
        {title}
      </span>
    </div>
    <p className="ml-8 text-xs leading-relaxed text-[#8f98bf]">{description}</p>
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
  const camCount = parseInt(safeData.numberOfCameras) || 0;

  /* Camera position count vs camera count warning */
  const selectedRealPositions = safeData.cameraPositions.includes("All of the Above")
    ? REAL_POSITIONS.length
    : safeData.cameraPositions.filter((p) => !["All of the Above", "Vendor Recommendation"].includes(p)).length;
  const positionWarning =
    selectedRealPositions > 0 && camCount > 0 && selectedRealPositions > camCount
      ? `You've selected ${selectedRealPositions} positions but only ${camCount} camera${camCount !== 1 ? "s" : ""}. Consider increasing camera count or reducing positions, or note that some cameras will cover multiple angles.`
      : undefined;

  /* Camera count hint based on capacity (no data dependency here, just general hints) */
  const camHint =
    camCount === 0
      ? null
      : camCount === 1
      ? "Single-camera setups are only adequate for small breakout archival."
      : camCount >= 5
      ? "5+ cameras — suitable for broadcast-quality production."
      : camCount >= 3
      ? "3–5 cameras — standard professional setup."
      : "2 cameras — minimal; consider adding a 3rd for coverage flexibility.";

  /* Cross-page suggestion: sizzle/recap owned by AV Vendor → suggest edited deliverable */
  const suggestEdited = sizzleRecapOwner === "AV Vendor" && safeData.editedDeliverable.needed !== "YES";

  /* Cross-page warning: on-demand recording selected on Page 3 */
  const onDemandWarning =
    onDemandRecording === "YES" && safeData.videoRecordingRequired !== "YES";

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#35bdf2]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#35bdf2]">
            Page 5 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Video Recording &amp; Broadcast</h2>
        <p className="mt-1 text-sm text-[#8f98bf]">
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
              You indicated on-demand recording of the stream is needed (Page 3). Recording must be enabled here as well.
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
              onClick={() => onChange({ videoRecordingRequired: "NO" })}
            />
          </div>
        </div>

        {/* NO state info panel */}
        {safeData.videoRecordingRequired === "NO" && (
          <div className="rounded-xl border border-[#d7dce3] bg-[#f5f7ff] px-6 py-5">
            <p className="text-sm font-semibold text-[#1f2d5d]">Section 5 will be omitted from your RFP</p>
            <p className="mt-1 text-xs text-[#8f98bf]">
              The AV vendor will execute the live show only. No cameras or recording equipment will be scoped.
            </p>
          </div>
        )}

        {/* YES: Full recording scope */}
        {needsRecording && (
          <>
            {/* ── Camera Plan ── */}
            <div>
              <p className={groupLabelClass}>Camera Plan</p>
              <div className="space-y-6">

                {/* Field 2 — Number of Cameras */}
                <div>
                  <label className={labelClass}>
                    Number of Cameras Required <span className="text-red-500">*</span>
                    <InfoTooltip text="For a 1,000-person general session, 3–5 cameras is the standard minimum. For broadcast quality, plan for 5+. Single-camera setups are only adequate for archival recording of small breakouts. Each camera needs a position selection below." />
                  </label>
                  <div className="flex items-center gap-2" style={{ maxWidth: 200 }}>
                    <button
                      type="button"
                      onClick={() => onChange({ numberOfCameras: String(Math.max(1, camCount - 1)) })}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#d7dce3] bg-white text-lg font-bold text-[#1f2d5d] hover:bg-[#f5f7ff] transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      className={`${inputClass} text-center`}
                      placeholder="e.g. 3"
                      value={safeData.numberOfCameras}
                      onChange={(e) => onChange({ numberOfCameras: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ numberOfCameras: String(Math.min(20, camCount + 1)) })}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#d7dce3] bg-white text-lg font-bold text-[#1f2d5d] hover:bg-[#f5f7ff] transition-colors"
                    >
                      +
                    </button>
                  </div>
                  {camHint && (
                    <p className="mt-2 text-xs text-[#8f98bf] italic">{camHint}</p>
                  )}
                </div>

                {/* Field 3 — Camera Positions */}
                <div>
                  <label className={labelClass}>
                    Camera Positions Needed <span className="text-red-500">*</span>
                    <InfoTooltip text="Select all camera angles needed. Standard broadcast setup: stage wide + speaker close-up + audience reaction. Add roaming for energy, jib for cinematic feel. Total angles should roughly match camera count." />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {CAMERA_POSITIONS.map((opt) => (
                      <PillCheckbox
                        key={opt}
                        label={opt}
                        checked={safeData.cameraPositions.includes(opt)}
                        onChange={() =>
                          onChange({ cameraPositions: toggleItem(safeData.cameraPositions, opt) })
                        }
                      />
                    ))}
                  </div>
                  {positionWarning && (
                    <p className="mt-2 text-xs font-medium text-amber-600">⚠ {positionWarning}</p>
                  )}
                </div>

                {/* Field 4 — IMAG */}
                <div>
                  <label className={labelClass}>
                    IMAG (Image Magnification to Screens)? <span className="text-red-500">*</span>
                    <InfoTooltip text="Will cameras feed live IMAG to your LED wall or screens during the show? IMAG makes presenters visible to large audiences by projecting their live image onto large screens. Standard for rooms over 500 people. Requires a Technical Director (TD) and Video Engineer (V1) on crew." />
                  </label>
                  <YesNo
                    name="imagRequired"
                    value={safeData.imagRequired}
                    onChange={(v) => onChange({ imagRequired: v })}
                  />
                </div>

                {/* Fields 5 + 6 — Operators + ISO */}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>
                      Camera Operators <span className="text-red-500">*</span>
                      <InfoTooltip text="Dedicated operators provide the highest production quality — they frame shots, follow speakers, and react to action. Robotic cameras (PTZ) are operated remotely by a single technician and cost less. Most professional broadcasts use dedicated operators for stage cameras and robotics for audience/wide shots." />
                    </label>
                    <select
                      className={`${inputClass} appearance-none`}
                      value={safeData.cameraOperators}
                      onChange={(e) => onChange({ cameraOperators: e.target.value })}
                    >
                      <option value="">Select operator model…</option>
                      <option>Dedicated Operator Per Camera</option>
                      <option>Robotic Cameras Acceptable</option>
                      <option>Mixed — Operators on key cameras, robotic on auxiliary</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>
                      ISO Recordings Per Camera <span className="text-red-500">*</span>
                      <InfoTooltip text="ISO (isolated) = individual recording per camera. Program cut = single switched live output. Most professional productions capture BOTH — ISO gives editing flexibility post-event; program cut gives you a ready-to-publish version immediately." />
                    </label>
                    <select
                      className={`${inputClass} appearance-none`}
                      value={safeData.isoRecordings}
                      onChange={(e) => onChange({ isoRecordings: e.target.value })}
                    >
                      <option value="">Select ISO strategy…</option>
                      <option>Switched Program Cut Only</option>
                      <option>ISO Per Camera Only</option>
                      <option>Both ISO + Switched Program Cut</option>
                      <option>Vendor Recommendation</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Recording & Deliverables ── */}
            <div>
              <p className={groupLabelClass}>Recording &amp; Deliverables</p>
              <div className="space-y-6">

                {/* Fields 7 + 8 — Resolution + Media */}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>
                      Recording Resolution <span className="text-red-500">*</span>
                      <InfoTooltip text="4K is now the standard for professional events and future-proofs your footage. 1080p is sufficient if files will only be used for internal review or social clips. 4K dramatically increases storage needs." />
                    </label>
                    <select
                      className={`${inputClass} appearance-none`}
                      value={safeData.recordingResolution}
                      onChange={(e) => onChange({ recordingResolution: e.target.value })}
                    >
                      <option value="">Select resolution…</option>
                      <option>4K (Preferred)</option>
                      <option>1080p</option>
                      <option>Either Acceptable</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Recording Media / Backup <span className="text-red-500">*</span>
                      <InfoTooltip text="Who provides and manages recording media (SD cards, SSDs)? Cloud backup is strongly recommended — media failures happen, and losing a CEO keynote is unacceptable. Vendor-managed with cloud backup is the safest option but adds cost." />
                    </label>
                    <select
                      className={`${inputClass} appearance-none`}
                      value={safeData.recordingMedia}
                      onChange={(e) => onChange({ recordingMedia: e.target.value })}
                    >
                      <option value="">Select media strategy…</option>
                      <option>Vendor-Managed</option>
                      <option>Client-Provided Media</option>
                      <option>Vendor-Managed with Cloud Backup</option>
                      <option>Client-Provided + Cloud Backup</option>
                    </select>
                  </div>
                </div>

                {/* Field 9 — Edited Deliverable */}
                <div>
                  <label className={labelClass}>
                    Edited Deliverable Required? <span className="text-red-500">*</span>
                    <InfoTooltip text="Do you need edited video deliverables — highlight reels or polished session edits — in addition to raw footage? Edited deliverables require a video editor, time, and an approval workflow." />
                  </label>
                  {suggestEdited && (
                    <p className="mb-2 text-xs font-medium text-[#35bdf2]">
                      ⚡ You assigned Sizzle/Recap Video to the AV vendor on Page 4 — enabling an edited deliverable here is recommended.
                    </p>
                  )}
                  <YesNo
                    name="editedDeliverable"
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
                      <p className="text-xs font-bold uppercase tracking-wide text-[#8f98bf]">
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
                          <select
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
                          </select>
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
                    name="rawFootageTurnover"
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
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-[#d7dce3] px-5 py-2.5 text-sm font-semibold text-[#1f2d5d] hover:bg-[#f5f7ff] transition-colors"
        >
          ← Content &amp; Creative
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 rounded-lg bg-[#35bdf2]! px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(53,189,242,0.35)] hover:bg-[#20a9de] transition-colors active:scale-95"
        >
          Venue &amp; Technical →
        </button>
      </div>
    </section>
  );
};

export default VideoRecordingStep;
