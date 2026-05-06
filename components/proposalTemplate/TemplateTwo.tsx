"use client";

import type { TemplateOneData } from "./TemplateOne";
import { Dancing_Script, Great_Vibes, Pacifico } from "next/font/google";

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

type TemplateTwoProps = {
  proposalData?: Partial<TemplateOneData>;
  rawProposal?: any;
  proposalLanguage?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  showPrimaryAction?: boolean;
  isPrimaryLoading?: boolean;
  isSecondaryLoading?: boolean;
  isPrimaryDisabled?: boolean;
  fontFamily?: "Inter" | "Poppins" | "Roboto";
};

export default function TemplateTwo({
  proposalData,
  rawProposal,
  proposalLanguage = "English",
  onPrimaryAction,
  onSecondaryAction,
  showPrimaryAction = true,
  isPrimaryLoading = false,
  isSecondaryLoading = false,
  isPrimaryDisabled = false,
  fontFamily = "Poppins",
}: TemplateTwoProps) {
  const languageKey = proposalLanguage.trim().toLowerCase();
  const t = (english: string, spanish: string, french = english) =>
    languageKey === "spanish"
      ? spanish
      : languageKey === "french"
        ? french
        : english;
        
  const data = proposalData;
  const raw = rawProposal || {};

  // Construct Data from Raw JSON
  const eventName = raw.event?.eventName || "";
  const proposalBadge = "EVENT PROPOSAL";
  const logoFile = raw.proposalSetting?.branding?.logoFile || null;
  const brandName = raw.proposalSetting?.branding?.brandName || "";
  
  const eventTypeRaw = raw.event?.eventType;
  const eventTypeString = typeof eventTypeRaw === "object" 
    ? (eventTypeRaw.eventType === "Other" ? eventTypeRaw.eventTypeOther : eventTypeRaw.eventType) 
    : eventTypeRaw;
    
  const eventDesc = [
    eventTypeString,
    raw.event?.eventFormat ? `${raw.event.eventFormat} Formatted` : "",
    raw.event?.attendees ? `${raw.event.attendees} Attendees` : ""
  ].filter(Boolean).join(" • ");
  
  const budgetValue = raw.budget?.budgetCustomAmount?.trim() || raw.budget?.estimatedAvBudget?.trim();
  
  // summaryBulletsRaw and additionalNotes are computed after `room` is resolved (see below)
  // They are declared as `let` so they can be assigned after the room resolution block.
  
  // Format AV Needs Snapshot from Room By Room
  const formatAVValue = (field: any): string => {
    if (!field && field !== 0) return "";
    if (typeof field === "string") return field === "No" ? "" : field;
    if (Array.isArray(field)) return field.filter(Boolean).join(", ");
    // Guard: only process plain objects (prevents string chars being iterated)
    if (typeof field !== "object" || field === null) return "";
    let isYes = false;
    const details: string[] = [];
    for (const [key, val] of Object.entries(field)) {
      // Skip numeric-string index keys (artefact of corrupted string spread e.g. {"0":"Y","1":"e"})
      if (/^\d+$/.test(key)) continue;
      if (typeof val === "string") {
        if (val.toLowerCase() === "yes") isYes = true;
        else if (val && val.toLowerCase() !== "no") details.push(val);
      }
    }
    if (!isYes && details.length === 0) return "";
    return isYes && details.length > 0 ? `Yes (${details.join(", ")})` : details.length > 0 ? details.join(", ") : "Yes";
  };
  
  const formatDateTime = (val: any) => {
    if (!val || typeof val !== "string") return "";
    try {
      if (val.includes("T")) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        }
      }
    } catch (e) {}
    return val;
  };

  // Normalise roomByRoom — DB stores an array; legacy data may be a single object
  const allRooms: Record<string, unknown>[] = Array.isArray(raw.roomByRoom)
    ? (raw.roomByRoom as Record<string, unknown>[]).filter(Boolean)
    : raw.roomByRoom && typeof raw.roomByRoom === "object"
      ? [raw.roomByRoom as Record<string, unknown>]
      : [];

  // Keep a reference to the first room for production/summary fallbacks
  const room = allRooms[0] ?? {};

  // Build AV items for a single room — only include fields that have a value
  const buildRoomAvItems = (r: Record<string, unknown>) => [
    { label: "Attendees",          value: formatAVValue(r.estimatedAttendeesInRoom) },
    { label: "Load In",            value: formatDateTime(r.loadInDateTime as string) },
    { label: "Rehearsal",          value: formatDateTime(r.rehearsalDateTime as string) },
    { label: "Show Start",         value: formatDateTime(r.showStartDateTime as string) },
    { label: "Show End",           value: formatDateTime(r.showEndDateTime as string) },
    { label: "Audio Sys for Ppl",  value: formatAVValue(r.audioSystemForHowManyPpl) },
    { label: "Podium Mic",         value: formatAVValue(r.podiumMic) },
    { label: "Wireless Mics",      value: formatAVValue(r.wirelessMics) },
    { label: "Large Monitors",     value: formatAVValue(r.largeMonitorsOrScreenProjector) },
    { label: "Client Laptops",     value: formatAVValue(r.clientProvideOwnPresentationLaptop) },
    { label: "Provided Laptops",   value: formatAVValue(r.presentationLaptops) },
    { label: "Video Playback",     value: formatAVValue(r.videoPlayback) },
    { label: "Audience Q&A",       value: formatAVValue(r.audienceQa) },
    { label: "Cameras",            value: formatAVValue(r.cameras) },
    { label: "Video Recording",    value: formatAVValue(r.videoRecording) },
    { label: "Audio Recording",    value: formatAVValue(r.audioRecording) },
    { label: "Stage Wash",         value: formatAVValue(r.stageWashLighting) },
    { label: "LED Wall",           value: formatAVValue(r.ledWall) },
    { label: "Video Format",       value: formatAVValue(r.videoFormatAspectRatio) },
    { label: "Backlighting",       value: formatAVValue(r.backlightingFor) },
    { label: "Scenic Uplighting",  value: formatAVValue(r.drapeOrScenicUplighting) },
    { label: "Audience Lighting",  value: formatAVValue(r.audienceLighting) },
    { label: "Prog Confidence",    value: formatAVValue(r.programConfidenceMonitor) },
    { label: "Notes Confidence",   value: formatAVValue(r.notesConfidenceMonitor) },
    { label: "Speaker Timer",      value: formatAVValue(r.speakerTimer) },
    { label: "Scenic Stage",       value: formatAVValue(r.scenicStageDesign) },
  ].filter((i) => i.value);

  // Per-room data: { roomName, avItems }
  const roomSections = allRooms.map((r, idx) => ({
    roomName: (r.roomFunction as string)?.trim() || `Room ${idx + 1}`,
    avItems: buildRoomAvItems(r),
  })).filter((rs) => rs.avItems.length > 0);

  const hasRoomSnapshot = roomSections.length > 0;

  // Summary bullets for Scope & Requirements section
  const summaryBulletsRaw = [
    raw.event?.venue ? `Venue: ${raw.event.venue}` : "",
    // For 1 room show its name; for multiple rooms list all names
    allRooms.length === 1 && room.roomFunction
      ? `Room Function: ${room.roomFunction}`
      : allRooms.length > 1
        ? `Rooms (${allRooms.length}): ${allRooms.map((r, i) => (r.roomFunction as string)?.trim() || `Room ${i + 1}`).join(", ")}`
        : "",
    raw.event?.startDate ? `Start Date: ${raw.event.startDate}` : "",
    raw.event?.endDate ? `End Date: ${raw.event.endDate}` : "",
    !raw.event?.startDate && !raw.event?.endDate && raw.budget?.timelineForProposal
      ? `Timeline: ${raw.budget.timelineForProposal}`
      : "",
    room.otherRolesNeeded
      ? `Additional roles: ${room.otherRolesNeeded}`
      : raw.production?.otherRolesNeeded
        ? `Additional roles: ${raw.production.otherRolesNeeded}`
        : "",
  ].filter((item: string) => item.trim().length > 0);

  const hasScope = summaryBulletsRaw.length > 0;

  // Per-room production items builder
  const legacyProduction = raw.production || {};
  const buildRoomProductionItems = (r: Record<string, unknown>) => [
    { label: "Scenic Stage Design",   value: formatAVValue(r.scenicStageDesign ?? legacyProduction.scenicStageDesign) },
    { label: "Union Labor",           value: formatAVValue(r.unionLabor ?? legacyProduction.unionLabor) },
    { label: "Content / Video Needs", value: formatAVValue((r.contentVideoNeeds as string) || "") },
    {
      label: "Show Crew Needed",
      value: formatAVValue(
        (Array.isArray(r.showCrewNeeded) && (r.showCrewNeeded as string[]).length > 0
          ? r.showCrewNeeded
          : legacyProduction.showCrewNeeded) as string[] | undefined,
      ),
    },
    { label: "Other Roles", value: formatAVValue((r.otherRolesNeeded as string) || (legacyProduction.otherRolesNeeded as string) || "") },
  ].filter((i) => i.value);


  // Venue
  const venue = raw.venue || {};

  // Helper: extract nested YES/NO field value and detail sub-field
  const getNestedVenueVal = (field: any, detailKey?: string): string => {
    if (!field) return "";
    if (typeof field === "string") return field === "NO" || field === "No" ? "" : field;
    if (typeof field === "object" && !Array.isArray(field)) {
      const entries = Object.entries(field as Record<string, unknown>);
      const yesEntry = entries.find(([, v]) => typeof v === "string" && (v as string).toUpperCase() === "YES");
      const detailEntry = detailKey ? (field as Record<string, unknown>)[detailKey] : undefined;
      if (!yesEntry) return "";
      return detailEntry && typeof detailEntry === "string" ? `YES — ${detailEntry}` : "YES";
    }
    return "";
  };

  const venueItems = [
    { label: "Rigging",              value: getNestedVenueVal(venue.needRiggingForFlown, "riggingPlotOrSpecs") },
    { label: "Power Drops",          value: getNestedVenueVal(venue.needDedicatedPowerDrops, "standardAmpWall") },
    { label: "Power Drops Qty",      value: formatAVValue(venue.powerDropsHowMany) },
    { label: "Hardline Internet",    value: getNestedVenueVal(venue.hardlineInternet, "hardlineInternetPurpose") },
    { label: "Livestream / Virtual", value: getNestedVenueVal(venue.livestreamVirtual, "livestreamPlatform") },
    { label: "Wireless Internet",    value: formatAVValue(venue.wirelessInternetAttendees) },
  ].filter((i) => i.value);
  const hasVenue = venueItems.length > 0;

  // Uploads
  const uploads = raw.uploads || {};
  
  const extractFilename = (url?: string) => {
    if (!url || typeof url !== "string") return "";
    if (!url.includes("/")) return url;
    const parts = url.split("/");
    return parts[parts.length - 1];
  };

  const buildFileLinks = (files: any) => {
    if (!Array.isArray(files) || files.length === 0) return null;
    return (
      <div className="flex flex-col gap-2 mt-2">
        {files.map((url: string, i: number) => {
          const filename = extractFilename(url);
          if (!filename) return null;
          return (
            <div key={i} className="flex flex-col rounded bg-white p-2 border border-slate-200">
              <span className="text-slate-500 text-[10px] break-all" title={filename}>{filename}</span>
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-800 text-[11px] font-black tracking-wide uppercase no-print mt-1.5 w-max">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View File
              </a>
            </div>
          );
        })}
      </div>
    );
  };

  const reviewQuoteBase = typeof uploads.reviewExistingAvQuote === "object" ? uploads.reviewExistingAvQuote?.reviewExistingAvQuote : uploads.reviewExistingAvQuote;
  const quoteLinks = typeof uploads.reviewExistingAvQuote === "object" ? buildFileLinks(uploads.reviewExistingAvQuote?.avQuoteFiles) : null;
  
  const finalQuoteVal = reviewQuoteBase && reviewQuoteBase !== "No" ? (
    <div className="flex flex-col">
      <span>{reviewQuoteBase}</span>
      {quoteLinks}
    </div>
  ) : null;

  const supportDocsLinks = buildFileLinks(uploads.supportDocuments);
  const supportDocsVal = supportDocsLinks || (uploads.supportDocuments && uploads.supportDocuments !== "No" ? formatAVValue(uploads.supportDocuments) : null);

  const uploadItems = [
    { label: "Review Existing Quote", value: finalQuoteVal },
    { label: "Support Documents", value: supportDocsVal },
  ].filter((i) => i.value);
  
  const hasUploads = uploadItems.length > 0;
  
  // Budget
  const budget = raw.budget || {};
  const budgetItems = [
    { label: "Format Preferences", value: formatAVValue(budget.proposalFormatPreferences) },
    { label: "Timeline", value: formatAVValue(budget.timelineForProposal) },
    { label: "Producer Call", value: formatAVValue(budget.callWithDxgProducer) },
    { label: "Referral Source", value: formatAVValue(budget.howDidYouHear) },
  ].filter((i) => i.value);
  const hasBudgetOptions = budgetItems.length > 0;
  
  // Contacts
  const contactName = [raw.contact?.contactFirstName, raw.contact?.contactLastName].filter(Boolean).join(" ").trim();
  const closingSubtitle = [raw.contact?.contactTitle, raw.contact?.contactOrganization].filter(Boolean).join(" - ").trim();
  const brandEmail = raw.contact?.contactEmail || raw.proposalSetting?.proposals?.contacts?.email?.value || "";
  const contactPhone = raw.contact?.contactPhone || raw.proposalSetting?.proposals?.contacts?.call?.value || "";
  const additionalNotes = raw.contact?.anythingElse || "";
  
  const hasContact = Boolean(contactName || closingSubtitle || brandEmail || contactPhone || additionalNotes);

  // Signatures
  const signatureSettings = raw.proposalSetting?.signatures || {};
  const brandingSettings = raw.proposalSetting?.branding || {};
  const signatureImageUrl = signatureSettings.signatureImageUrl;
  const signatureText = signatureSettings.signatureText;
  const signatureStyle = signatureSettings.signatureStyle;
  const signatureColor = brandingSettings.signatureColor || "var(--proposal-signature-color, #2DC6F5)";
  const signatureFontClass =
    signatureStyle?.includes("Dancing Script")
      ? dancingScript.className
      : signatureStyle?.includes("Pacifico")
        ? pacifico.className
        : signatureStyle?.includes("Great Vibes")
          ? greatVibes.className
          : "";

  return (
    <div
      className="proposal-print-root bg-slate-50 text-slate-900"
      style={{
        fontFamily: `var(--proposal-font-family, "${fontFamily}", var(--font-sans))`,
      }}
    >
      <style jsx global>{`
        .proposal-print-root,
        .proposal-print-root * {
          font-family: var(--proposal-font-family, "${fontFamily}", var(--font-sans)) !important;
        }
        .proposal-print-root .signature-draw-text {
          font-family: var(
            --proposal-signature-font-family,
            var(--proposal-font-family, "${fontFamily}", var(--font-sans))
          ) !important;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
          html, body {
            width: 210mm !important;
            max-width: 210mm !important;
            background: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .proposal-print-root {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 297mm !important;
            background: #f8fafc !important;
          }
          .proposal-print-root main {
            max-width: 100% !important;
            width: 100% !important;
            padding-left: 14mm !important;
            padding-right: 14mm !important;
            padding-top: 12mm !important;
            padding-bottom: 12mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
          .proposal-print-root section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <main className="mx-auto px-6 py-10" style={{ maxWidth: "var(--proposal-max-width, 72rem)" }}>
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          {(logoFile || brandName) && (
            <div className="mb-6 flex items-center gap-3">
              {logoFile && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoFile}
                  alt={brandName || "Brand logo"}
                  className="h-10 w-auto max-w-40 object-contain"
                />
              )}
              {!logoFile && brandName && (
                <span className="text-base font-black text-slate-800 tracking-tight">
                  {brandName}
                </span>
              )}
            </div>
          )}
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">
            {proposalBadge}
          </p>
          <h1 className="mt-3 text-4xl font-black text-slate-900">
            {eventName}
          </h1>
          {eventDesc && (
            <p className="mt-4 max-w-3xl text-slate-600 font-medium">{eventDesc}</p>
          )}
        </section>

        {hasScope && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              {t("Scope & Requirements", "Alcance y requisitos", "Portee et exigences")}
            </h2>
            <div className="mt-4 space-y-3">
              {summaryBulletsRaw.map((bullet: string, idx: number) => {
                const colonIndex = bullet.indexOf(":");
                const title = colonIndex !== -1 ? bullet.substring(0, colonIndex).trim() : "Detail";
                const text = colonIndex !== -1 ? bullet.substring(colonIndex + 1).trim() : bullet;
                return (
                  <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-sm font-bold text-slate-900 uppercase tracking-widest text-[10px] mb-1">{title}</p>
                    <p className="text-sm font-semibold text-slate-700">{text}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(budgetValue || hasBudgetOptions) && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-5">
              {t("Budget & Proposal Preferences", "Presupuesto y preferencias", "Budget et préférences")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgetValue && (
                <div className="sm:col-span-2 lg:col-span-1 bg-cyan-50 border border-cyan-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest mb-2">
                    {t("Estimated AV Budget", "Presupuesto estimado", "Budget estimé")}
                  </p>
                  <p className="text-4xl font-black italic text-cyan-900">{budgetValue}</p>
                </div>
              )}
              {budgetItems.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 hover:border-cyan-200 bg-slate-50 p-4 transition-colors">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}


        {/* ── Per-room: AV Needs + Production Support paired ── */}
        {hasRoomSnapshot && (
          <>
            {allRooms.map((r, roomIdx) => {
              const rs = roomSections[roomIdx];
              if (!rs) return null;
              const prodItems = buildRoomProductionItems(r as Record<string, unknown>);
              const hasProd = prodItems.length > 0;
              return (
                <section
                  key={roomIdx}
                  className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  {/* Room heading */}
                  <div className="flex items-center gap-3 mb-5">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500 text-white text-[12px] font-black shrink-0">
                      {roomIdx + 1}
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-600 mb-0.5">
                        {roomSections.length === 1
                          ? t("Room AV & Production", "AV y producción", "AV et production")
                          : `${t("Room", "Sala", "Salle")} ${roomIdx + 1} ${t("of", "de", "sur")} ${roomSections.length}`}
                      </p>
                      <h2 className="text-lg font-black text-slate-900 leading-tight">
                        {rs.roomName}
                      </h2>
                    </div>
                  </div>

                  {/* AV Items */}
                  {rs.avItems.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-3 flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {t("Technical AV Specifications", "Especificaciones AV", "Spécifications AV")}
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                        {rs.avItems.map((item, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-100 hover:border-cyan-200 bg-slate-50 p-4 transition-colors">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{item.label}</p>
                            <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Production Support for this room */}
                  {hasProd && (
                    <div className={rs.avItems.length > 0 ? "mt-6 pt-5 border-t border-slate-100" : ""}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-3 flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {t("Production & Crew", "Producción y equipo", "Production et équipe")}
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {prodItems.map((item, idx) => {
                          const isCrewList = item.label === "Show Crew Needed" && item.value.includes(",");
                          return (
                            <div
                              key={idx}
                              className={`rounded-xl border border-slate-100 hover:border-cyan-200 bg-slate-50 p-4 transition-colors${
                                isCrewList ? " sm:col-span-2 md:col-span-3" : ""
                              }`}
                            >
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                {item.label}
                              </p>
                              {isCrewList ? (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {item.value.split(", ").map((crew: string, ci: number) => (
                                    <span
                                      key={ci}
                                      className="inline-flex items-center rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 text-[11px] font-bold text-cyan-800 uppercase tracking-wide"
                                    >
                                      {crew.trim()}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm font-semibold text-slate-900 leading-snug">{item.value}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </>
        )}


        {hasVenue && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-5">
              {t("Venue & Technical", "Sede y técnico", "Lieu et technique")}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {venueItems.map((item, idx) => {
                // Split "YES — detail" into badge + detail line
                const dashIdx = item.value.indexOf(" — ");
                const badge   = dashIdx !== -1 ? item.value.slice(0, dashIdx) : item.value;
                const detail  = dashIdx !== -1 ? item.value.slice(dashIdx + 3) : "";
                const isFull  = detail.length > 60; // long detail spans full width
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border border-slate-100 hover:border-cyan-200 bg-slate-50 p-4 transition-colors${
                      isFull ? " sm:col-span-2 md:col-span-3" : ""
                    }`}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{item.label}</p>
                    <span className="inline-flex items-center rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 text-[11px] font-black text-cyan-800 uppercase tracking-wide mb-1">
                      {badge}
                    </span>
                    {detail && (
                      <p className="mt-1 text-xs font-semibold text-slate-600 leading-snug break-words">{detail}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {hasUploads && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              {t("Reference Materials", "Materiales de referencia", "Documents de référence")}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {uploadItems.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 hover:border-cyan-200 bg-slate-50 p-4 transition-colors">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{item.label}</p>
                  <div className="text-sm font-semibold text-slate-900 break-words">{item.value}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {hasContact && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-4">
              {t("Point of Contact", "Contacto", "Contact")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                {contactName && <p className="text-xl font-bold text-slate-900">{contactName}</p>}
                {closingSubtitle && <p className="text-sm font-semibold text-cyan-700">{closingSubtitle}</p>}
                
                <div className="pt-4 space-y-2">
                  {brandEmail && <p className="text-sm text-slate-600 font-medium tracking-wide">📧 {brandEmail}</p>}
                  {contactPhone && <p className="text-sm text-slate-600 font-medium tracking-wide">📞 {contactPhone}</p>}
                </div>
              </div>
              {additionalNotes && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs uppercase font-bold text-slate-400 mb-2">Additional Notes</p>
                  <p className="text-sm font-semibold text-slate-700 leading-relaxed">{additionalNotes}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {(signatureImageUrl || signatureText || contactName) && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">
              {t("Proposal Signature", "Firma de propuesta", "Signature de proposition")}
            </h2>
            <div className="mt-6">
              {signatureImageUrl && signatureSettings.signatureType === "Upload" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signatureImageUrl}
                  alt={t("Signature", "Firma", "Signature")}
                  className="h-16 w-auto object-contain"
                />
              ) : (
                <p
                  className={`${signatureFontClass} signature-draw-text text-4xl font-semibold leading-none opacity-80`}
                  style={{
                    color: signatureColor,
                    ["--proposal-signature-font-family" as string]:
                      signatureStyle?.trim() ||
                      `var(--proposal-font-family, "${fontFamily}", var(--font-sans))`,
                  }}
                >
                  {signatureText || contactName || "Signature"}
                </p>
              )}
              <div
                className="mt-4 h-[2px] w-full max-w-[320px] rounded-full opacity-60"
                style={{ backgroundColor: signatureColor }}
              />
              <p className="mt-3 text-sm font-black text-slate-900 uppercase tracking-widest">
                {contactName || ""}
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
