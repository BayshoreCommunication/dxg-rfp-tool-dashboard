"use client";
import { InfoTooltip, PillCheckbox, PillRadio, toggleItem } from "./shared";

type ProposalSettings = {
  branding: { linkPrefix: string; defaultFont: "Inter" | "Poppins" | "Roboto" };
  proposals: {
    proposalLanguage: string; defaultCurrency: string; expiryDate: string;
    priceSeparator: string; dateFormat: string; decimalPrecision: string;
  };
};

export type VideoRecordingData = {
  /* Camera Setup */
  totalCameraCount: string;
  cameraTypes: string[];
  cameraPositions: string[];
  liveSwitchedProgram: "YES" | "NO" | "";
  technicalDirectorNeeded: "YES" | "NO" | "";

  /* Recording Format */
  recordingResolution: string;
  recordingFormat: string;
  redundantRecording: "YES" | "NO" | "";
  isoRecording: "YES" | "NO" | "";

  /* Deliverables */
  deliverableFormat: string;
  deliveryMethod: string;
  deliveryTimeline: string;
  sessionSplitFiles: "YES" | "NO" | "";
  editedHighlightCut: "YES" | "NO" | "";
  highlightCutLength: string;

  /* IMAG */
  imagRequired: "YES" | "NO" | "";
  imagOutputCount: string;

  /* Specialty */
  droneFootage: "YES" | "NO" | "";
  greenScreenRecording: "YES" | "NO" | "";
  threeSixtyRecording: "YES" | "NO" | "";

  additionalRecordingNotes: string;
};

export const defaultVideoRecording = (): VideoRecordingData => ({
  totalCameraCount: "",
  cameraTypes: [],
  cameraPositions: [],
  liveSwitchedProgram: "",
  technicalDirectorNeeded: "",
  recordingResolution: "",
  recordingFormat: "",
  redundantRecording: "",
  isoRecording: "",
  deliverableFormat: "",
  deliveryMethod: "",
  deliveryTimeline: "",
  sessionSplitFiles: "",
  editedHighlightCut: "",
  highlightCutLength: "",
  imagRequired: "",
  imagOutputCount: "",
  droneFootage: "",
  greenScreenRecording: "",
  threeSixtyRecording: "",
  additionalRecordingNotes: "",
});

/* ─── Tailwind-safe YES/NO button classes ─── */
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

const Group = ({ label }: { label: string }) => (
  <div className="mb-5 mt-8 border-t border-[#e8edf5] pt-6 first:mt-0 first:border-0 first:pt-0">
    <p className={groupLabelClass}>{label}</p>
  </div>
);

const CAMERA_TYPES = [
  "Manned (operated)",
  "PTZ (robotic / remote)",
  "Jib / Crane",
  "Steadicam / Handheld",
  "Drone / Aerial",
  "Webcam / Remote Presenter",
];

const CAMERA_POSITIONS = [
  "Front-of-House (FOH)",
  "Stage Level (close-up)",
  "Roving / Audience",
  "Balcony / Elevated",
  "Backstage / Greenroom",
  "Registration / Lobby",
];

