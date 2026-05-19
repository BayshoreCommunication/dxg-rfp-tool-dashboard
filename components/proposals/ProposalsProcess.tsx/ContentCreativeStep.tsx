"use client";

import { InfoTooltip } from "./shared";

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
  motionGraphicsOpenerVideo: string;
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
  motionGraphicsOpenerVideo: "",
  lowerThirdsNameSupers: "",
  eventLogoBrandStandards: "",
  sizzleRecapVideo: "",
  liveDataFeeds: { needed: "", ownership: "" },
  sponsorRecognitionContent: "",
  socialMediaContentCapture: "",
  virtualBackgroundDesign: "",
  creativeDirectionNotes: "",
});

/* â”€â”€â”€ Style constants â”€â”€â”€ */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#8f98bf] border-b border-[#d7dce3] pb-2";

/* â”€â”€â”€ Ownership options â”€â”€â”€ */
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
    return `${base} border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300`;
  if (opt === "Client / Internal Team")
    return `${base} border-[#00c2c9] bg-[#00c2c9]/5 text-brand-dark`;
  if (opt === "AV Vendor")
    return `${base} border-[#00c2c9] bg-[#00c2c9]/10 text-[#0097cc]`;
  if (opt === "TBD")
    return `${base} border-amber-400 bg-amber-50 text-amber-700`;
  return `${base} border-slate-300 bg-slate-100 text-slate-500`;
};

/* â”€â”€â”€ Mini Yes/No (for live data feeds toggle) â”€â”€â”€ */
const miniYesNoCls = (opt: "YES" | "NO", value: string): string => {
  const base =
    "flex h-9 min-w-[56px] cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-semibold transition-all";
  if (value !== opt)
    return `${base} border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300`;
  if (opt === "YES") return `${base} border-emerald-400 bg-emerald-50 text-emerald-700`;
  return `${base} border-rose-400 bg-rose-50 text-rose-700`;
};

/* â”€â”€â”€ Matrix row â”€â”€â”€ */
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
      <span className="flex items-center gap-1 text-sm font-semibold text-[#1f2d5d]">
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
      <p className="mt-2 text-xs font-medium text-amber-600">âš  {warning}</p>
    )}
  </div>
);

/* â”€â”€â”€ Gateway card â”€â”€â”€ */
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
        ? "border-[#00c2c9] bg-[#00c2c9]/5"
        : "border-[#d7dce3] bg-white hover:border-[#00c2c9]/40"
    }`}
  >
    <div className="flex items-center gap-3 mb-2">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          isSelected ? "border-[#00c2c9] bg-[#00c2c9]" : "border-[#d7dce3]"
        }`}
      >
        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
      <span
        className={`text-sm font-bold ${
          isSelected ? "text-[#00c2c9]" : "text-[#1f2d5d]"
        }`}
      >
        {title}
      </span>
    </div>
    <p className="ml-8 text-xs leading-relaxed text-[#8f98bf]">{description}</p>
  </button>
);

