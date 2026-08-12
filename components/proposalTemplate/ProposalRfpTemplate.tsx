"use client";

import { resolveMonitorSize, resolveScreenSize } from "@/components/proposals/screenSize";
import { cameraPlanSummary, type CameraPlan } from "@/components/proposals/cameraPlan";
import { ensureLedWallSlots, ledWallCount, normalizeLedWalls, type LedWallPlan } from "@/components/proposals/ledWallPlan";

/* ─── CSS matching ProposalTemplate.html design ─── */
const TEMPLATE_CSS = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a2e; line-height: 1.45; background: #e5e7eb; }
  .rfp-root { --primary: #222628; --accent: #008ad2; --gray: #565859; --border: #e4e4e4; --light: #fbfbfb; --orange: #f97316; --amber: #fffbeb; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a2e; line-height: 1.45; background: #e5e7eb; }
  .rfp-root .page { width: 210mm; min-height: 297mm; padding: 11mm 13mm 10mm; margin: 0 auto 8px; background: #fff; position: relative; page-break-after: always; }
  @media print { body, .rfp-root { background: #fff; } .rfp-root .page { box-sizing: border-box; width: 210mm; height: 297mm; min-height: 297mm; overflow: hidden; margin: 0; padding: 9mm 11mm 8mm; break-after: page; page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .rfp-root .page:last-child { break-after: auto; page-break-after: auto; } .no-print { display: none !important; } .rfp-root .cover-header { margin: -9mm -11mm 14px; padding: 24px 11mm; } .rfp-root .rooms-page .info-row { padding: 3px 0; } .rfp-root .rooms-page .info-label, .rfp-root .rooms-page .info-value { font-size: 10px; } .rfp-root .rooms-page .crew-box { margin-top: 5px; padding: 5px 9px; } .rfp-root .rooms-page .two-col + .two-col { margin-top: 7px !important; } }
  .rfp-root .int-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .rfp-root .int-header-left { font-size: 10.5px; font-weight: 700; color: #222628; letter-spacing: 0.2px; }
  .rfp-root .int-header-right { font-size: 10.5px; font-weight: 700; color: #008ad2; letter-spacing: 0.2px; }
  .rfp-root .divider { border: none; border-top: 1px solid #e2e8f0; margin: 0 0 8px; }
  .rfp-root .divider-thick { border: none; border-top: 4px solid #008ad2; margin: 10px 0 13px; border-radius: 2px; }
  .rfp-root .footer { position: absolute; bottom: 7mm; left: 13mm; right: 13mm; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px; }
  .rfp-root .cover-header { background: #222628; margin: -11mm -13mm 14px; padding: 26px 13mm; display: flex; justify-content: space-between; align-items: center; }
  .rfp-root .cover-header-left { display: flex; flex-direction: column; align-items: flex-start; }
  .rfp-root .dxg-brand { display: inline-flex; align-items: center; gap: 7px; padding: 6px 11px; border-radius: 8px; background: #fff; }
  .rfp-root .dxg-brand-logo { display: block; width: 34px; height: 34px; object-fit: contain; }
  .rfp-root .dxg-brand-wordmark { color: #222628; font-size: 21px; font-weight: 900; line-height: 1; letter-spacing: -0.5px; }
  .rfp-root .dxg-brand-wordmark-accent { color: #2bb4df; }
  .rfp-root .dxg-logo { display: block; font-size: 24px; font-weight: 900; color: #fff; letter-spacing: -0.5px; line-height: 1.15; }
  .rfp-root .dxg-name { font-size: 12px; font-weight: 600; color: #c5d9f4; }
  .rfp-root .badge-confidential { display: inline-flex; align-items: center; margin-top: 7px; background: #ef4444; color: #fff; font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.6px; width: fit-content; }
  .rfp-root .badge-rfpilot { display: inline-flex; align-items: center; background: #008ad2; color: #fff; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 8px; letter-spacing: 0.3px; white-space: nowrap; }
  .rfp-root .logo-chip { display: inline-flex; align-items: center; background: #fff; padding: 10px 18px; border-radius: 10px; }
  .rfp-root .logo-chip img { display: block; height: 42px; width: auto; }
  .rfp-root .cover-title-block { margin-top: 4px; margin-bottom: 10px; }
  .rfp-root .rfp-label { display: inline-flex; align-items: center; background: #fef2f2; color: #b91c1c; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border: 1px solid #fecaca; }
  .rfp-root .event-name { font-size: 28px; font-weight: 900; color: #222628; line-height: 1.15; margin-bottom: 4px; letter-spacing: -0.3px; }
  .rfp-root .event-client { font-size: 14px; font-weight: 700; color: #64748b; margin-bottom: 10px; }
  .rfp-root .date-bar { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; margin-bottom: 10px; }
  .rfp-root .date-cell { padding: 8px 12px; font-size: 12px; background: #f8fafc; border-right: 1px solid #e2e8f0; }
  .rfp-root .date-cell:last-child { border-right: none; }
  .rfp-root .date-cell b { color: #222628; }
  .rfp-root .stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin-bottom: 9px; }
  .rfp-root .stat-card { border: 1px solid #e2e8f0; border-top: 3px solid #008ad2; border-radius: 7px; padding: 9px 9px 8px; background: rgba(0,138,210,0.03); text-align: center; }
  .rfp-root .stat-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .rfp-root .stat-value { font-size: 17px; font-weight: 900; color: #008ad2; line-height: 1; }
  .rfp-root .flags-section { margin-bottom: 9px; }
  .rfp-root .flags-label { font-size: 10px; font-weight: 800; color: #008ad2; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 5px; }
  .rfp-root .flags-row { display: flex; flex-wrap: wrap; gap: 5px; }
  .rfp-root .flag { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 800; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.2px; white-space: nowrap; }
  .rfp-root .flag::before { content: "●"; font-size: 8px; }
  .rfp-root .flag.teal { background: #0e7490; color: #fff; }
  .rfp-root .flag.charcoal { background: #1e293b; color: #fff; }
  .rfp-root .flag.orange { background: #c2410c; color: #fff; }
  .rfp-root .flag.dteal { background: #0f766e; color: #fff; }
  .rfp-root .flag.purple { background: #6d28d9; color: #fff; }
  .rfp-root .flag.violet { background: #9333ea; color: #fff; }
  .rfp-root .flag.green { background: #166534; color: #fff; }
  .rfp-root .overview-box { border: 1px solid #e2e8f0; border-radius: 7px; padding: 10px 13px; background: #fff; margin-bottom: 8px; }
  .rfp-root .overview-heading { font-size: 11px; font-weight: 800; color: #008ad2; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 7px; }
  .rfp-root .overview-box p { font-size: 12px; color: #2d3748; line-height: 1.6; margin-bottom: 6px; }
  .rfp-root .overview-box p:last-of-type { margin-bottom: 0; }
  .rfp-root .contact-bar { display: grid; grid-template-columns: 90px 1fr 1fr 1fr; border: 1px solid #e2e8f0; border-radius: 7px; overflow: hidden; margin-top: 9px; }
  .rfp-root .contact-label-cell { background: #222628; color: #fff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 8px 6px; line-height: 1.4; }
  .rfp-root .contact-data-cell { padding: 8px 11px; font-size: 12px; font-weight: 700; color: #222628; border-left: 1px solid #e2e8f0; display: flex; align-items: center; background: #f8fafc; }
  .rfp-root .section { margin-bottom: 9px; }
  .rfp-root .section-title { background: #222628; color: #fff; padding: 8px 13px; border-radius: 9px; display: flex; align-items: center; gap: 10px; margin-bottom: 9px; font-size: 13px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; }
  .rfp-root .sec-num { background: #008ad2; color: #fff; min-width: 26px; height: 26px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; flex-shrink: 0; }
  .rfp-root .section-subtitle { font-size: 10.5px; font-weight: 800; color: #008ad2; text-transform: uppercase; letter-spacing: 0.9px; margin: 8px 0 5px; }
  .rfp-root table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .rfp-root th { background: #222628; color: #fff; font-size: 11px; font-weight: 700; padding: 7px 9px; text-align: left; letter-spacing: 0.3px; text-transform: uppercase; }
  .rfp-root td { border: 1px solid #e2e8f0; padding: 6px 9px; vertical-align: top; line-height: 1.45; color: #1e293b; }
  .rfp-root tr:nth-child(even) td { background: #fafbfd; }
  .rfp-root tr:first-child td { border-top: none; }
  .rfp-root .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .rfp-root .info-card { border: 1px solid #e2e8f0; border-radius: 7px; padding: 9px 12px; background: #fff; }
  .rfp-root .info-card h3 { font-size: 12.5px; font-weight: 800; color: #222628; margin-bottom: 7px; text-transform: uppercase; letter-spacing: 0.3px; }
  .rfp-root .info-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 4px 0; border-bottom: 1px dashed #e5e7eb; gap: 8px; }
  .rfp-root .info-row:last-of-type { border-bottom: none; }
  .rfp-root .info-label { font-weight: 700; color: #64748b; font-size: 11px; white-space: nowrap; flex-shrink: 0; }
  .rfp-root .info-value { font-weight: 600; color: #1e293b; font-size: 11px; text-align: right; }
  .rfp-root .crew-box { margin-top: 7px; padding: 6px 10px; background: rgba(0,138,210,0.07); border-left: 3px solid #008ad2; border-radius: 4px; }
  .rfp-root .crew-title { font-size: 10px; font-weight: 800; color: #008ad2; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 3px; }
  .rfp-root .crew-list { font-size: 11px; color: #374151; line-height: 1.5; }
  .rfp-root .note-box { margin-top: 6px; padding: 6px 10px; background: #fffbeb; border-left: 3px solid #f97316; border-radius: 4px; }
  .rfp-root .note-title { font-size: 10px; font-weight: 800; color: #f97316; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .rfp-root .note-text { font-size: 11px; color: #78350f; line-height: 1.5; }
  .rfp-root .callout { border: 1px solid #e2e8f0; border-left: 4px solid #008ad2; border-radius: 6px; padding: 9px 12px; background: rgba(0,138,210,0.04); margin-top: 8px; }
  .rfp-root .callout p { font-size: 11.5px; color: #1e293b; line-height: 1.55; }
  .rfp-root .callout-heading { font-size: 11px; font-weight: 800; color: #222628; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.3px; }
  .rfp-root .orange-callout { border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 6px; padding: 9px 12px; background: #fff7ed; margin-top: 8px; font-size: 11.5px; color: #7c2d12; line-height: 1.55; font-style: italic; }
  .rfp-root .orange-callout b { color: #9a3412; font-style: normal; }
  .rfp-root .cta-box { display: flex; margin-top: 10px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .rfp-root .cta-side { background: #222628; color: #008ad2; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 10px; display: flex; align-items: center; justify-content: center; text-align: center; min-width: 80px; line-height: 1.5; writing-mode: vertical-lr; transform: rotate(180deg); }
  .rfp-root .cta-body { padding: 12px 15px; background: rgba(0,138,210,0.04); flex: 1; }
  .rfp-root .cta-body p { font-size: 11.5px; color: #1e293b; line-height: 1.6; }
  .rfp-root .cta-link { margin-top: 6px; font-size: 12px; font-weight: 800; color: #008ad2; }
  .rfp-root .disclaimer-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-top: 8px; background: #f8fafc; }
  .rfp-root .disclaimer-box p { font-size: 11px; color: #64748b; line-height: 1.6; text-align: center; }
  .rfp-root .matrix-bar { height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 3px; }
  .rfp-root .matrix-fill { height: 6px; background: #008ad2; border-radius: 3px; }
`;

/* ─── Data types ─── */
type RD = Record<string, unknown>;

export type RfpProposalData = {
  _id?: string;
  createdAt?: string;
  status?: string;
  proposalSetting?: {
    branding?: {
      brandName?: string;
      linkPrefix?: string;
      signatureColor?: string;
      logoFile?: string | null;
    };
    proposals?: {
      proposalLanguage?: string;
      defaultCurrency?: string;
    };
  };
  proposalSettings?: {
    linkPrefix?: string;
    defaultFont?: string;
    proposalLanguage?: string;
    defaultCurrency?: string;
  };
  event?: {
    eventName?: string;
    editionYear?: string;
    eventTheme?: string;
    eventWebsite?: string;
    startDate?: string;
    endDate?: string;
    attendees?: string;
    eventFormat?: string;
    eventType?: { eventType?: string; eventTypeOther?: string } | string;
    primaryAudience?: string[];
    eventObjectives?: string;
    toneDirection?: string[];
    sacredConstraints?: string;
    aboutOrganization?: string;
    statementOfWork?: string;
    eventProfile?: string;
    rfpTimeline?: string;
  };
  venueSchedule?: RD;
  roomByRoom?: RD[] | RD;
  production?: RD;
  hybridVirtual?: RD;
  contentCreative?: RD;
  videoRecordingStep?: RD;
  venue?: RD;
  uploads?: RD;
  budget?: RD;
  contact?: {
    contactFirstName?: string;
    contactLastName?: string;
    contactTitle?: string;
    contactOrganization?: string;
    organizationLegalName?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactPhoneExt?: string;
    contactPhoneType?: string;
    additionalContacts?: Record<string, unknown>[];
    preferredContactMethod?: string;
    bestTimeToReach?: string;
    anythingElse?: string;
  };
};

/* ─── Helpers ─── */
const p = (v: unknown): string =>
  typeof v === "string" && v.trim() ? v.trim() : "";

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? (v as unknown[]).map((x) => p(x)).filter(Boolean) : [];

const fmtDate = (v?: string): string => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const yn = (v: unknown): string => {
  const s = p(v);
  if (s === "YES") return "Yes";
  if (s === "NO") return "No";
  return s;
};

/* ─── Sub-components ─── */
function IntHeader({ brand, title }: { brand: string; title: string }) {
  return (
    <>
      <div className="int-header">
        <span className="int-header-left">{brand} | RFPilot</span>
        <span className="int-header-right">{title} — CONFIDENTIAL</span>
      </div>
      <hr className="divider" />
    </>
  );
}

function Footer({ left, page }: { left: string; page: number }) {
  return (
    <div className="footer">
      <div>{left}</div>
      <div>Page {page}</div>
    </div>
  );
}

function SectionTitle({ num, children }: { num: number | string; children: React.ReactNode }) {
  return (
    <div className="section-title">
      <span className="sec-num">{num}</span>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

/* ─── Main component ─── */
export default function ProposalRfpTemplate({ proposal }: { proposal: RfpProposalData }) {
  const ev = proposal.event || {};
  const ct = proposal.contact || {};
  const vs = (proposal.venueSchedule || {}) as RD;
  const rooms: RD[] = Array.isArray(proposal.roomByRoom)
    ? (proposal.roomByRoom as RD[])
    : proposal.roomByRoom
    ? [proposal.roomByRoom as RD]
    : [];
  const hv = (proposal.hybridVirtual || {}) as RD;
  const cc = (proposal.contentCreative || {}) as RD;
  const vr = (proposal.videoRecordingStep || {}) as RD;
  const ven = (proposal.venue || {}) as RD;
  const up = (proposal.uploads || {}) as RD;
  const bud = (proposal.budget || {}) as RD;

  const brandName =
    p(proposal.proposalSetting?.branding?.brandName) ||
    p(proposal.proposalSettings?.linkPrefix) ||
    "DXG";

  const eventName = p(ev.eventName) || "Event Proposal";
  const isHybrid = ev.eventFormat === "Hybrid" || ev.eventFormat === "Virtual";
  const fullName = [p(ct.contactFirstName), p(ct.contactLastName)].filter(Boolean).join(" ");
  const org = p(ct.contactOrganization);

  /* Flags */
  const hasLedWall = rooms.some((r) => p(r.ledWall).toUpperCase() === "YES");
  const hasUnion = p(vs.isUnionVenue) === "YES";
  const hasVideo = rooms.some((r) => {
    const rv = r.videoRecording;
    if (rv && typeof rv === "object") return p((rv as RD).videoRecording).toLowerCase() === "yes";
    return p(rv as string).toLowerCase() === "yes";
  });
  const hasScenic = rooms.some((r) => p(r.scenicStageDesign).toLowerCase() === "yes");
  const hasPrompt = rooms.some(
    (r) => p(r.teleprompterRequired).toUpperCase() === "YES" || p(r.teleprompterBilingual).toUpperCase() === "YES",
  );
  const hasContent = p(cc.contentServicesNeeded) === "YES";

  const flags: { label: string; cls: string }[] = [
    ...(isHybrid ? [{ label: `${ev.eventFormat?.toUpperCase()} PRODUCTION`, cls: "teal" }] : [{ label: "IN-PERSON EVENT", cls: "charcoal" }]),
    ...(hasUnion ? [{ label: "UNION VENUE", cls: "charcoal" }] : []),
    ...(hasLedWall ? [{ label: "LED WALL", cls: "orange" }] : []),
    ...(hasPrompt ? [{ label: "TELEPROMPTING", cls: "dteal" }] : []),
    ...(hasVideo ? [{ label: "VIDEO RECORDING", cls: "purple" }] : []),
    ...(hasScenic ? [{ label: "SCENIC DESIGN", cls: "violet" }] : []),
    ...(hasContent ? [{ label: "CONTENT & CREATIVE", cls: "green" }] : []),
  ];

  const footerLeft = `${brandName} | RFPilot — ${eventName} — CONFIDENTIAL`;
  const headerTitle = `${eventName}`;

  /* Covendors */
  const cvs = (up.coVendors || {}) as RD;
  const coVendorList: { cat: string; company: string; contact: string; scope: string }[] = [
    { cat: "In-House Venue AV", company: p((cvs.inHouseVenueAv as RD)?.companyName), contact: p((cvs.inHouseVenueAv as RD)?.contactName), scope: "Power, rigging, venue infrastructure" },
    { cat: "Event Decorator / Scenic", company: p((cvs.eventDecorator as RD)?.companyName), contact: p((cvs.eventDecorator as RD)?.contactName), scope: "Stage build, furniture, signage" },
    { cat: "Registration / Event Tech", company: p((cvs.registrationTech as RD)?.companyName), contact: p((cvs.registrationTech as RD)?.contactName), scope: "Badge, app, virtual platform integration" },
    { cat: "Agency of Record", company: p((cvs.agencyOfRecord as RD)?.companyName), contact: p((cvs.agencyOfRecord as RD)?.contactName), scope: "Brand approvals, content sign-off" },
    { cat: "Photography", company: p((cvs.photographer as RD)?.companyName), contact: p((cvs.photographer as RD)?.contactName), scope: "Coordinate stage access windows" },
  ].filter((v) => v.company || v.contact);

  /* Eval matrix. Published only once the planner has accepted the weightings:
     they ship pre-populated, and vendors are scored against them, so an
     untouched default set must not go out as the client's stated criteria. */
  const evaluationMatrixConfirmed = bud.evaluationMatrixConfirmed === true;
  const em = (bud.evaluationMatrix || {}) as RD;
  const matrixRows: { label: string; weight: number; guide: string }[] = [
    { label: "Technical Approach", weight: Number(em.technicalApproach) || 25, guide: "Spec compliance" },
    { label: "Crew Experience & References", weight: Number(em.crewExperience) || 20, guide: "Bios and Experience with similar scale events" },
    ...(isHybrid ? [{ label: "Hybrid / Virtual Production Capability", weight: Number(em.hybridVirtual) || 20, guide: "Platform integration, virtual producer, stream quality" }] : []),
    { label: "Pricing & Value", weight: Number(em.pricing) || 15, guide: "Competitiveness, transparency, alternate options" },
    ...(hasScenic || hasContent ? [{ label: "Creative & Scenic Design Capability", weight: Number(em.creativeScenic) || 10, guide: "Portfolio, LED aesthetic, scenic vision" }] : []),
    { label: "Responsiveness & Communication", weight: Number(em.responsiveness) || 7, guide: "RFP quality, questions asked, proposal clarity" },
    { label: "Sustainability & DEI Practices", weight: Number(em.sustainabilityDei) || 3, guide: "Vendor policy documentation" },
  ];

  /* Room renderer */
  const renderRoom = (room: RD, idx: number, total: number) => {
    const crew = arr(room.showCrewNeeded);
    const crewQty = (room.showCrewQty || {}) as RD;
    const notes: string[] = [];
    if (p(room.scenicStageDesign).toLowerCase() === "yes" && p(room.scenicStageDesignNotes)) {
      notes.push(p(room.scenicStageDesignNotes));
    }
    if (p(room.contentVideoNeeds)) notes.push(p(room.contentVideoNeeds));
    if (!Array.isArray(room.ledWalls) && p(room.ledWallNotes)) notes.push(p(room.ledWallNotes));

    const aqRaw = room.audienceQa;
    const aqMethod = aqRaw && typeof aqRaw === "object" ? p((aqRaw as RD).audienceQaMethod) : "";
    const aqVal = aqRaw && typeof aqRaw === "object" ? p((aqRaw as RD).audienceQa) : p(aqRaw as string);

    const vrRaw = room.videoRecording;
    const vrVal = vrRaw && typeof vrRaw === "object" ? p((vrRaw as RD).videoRecording) : p(vrRaw as string);
    const vrType = vrRaw && typeof vrRaw === "object" ? p((vrRaw as RD).videoRecordingType) : "";
    const vrCodec = vrRaw && typeof vrRaw === "object" ? p((vrRaw as RD).recordingCodec) : "";
    const vr4k = vrRaw && typeof vrRaw === "object" ? p((vrRaw as RD).recordIn4k) : "";

    const swRaw = room.stageWashLighting;
    const swVal = swRaw && typeof swRaw === "object" ? p((swRaw as RD).stageWashLighting) : p(swRaw as string);
    const swSize = swRaw && typeof swRaw === "object" ? p((swRaw as RD).stageWashLightingStageSize) : "";

    const pmRaw = room.programConfidenceMonitor;
    const pmVal = pmRaw && typeof pmRaw === "object" ? p((pmRaw as RD).programConfidenceMonitor) : p(pmRaw as string);
    const pmQty = pmRaw && typeof pmRaw === "object" ? p((pmRaw as RD).programConfidenceMonitorQty) : "";

    const nmRaw = room.notesConfidenceMonitor;
    const nmVal = nmRaw && typeof nmRaw === "object" ? p((nmRaw as RD).notesConfidenceMonitor) : p(nmRaw as string);
    const nmQty = nmRaw && typeof nmRaw === "object" ? p((nmRaw as RD).notesConfidenceMonitorQty) : "";

    const wmRaw = room.wirelessMics;
    const wmVal = wmRaw && typeof wmRaw === "object" ? p((wmRaw as RD).wirelessMics) : p(wmRaw as string);
    const wmQty = wmRaw && typeof wmRaw === "object" ? p((wmRaw as RD).wirelessMicsQty) : "";
    const wmTypeRaw = wmRaw && typeof wmRaw === "object" ? p((wmRaw as RD).wirelessMicsType) : "";
    const wmTypeOther = wmRaw && typeof wmRaw === "object" ? p((wmRaw as RD).wirelessMicsTypeOther) : "";
    const wmType = wmTypeRaw === "Other" && wmTypeOther ? wmTypeOther : wmTypeRaw;

    const camRaw = room.cameras;
    const camVal = camRaw && typeof camRaw === "object" ? p((camRaw as RD).cameras) : p(camRaw as string);
    const camSummary = camRaw && typeof camRaw === "object"
      ? cameraPlanSummary(camRaw as unknown as CameraPlan)
      : camVal;

    const pmicRaw = room.podiumMic;
    const pmicVal = pmicRaw && typeof pmicRaw === "object" ? p((pmicRaw as RD).podiumMic) : p(pmicRaw as string);
    const pmicQty = pmicRaw && typeof pmicRaw === "object" ? p((pmicRaw as RD).podiumMicQty) : "";

    const lmRaw = room.largeMonitorsOrScreenProjector;
    const lmVal = lmRaw && typeof lmRaw === "object" ? p((lmRaw as RD).largeMonitorsOrScreenProjector) : p(lmRaw as string);
    const lmMonitors = lmRaw && typeof lmRaw === "object" ? p((lmRaw as RD).numberOfMonitors) : "";
    const lmScreens = lmRaw && typeof lmRaw === "object" ? p((lmRaw as RD).numberOfScreens) : "";
    const lmMonitorSize = lmRaw && typeof lmRaw === "object"
      ? resolveMonitorSize({
          monitorSize: p((lmRaw as RD).monitorSize),
          monitorSizeOther: p((lmRaw as RD).monitorSizeOther),
        })
      : "";
    const lmScreenSize = lmRaw && typeof lmRaw === "object"
      ? resolveScreenSize({
          screenSize: p((lmRaw as RD).screenSize),
          screenSizeOther: p((lmRaw as RD).screenSizeOther),
        })
      : "";
    const lmQty = [
      lmMonitors ? `${lmMonitors} monitor${lmMonitors === "1" ? "" : "s"}${lmMonitorSize ? ` — ${lmMonitorSize}` : ""}` : "",
      lmScreens ? `${lmScreens} screen${lmScreens === "1" ? "" : "s"}${lmScreenSize ? ` — ${lmScreenSize}` : ""}` : "",
    ].filter(Boolean).join(", ");

    const clRaw = room.clientProvideOwnPresentationLaptop;
    const clVal = clRaw && typeof clRaw === "object" ? p((clRaw as RD).clientProvideOwnPresentationLaptop) : p(clRaw as string);
    const clQty = clRaw && typeof clRaw === "object" ? p((clRaw as RD).clientLaptopQty) : "";

    const plRaw = room.presentationLaptops;
    const plVal = plRaw && typeof plRaw === "object" ? p((plRaw as RD).presentationLaptops) : p(plRaw as string);
    const plQty = plRaw && typeof plRaw === "object" ? p((plRaw as RD).presentationLaptopQty) : "";

    const vpRaw = room.videoPlayback;
    const vpVal = vpRaw && typeof vpRaw === "object" ? p((vpRaw as RD).videoPlayback) : p(vpRaw as string);
    const vpCount = vpRaw && typeof vpRaw === "object" ? p((vpRaw as RD).videoPlaybackCount) : "";
    const vpFormat = vpRaw && typeof vpRaw === "object" ? p((vpRaw as RD).videoPlaybackFormat) : "";

    const isLedWall = p(room.ledWall).toLowerCase() === "yes";
    const ledWallPlan = room as unknown as LedWallPlan;
    const roomLedWallCount = ledWallCount(ledWallPlan);
    const roomLedWalls = ensureLedWallSlots(normalizeLedWalls(ledWallPlan), roomLedWallCount).slice(0, roomLedWallCount);
    roomLedWalls.forEach((wall) => {
      if (wall.notes.trim()) notes.push(wall.notes.trim());
    });

    const teleVal = p(room.teleprompterRequired);
    const isBilingual = p(room.teleprompterBilingual).toUpperCase() === "YES";
    const telepromptValue = teleVal
      ? isBilingual
        ? `Yes — Bilingual (${arr(room.teleprompterLanguages).join(" / ") || ""})`
        : teleVal
      : "";
    const functionSchedules = Array.isArray(room.functions) && room.functions.length > 0
      ? room.functions.map((value) => value && typeof value === "object" ? value as RD : {})
      : [{
          functionName: room.roomFunction,
          scheduleDate: room.scheduleDate,
          scheduleDay: room.scheduleDay,
          showStartDateTime: room.showStartDateTime,
          showEndDateTime: room.showEndDateTime,
          roomSetup: room.roomSetup,
          estimatedAttendees: room.estimatedAttendeesInRoom,
        }];

    return (
      <div key={idx} className="info-card">
        <h3>
          Room {idx + 1} of {total}
          {p(room.roomLocation) || p(room.roomFunction)
            ? ` — ${p(room.roomLocation) || p(room.roomFunction)}`
            : ""}
        </h3>

        {/* Scheduling */}
        {p(room.roomLocation) && <InfoRow label="Room" value={p(room.roomLocation)} />}
        {functionSchedules.map((entry, functionIndex) => (
          <div key={`${idx}-function-${functionIndex}`}>
            <InfoRow
              label={`Function ${functionIndex + 1}`}
              value={p(entry.functionName) || `Function ${functionIndex + 1}`}
            />
            <InfoRow label="Room Setup" value={p(entry.roomSetup)} />
            <InfoRow
              label="Date"
              value={[fmtDate(p(entry.scheduleDate)), p(entry.scheduleDay)].filter(Boolean).join(" — ")}
            />
            <InfoRow label="Attendees" value={p(entry.estimatedAttendees)} />
            <InfoRow label="Show Start" value={p(entry.showStartDateTime)} />
            <InfoRow label="Show End" value={p(entry.showEndDateTime)} />
          </div>
        ))}
        <InfoRow label="Load In" value={p(room.loadInDateTime)} />
        <InfoRow label="Rehearsal" value={p(room.rehearsalDateTime)} />
        <InfoRow label="Stage Dimensions" value={p(room.stageDimensions)} />

        {/* Audio */}
        <InfoRow label="Audio System" value={p(room.audioSystemRequired) === "Yes" ? (p(room.audioSystemForHowManyPpl) ? `Yes — ${p(room.audioSystemForHowManyPpl)} ppl` : "Yes") : p(room.audioSystemRequired)} />
        <InfoRow label="Podium Mic" value={pmicVal === "Yes" && pmicQty ? `Yes (${pmicQty})` : pmicVal} />
        <InfoRow label="Wireless Mics" value={wmVal === "Yes" && wmQty ? `Yes (${wmQty}${wmType ? `, ${wmType}` : ""})` : wmVal} />
        <InfoRow label="Audio Recording" value={p(room.audioRecording)} />
        <InfoRow label="Audience Q&A" value={aqVal === "Yes" && aqMethod ? `Yes — ${aqMethod}` : aqVal} />

        {/* Displays / LED */}
        <InfoRow label="LED Wall" value={isLedWall ? "Yes" : p(room.ledWall)} />
        {isLedWall && <InfoRow label="LED Wall Count" value={String(roomLedWallCount || 1)} />}
        {isLedWall && roomLedWalls.map((wall, wallIndex) => (
          <div key={`${idx}-led-wall-${wallIndex}`}>
            <InfoRow label={`LED Wall ${wallIndex + 1} Size`} value={[wall.width ? `${wall.width}W` : "", wall.height ? `${wall.height}H` : ""].filter(Boolean).join(" × ")} />
            <InfoRow label={`LED Wall ${wallIndex + 1} Shape`} value={wall.shape} />
            <InfoRow label={`LED Wall ${wallIndex + 1} Pixel Pitch`} value={wall.pixelPitch} />
            <InfoRow label={`LED Wall ${wallIndex + 1} Processor`} value={wall.switcher} />
            <InfoRow label={`LED Wall ${wallIndex + 1} Notes`} value={wall.notes} />
          </div>
        ))}
        <InfoRow label="Large Monitors" value={lmVal === "Yes" && lmQty ? `Yes (${lmQty})` : lmVal} />

        {/* Video */}
        <InfoRow label="Video Format" value={p(room.videoFormatAspectRatio)} />
        <InfoRow
          label="Video Playback"
          value={vpVal === "Yes" ? `Yes${vpCount ? ` (${vpCount})` : ""}${vpFormat ? ` — ${vpFormat}` : ""}` : vpVal}
        />
        <InfoRow label="Video Recording" value={vrVal === "Yes" && vrType ? `Yes — ${vrType}` : vrVal} />
        {vrVal === "Yes" && <InfoRow label="Recording Format" value={vrCodec} />}
        {vrVal === "Yes" && <InfoRow label="4K Recording" value={vr4k} />}
        <InfoRow label="Cameras" value={camSummary} />

        {/* Presentation */}
        <InfoRow label="Pres. Laptops" value={plVal === "Yes" && plQty ? `Yes (${plQty})` : plVal} />
        <InfoRow label="Client Laptop" value={clVal === "Yes" && clQty ? `Yes (${clQty})` : clVal} />
        <InfoRow label="Teleprompter" value={telepromptValue} />
        <InfoRow label="Speaker Timer" value={p(room.speakerTimer)} />
        <InfoRow label="Prog. Confidence" value={pmVal === "Yes" && pmQty ? `Yes — ${pmQty} Monitors` : pmVal} />
        <InfoRow label="Notes Confidence" value={nmVal === "Yes" && nmQty ? `Yes — ${nmQty} Monitors` : nmVal} />

        {/* Lighting */}
        {arr(room.lightingRequirements).length > 0 && (
          <InfoRow label="Lighting Req." value={arr(room.lightingRequirements).join(", ")} />
        )}
        <InfoRow label="Stage Wash" value={swVal === "Yes" && swSize ? `Yes — ${swSize}` : swVal} />
        <InfoRow label="Backlighting" value={p(room.backlightingFor)} />
        <InfoRow label="Scenic Uplighting" value={p(room.drapeOrScenicUplighting)} />
        <InfoRow label="Audience Lighting" value={p(room.audienceLighting)} />

        {/* Production */}
        <InfoRow label="Scenic Design" value={p(room.scenicStageDesign)} />

        {crew.length > 0 && (
          <div className="crew-box">
            <div className="crew-title">Show Crew</div>
            <div className="crew-list">
              {crew.map((role) => {
                const qty = p(crewQty[role]);
                return qty ? `${role} ×${qty}` : role;
              }).join(" · ")}
            </div>
            {p(room.otherRolesNeeded) && (
              <div className="crew-list" style={{ marginTop: 4, fontStyle: "italic" }}>Other: {p(room.otherRolesNeeded)}</div>
            )}
          </div>
        )}
        {notes.length > 0 && (
          <div className="note-box">
            <div className="note-title">★ Special Notes</div>
            <div className="note-text">{notes.join(" ")}</div>
          </div>
        )}
      </div>
    );
  };

  let sectionNum = 0;
  const nextSec = () => ++sectionNum;
  let pageNum = 0;
  const nextPage = () => ++pageNum;

  return (
    <div className="rfp-root proposal-print-root">
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: TEMPLATE_CSS }} />

      {/* ══════════════ PAGE 1: COVER ══════════════ */}
      <div className="page">
        <div className="cover-header">
          <div className="cover-header-left">
            <div className="dxg-brand">
              <img
                className="dxg-brand-logo"
                src="/assets/logo/rfpilot-primary-logo.png"
                alt=""
                aria-hidden="true"
              />
              <span className="dxg-brand-wordmark">RFP<span className="dxg-brand-wordmark-accent">ilot</span></span>
            </div>
            <div className="badge-confidential">Confidential</div>
          </div>
        </div>

        <div className="divider-thick" />

        <div className="cover-title-block">
          <div className="rfp-label">Request for Proposal</div>
          <div className="event-name">{eventName}</div>
          {(org || p(vs.venueName)) && (
            <div className="event-client">
              {[org, p(vs.venueName)].filter(Boolean).join(" | ")}
            </div>
          )}
          <div className="date-bar">
            <div className="date-cell">
              <b>RFP Issued:</b> {fmtDate(proposal.createdAt) || "—"}
            </div>
            <div className="date-cell">
              <b>Response Due:</b>{" "}
              {fmtDate(p(bud.proposalSubmissionDueDate)) || fmtDate(p(bud.decisionDate)) || "—"}
            </div>
            <div className="date-cell">
              <b>Event Dates:</b>{" "}
              {[fmtDate(p(ev.startDate)), fmtDate(p(ev.endDate))].filter(Boolean).join(" – ") || "—"}
            </div>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card" style={{ borderTopColor: "#008ad2", background: "rgba(0,138,210,0.04)" }}>
            <div className="stat-label">Attendees</div>
            <div className="stat-value" style={{ color: "#008ad2" }}>{p(ev.attendees) || "—"}</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: "#0ea5e9", background: "rgba(14,165,233,0.04)" }}>
            <div className="stat-label">Show Rooms</div>
            <div className="stat-value" style={{ color: "#0ea5e9" }}>{p(vs.numberOfEventRooms) || rooms.length || "—"}</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: "#8b5cf6", background: "rgba(139,92,246,0.04)" }}>
            <div className="stat-label">Format</div>
            <div className="stat-value" style={{ color: "#8b5cf6" }}>{p(ev.eventFormat) || "—"}</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: "#f97316", background: "rgba(249,115,22,0.04)" }}>
            <div className="stat-label">Union Venue</div>
            <div className="stat-value" style={{ color: "#f97316" }}>{p(vs.isUnionVenue) === "YES" ? "Yes" : p(vs.isUnionVenue) === "NO" ? "No" : "—"}</div>
          </div>
        </div>

        {flags.length > 0 && (
          <div className="flags-section">
            <div className="flags-label">Event Flags</div>
            <div className="flags-row">
              {flags.map((f, i) => (
                <span key={i} className={`flag ${f.cls}`}>
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="overview-box">
          <div className="overview-heading">Event Overview</div>
          {p(ev.eventObjectives) ? (
            <p>{p(ev.eventObjectives)}</p>
          ) : (
            <p>
              {eventName} is a {p(ev.eventFormat) || "live"} event
              {org ? ` for ${org}` : ""}
              {p(vs.venueName) ? ` at ${p(vs.venueName)}` : ""}
              {[p(vs.venueCity), p(vs.venueState)].filter(Boolean).length > 0 ? `, ${[p(vs.venueCity), p(vs.venueState)].filter(Boolean).join(", ")}` : ""}.
              {" "}This RFP outlines AV and production requirements for vendor review and proposal.
            </p>
          )}
          {p(ev.eventTheme) && <p>Theme: {p(ev.eventTheme)}</p>}
          {p(ev.sacredConstraints) && (
            <p>Constraints: {p(ev.sacredConstraints)}</p>
          )}
          {arr(ev.primaryAudience).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#008ad2", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 5 }}>Primary Audience</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {arr(ev.primaryAudience).map((a, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", background: "#222628", color: "#fff", fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{a}</span>
                ))}
              </div>
            </div>
          )}
          {arr(ev.toneDirection).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#008ad2", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 5 }}>Tone &amp; Direction</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {arr(ev.toneDirection).map((t, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", background: "rgba(0,138,210,0.1)", color: "#0e7490", fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(0,138,210,0.35)" }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {(fullName || p(ct.contactEmail) || p(ct.contactPhone)) && (
          <div className="contact-bar">
            <div className="contact-label-cell">Primary<br />Contact</div>
            {fullName && <div className="contact-data-cell">{fullName}</div>}
            {p(ct.contactEmail) && <div className="contact-data-cell">{p(ct.contactEmail)}</div>}
            {p(ct.contactPhone) && <div className="contact-data-cell">{p(ct.contactPhone)}</div>}
          </div>
        )}

        <Footer left={`© ${new Date().getFullYear()} ${brandName} | RFPilot`} page={nextPage()} />
      </div>

      {/* ══════════════ PAGE 2: SCOPE AT A GLANCE ══════════════ */}
      <div className="page">
        <IntHeader brand={brandName} title={headerTitle} />
        <SectionTitle num={nextSec()}>Scope at a Glance</SectionTitle>

        {(() => {
          const showStartDate = p(vs.showStartDate) || p(ev.startDate);
          const showEndDate = p(vs.showEndDate) || p(ev.endDate);
          if (!p(vs.loadInDate) && !p(vs.rehearsalDate) && !showStartDate) return null;
          return (
            <>
              <div className="section-subtitle">Production Timeline</div>
              <table>
                <thead>
                  <tr>
                    {p(vs.loadInDate) && <th style={{ background: "#008ad2" }}>Load-In</th>}
                    {p(vs.rehearsalDate) && <th style={{ background: "#0ea5e9" }}>Rehearsal</th>}
                    {showStartDate && <th style={{ background: "#10b981" }}>Show Start</th>}
                    {showEndDate && <th style={{ background: "#8b5cf6" }}>Show End</th>}
                    {p(vs.strikeDate) && <th style={{ background: "#f97316" }}>Strike</th>}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {p(vs.loadInDate) && <td style={{ background: "rgba(0,138,210,0.06)", color: "#008ad2", fontWeight: 700 }}>{fmtDate(p(vs.loadInDate))}{p(vs.loadInTime) ? ` — ${p(vs.loadInTime)}` : ""}</td>}
                    {p(vs.rehearsalDate) && <td style={{ background: "rgba(14,165,233,0.06)", color: "#0ea5e9", fontWeight: 700 }}>{fmtDate(p(vs.rehearsalDate))}{p(vs.rehearsalTime) ? ` — ${p(vs.rehearsalTime)}` : ""}</td>}
                    {showStartDate && <td style={{ background: "rgba(16,185,129,0.06)", color: "#10b981", fontWeight: 700 }}>{fmtDate(showStartDate)}{p(vs.showStartTime) ? ` — ${p(vs.showStartTime)}` : ""}</td>}
                    {showEndDate && <td style={{ background: "rgba(139,92,246,0.06)", color: "#8b5cf6", fontWeight: 700 }}>{fmtDate(showEndDate)}{p(vs.showEndTime) ? ` — ${p(vs.showEndTime)}` : ""}</td>}
                    {p(vs.strikeDate) && <td style={{ background: "rgba(249,115,22,0.06)", color: "#f97316", fontWeight: 700 }}>{fmtDate(p(vs.strikeDate))}{p(vs.strikeTime) ? ` — ${p(vs.strikeTime)}` : ""}</td>}
                  </tr>
                </tbody>
              </table>
            </>
          );
        })()}

        <div className="section-subtitle">Scope Overview</div>
        <div className="info-card">
          <InfoRow label="Venue" value={[p(vs.venueName), p(vs.venueCity), p(vs.venueState)].filter(Boolean).join(", ")} />
          <InfoRow label="Venue Address" value={p(vs.venueAddress)} />
          <InfoRow label="Venue Status" value={p(vs.venueConfirmedStatus) ? p(vs.venueConfirmedStatus).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : ""} />
          <InfoRow label="Venue Type" value={p(vs.venueType)} />
          <InfoRow
            label="Union / Teamster / In-House Labor"
            value={p(vs.isUnionVenue) === "YES"
              ? [[...arr(vs.unionJurisdictions), p(vs.unionJurisdictionOther)].filter(Boolean).join(", ") || "Yes", p(vs.unionLaborDetails)].filter(Boolean).join(" — ")
              : p(vs.isUnionVenue) === "NO" ? "No" : ""}
          />
          <InfoRow label="Event Format" value={p(ev.eventFormat)} />
          <InfoRow label="Attendees" value={p(ev.attendees)} />
          <InfoRow label="Production Rooms" value={p(vs.numberOfEventRooms) || String(rooms.length) || ""} />
          <InfoRow label="Time Zone" value={p(vs.timeZone)} />
          {arr(bud.proposalFormatPreferences as unknown).length > 0 && (
            <InfoRow label="Proposal Format" value={arr(bud.proposalFormatPreferences as unknown).join(", ")} />
          )}
          {p(ven.riggingRequired) === "YES" && (
            <InfoRow
              label="Rigging"
              value={`Required${p(ven.trussAndMotorsProvidedByVenue) ? ` — Truss/Motors by Venue: ${p(ven.trussAndMotorsProvidedByVenue)}` : ""}${p(ven.liftsProvidedByVenue) ? `, Lifts by Venue: ${p(ven.liftsProvidedByVenue)}` : ""}`}
            />
          )}
          {p(ven.powerDropsRequired) === "YES" && (
            <InfoRow
              label="Power Drops"
              value={`${p(ven.numberOfPowerDrops) || ""}${p(ven.powerDropAmperage) ? ` × ${p(ven.powerDropAmperage)}A` : ""} drops required`}
            />
          )}
          <InfoRow label="COI Requirements" value={p(ven.coiRequirements)} />
          <InfoRow label="Venue Access" value={p(ven.venueAccessRequirements)} />
          {p(ev.eventWebsite) && <InfoRow label="Event Website" value={p(ev.eventWebsite)} />}
        </div>

        {p(ev.aboutOrganization) && (
          <div className="callout" style={{ marginTop: 9 }}>
            <div className="callout-heading">About The Organization</div>
            <p>{p(ev.aboutOrganization)}</p>
          </div>
        )}

        {p(ev.statementOfWork) && (
          <div className="callout" style={{ marginTop: 9 }}>
            <div className="callout-heading">Statement of Work</div>
            <p>{p(ev.statementOfWork)}</p>
          </div>
        )}

        {p(ev.eventProfile) && (
          <div className="callout" style={{ marginTop: 9 }}>
            <div className="callout-heading">Event Profile</div>
            <p>{p(ev.eventProfile)}</p>
          </div>
        )}

        {p(ev.rfpTimeline) && (
          <div className="callout" style={{ marginTop: 9 }}>
            <div className="callout-heading">RFP Timeline</div>
            <p>{p(ev.rfpTimeline)}</p>
          </div>
        )}

        <Footer left={footerLeft} page={nextPage()} />
      </div>

      {/* ══════════════ PAGE 3+: ROOM-BY-ROOM ══════════════ */}
      {rooms.length > 0 && (
        <div className="page rooms-page">
          <IntHeader brand={brandName} title={headerTitle} />
          <SectionTitle num={nextSec()}>Room-by-Room Technical Specifications</SectionTitle>

          {rooms.length === 1 ? (
            renderRoom(rooms[0], 0, 1)
          ) : (
            <div className="two-col">
              {rooms.slice(0, 2).map((r, i) => renderRoom(r, i, rooms.length))}
            </div>
          )}

          {rooms.length > 2 && (
            <div className="two-col" style={{ marginTop: 12 }}>
              {rooms.slice(2, 4).map((r, i) => renderRoom(r, i + 2, rooms.length))}
            </div>
          )}

          <Footer left={footerLeft} page={nextPage()} />
        </div>
      )}

      {/* ══════════════ HYBRID & VIRTUAL ══════════════ */}
      {isHybrid && (
        <div className="page">
          <IntHeader brand={brandName} title={headerTitle} />
          <SectionTitle num={nextSec()}>Hybrid &amp; Virtual Production</SectionTitle>

          <p style={{ fontSize: "10.5px", color: "#64748b", lineHeight: 1.6, marginBottom: 12 }}>
            This event is formatted as a {ev.eventFormat?.toLowerCase()} production. The specifications below govern the virtual audience experience and streaming infrastructure.
          </p>

          <table>
            <tbody>
              <InfoTd label="Virtual Attendees (Est.)" value={p(hv.virtualAttendeeEstimate)} />
              <InfoTd label="Streaming Platform" value={p(hv.streamingPlatform) === "Other" ? p(hv.streamingPlatformOther) : p(hv.streamingPlatform)} />
              <InfoTd label="Platform Integration" value={yn(hv.platformIntegrationWithAv)} />
              <InfoTd label="Stream Ownership" value={p(hv.streamOwnership)} />
              <InfoTd label="Remote Speakers" value={(() => {
                const rs = hv.remoteSpeakers as RD | undefined;
                if (!rs) return "";
                const v = p(rs.remoteSpeakers);
                const qty = p(rs.howManyRemoteSpeakers);
                return v === "YES" ? `Yes${qty ? ` (${qty})` : ""}` : yn(v);
              })()} />
              <InfoTd label="Live Virtual Q&A" value={yn(hv.liveVirtualQa)} />
              <InfoTd label="Virtual-Only Breakouts" value={yn(hv.virtualOnlyBreakouts)} />
              <InfoTd label="Dedicated Virtual Producer" value={yn(hv.dedicatedVirtualProducer)} />
              <InfoTd label="Closed Captions" value={(() => {
                const caps = hv.closedCaptions as RD | undefined;
                if (!caps) return "";
                const v = p(caps.closedCaptions);
                const langs = arr(caps.captionLanguages);
                return v === "YES" ? `Yes${langs.length ? ` — ${langs.join(", ")}` : ""}` : yn(v);
              })()} />
              <InfoTd label="On-Demand Recording" value={yn(hv.onDemandRecording)} />
              <InfoTd label="Sponsor Overlays" value={yn(hv.sponsorOverlays)} />
              <InfoTd label="Virtual Networking" value={yn(hv.virtualNetworking)} />
            </tbody>
          </table>

          <Footer left={footerLeft} page={nextPage()} />
        </div>
      )}

      {/* ══════════════ CONTENT & CREATIVE ══════════════ */}
      {hasContent && (
        <div className="page">
          <IntHeader brand={brandName} title={headerTitle} />
          <SectionTitle num={nextSec()}>Content &amp; Creative Scope</SectionTitle>

          <table>
            <thead>
              <tr>
                <th style={{ width: "40%" }}>Content Element</th>
                <th style={{ width: "15%", textAlign: "center" }}>Client</th>
                <th style={{ width: "18%", textAlign: "center" }}>AV Vendor</th>
                <th style={{ width: "8%", textAlign: "center" }}>TBD</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const ldf = (cc.liveDataFeeds || {}) as RD;
                const ldfOwnership = p(ldf.needed) === "YES" ? p(ldf.ownership) : "";
                const openingClosingOwner = p(cc.openingClosingVideo);
                const motionAssetsOwner = p(cc.motionGraphicsStingersBumpers);
                const legacyCombinedOwner = !openingClosingOwner && !motionAssetsOwner
                  ? p(cc.motionGraphicsOpenerVideo)
                  : "";
                const rows = [
                  { label: "Presentation Template Design", val: p(cc.presentationTemplateDesign) },
                  { label: "Speaker Slide Collection & Formatting", val: p(cc.speakerSlideCollection) },
                  { label: "Opening / Closing Video", val: openingClosingOwner },
                  { label: "Motion Graphics / Stingers / Speaker Bumpers", val: motionAssetsOwner },
                  { label: "Legacy Motion Graphics / Opener Video", val: legacyCombinedOwner },
                  { label: "Lower Thirds & Name Supers", val: p(cc.lowerThirdsNameSupers) },
                  { label: "Event Logo & Brand Standards", val: p(cc.eventLogoBrandStandards) },
                  { label: "Sizzle / Recap Video", val: p(cc.sizzleRecapVideo) },
                  { label: "Live Data Feeds", val: ldfOwnership },
                  { label: "Sponsor Recognition Content", val: p(cc.sponsorRecognitionContent) },
                  { label: "Social Media Content Capture", val: p(cc.socialMediaContentCapture) },
                  { label: "Virtual Background Design", val: p(cc.virtualBackgroundDesign) },
                ];
                return rows.map(({ label, val }) => {
                  if (!val) return null;
                  const isClient = val === "Client / Internal Team";
                  const isVendor = val === "AV Vendor";
                  const isTbd = val === "TBD";
                  return (
                    <tr key={label}>
                      <td>{label}</td>
                      <td style={{ textAlign: "center", color: isClient ? "#16a34a" : "#64748b", fontWeight: isClient ? 800 : 400 }}>{isClient ? "✓" : "—"}</td>
                      <td style={{ textAlign: "center", color: isVendor ? "#16a34a" : "#64748b", fontWeight: isVendor ? 800 : 400 }}>{isVendor ? "✓" : "—"}</td>
                      <td style={{ textAlign: "center", color: isTbd ? "#d97706" : "#64748b", fontWeight: isTbd ? 800 : 400 }}>{isTbd ? "✓" : "—"}</td>
                      <td>{val === "N/A" ? "Not applicable" : ""}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>

          {p(cc.creativeDirectionNotes) && (
            <div className="orange-callout">
              <b>Creative Direction Note:</b> {p(cc.creativeDirectionNotes)}
            </div>
          )}

          <Footer left={footerLeft} page={nextPage()} />
        </div>
      )}

      {/* ══════════════ VIDEO RECORDING ══════════════ */}
      {p(vr.videoRecordingRequired) === "YES" && (
        <div className="page">
          <IntHeader brand={brandName} title={headerTitle} />
          <SectionTitle num={nextSec()}>Video Recording &amp; Broadcast</SectionTitle>

          <div className="section-subtitle">Recording Strategy</div>
          <table>
            <tbody>
              <InfoTd label="ISO Recordings" value={p(vr.isoRecordings)} />
            </tbody>
          </table>

          <div className="section-subtitle">Recording &amp; Deliverables</div>
          <table>
            <tbody>
              <InfoTd label="Recording Codec" value={p(vr.recordingCodec)} />
              <InfoTd label="Record in 4K" value={p(vr.recordIn4k) ? yn(vr.recordIn4k) : p(vr.recordingResolution)} />
              <InfoTd label="Recording Media" value={p(vr.recordingMedia)} />
              <InfoTd label="Raw Footage Turnover" value={yn(vr.rawFootageTurnover)} />
              <InfoTd label="Deliverable Format" value={arr(vr.deliverableFormat).join(", ")} />
              <InfoTd label="Delivery Method" value={arr(vr.deliveryMethod).join(", ")} />
              {(() => {
                const ed = vr.editedDeliverable as RD | undefined;
                if (!ed || p(ed.needed) !== "YES") return null;
                return (
                  <>
                    <InfoTd label="Edited Deliverable" value={`Yes — ${arr(ed.deliverableType).join(", ") || ""}`} />
                    <InfoTd label="Turnaround Time" value={p(ed.turnaroundTime)} />
                    <InfoTd label="Reel Length" value={p(ed.reelLengthPreference)} />
                  </>
                );
              })()}
            </tbody>
          </table>

          <Footer left={footerLeft} page={nextPage()} />
        </div>
      )}

      {/* ══════════════ VENUE & INFRASTRUCTURE ══════════════ */}
      <div className="page">
        <IntHeader brand={brandName} title={headerTitle} />
        <SectionTitle num={nextSec()}>Venue &amp; Infrastructure</SectionTitle>

        <table>
          <tbody>
            <InfoTd label="Venue" value={p(vs.venueName)} />
            <InfoTd label="Venue AV Contact" value={p(ven.venueAvContactName)} />
            <InfoTd label="AV Contact Phone" value={p(ven.venueAvContactPhone)} />
            <InfoTd label="AV Contact Email" value={p(ven.venueAvContactEmail)} />
            <InfoTd label="In-House AV Company" value={p(ven.inHouseAvCompanyName)} />
            <InfoTd
              label="Union / Teamster / In-House Labor"
              value={p(vs.isUnionVenue) === "YES"
                ? [arr(vs.unionJurisdictions).join(", ") || "Yes", p(vs.unionLaborDetails)].filter(Boolean).join(" — ")
                : ""}
            />
            <InfoTd
              label="Rigging"
              value={p(ven.riggingRequired) === "YES"
                ? `Required${p(ven.trussAndMotorsProvidedByVenue) ? ` — Truss/Motors by Venue: ${p(ven.trussAndMotorsProvidedByVenue)}` : ""}${p(ven.liftsProvidedByVenue) ? `, Lifts by Venue: ${p(ven.liftsProvidedByVenue)}` : ""}`
                : p(ven.riggingRequired) === "NO" ? "Not Required" : ""}
            />
            <InfoTd
              label="Power Drops"
              value={p(ven.powerDropsRequired) === "YES"
                ? `${p(ven.numberOfPowerDrops) || "Required"}${p(ven.powerDropAmperage) ? ` × ${p(ven.powerDropAmperage)}A` : ""}`
                : p(ven.powerDropsRequired) === "NO" ? "Not Required" : ""}
            />
            <InfoTd label="Wireless Internet" value={p(ven.wirelessInternetRequired) === "YES" ? `Required — ${arr(ven.internetUseCases).join(", ") || ""}` : p(ven.wirelessInternetRequired) === "NO" ? "Not Required" : ""} />
            <InfoTd label="Load-In Access" value={p(vs.loadInDate) ? `${fmtDate(p(vs.loadInDate))}${p(vs.loadInTime) ? ` from ${p(vs.loadInTime)}` : ""}` : ""} />
            <InfoTd label="Strike" value={p(vs.strikeDate) ? `${fmtDate(p(vs.strikeDate))}${p(vs.strikeTime) ? ` from ${p(vs.strikeTime)}` : ""}` : ""} />
            <InfoTd label="COI Requirements" value={p(ven.coiRequirements)} />
            <InfoTd label="Venue Access Notes" value={p(ven.venueAccessRequirements)} />
          </tbody>
        </table>

        {p(vs.isUnionVenue) === "YES" && (
          <div className="orange-callout">
            <b>Union Note:</b> This venue operates under{" "}
            {arr(vs.unionJurisdictions).join(", ") || "union"} jurisdiction. Vendors must demonstrate established experience managing union labor calls at this venue specifically.
          </div>
        )}

        <Footer left={footerLeft} page={nextPage()} />
      </div>

      {/* ══════════════ VENDOR COORDINATION ══════════════ */}
      {coVendorList.length > 0 && (
        <div className="page">
          <IntHeader brand={brandName} title={headerTitle} />
          <SectionTitle num={nextSec()}>Vendor Coordination</SectionTitle>

          <p style={{ fontSize: "10.5px", color: "#64748b", lineHeight: 1.6, marginBottom: 12 }}>
            The following co-vendors are confirmed or anticipated. The selected AV vendor is expected to coordinate directly with each.
          </p>

          <table>
            <thead>
              <tr>
                <th style={{ width: "25%" }}>Vendor Category</th>
                <th style={{ width: "25%" }}>Company</th>
                <th style={{ width: "20%" }}>Contact</th>
                <th>Coordination Scope</th>
              </tr>
            </thead>
            <tbody>
              {coVendorList.map((v, i) => (
                <tr key={i}>
                  <td>{v.cat}</td>
                  <td><b>{v.company || "TBD"}</b></td>
                  <td>{v.contact || "TBD"}</td>
                  <td>{v.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {p(up.ndaRequired) === "YES" && (
            <div className="callout" style={{ marginTop: 14 }}>
              <div className="callout-heading">NDA Required</div>
              <p>An NDA must be executed before receiving sensitive materials. Type: {p(up.ndaType) || "Standard NDA"}.</p>
            </div>
          )}

          <Footer left={footerLeft} page={nextPage()} />
        </div>
      )}

      {/* ══════════════ EVALUATION ══════════════ */}
      <div className="page">
        <IntHeader brand={brandName} title={headerTitle} />
        <SectionTitle num={nextSec()}>Proposal Requirements &amp; Evaluation</SectionTitle>

        <div className="section-subtitle">Required Response Format</div>
        <p style={{ fontSize: "10.5px", color: "#64748b", marginBottom: 8 }}>All vendor proposals must include the following components. Incomplete submissions will be removed from evaluation.</p>

        <table>
          <thead>
            <tr>
              <th style={{ width: "6%" }}>#</th>
              <th style={{ width: "28%" }}>Requirement</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: "Itemized Gear List", detail: "Line-item equipment list with quantities, make/model, and daily rates." },
              { label: "Labor Breakdown", detail: "All crew positions by day with call times, rates, and overtime assumptions." },
              { label: "All-In Estimate", detail: "Single consolidated total inclusive of gear, labor, freight, and other costs." },
              ...(isHybrid ? [{ label: "Hybrid Production Plan", detail: "Narrative describing your approach to broadcast, platform integration, and virtual audience experience." }] : []),
              { label: "Crew Bios", detail: "Lead crew bios for TD, A1, L1, and Showcaller." },
              { label: "References", detail: "Minimum two references from comparable events in the last 24 months." },
              { label: "Alternates", detail: "At least one alternate/value-engineered option with scope tradeoffs explained." },
            ].map((req, i) => (
              <tr key={i}>
                <td style={{ textAlign: "center", fontWeight: 900, background: i % 2 === 0 ? "#222628" : "#008ad2", color: i % 2 === 0 ? "#008ad2" : "#fff" }}>{i + 1}</td>
                <td><b>{req.label}</b></td>
                <td>{req.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="section-subtitle">Bid Details</div>
        <div className="info-card" style={{ marginBottom: 9 }}>
          <InfoRow label="Budget Flexibility" value={p(bud.budgetFlexibility)} />
          <InfoRow label="Competitive Bid" value={yn(bud.competitiveBid)} />
          <InfoRow label="Vendors Invited" value={p(bud.numberOfProposals)} />
          <InfoRow label="Vendor Questions Due" value={fmtDate(p(bud.vendorQuestionsDueDate))} />
          <InfoRow label="Response to Vendor Questions" value={fmtDate(p(bud.responseToVendorQuestionsDate))} />
          <InfoRow label="Proposal Submission Due" value={fmtDate(p(bud.proposalSubmissionDueDate))} />
          <InfoRow label="Shortlist Notification" value={fmtDate(p(bud.shortlistNotificationDate))} />
          {p(bud.vendorPresentationOpportunity) === "YES" && (
            <InfoRow label="Vendor Presentation Date" value={fmtDate(p(bud.vendorPresentationDate))} />
          )}
          <InfoRow label="Vendor Selection" value={fmtDate(p(bud.vendorSelectionDate))} />
          <InfoRow label="Decision Date" value={fmtDate(p(bud.decisionDate))} />
          <InfoRow label="Call with Producer" value={yn(bud.callWithDxgProducer)} />
        </div>

        <div className="section-subtitle">Weighted Evaluation Matrix</div>
        {evaluationMatrixConfirmed ? (
          <table>
            <thead>
              <tr>
                <th>Evaluation Criterion</th>
                <th style={{ width: "10%", textAlign: "center" }}>Weight</th>
                <th>Scoring Guide</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row, i) => (
                <tr key={i}>
                  <td>{row.label}</td>
                  <td style={{ textAlign: "center", fontWeight: 800, color: "#222628" }}>{row.weight}%</td>
                  <td>{row.guide}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>
            Scoring criteria have not been finalised. Proposals will be evaluated on overall fit
            against the requirements in this document; the client will confirm weightings before
            award.
          </p>
        )}

        {p(bud.sustainabilityDeiNotes) && (
          <div className="callout" style={{ marginTop: 9 }}>
            <div className="callout-heading">Sustainability &amp; DEI Practices</div>
            <p>{p(bud.sustainabilityDeiNotes)}</p>
          </div>
        )}

        {p(bud.scoringNotes) && (
          <div className="callout" style={{ marginTop: 9 }}>
            <div className="callout-heading">Scoring Notes / Key Decision Factors</div>
            <p>{p(bud.scoringNotes)}</p>
          </div>
        )}

        <Footer left={footerLeft} page={nextPage()} />
      </div>

      {/* ══════════════ UPLOADS & CO-VENDORS ══════════════ */}
      {(() => {
        const fname = (url: string): string => decodeURIComponent(url.split("/").pop() ?? url).replace(/^\d+-\d+-/, "");
        const hasPrivateLocation = (value: string): boolean => /^https?:\/\//i.test(value);
        const dlBtn = (url: string, name: string) => hasPrivateLocation(url) ? (
          <td className="no-print" style={{ width: "12%", textAlign: "center", verticalAlign: "middle" }}>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(url, { mode: "cors" });
                  if (!res.ok) throw new Error();
                  const blob = await res.blob();
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = name;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(a.href);
                } catch {
                  window.open(url, "_blank");
                }
              }}
              style={{ background: "#222628", color: "#fff", border: "none", borderRadius: 5, padding: "4px 9px", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              ↓ Download
            </button>
          </td>
        ) : <td className="no-print" />;
        const openBtn = (url: string) => (
          <td className="no-print" style={{ width: "12%", textAlign: "center", verticalAlign: "middle" }}>
            <a href={url} target="_blank" rel="noreferrer" style={{ display: "inline-block", background: "#008ad2", color: "#fff", borderRadius: 5, padding: "4px 9px", fontSize: 10, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
              ↗ Open
            </a>
          </td>
        );
        const brandFiles = arr(up.brandGuideFiles);
        const logoFiles = arr(up.eventLogoFiles);
        const refFiles = arr(up.referenceFiles);
        const refUrls = arr(up.referenceUrls);
        const venueDocs = arr(up.venueDocs);
        const scenicFiles = arr(up.scenicInspirationFiles);
        const venueCoiFiles = arr(up.venueCoiFiles);
        const ndaDocs = arr(up.ndaDocumentFiles);
        const ndaRequired = p(up.ndaRequired) === "YES";
        const cvEntries = [
          { cat: "In-House Venue AV", raw: (cvs.inHouseVenueAv || {}) as RD },
          { cat: "Event Decorator / Scenic", raw: (cvs.eventDecorator || {}) as RD },
          { cat: "Registration / Event Tech", raw: (cvs.registrationTech || {}) as RD },
          { cat: "Agency of Record", raw: (cvs.agencyOfRecord || {}) as RD },
          { cat: "Photography", raw: (cvs.photographer || {}) as RD },
        ].filter(({ raw }) => p(raw.companyName) || p(raw.contactName));

        const hasFiles = brandFiles.length || logoFiles.length || refFiles.length || refUrls.length || scenicFiles.length || venueDocs.length || venueCoiFiles.length || ndaDocs.length || p(up.brandGuideUrl);
        // NDA status is already included on the submission page. Avoid adding
        // an otherwise empty reference page when there are no files or contacts.
        if (!hasFiles && !cvEntries.length) return null;

        return (
          <div className="page">
            <IntHeader brand={brandName} title={headerTitle} />
            <SectionTitle num={nextSec()}>Reference Materials &amp; Co-Vendor Coordination</SectionTitle>

            {hasFiles && (
              <>
                <div className="section-subtitle">Attached Documents &amp; Files</div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "28%" }}>Category</th>
                      <th>File / URL</th>
                      <th className="no-print" style={{ width: "12%", textAlign: "center" }}>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandFiles.map((f, i) => (
                      <tr key={`bg-${i}`}>
                        <td>{i === 0 ? <b>Brand Guide</b> : ""}</td>
                        <td style={{ fontSize: 11, color: "#222628" }}>{fname(f)}</td>
                        {dlBtn(f, fname(f))}
                      </tr>
                    ))}
                    {p(up.brandGuideUrl) && (
                      <tr>
                        <td><b>Brand Guide URL</b></td>
                        <td style={{ fontSize: 11, color: "#222628" }}>{p(up.brandGuideUrl)}</td>
                        {openBtn(p(up.brandGuideUrl))}
                      </tr>
                    )}
                    {logoFiles.map((f, i) => (
                      <tr key={`lo-${i}`}>
                        <td>{i === 0 ? <b>Event Logo</b> : ""}</td>
                        <td style={{ fontSize: 11, color: "#222628" }}>{fname(f)}</td>
                        {dlBtn(f, fname(f))}
                      </tr>
                    ))}
                    {refFiles.map((f, i) => (
                      <tr key={`rf-${i}`}>
                        <td>{i === 0 ? <b>Reference Files</b> : ""}</td>
                        <td style={{ fontSize: 11, color: "#222628" }}>{fname(f)}</td>
                        {dlBtn(f, fname(f))}
                      </tr>
                    ))}
                    {scenicFiles.map((f, i) => (
                      <tr key={`sc-${i}`}>
                        <td>{i === 0 ? <b>Scenic Inspirations</b> : ""}</td>
                        <td style={{ fontSize: 11, color: "#222628" }}>{fname(f)}</td>
                        {dlBtn(f, fname(f))}
                      </tr>
                    ))}
                    {refUrls.map((u, i) => (
                      <tr key={`ru-${i}`}>
                        <td>{i === 0 && !refFiles.length ? <b>Reference URLs</b> : ""}</td>
                        <td style={{ fontSize: 11, color: "#222628" }}>{u}</td>
                        {openBtn(u)}
                      </tr>
                    ))}
                    {venueDocs.map((f, i) => (
                      <tr key={`vd-${i}`}>
                        <td>{i === 0 ? <b>Venue Documents</b> : ""}</td>
                        <td style={{ fontSize: 11, color: "#222628" }}>{fname(f)}</td>
                        {dlBtn(f, fname(f))}
                      </tr>
                    ))}
                    {venueCoiFiles.map((f, i) => (
                      <tr key={`vc-${i}`}>
                        <td>{i === 0 ? <b>Venue / COI Documents</b> : ""}</td>
                        <td style={{ fontSize: 11, color: "#222628" }}>{fname(f)}</td>
                        {dlBtn(f, fname(f))}
                      </tr>
                    ))}
                    {ndaDocs.map((f, i) => (
                      <tr key={`nd-${i}`}>
                        <td>{i === 0 ? <b>NDA Document</b> : ""}</td>
                        <td style={{ fontSize: 11, color: "#222628" }}>{fname(f)}</td>
                        {dlBtn(f, fname(f))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {ndaRequired && (
              <div className="orange-callout" style={{ marginTop: 8 }}>
                <b>NDA Required:</b> Vendors must execute a{" "}
                {p(up.ndaType) === "one_way" ? "one-way" : p(up.ndaType) === "mutual" ? "mutual" : p(up.ndaType) || "standard"}{" "}
                Non-Disclosure Agreement before receiving full brief materials.
                {ndaDocs.length > 0 && " See attached NDA document."}
              </div>
            )}

            {cvEntries.length > 0 && (
              <>
                <div className="section-subtitle" style={{ marginTop: 9 }}>Co-Vendor Contacts</div>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "22%" }}>Vendor Category</th>
                      <th style={{ width: "22%" }}>Company</th>
                      <th style={{ width: "20%" }}>Contact</th>
                      <th style={{ width: "22%" }}>Email / Phone</th>
                      <th>Status / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cvEntries.map(({ cat, raw }) => (
                      <tr key={cat}>
                        <td><b>{cat}</b></td>
                        <td>{p(raw.companyName)}</td>
                        <td>{p(raw.contactName)}</td>
                        <td style={{ fontSize: 10.5 }}>{[p(raw.contactEmail), p(raw.contactPhone)].filter(Boolean).join(" | ")}</td>
                        <td style={{ fontSize: 10.5 }}>{[p(raw.status), p(raw.notes)].filter(Boolean).join(" — ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <Footer left={footerLeft} page={nextPage()} />
          </div>
        );
      })()}

      {/* ══════════════ SUBMISSION TERMS ══════════════ */}
      <div className="page">
        <IntHeader brand={brandName} title={headerTitle} />
        <SectionTitle num={nextSec()}>Submission Terms &amp; Next Steps</SectionTitle>

        <table>
          <tbody>
            <InfoTd label="Vendor Questions Due" value={fmtDate(p(bud.vendorQuestionsDueDate))} />
            <InfoTd label="Response to Vendor Questions" value={fmtDate(p(bud.responseToVendorQuestionsDate))} />
            <InfoTd label="Proposal Submission Due" value={fmtDate(p(bud.proposalSubmissionDueDate))} />
            <InfoTd label="Shortlist Notification" value={fmtDate(p(bud.shortlistNotificationDate))} />
            {p(bud.vendorPresentationOpportunity) === "YES" && (
              <InfoTd label="Vendor Presentation Date" value={fmtDate(p(bud.vendorPresentationDate))} />
            )}
            <InfoTd label="Vendor Selection" value={fmtDate(p(bud.vendorSelectionDate))} />
            <InfoTd label="Decision Date" value={fmtDate(p(bud.decisionDate))} />
            <InfoTd label="Submission Method" value="Via RFPilot vendor portal" />
            <InfoTd label="Competitive Bid" value={yn(bud.competitiveBid)} />
            <InfoTd label="Number of Proposals" value={p(bud.numberOfProposals)} />
            <InfoTd label="Proposal Validity" value="Proposals must remain valid for 60 days from submission" />
            {p(up.ndaRequired) === "YES" && (
              <InfoTd label="NDA Requirement" value={`NDA required — ${p(up.ndaType) || "Standard"}`} />
            )}
            {p(ven.coiRequirements) && (
              <InfoTd label="COI Requirement" value={p(ven.coiRequirements)} />
            )}
          </tbody>
        </table>

        <div className="section-subtitle">Primary Contact</div>
        <div className="info-card" style={{ marginBottom: 9 }}>
          <InfoRow label="Name" value={[fullName, p(ct.contactTitle)].filter(Boolean).join(" — ")} />
          <InfoRow label="Organization" value={p(ct.contactOrganization)} />
          <InfoRow label="Legal Name" value={p(ct.organizationLegalName)} />
          <InfoRow label="Email" value={p(ct.contactEmail)} />
          <InfoRow label="Phone" value={[p(ct.contactPhone) + (p(ct.contactPhoneExt) ? ` ext. ${p(ct.contactPhoneExt)}` : ""), p(ct.contactPhoneType)].filter(Boolean).join(" · ")} />
          <InfoRow label="Preferred Contact" value={p(ct.preferredContactMethod)} />
          <InfoRow label="Best Time to Reach" value={p(ct.bestTimeToReach)} />
        </div>

        {Array.isArray(ct.additionalContacts) && ct.additionalContacts.length > 0 && (
          <>
            <div className="section-subtitle">Additional Contacts</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Name</th>
                  <th style={{ width: "24%" }}>Title / Role</th>
                  <th style={{ width: "28%" }}>Email</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {ct.additionalContacts.map((ac, i) => {
                  const c = ac as RD;
                  return (
                    <tr key={i}>
                      <td>{p(c.fullName)}</td>
                      <td>{p(c.titleAndRole)}</td>
                      <td>{p(c.email)}</td>
                      <td>{p(c.phone)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {p(bud.callWithDxgProducer) === "YES" && (
          <div className="cta-box">
            <div className="cta-side">Book a Producer Insight Call</div>
            <div className="cta-body">
              <p>Your event includes specialized production requirements that benefit from a conversation before your RFP goes out. Our producers are available to walk through your scope.</p>
              <div className="cta-link">→ Contact {fullName || brandName} to schedule</div>
            </div>
          </div>
        )}

        {p(ct.anythingElse) && (
          <div className="callout" style={{ marginTop: 14 }}>
            <div className="callout-heading">Additional Notes</div>
            <p>{p(ct.anythingElse)}</p>
          </div>
        )}

        {p(bud.scoringNotes) && (
          <div className="callout" style={{ marginTop: 10 }}>
            <div className="callout-heading">Scoring Notes</div>
            <p>{p(bud.scoringNotes)}</p>
          </div>
        )}

        <div className="disclaimer-box">
          <p>
            This RFP was generated by RFPilot, a platform by {brandName}. All specifications reflect information provided by the event planner. This document is confidential and intended solely for invited vendors.
          </p>
        </div>

        <Footer left={footerLeft} page={nextPage()} />
      </div>
    </div>
  );
}

/* ─── Table row helper (only renders if value is non-empty) ─── */
function InfoTd({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <tr>
      <td style={{ width: "38%" }}>
        <b>{label}</b>
      </td>
      <td>{value}</td>
    </tr>
  );
}
