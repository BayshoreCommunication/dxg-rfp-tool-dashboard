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
  
  // Construct summary bullets internally from raw
  const summaryBulletsRaw = [
    raw.event?.venue ? `Venue: ${raw.event.venue}` : "",
    raw.roomByRoom?.roomFunction ? `Room Function: ${raw.roomByRoom.roomFunction}` : "",
    raw.event?.startDate ? `Start Date: ${raw.event.startDate}` : "",
    raw.event?.endDate ? `End Date: ${raw.event.endDate}` : "",
    !raw.event?.startDate && !raw.event?.endDate && raw.budget?.timelineForProposal ? `Timeline: ${raw.budget.timelineForProposal}` : "",
    raw.production?.otherRolesNeeded ? `Additional roles: ${raw.production.otherRolesNeeded}` : "",
  ].filter((item) => item.trim().length > 0);
  
  const hasScope = summaryBulletsRaw.length > 0;
  
  // Format AV Needs Snapshot from Room By Room
  const formatAVValue = (field: any) => {
    if (!field) return "";
    if (typeof field === "string") return field === "No" ? "" : field;
    if (Array.isArray(field)) return field.filter(Boolean).join(", ");
    let isYes = false;
    const details = [];
    for (const val of Object.values(field)) {
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

  const room = raw.roomByRoom || {};
  const avItems = [
    { label: "Function", value: formatAVValue(room.roomFunction) },
    { label: "Attendees", value: formatAVValue(room.estimatedAttendeesInRoom) },
    { label: "Load In", value: formatDateTime(room.loadInDateTime) },
    { label: "Rehearsal", value: formatDateTime(room.rehearsalDateTime) },
    { label: "Show Start", value: formatDateTime(room.showStartDateTime) },
    { label: "Show End", value: formatDateTime(room.showEndDateTime) },
    { label: "Audio Sys for Ppl", value: formatAVValue(room.audioSystemForHowManyPpl) },
    { label: "Podium Mic", value: formatAVValue(room.podiumMic) },
    { label: "Wireless Mics", value: formatAVValue(room.wirelessMics) },
    { label: "Large Monitors", value: formatAVValue(room.largeMonitorsOrScreenProjector) },
    { label: "Client Laptops", value: formatAVValue(room.clientProvideOwnPresentationLaptop) },
    { label: "Provided Laptops", value: formatAVValue(room.presentationLaptops) },
    { label: "Video Playback", value: formatAVValue(room.videoPlayback) },
    { label: "Audience Q&A", value: formatAVValue(room.audienceQa) },
    { label: "Cameras", value: formatAVValue(room.cameras) },
    { label: "Video Recording", value: formatAVValue(room.videoRecording) },
    { label: "Audio Recording", value: formatAVValue(room.audioRecording) },
    { label: "Stage Wash", value: formatAVValue(room.stageWashLighting) },
    { label: "LED Wall", value: formatAVValue(room.ledWall) },
    { label: "Video Format", value: formatAVValue(room.videoFormatAspectRatio) },
    { label: "Backlighting", value: formatAVValue(room.backlightingFor) },
    { label: "Scenic Uplighting", value: formatAVValue(room.drapeOrScenicUplighting) },
    { label: "Audience Lighting", value: formatAVValue(room.audienceLighting) },
    { label: "Prog Confidence", value: formatAVValue(room.programConfidenceMonitor) },
    { label: "Notes Confidence", value: formatAVValue(room.notesConfidenceMonitor) },
    { label: "Speaker Timer", value: formatAVValue(room.speakerTimer) },
    { label: "Scenic Stage", value: formatAVValue(room.scenicStageDesign) },
  ].filter((i) => i.value);

  const hasRoomSnapshot = avItems.length > 0;

  // Production
  const production = raw.production || {};
  const productionItems = [
    { label: "Scenic Stage Design", value: formatAVValue(production.scenicStageDesign) },
    { label: "Union Labor", value: formatAVValue(production.unionLabor) },
    { label: "Show Crew", value: formatAVValue(production.showCrewNeeded) },
    { label: "Other Roles", value: formatAVValue(production.otherRolesNeeded) },
  ].filter((i) => i.value);
  const hasProduction = productionItems.length > 0;

  // Venue
  const venue = raw.venue || {};
  const venueItems = [
    { label: "Rigging Request", value: formatAVValue(venue.needRiggingForFlown) },
    { label: "Power Drops Request", value: formatAVValue(venue.needDedicatedPowerDrops) },
    { label: "Power Drops Qty", value: formatAVValue(venue.powerDropsHowMany) },
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
  const additionalNotes = raw.contact?.anythingElse || room.contentVideoNeeds || "";
  
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
      className="proposal-print-root min-h-screen bg-slate-50 text-slate-900"
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
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <main className="mx-auto max-w-6xl px-6 py-10 print:px-12 print:py-12">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
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

        {(hasScope || budgetValue || hasBudgetOptions) && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {hasScope && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
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
              </div>
            )}

            {(budgetValue || hasBudgetOptions) && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
                <h2 className="text-lg font-black text-slate-900 mb-4">
                  {t("Estimated Budget", "Presupuesto", "Budget")}
                </h2>
                {budgetValue && (
                  <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-8 text-center flex-1 flex flex-col items-center justify-center mb-4">
                    <p className="text-sm font-bold text-cyan-700 uppercase tracking-widest mb-2">Total Estimate</p>
                    <p className="text-5xl font-black italic text-cyan-900 hover:scale-105 transition-transform cursor-default">{budgetValue}</p>
                  </div>
                )}
                {hasBudgetOptions && (
                  <div className="grid grid-cols-1 gap-2 mt-auto">
                    {budgetItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 w-1/3 pr-2">{item.label}</span>
                        <span className="text-xs font-semibold text-slate-900 text-right w-2/3 leading-tight">{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {hasRoomSnapshot && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              {t("Room-by-Room Snapshot", "Resumen sala por sala", "Apercu salle par salle")}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {avItems.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 hover:border-cyan-200 bg-slate-50 p-4 transition-colors">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {hasProduction && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              {t("Production & Labor", "Producción y mano de obra", "Production et main-d'œuvre")}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {productionItems.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 hover:border-cyan-200 bg-slate-50 p-4 transition-colors">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {hasVenue && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              {t("Venue & Technical", "Sede y técnico", "Lieu et technique")}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {venueItems.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-100 hover:border-cyan-200 bg-slate-50 p-4 transition-colors">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
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