/* â”€â”€â”€ Props â”€â”€â”€ */
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

  const sponsorWarning =
    sponsorOverlays === "YES" && safeData.sponsorRecognitionContent === "N/A"
      ? "You indicated sponsor overlays will appear on the stream. Sponsor content cannot be N/A â€” please assign ownership."
      : undefined;

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* â”€â”€ Header â”€â”€ */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#00c2c9]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#00c2c9]">
            Page 4 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Content &amp; Creative</h2>
        <p className="mt-1 text-sm text-[#8f98bf]">
          Graphics, presentations, video, and content ownership matrix.
        </p>
      </div>

      {/* â”€â”€ Body â”€â”€ */}
      <div className="flex-1 px-8 py-8 space-y-8">

        {/* Field 1 â€” Gateway */}
        <div>
          <label className={labelClass}>
            Content / Creative Services Needed?{" "}
            <span className="text-red-500">*</span>
            <InfoTooltip text="Do you need the AV vendor to provide any content design or creative production services beyond live show technical execution? This includes designing slide templates, producing opener videos, building lower-third graphics, or creating sizzle reels. Select No if you have a separate creative agency handling all content and the AV vendor will only execute the live show." />
          </label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <GatewayCard
              isSelected={safeData.contentServicesNeeded === "YES"}
              title="Yes â€” I need creative/content services from the AV vendor"
              description="You'll specify which content elements the vendor will produce. Common when you don't have a separate creative agency."
              onClick={() => onChange({ contentServicesNeeded: "YES" })}
            />
            <GatewayCard
              isSelected={safeData.contentServicesNeeded === "NO"}
              title="No â€” Content is handled separately by my agency or in-house team"
              description="The AV vendor will only execute the live show. Section 4 will be omitted from your RFP."
              onClick={() => onChange({ contentServicesNeeded: "NO" })}
            />
          </div>
        </div>

        {/* â”€â”€ NO state info panel â”€â”€ */}
        {safeData.contentServicesNeeded === "NO" && (
          <div className="rounded-xl border border-[#d7dce3] bg-[#f5f7ff] px-6 py-5">
            <p className="text-sm font-semibold text-[#1f2d5d]">
              Section 4 will be omitted from your RFP
            </p>
            <p className="mt-1 text-xs text-[#8f98bf]">
              The AV vendor will execute the live show only. All content is being handled by your agency or in-house team.
            </p>
          </div>
        )}

        {/* â”€â”€ YES: Content Responsibility Matrix (Fields 2â€“11) â”€â”€ */}
        {needsContent && (
          <>
            <div>
              <p className={groupLabelClass}>Content Responsibility Matrix</p>
              <p className="mb-1 text-xs text-slate-500 italic">
                Select an owner for each content element. This table appears verbatim in Section 4 of your RFP.
              </p>
              <p className="mb-5 text-[11px] text-[#8f98bf] italic">
                "The table below defines content ownership responsibilities. Vendors must confirm their ability to deliver all items marked as AV Vendor responsibility and flag any items requiring clarification. TBD items should be addressed in the vendor's questions."
              </p>

              {/* Legend */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="text-xs text-[#8f98bf] font-semibold uppercase tracking-wide">Key:</span>
                {OWNERSHIP_OPTS.map((opt) => (
                  <span key={opt.value} className={`text-xs px-2 py-1 rounded border font-semibold ${ownershipCls(opt.value, opt.value)}`}>
                    {opt.label}
                  </span>
                ))}
              </div>

              <div className="rounded-xl border border-[#d7dce3] overflow-hidden">
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
                    helpText="Who collects slide decks from individual speakers and formats them to the master template? This involves chasing speakers for content (often last-minute), fixing fonts, applying branding, and queue management. Time-intensive â€” many planners outsource this."
                    value={safeData.speakerSlideCollection}
                    onChange={(v) => onChange({ speakerSlideCollection: v })}
                  />

                  {/* Field 4 */}
                  <MatrixRow
                    label="Motion Graphics / Opener Video"
                    helpText="Who produces the opening 'show open' video, session bumpers, and motion graphic elements? A great opener sets the tone for the entire event. Typical scope: 60â€“90 second main open + 6â€“10 bumpers."
                    value={safeData.motionGraphicsOpenerVideo}
                    onChange={(v) => onChange({ motionGraphicsOpenerVideo: v })}
                  />

                  {/* Field 5 */}
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
                    helpText="Who produces event highlight reels â€” either same-day 'best of' videos to play during the closing session, or post-event recap videos for marketing use? Requires camera operators and a video editor on-site or post-event."
                    value={safeData.sizzleRecapVideo}
                    onChange={(v) => onChange({ sizzleRecapVideo: v })}
                  />

                  {/* Field 8 â€” Live Data Feeds (two-step: Yes/No then ownership) */}
                  <div className="py-4 border-b border-[#f0f2f8]">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <span className="flex items-center gap-1 text-sm font-semibold text-[#1f2d5d]">
                        Live Data Feeds / Real-Time Displays
                        <InfoTooltip text="Do you need live data, leaderboards, real-time polling results, or dynamic content displayed on screens during the event? Examples: sales contest leaderboards, live Twitter feeds, attendee polling. Complex scope â€” typically requires custom integrations." />
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
                              {opt === "YES" ? "âœ“ Yes" : "âœ— No"}
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
                        âš¡ Complex scope â€” a DXG producer call may be needed to confirm feasibility.
                      </p>
                    )}
                  </div>

                  {/* Field 9 */}
                  <MatrixRow
                    label="Sponsor Recognition Content"
                    helpText="Who provides and manages sponsor logo files, sponsored segment slates, and sponsor recognition assets? Often delivered late â€” requires careful version control. If stream sponsor overlays were selected on Page 3, this row needs an owner."
                    value={safeData.sponsorRecognitionContent}
                    onChange={(v) => onChange({ sponsorRecognitionContent: v })}
                    warning={sponsorWarning}
                  />

                  {/* Field 10 */}
                  <MatrixRow
                    label="Social Media Content Capture"
                    helpText="Who captures behind-the-scenes content, short clips, and social-ready content during the event? This is separate from the main session recording â€” typically a roaming videographer with social-format (vertical/square) cameras."
                    value={safeData.socialMediaContentCapture}
                    onChange={(v) => onChange({ socialMediaContentCapture: v })}
                  />

                  {/* Field 11 â€” Doubly conditional (Hybrid or Virtual only) */}
                  {isHybridOrVirtual && (
                    <MatrixRow
                      label="Virtual Background Design"
                      helpText="Who designs branded virtual backgrounds for remote speakers presenting into the event? Custom virtual backgrounds reinforce event branding and present remote speakers professionally. Standard scope: 1â€“3 branded background variants."
                      value={safeData.virtualBackgroundDesign}
                      onChange={(v) => onChange({ virtualBackgroundDesign: v })}
                    />
                  )}

                </div>
              </div>
            </div>

            {/* Field 12 â€” Creative Direction Notes */}
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
                className="w-full resize-none rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#00c2c9] focus:outline-none focus:ring-2 focus:ring-[#00c2c9]/20"
                placeholder={`e.g., "The Summit visual identity uses a dark navy and electric teal palette with bold, kinetic typography. The 2026 theme is 'Velocity' â€” content should feel forward-momentum, cinematic, with high-contrast graphics. Brand guide attached on Page 8."`}
                value={safeData.creativeDirectionNotes}
                onChange={(e) => onChange({ creativeDirectionNotes: e.target.value })}
              />
              <div className="mt-1 flex justify-end">
                <span className={`text-xs ${notesLen > 900 ? "text-amber-600" : "text-[#8f98bf]"}`}>
                  {notesLen}/1,000
                </span>
              </div>
            </div>
          </>
        )}

      </div>

      {/* â”€â”€ Footer Nav â”€â”€ */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-[#d7dce3] px-5 py-2.5 text-sm font-semibold text-[#1f2d5d] hover:bg-[#f5f7ff] transition-colors"
        >
          {isInPersonOnly ? "â† Room Specifications" : "â† Hybrid & Virtual"}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 rounded-lg bg-[#00c2c9]! px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(0,194,201,0.35)] hover:bg-[#009198] transition-colors active:scale-95"
        >
          Video Recording â†’
        </button>
      </div>
    </section>
  );
};

export default ContentCreativeStep;