interface Props {
  data: VideoRecordingData;
  onChange: (updates: Partial<VideoRecordingData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors: boolean;
  proposalSettings: ProposalSettings;
}

const VideoRecordingStep = ({ data, onChange, onContinue, onBack, proposalSettings }: Props) => {
  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white">
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#35bdf2]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#35bdf2]">
            Page 5 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Video Recording</h2>
        <p className="mt-1 text-sm text-[#8f98bf]">
          Cameras, recording specs, deliverables, and post-production requirements.
        </p>
      </div>

      <div className="flex-1 px-8 py-8">
      {/* ── Camera Setup ── */}
      <Group label="Camera Setup" />

      <div className="mb-6">
        <label className={labelClass}>
          Total Number of Cameras
          <InfoTooltip text="The total camera count across all rooms and spaces. Each camera requires an operator (or PTZ controller), cabling, and a record channel. This is the primary driver of the camera package line item in the RFP." />
        </label>
        <input
          type="number"
          min={1}
          className={inputClass}
          placeholder="e.g. 3"
          value={data.totalCameraCount}
          onChange={(e) => onChange({ totalCameraCount: e.target.value })}
          style={{ maxWidth: 200 }}
        />
      </div>

      <div className="mb-6">
        <label className={labelClass}>
          Camera Types Required
          <InfoTooltip text="Select all camera types needed. 'Manned' cameras provide the highest-quality coverage with a dedicated operator. PTZ cameras allow remote-controlled positioning without a dedicated operator per camera. Mixed packages are common for large events." />
        </label>
        <div className="flex flex-wrap gap-3">
          {CAMERA_TYPES.map((opt) => (
            <PillCheckbox
              key={opt}
              label={opt}
              checked={(data.cameraTypes ?? []).includes(opt)}
              onChange={() => onChange({ cameraTypes: toggleItem(data.cameraTypes ?? [], opt) })}
            />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className={labelClass}>
          Camera Positions / Coverage Areas
          <InfoTooltip text="Where cameras will be physically placed. Each position requires planning for sight lines, cabling runs, and floor space. Front-of-House is standard; additional positions increase production value but add crew and equipment cost." />
        </label>
        <div className="flex flex-wrap gap-3">
          {CAMERA_POSITIONS.map((opt) => (
            <PillCheckbox
              key={opt}
              label={opt}
              checked={(data.cameraPositions ?? []).includes(opt)}
              onChange={() => onChange({ cameraPositions: toggleItem(data.cameraPositions ?? [], opt) })}
            />
          ))}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-5">
        {/* Live Switched Program */}
        <div>
          <label className={labelClass}>
            Live Switched Program Cut?
            <InfoTooltip text="A real-time edit where a Technical Director switches between camera feeds live, producing a finished program cut during the event. Required for livestreams and IMAG. Adds a video switcher and TD to the proposal." />
          </label>
          <YesNo value={data.liveSwitchedProgram} onChange={(v) => onChange({ liveSwitchedProgram: v })} />
        </div>

        {/* Technical Director */}
        <div>
          <label className={labelClass}>
            Dedicated Technical Director (TD)?
            <InfoTooltip text="The TD calls camera cuts, manages graphics playback, and ensures the program output is clean. Required for any multi-camera switched production or hybrid/live stream event. Adds a senior operator line item to the proposal." />
          </label>
          <YesNo value={data.technicalDirectorNeeded} onChange={(v) => onChange({ technicalDirectorNeeded: v })} />
        </div>
      </div>

      {/* ── Recording Format ── */}
      <Group label="Recording Format" />

      <div className="mb-6 grid grid-cols-2 gap-5">
        {/* Resolution */}
        <div>
          <label className={labelClass}>
            Recording Resolution
            <InfoTooltip text="The pixel resolution of the recorded files. 1080p is standard for most corporate events and sufficient for web distribution. 4K is preferred when content will be used in broadcast, large-screen playback, or heavily edited post-production." />
          </label>
          <select
            className={inputClass}
            value={data.recordingResolution}
            onChange={(e) => onChange({ recordingResolution: e.target.value })}
          >
            <option value="">Select resolution…</option>
            <option>720p HD</option>
            <option>1080p Full HD (standard)</option>
            <option>4K UHD</option>
            <option>Vendor Recommendation</option>
          </select>
        </div>

        {/* Recording Format */}
        <div>
          <label className={labelClass}>
            Recording File Format
            <InfoTooltip text="The container and codec format of the delivered files. MP4/H.264 is web-ready and universally compatible. ProRes is preferred for post-production editing due to its high-quality, low-compression codec. MXF is a broadcast standard." />
          </label>
          <select
            className={inputClass}
            value={data.recordingFormat}
            onChange={(e) => onChange({ recordingFormat: e.target.value })}
          >
            <option value="">Select format…</option>
            <option>MP4 / H.264 (web-ready)</option>
            <option>ProRes (post-production)</option>
            <option>MOV</option>
            <option>MXF (broadcast)</option>
            <option>Vendor Recommendation</option>
          </select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-5">
        {/* Redundant Recording */}
        <div>
          <label className={labelClass}>
            Redundant / Backup Recording?
            <InfoTooltip text="A secondary recorder running in parallel as a failsafe. Strongly recommended for keynotes or VIP sessions where a recording failure would be unacceptable. Adds a redundant record deck to the proposal." />
          </label>
          <YesNo value={data.redundantRecording} onChange={(v) => onChange({ redundantRecording: v })} />
        </div>

        {/* ISO Recording */}
        <div>
          <label className={labelClass}>
            ISO Recording (per-camera)?
            <InfoTooltip text="Records each camera feed as a separate, isolated file in addition to the switched program cut. Enables full re-editing in post-production. Requires additional storage and record channels — adds cost but gives maximum post-production flexibility." />
          </label>
          <YesNo value={data.isoRecording} onChange={(v) => onChange({ isoRecording: v })} />
        </div>
      </div>

      {/* ── Deliverables ── */}
      <Group label="Deliverables" />

      <div className="mb-6 grid grid-cols-2 gap-5">
        {/* Deliverable Format */}
        <div>
          <label className={labelClass}>
            Final Deliverable Format
            <InfoTooltip text="The format in which the final edited files are delivered to you. MP4/H.264 is the standard for web uploads (YouTube, Vimeo). ProRes is for editing suites. If unsure, MP4 is the safest choice for most corporate use cases." />
          </label>
          <select
            className={inputClass}
            value={data.deliverableFormat}
            onChange={(e) => onChange({ deliverableFormat: e.target.value })}
          >
            <option value="">Select format…</option>
            <option>MP4 / H.264</option>
            <option>ProRes (editing-ready)</option>
            <option>MOV</option>
            <option>Both MP4 and ProRes</option>
          </select>
        </div>

        {/* Delivery Method */}
        <div>
          <label className={labelClass}>
            Delivery Method
            <InfoTooltip text="How the finished files are transferred to you. WeTransfer and cloud links are best for files under 10GB. Physical drives (USB/HDD) are preferred for large multi-camera ISO packages. FTP is used for enterprise workflows." />
          </label>
          <select
            className={inputClass}
            value={data.deliveryMethod}
            onChange={(e) => onChange({ deliveryMethod: e.target.value })}
          >
            <option value="">Select method…</option>
            <option>Cloud Link (WeTransfer / Dropbox / Drive)</option>
            <option>USB Drive (handed on-site)</option>
            <option>External Hard Drive</option>
            <option>FTP / SFTP</option>
            <option>Vendor Recommendation</option>
          </select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-5">
        {/* Delivery Timeline */}
        <div>
          <label className={labelClass}>
            Delivery Timeline
            <InfoTooltip text="When the final deliverables need to be in your hands. Same-day or 24-hour turnarounds require a dedicated on-site editor and significantly increase production cost. Typical post-production is 1–2 weeks for a basic edit." />
          </label>
          <select
            className={inputClass}
            value={data.deliveryTimeline}
            onChange={(e) => onChange({ deliveryTimeline: e.target.value })}
          >
            <option value="">Select timeline…</option>
            <option>Same Day (on-site edit)</option>
            <option>Within 24 Hours</option>
            <option>Within 3 Business Days</option>
            <option>1 Week Post-Event</option>
            <option>2 Weeks Post-Event</option>
            <option>Flexible</option>
          </select>
        </div>

        {/* Session Split Files */}
        <div>
          <label className={labelClass}>
            Split Into Individual Session Files?
            <InfoTooltip text="Whether the recording is delivered as one continuous file per room or cut into separate files per session/speaker. Individual session files allow easier distribution of specific talks and are essential for on-demand content libraries." />
          </label>
          <YesNo value={data.sessionSplitFiles} onChange={(v) => onChange({ sessionSplitFiles: v })} />
        </div>
      </div>

      {/* Edited Highlight Cut */}
      <div className="mb-6">
        <label className={labelClass}>
          Edited Highlight Cut Needed?
          <InfoTooltip text="A short curated edit (typically 2–5 minutes) combining the best moments from across the event. Used for post-event social media, internal comms, and sponsor reports. Adds an editing labor line item to the proposal." />
        </label>
        <YesNo
          value={data.editedHighlightCut}
          onChange={(v) => onChange({ editedHighlightCut: v, highlightCutLength: v !== "YES" ? "" : data.highlightCutLength })}
        />
        {data.editedHighlightCut === "YES" && (
          <div className={subPanelClass}>
            <p className={subPanelHeader}>Highlight Cut Sub-Questions</p>
            <label className={labelClass}>
              Desired Length
              <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
              <InfoTooltip text="Target runtime for the highlight edit. Shorter edits (60–90 sec) are ideal for social media. Longer cuts (3–5 min) work better for stakeholder reports and internal sharing." />
            </label>
            <div className="flex flex-wrap gap-3">
              {["30–60 seconds", "60–90 seconds", "2–3 minutes", "3–5 minutes", "5+ minutes"].map((opt) => (
                <PillRadio
                  key={opt}
                  name="highlightCutLength"
                  value={opt}
                  checked={data.highlightCutLength === opt}
                  onChange={() => onChange({ highlightCutLength: opt })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── IMAG ── */}
      <Group label="IMAG (Image Magnification)" />

      <div className="mb-6">
        <label className={labelClass}>
          IMAG Required?
          <InfoTooltip text="Image Magnification projects a live camera feed onto the main screen so the audience can see the speaker up close. Essential for rooms where stage-to-back-of-room distance exceeds 50–60 feet. Requires a live switched program and at least one manned camera." />
        </label>
        <YesNo
          value={data.imagRequired}
          onChange={(v) => onChange({ imagRequired: v, imagOutputCount: v !== "YES" ? "" : data.imagOutputCount })}
        />
        {data.imagRequired === "YES" && (
          <div className={subPanelClass}>
            <p className={subPanelHeader}>IMAG Sub-Questions</p>
            <label className={labelClass}>
              Number of IMAG Outputs / Screens
              <span className="ml-2 text-xs font-normal normal-case text-slate-400">(conditional)</span>
              <InfoTooltip text="How many screens will display the live IMAG feed. Multiple outputs require additional distribution amplifiers and cabling runs, adding to the video system cost." />
            </label>
            <input
              type="number"
              min={1}
              className={inputClass}
              placeholder="e.g. 2"
              value={data.imagOutputCount}
              onChange={(e) => onChange({ imagOutputCount: e.target.value })}
              style={{ maxWidth: 200 }}
            />
          </div>
        )}
      </div>

      {/* ── Specialty ── */}
      <Group label="Specialty Capture" />

      <div className="mb-6 grid grid-cols-3 gap-5">
        {/* Drone */}
        <div>
          <label className={labelClass}>
            Drone / Aerial Footage?
            <InfoTooltip text="FAA-licensed drone operation for aerial establishing shots, venue exteriors, or crowd overviews. Requires advance approval from the venue and local FAA coordination. Adds a drone operator and permitting line item to the proposal." />
          </label>
          <YesNo value={data.droneFootage} onChange={(v) => onChange({ droneFootage: v })} />
        </div>

        {/* Green Screen */}
        <div>
          <label className={labelClass}>
            Green Screen / Virtual BG Recording?
            <InfoTooltip text="Shooting presenters against a green screen for virtual background compositing in post-production. Requires specific lighting (no spill, even illumination), a green screen backdrop, and post-production compositing time." />
          </label>
          <YesNo value={data.greenScreenRecording} onChange={(v) => onChange({ greenScreenRecording: v })} />
        </div>

        {/* 360 */}
        <div>
          <label className={labelClass}>
            360° / Immersive VR Recording?
            <InfoTooltip text="Full-sphere video capture for VR headset playback or immersive virtual event replays. Requires specialized 360° camera rigs, stitching software, and significantly higher post-production time." />
          </label>
          <YesNo value={data.threeSixtyRecording} onChange={(v) => onChange({ threeSixtyRecording: v })} />
        </div>
      </div>

      {/* Additional Notes */}
      <div className="mb-8">
        <label className={labelClass}>
          Additional Recording Notes
          <span className="ml-2 text-xs font-normal normal-case tracking-normal text-slate-400">(Optional)</span>
          <InfoTooltip text="Any additional camera or recording requirements, specific shot lists, broadcast standards, or notes for the AV production team not covered above." />
        </label>
        <textarea
          rows={4}
          className="w-full resize-none rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#35bdf2] focus:outline-none focus:ring-2 focus:ring-[#35bdf2]/20"
          placeholder="Describe any specific shot requirements, broadcast specs, or post-production notes…"
          value={data.additionalRecordingNotes}
          onChange={(e) => onChange({ additionalRecordingNotes: e.target.value })}
        />
      </div>

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
          className="flex items-center gap-2 rounded-lg !bg-[#35bdf2] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(53,189,242,0.35)] hover:bg-[#20a9de] transition-colors active:scale-95"
        >
          Venue &amp; Technical →
        </button>
      </div>
    </section>
  );
};

export default VideoRecordingStep;
