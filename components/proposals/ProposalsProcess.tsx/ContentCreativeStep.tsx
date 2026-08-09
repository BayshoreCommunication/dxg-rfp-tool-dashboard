"use client";

import { InfoTooltip } from "./shared";
import { ArrowLeft, ArrowRight } from "lucide-react";

type ProposalSettings = {
  branding: { linkPrefix: string; defaultFont: "Inter" | "Poppins" | "Roboto" };
  proposals: {
    proposalLanguage: string; defaultCurrency: string; expiryDate: string;
    priceSeparator: string; dateFormat: string; decimalPrecision: string;
  };
};

export type ContentCreativeData = {
  contentServicesNeeded: "YES" | "NO" | "";
  presentationTemplateDesign: string;
  speakerSlideCollection: string;
  /** Legacy combined owner. Read-only compatibility fallback. */
  motionGraphicsOpenerVideo?: string;
  openingClosingVideo: string;
  motionGraphicsStingersBumpers: string;
  lowerThirdsNameSupers: string;
  eventLogoBrandStandards: string;
  sizzleRecapVideo: string;
  liveDataFeeds: {
    needed: "YES" | "NO" | "";
    ownership: string;
  };
  sponsorRecognitionContent: string;
  socialMediaContentCapture: string;
  virtualBackgroundDesign: string;
  creativeDirectionNotes: string;
};

export const defaultContentCreative = (): ContentCreativeData => ({
  contentServicesNeeded: "",
  presentationTemplateDesign: "",
  speakerSlideCollection: "",
  openingClosingVideo: "",
  motionGraphicsStingersBumpers: "",
  lowerThirdsNameSupers: "",
  eventLogoBrandStandards: "",
  sizzleRecapVideo: "",
  liveDataFeeds: { needed: "", ownership: "" },
  sponsorRecognitionContent: "",
  socialMediaContentCapture: "",
  virtualBackgroundDesign: "",
  creativeDirectionNotes: "",
});

/* ─── Style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#222628] uppercase tracking-wide";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#969798] border-b border-[#e4e4e4] pb-2";

/* ─── Ownership options ─── */
const OWNERSHIP_OPTS = [
  { value: "Client / Internal Team", label: "Client" },
  { value: "AV Vendor",              label: "AV Vendor" },
  { value: "TBD",                    label: "TBD" },
  { value: "N/A",                    label: "N/A" },
] as const;

const ownershipCls = (opt: string, value: string): string => {
  const base =
    "flex h-9 min-w-[72px] cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-semibold transition-all";
  if (value !== opt)
    return `${base} border-[#e4e4e4] bg-white text-[#969798] hover:border-slate-300`;
  if (opt === "Client / Internal Team")
    return `${base} border-[#1DBFD3] bg-[#1DBFD3]/5 text-brand-dark`;
  if (opt === "AV Vendor")
    return `${base} border-[#1DBFD3] bg-[#1DBFD3]/10 text-[#0097cc]`;
  if (opt === "TBD")
    return `${base} border-amber-400 bg-amber-50 text-amber-700`;
  return `${base} border-slate-300 bg-slate-100 text-slate-500`;
};

/* ─── Mini Yes/No (for live data feeds toggle) ─── */
const miniYesNoCls = (opt: "YES" | "NO", value: string): string => {
  const base =
    "flex h-9 min-w-[56px] cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-semibold transition-all";
  if (value !== opt)
    return `${base} border-[#e4e4e4] bg-white text-[#969798] hover:border-slate-300`;
  if (opt === "YES") return `${base} border-emerald-400 bg-emerald-50 text-emerald-700`;
  return `${base} border-rose-400 bg-rose-50 text-rose-700`;
};

/* ─── Matrix row ─── */
interface MatrixRowProps {
  label: string;
  helpText: string;
  value: string;
  onChange: (v: string) => void;
  warning?: string;
}

const MatrixRow = ({ label, helpText, value, onChange, warning }: MatrixRowProps) => (
  <div className="py-4 border-b border-[#f0f2f8] last:border-0">
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <span className="flex items-center gap-1 text-sm font-semibold text-[#222628]">
        {label}
        <InfoTooltip text={helpText} />
      </span>
      <div className="flex gap-2">
        {OWNERSHIP_OPTS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={ownershipCls(opt.value, value)}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
    {warning && (
      <p className="mt-2 text-xs font-medium text-amber-600">⚠ {warning}</p>
    )}
  </div>
);

/* ─── Gateway card ─── */
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
        className={`text-sm font-bold ${
          isSelected ? "text-[#1DBFD3]" : "text-[#222628]"
        }`}
      >
        {title}
      </span>
    </div>
    <p className="ml-8 text-xs leading-relaxed text-[#969798]">{description}</p>
  </button>
);

/* ─── Props ─── */
interface Props {
  data: ContentCreativeData;
  onChange: (updates: Partial<ContentCreativeData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors: boolean;
  proposalSettings: ProposalSettings;
  eventFormat?: string;
  sponsorOverlays?: "YES" | "NO" | "";
}

const ContentCreativeStep = ({
  data,
  onChange,
  onContinue,
  onBack,
  proposalSettings,
  eventFormat = "",
  sponsorOverlays = "",
}: Props) => {
  const def = defaultContentCreative();
  const safeData: ContentCreativeData = {
    ...def,
    ...data,
    liveDataFeeds: { ...def.liveDataFeeds, ...(data.liveDataFeeds ?? {}) },
  };

  const needsContent    = safeData.contentServicesNeeded === "YES";
  const isInPersonOnly  = eventFormat === "In-Person";
  const isHybridOrVirtual = eventFormat === "Hybrid" || eventFormat === "Virtual";
  const notesLen        = safeData.creativeDirectionNotes.length;
  const legacyVideoOwner = safeData.motionGraphicsOpenerVideo?.trim() ?? "";
  const showLegacyVideoOwner = Boolean(
    legacyVideoOwner && !safeData.openingClosingVideo && !safeData.motionGraphicsStingersBumpers,
  );

  const sponsorWarning =
    sponsorOverlays === "YES" && safeData.sponsorRecognitionContent === "N/A"
      ? "You indicated sponsor overlays will appear on the stream. Sponsor content cannot be N/A — please assign ownership."
      : undefined;

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#e4e4e4] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-[#e4e4e4]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#1DBFD3]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#1DBFD3]">
            Page 4 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#222628]">Content &amp; Creative</h2>
        <p className="mt-1 text-sm text-[#969798]">
          Graphics, presentations, video, and content ownership matrix.
        </p>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-8 py-8 space-y-8">

        {/* Field 1 — Gateway */}
        <div>
          <label className={labelClass}>
            Content / Creative Services Needed?{" "}
            <span className="text-red-500">*</span>
            <InfoTooltip text="Do you need the AV vendor to provide any content design or creative production services beyond live show technical execution? This includes designing slide templates, producing opener videos, building lower-third graphics, or creating sizzle reels. Select No if you have a separate creative agency handling all content and the AV vendor will only execute the live show." />
          </label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <GatewayCard
              isSelected={safeData.contentServicesNeeded === "YES"}
              title="Yes — I need creative/content services from the AV vendor"
              description="You'll specify which content elements the vendor will produce. Common when you don't have a separate creative agency."
              onClick={() => onChange({ contentServicesNeeded: "YES" })}
            />
            <GatewayCard
              isSelected={safeData.contentServicesNeeded === "NO"}
              title="No — Content is handled separately by my agency or in-house team"
              description="The AV vendor will only execute the live show. Section 4 will be omitted from your RFP."
              onClick={() => onChange({ contentServicesNeeded: "NO" })}
            />
          </div>
        </div>

        {/* ── NO state info panel ── */}
        {safeData.contentServicesNeeded === "NO" && (
          <div className="rounded-xl border border-[#e4e4e4] bg-[#f9f9f9] px-6 py-5">
            <p className="text-sm font-semibold text-[#222628]">
              Section 4 will be omitted from your RFP
            </p>
            <p className="mt-1 text-xs text-[#969798]">
              The AV vendor will execute the live show only. All content is being handled by your agency or in-house team.
            </p>
          </div>
        )}

        {/* ── YES: Content Responsibility Matrix (Fields 2–11) ── */}
        {needsContent && (
          <>
            <div>
              <p className={groupLabelClass}>Content Responsibility Matrix</p>
              <p className="mb-1 text-xs text-slate-500 italic">
                Select an owner for each content element. This table appears verbatim in Section 4 of your RFP.
              </p>
              <p className="mb-5 text-[11px] text-[#969798] italic">
                &quot;The table below defines content ownership responsibilities. Vendors must confirm their ability to deliver all items marked as AV Vendor responsibility and flag any items requiring clarification. TBD items should be addressed in the vendor&apos;s questions.&quot;
              </p>

              {/* Legend */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="text-xs text-[#969798] font-semibold uppercase tracking-wide">Key:</span>
                {OWNERSHIP_OPTS.map((opt) => (
                  <span key={opt.value} className={`text-xs px-2 py-1 rounded border font-semibold ${ownershipCls(opt.value, opt.value)}`}>
                    {opt.label}
                  </span>
                ))}
              </div>

              <div className="rounded-xl border border-[#e4e4e4] overflow-hidden">
                <div className="px-5">

                  {/* Field 2 */}
                  <MatrixRow
                    label="Presentation Template Design"
                    helpText="Who designs the master slide template used by all speakers? This is the branded PowerPoint/Keynote template with title slides, content slides, and transitions. AV vendors often build templates that align with stage scenic design."
                    value={safeData.presentationTemplateDesign}
                    onChange={(v) => onChange({ presentationTemplateDesign: v })}
                  />

                  {/* Field 3 */}
                  <MatrixRow
                    label="Speaker Slide Collection & Formatting"
                    helpText="Who collects slide decks from individual speakers and formats them to the master template? This involves chasing speakers for content (often last-minute), fixing fonts, applying branding, and queue management. Time-intensive — many planners outsource this."
                    value={safeData.speakerSlideCollection}
                    onChange={(v) => onChange({ speakerSlideCollection: v })}
                  />

                  {/* Field 4 */}
                  <MatrixRow
                    label="Opening / Closing Video"
                    helpText="Who produces the event's opening and closing videos? This scope covers the primary show-open and show-close pieces, independently from shorter motion-graphics assets."
                    value={safeData.openingClosingVideo}
                    onChange={(v) => onChange({ openingClosingVideo: v })}
                  />

                  {/* Field 5 */}
                  <MatrixRow
                    label="Motion Graphics / Stingers / Speaker Bumpers"
                    helpText="Who produces the short animated transitions, stingers, and speaker bumpers used throughout the show? These are separate deliverables from the main opening and closing videos."
                    value={safeData.motionGraphicsStingersBumpers}
                    onChange={(v) => onChange({ motionGraphicsStingersBumpers: v })}
                  />

                  {showLegacyVideoOwner && (
                    <div className="border-b border-[#f0f2f8] bg-amber-50/60 px-3 py-3 text-xs text-amber-800">
                      Legacy Motion Graphics / Opener Video owner: <strong>{legacyVideoOwner}</strong>. Assign the two new deliverables independently before saving to replace this combined value.
                    </div>
                  )}

                  {/* Field 6 */}
                  <MatrixRow
                    label="Lower Thirds & Name Supers"
                    helpText="Who builds and operates the speaker name/title graphics that appear on screen during presentations? These need to be built in advance and switched live during the show by a graphics operator."
                    value={safeData.lowerThirdsNameSupers}
                    onChange={(v) => onChange({ lowerThirdsNameSupers: v })}
                  />

                  {/* Field 6 */}
                  <MatrixRow
                    label="Event Logo & Brand Standards"
                    helpText="Who provides and owns the event logo, brand guidelines, and visual identity standards? Almost always client-owned, but occasionally an AV vendor with creative capability designs the event identity from scratch."
                    value={safeData.eventLogoBrandStandards}
                    onChange={(v) => onChange({ eventLogoBrandStandards: v })}
                  />

                  {/* Field 7 */}
                  <MatrixRow
                    label="Sizzle / Recap Video"
                    helpText="Who produces event highlight reels — either same-day 'best of' videos to play during the closing session, or post-event recap videos for marketing use? Requires camera operators and a video editor on-site or post-event."
                    value={safeData.sizzleRecapVideo}
                    onChange={(v) => onChange({ sizzleRecapVideo: v })}
                  />

                  {/* Field 8 — Live Data Feeds (two-step: Yes/No then ownership) */}
                  <div className="py-4 border-b border-[#f0f2f8]">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <span className="flex items-center gap-1 text-sm font-semibold text-[#222628]">
                        Live Data Feeds / Real-Time Displays
                        <InfoTooltip text="Do you need live data, leaderboards, real-time polling results, or dynamic content displayed on screens during the event? Examples: sales contest leaderboards, live Twitter feeds, attendee polling. Complex scope — typically requires custom integrations." />
                      </span>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          {(["YES", "NO"] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              className={miniYesNoCls(opt, safeData.liveDataFeeds.needed)}
                              onClick={() =>
                                onChange({
                                  liveDataFeeds: {
                                    ...safeData.liveDataFeeds,
                                    needed: opt,
                                    ...(opt === "NO" && { ownership: "" }),
                                  },
                                })
                              }
                            >
                              {opt === "YES" ? "✓ Yes" : "✗ No"}
                            </button>
                          ))}
                        </div>
                        {safeData.liveDataFeeds.needed === "YES" && (
                          <div className="flex gap-2">
                            {OWNERSHIP_OPTS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={ownershipCls(opt.value, safeData.liveDataFeeds.ownership)}
                                onClick={() =>
                                  onChange({
                                    liveDataFeeds: {
                                      ...safeData.liveDataFeeds,
                                      ownership: opt.value,
                                    },
                                  })
                                }
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {safeData.liveDataFeeds.needed === "YES" && (
                      <p className="mt-2 text-xs font-medium text-amber-600">
                        ⚡ Complex scope — a DXG producer call may be needed to confirm feasibility.
                      </p>
                    )}
                  </div>

                  {/* Field 9 */}
                  <MatrixRow
                    label="Sponsor Recognition Content"
                    helpText="Who provides and manages sponsor logo files, sponsored segment slates, and sponsor recognition assets? Often delivered late — requires careful version control. If stream sponsor overlays were selected on Page 3, this row needs an owner."
                    value={safeData.sponsorRecognitionContent}
                    onChange={(v) => onChange({ sponsorRecognitionContent: v })}
                    warning={sponsorWarning}
                  />

                  {/* Field 10 */}
                  <MatrixRow
                    label="Social Media Content Capture"
                    helpText="Who captures behind-the-scenes content, short clips, and social-ready content during the event? This is separate from the main session recording — typically a roaming videographer with social-format (vertical/square) cameras."
                    value={safeData.socialMediaContentCapture}
                    onChange={(v) => onChange({ socialMediaContentCapture: v })}
                  />

                  {/* Field 11 — Doubly conditional (Hybrid or Virtual only) */}
                  {isHybridOrVirtual && (
                    <MatrixRow
                      label="Virtual Background Design"
                      helpText="Who designs branded virtual backgrounds for remote speakers presenting into the event? Custom virtual backgrounds reinforce event branding and present remote speakers professionally. Standard scope: 1–3 branded background variants."
                      value={safeData.virtualBackgroundDesign}
                      onChange={(v) => onChange({ virtualBackgroundDesign: v })}
                    />
                  )}

                </div>
              </div>
            </div>

            {/* Field 12 — Creative Direction Notes */}
            <div>
              <p className={groupLabelClass}>Creative Direction</p>
              <label className={labelClass}>
                Creative Direction Notes
                <span className="ml-2 text-xs font-normal normal-case tracking-normal text-slate-400">
                  (Optional)
                </span>
                <InfoTooltip text="Describe your visual identity, color palette, theme direction, creative references, or anything that helps vendors understand your aesthetic. Brand guides and logo files can be uploaded on Page 8. The more specific you are, the better vendors can tailor their creative pitch." />
              </label>
              <textarea
                rows={5}
                maxLength={1000}
                className="w-full resize-none rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1DBFD3] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20"
                placeholder={`e.g., "The Summit visual identity uses a dark navy and electric teal palette with bold, kinetic typography. The 2026 theme is 'Velocity' — content should feel forward-momentum, cinematic, with high-contrast graphics. Brand guide attached on Page 8."`}
                value={safeData.creativeDirectionNotes}
                onChange={(e) => onChange({ creativeDirectionNotes: e.target.value })}
              />
              <div className="mt-1 flex justify-end">
                <span className={`text-xs ${notesLen > 900 ? "text-amber-600" : "text-[#969798]"}`}>
                  {notesLen}/1,000
                </span>
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
          {isInPersonOnly ? "Room Specifications" : "Hybrid & Virtual"}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(14,165,233,0.6)] active:translate-y-0"
          style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #1DBFD3 100%)" }}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
          Video Recording
          <ArrowRight size={15} className="shrink-0" />
        </button>
      </div>
    </section>
  );
};

export default ContentCreativeStep;
