import type { VendorSubmissionDetail, VendorSubmissionVersion } from "@/app/actions/vendorResponse";
import { formatAppDate, formatAppDateTime } from "@/lib/dateFormat";
import { fileTypeLabel } from "@/lib/proposalIntelligence/plainLanguage";
import { formatMoney } from "@/lib/vendorResponses/workspaceModel";
import { displayFileName, formatFileSize } from "@/lib/vendorResponses/documentFiles";

/* One document for both "Print view" and "Download review": the PDF is this
   page printed by headless Chrome, so the two can never show different data.
   Visual language follows the proposal document (ProposalRfpTemplate), but the
   content flows across A4 pages instead of fixed-height pages, because a
   vendor response has no fixed length. Rows, cards and section headings never
   split across a page break. */
export const VENDOR_RESPONSE_DOCUMENT_CSS = `
  @page { size: A4; margin: 12mm 0 14mm; }
  @page :first { margin-top: 0; }
  body { margin: 0; background: #e5e7eb; }
  .vrd { --ink: #1e293b; --muted: #64748b; --line: #e2e8f0; --accent: #008ad2; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.45; color: var(--ink); background: #e5e7eb; padding: 24px 0 110px; }
  .vrd *, .vrd *::before, .vrd *::after { box-sizing: border-box; }
  .vrd .vrd-page { width: 210mm; margin: 0 auto; padding: 0 13mm 12mm; background: #fff; box-shadow: 0 1px 4px rgba(15,23,42,.12); }
  .vrd .cover { position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center; gap: 24px; margin: 0 -13mm 16px; padding: 24px 13mm 22px; background: linear-gradient(118deg, #1d2327 0%, #222628 60%, #172e38 100%); border-bottom: 4px solid #2bb4df; }
  .vrd .cover::after { content: ""; position: absolute; right: -48px; bottom: -86px; width: 210px; height: 210px; border: 1px solid rgba(43,180,223,.16); border-radius: 50%; box-shadow: 0 0 0 26px rgba(43,180,223,.035), 0 0 0 54px rgba(43,180,223,.025); }
  .vrd .brand { display: inline-flex; align-items: center; gap: 7px; padding: 6px 11px; border-radius: 8px; background: #fff; }
  .vrd .brand img { display: block; width: 34px; height: 34px; object-fit: contain; }
  .vrd .brand-word { color: #222628; font-size: 21px; font-weight: 900; letter-spacing: -.5px; line-height: 1; }
  .vrd .brand-word span { color: #2bb4df; }
  .vrd .brand-caption { margin-top: 7px; color: #9fb4c0; font-size: 9px; font-weight: 700; letter-spacing: 1.25px; text-transform: uppercase; }
  .vrd .cover-meta { position: relative; z-index: 1; max-width: 380px; text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
  .vrd .cover-row { display: flex; align-items: center; gap: 9px; margin-bottom: 7px; }
  .vrd .cover-type { color: #7dd3f0; font-size: 10px; font-weight: 800; letter-spacing: 1.1px; text-transform: uppercase; }
  .vrd .badge-conf { background: #ef4444; color: #fff; font-size: 9px; font-weight: 800; padding: 4px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: .65px; }
  .vrd .cover-event { color: #fff; font-size: 16px; font-weight: 800; line-height: 1.2; }
  .vrd .cover-issued { margin-top: 5px; color: #9fb4c0; font-size: 9px; font-weight: 600; letter-spacing: .25px; }
  .vrd .accent-rule { border: 0; border-top: 4px solid var(--accent); border-radius: 2px; margin: 0 0 12px; }
  .vrd h1 { margin: 0 0 4px; font-size: 26px; font-weight: 900; color: #222628; letter-spacing: -.3px; line-height: 1.15; }
  .vrd .subtitle { margin: 0 0 12px; font-size: 13.5px; font-weight: 700; color: var(--muted); }
  .vrd .date-bar { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--line); border-radius: 7px; overflow: hidden; margin-bottom: 10px; }
  .vrd .date-bar > div { padding: 8px 12px; background: #f8fafc; border-right: 1px solid var(--line); }
  .vrd .date-bar > div:last-child { border-right: 0; }
  .vrd .date-bar b { color: #222628; }
  .vrd .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 7px; }
  .vrd .stat { border: 1px solid var(--line); border-top: 3px solid var(--accent); border-radius: 7px; padding: 9px; background: rgba(0,138,210,.03); text-align: center; break-inside: avoid; }
  .vrd .stat-label { font-size: 9.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
  .vrd .stat-value { font-size: 17px; font-weight: 900; color: var(--accent); line-height: 1; }
  .vrd .tally { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-bottom: 10px; }
  .vrd .tally > div { border-radius: 7px; padding: 7px 11px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; break-inside: avoid; }
  .vrd .tally b { font-size: 16px; }
  .vrd .t-comply { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
  .vrd .t-sub { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
  .vrd .t-exc { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
  .vrd .contact { display: grid; grid-template-columns: 96px 1fr 1fr 1fr; border: 1px solid var(--line); border-radius: 7px; overflow: hidden; margin-bottom: 14px; break-inside: avoid; }
  .vrd .contact > div { padding: 8px 11px; font-weight: 700; color: #222628; background: #f8fafc; border-left: 1px solid var(--line); overflow-wrap: anywhere; }
  .vrd .contact > .contact-label { background: #222628; color: #fff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; border-left: 0; display: flex; align-items: center; justify-content: center; text-align: center; }
  .vrd .section { margin-top: 14px; }
  .vrd .section-title { display: flex; align-items: center; gap: 10px; margin: 0 0 9px; padding: 8px 13px; border-radius: 9px; background: #222628; color: #fff; font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .3px; break-after: avoid; break-inside: avoid; }
  .vrd .sec-num { min-width: 24px; height: 24px; border-radius: 6px; background: var(--accent); display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; }
  .vrd .tag { margin-left: auto; font-size: 8.5px; font-weight: 800; letter-spacing: .6px; padding: 3px 7px; border-radius: 999px; }
  .vrd .tag-vendor { background: rgba(125,211,240,.18); color: #7dd3f0; }
  .vrd .tag-server { background: rgba(110,231,183,.18); color: #6ee7b7; }
  .vrd .subhead { margin: 10px 0 5px; font-size: 10.5px; font-weight: 800; color: var(--accent); text-transform: uppercase; letter-spacing: .9px; break-after: avoid; }
  .vrd .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .vrd .card { border: 1px solid var(--line); border-radius: 7px; padding: 9px 12px; background: #fff; break-inside: avoid; }
  .vrd .row { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; border-bottom: 1px dashed #e5e7eb; }
  .vrd .row:last-child { border-bottom: 0; }
  .vrd .row-label { font-size: 11px; font-weight: 700; color: var(--muted); white-space: nowrap; }
  .vrd .row-value { font-size: 11px; font-weight: 600; text-align: right; overflow-wrap: anywhere; }
  .vrd .note { margin-top: 8px; padding: 8px 11px; border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 6px; background: rgba(0,138,210,.04); font-size: 11.5px; line-height: 1.55; break-inside: avoid; white-space: pre-wrap; overflow-wrap: anywhere; }
  .vrd .note b { display: block; margin-bottom: 2px; font-size: 10px; color: #222628; text-transform: uppercase; letter-spacing: .3px; }
  .vrd .room-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin: 12px 0 6px; padding-bottom: 5px; border-bottom: 2px solid var(--line); break-after: avoid; break-inside: avoid; }
  .vrd .room-name { font-size: 13.5px; font-weight: 900; color: #222628; }
  .vrd .room-meta { font-size: 10.5px; color: var(--muted); }
  .vrd .room-total { font-size: 13px; font-weight: 900; color: #222628; white-space: nowrap; }
  .vrd .table-wrap { width: 100%; }
  .vrd table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .vrd thead { display: table-header-group; }
  .vrd th { background: #222628; color: #fff; font-size: 10px; font-weight: 700; padding: 6px 8px; text-align: left; text-transform: uppercase; letter-spacing: .3px; }
  .vrd td { border: 1px solid var(--line); padding: 6px 8px; vertical-align: top; overflow-wrap: anywhere; }
  .vrd tr { break-inside: avoid; }
  .vrd tbody tr:nth-child(even) td { background: #fafbfd; }
  .vrd td.num, .vrd th.num { text-align: right; white-space: nowrap; }
  .vrd td.total { font-weight: 900; color: #222628; background: #f1f5f9 !important; }
  .vrd .muted { color: var(--muted); }
  .vrd .small { font-size: 10px; }
  .vrd .pill { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .3px; white-space: nowrap; }
  .vrd .p-comply { background: #ecfdf5; color: #047857; }
  .vrd .p-substitute { background: #fffbeb; color: #b45309; }
  .vrd .p-exception { background: #fff1f2; color: #be123c; }
  .vrd .p-neutral { background: #f1f5f9; color: #475569; }
  .vrd .empty { padding: 8px 11px; border: 1px dashed #cbd5e1; border-radius: 7px; color: var(--muted); font-size: 11px; }
  .vrd ul.plain { margin: 0; padding-left: 16px; }
  .vrd ul.plain li { margin: 3px 0; }
  .vrd .ack { display: flex; gap: 9px; padding: 7px 0; border-bottom: 1px dashed #e5e7eb; break-inside: avoid; }
  .vrd .ack:last-child { border-bottom: 0; }
  .vrd .ack-mark { flex-shrink: 0; width: 16px; height: 16px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: #fff; background: #059669; }
  .vrd .ack-mark.no { background: #cbd5e1; }
  @media print {
    body, .vrd { background: #fff; }
    .vrd { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .vrd .vrd-page { width: auto; margin: 0; padding: 0 12mm; box-shadow: none; }
    .vrd .cover { margin: 0 -12mm 14px; padding: 24px 12mm 22px; }
    .no-print { display: none !important; }
  }
  @media screen and (max-width: 840px) {
    .vrd { padding: 8px 0 110px; font-size: 11px; }
    .vrd .vrd-page { width: calc(100% - 16px); padding: 0 16px 16px; border-radius: 10px; overflow: hidden; }
    .vrd .cover { margin: 0 -16px 14px; padding: 18px 16px; flex-direction: column; align-items: flex-start; gap: 14px; }
    .vrd .cover-meta { align-items: flex-start; text-align: left; max-width: 100%; }
    .vrd h1 { font-size: 21px; overflow-wrap: anywhere; }
    .vrd .date-bar, .vrd .contact, .vrd .grid2, .vrd .tally { grid-template-columns: 1fr; }
    .vrd .date-bar > div { border-right: 0; border-bottom: 1px solid var(--line); }
    .vrd .contact > div { border-left: 0; border-top: 1px solid var(--line); }
    .vrd .contact > .contact-label { justify-content: flex-start; border-top: 0; }
    .vrd .stats { grid-template-columns: repeat(2, 1fr); }
    .vrd .table-wrap { overflow-x: auto; }
    .vrd table { min-width: 520px; }
  }
`;

const dash = (value: unknown) =>
  value === undefined || value === null || value === "" ? "—" : String(value);

const dateRange = (start?: string, end?: string) => {
  if (!start && !end) return "—";
  const a = formatAppDate(start, "");
  const b = formatAppDate(end, "");
  return a && b && a !== b ? `${a} – ${b}` : a || b;
};

function Section({ number, title, provenance, children }: { number: number; title: string; provenance?: "vendor" | "server"; children: React.ReactNode }) {
  return (
    <section className="section">
      <h2 className="section-title">
        <span className="sec-num">{number}</span>
        {title}
        {provenance ? (
          <span className={`tag ${provenance === "vendor" ? "tag-vendor" : "tag-server"}`}>
            {provenance === "vendor" ? "Vendor stated" : "Server calculated"}
          </span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="row">
    <span className="row-label">{label}</span>
    <span className="row-value">{value}</span>
  </div>
);

export default function VendorResponseDocument({
  detail,
  version,
}: {
  detail: VendorSubmissionDetail;
  version: VendorSubmissionVersion;
}) {
  const questionnaire = version.questionnaire;
  const response = version.structuredResponse;
  const calculation = version.calculationSnapshot;
  if (!questionnaire || !response || !calculation) return null;

  const context = questionnaire.context;
  const precision = context.decimalPrecision;
  const currency = calculation.currency;
  const money = (minor: number) => formatMoney(minor, currency, precision);
  const roomById = new Map(questionnaire.rooms.map((room) => [room.roomId, room]));
  const roleById = new Map(questionnaire.crew.roles.map((role) => [role.id, role.label]));
  const categoryById = new Map(questionnaire.pricing.equipmentCategories.map((item) => [item.id, item.label]));
  const feeById = new Map(questionnaire.pricing.feeLines.map((fee) => [fee.feeId, fee]));
  const purposeById = new Map(questionnaire.documents.categories.map((item) => [item.purposeId, item.label]));
  const laborById = new Map(response.rooms.flatMap((room) => room.laborLines.map((line) => [line.laborLineId, line] as const)));
  // Same heading as the on-screen detail view, which shows the vendor name the
  // vendor entered on the compliance step (legal name is in Company profile).
  const vendorName = version.vendorName || detail.response.vendorName || response.companyProfile.legalName;
  const proposalTitle = context.proposalTitle || detail.response.proposalTitle;
  const subtitle = ["Response to " + proposalTitle, context.plannerOrganizationName, [context.venueName, context.venueLocation].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" | ");
  const fees = response.pricing.fees.filter((fee) => feeById.get(fee.feeId)?.kind !== "tax");
  const taxes = response.pricing.fees.filter((fee) => feeById.get(fee.feeId)?.kind === "tax");
  const scopeLabel = (scopeType?: string | null, scopeId?: string | null) => {
    if (scopeType === "room") return roomById.get(scopeId ?? "")?.name ?? "Room";
    if (scopeType === "crew_member") return `Crew · ${response.crew.find((m) => m.crewMemberId === scopeId)?.name || "member"}`;
    if (scopeType === "reference") return `Reference · ${response.references.find((r) => r.referenceId === scopeId)?.clientName || "client"}`;
    return "Whole proposal";
  };
  let n = 0;
  const next = () => ++n;

  return (
    <div className="rfp-root vrd" data-testid="vendor-response-document">
      <style>{VENDOR_RESPONSE_DOCUMENT_CSS}</style>
      <article className="page vrd-page">
        <header className="cover">
          <div>
            <div className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo/rfpilot-primary-logo.png" alt="" aria-hidden="true" />
              <span className="brand-word">RFP<span>ilot</span></span>
            </div>
            <div className="brand-caption">AV &amp; Event Production Sourcing</div>
          </div>
          <div className="cover-meta">
            <div className="cover-row">
              <span className="cover-type">Vendor Response</span>
              <span className="badge-conf">Confidential</span>
            </div>
            <div className="cover-event">{proposalTitle}</div>
            <div className="cover-issued">
              Received {formatAppDateTime(version.receivedAt)} · Version {version.versionNumber} · Record {version.versionId.slice(-8)}
            </div>
          </div>
        </header>

        <hr className="accent-rule" />
        <h1>{vendorName}</h1>
        <p className="subtitle">{subtitle}</p>

        <div className="date-bar">
          <div><b>Response received:</b> {formatAppDate(version.receivedAt)}</div>
          <div><b>Response due:</b> {formatAppDate(context.proposalDueDate, "No deadline listed")}</div>
          <div><b>Event dates:</b> {dateRange(context.eventStartDate, context.eventEndDate)}</div>
        </div>

        <div className="stats">
          <div className="stat"><div className="stat-label">Grand total</div><div className="stat-value">{money(calculation.grandTotalMinor)}</div></div>
          <div className="stat"><div className="stat-label">Required completion</div><div className="stat-value">{calculation.completion.percent}%</div></div>
          <div className="stat"><div className="stat-label">Specs answered</div><div className="stat-value">{calculation.specCounts.answered} of {calculation.specCounts.total}</div></div>
          <div className="stat"><div className="stat-label">Room nights</div><div className="stat-value">{calculation.requestedRoomNights}</div></div>
        </div>
        <div className="tally">
          <div className="t-comply">Comply <b>{calculation.specCounts.comply}</b></div>
          <div className="t-sub">Substitute <b>{calculation.specCounts.substitute}</b></div>
          <div className="t-exc">Exception <b>{calculation.specCounts.exception}</b></div>
        </div>

        <div className="contact">
          <div className="contact-label">Submitted by</div>
          <div>{dash(version.submittedBy)}</div>
          <div>{dash(version.email)}</div>
          <div>Received {formatAppDateTime(version.receivedAt)}</div>
        </div>

        <Section number={next()} title="Company profile" provenance="vendor">
          <div className="grid2">
            <div className="card">
              <Row label="Legal name" value={dash(response.companyProfile.legalName)} />
              {response.companyProfile.dba ? <Row label="DBA" value={response.companyProfile.dba} /> : null}
              <Row label="Headquarters" value={dash(response.companyProfile.headquarters)} />
            </div>
            <div className="card">
              <Row label="Years in business" value={dash(response.companyProfile.yearsInBusiness)} />
              <Row label="Full-time staff" value={dash(response.companyProfile.staffCount)} />
              {response.companyProfile.clientMix.length ? (
                <Row
                  label="Client mix"
                  value={response.companyProfile.clientMix
                    .filter((entry) => entry.percent > 0)
                    .map((entry) => `${questionnaire.companyProfile.clientMix.categories.find((c) => c.categoryId === entry.categoryId)?.label ?? entry.categoryId} ${entry.percent}%`)
                    .join(", ") || "—"}
                />
              ) : null}
            </div>
          </div>
          {response.companyProfile.largestComparableEvent ? (
            <div className="note"><b>Largest comparable event</b>{response.companyProfile.largestComparableEvent}</div>
          ) : null}
        </Section>

        <Section number={next()} title="Rooms and specifications" provenance="vendor">
          {response.platformIntegrationPlan ? (
            <div className="note"><b>Platform integration plan</b>{response.platformIntegrationPlan}</div>
          ) : null}
          {response.rooms.length === 0 ? <div className="empty">No room responses.</div> : null}
          {response.rooms.map((roomResponse) => {
            const room = roomById.get(roomResponse.roomId);
            const total = calculation.roomTotals.find((entry) => entry.roomId === roomResponse.roomId);
            const meta = [room?.location, room?.setup, room?.estimatedAttendees ? `${room.estimatedAttendees} attendees` : ""].filter(Boolean).join(" · ");
            return (
              <div key={roomResponse.roomId}>
                <div className="room-head">
                  <div>
                    <div className="room-name">{room?.name ?? roomResponse.roomId}</div>
                    {meta ? <div className="room-meta">{meta}</div> : null}
                  </div>
                  <div className="room-total">{total ? money(total.roomTotalMinor) : "—"}</div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th style={{ width: "26%" }}>Specification</th><th>Requirement</th><th style={{ width: "13%" }}>Response</th><th style={{ width: "24%" }}>Vendor note</th></tr></thead>
                    <tbody>
                      {roomResponse.specResponses.map((answer) => {
                        const spec = room?.specs.find((item) => item.specId === answer.specId);
                        return (
                          <tr key={answer.specId}>
                            <td><b>{spec?.label ?? answer.specId}</b></td>
                            <td className="muted">{dash(spec?.requirementText)}</td>
                            <td><span className={`pill p-${answer.status}`}>{answer.status}</span></td>
                            <td>{dash(answer.note)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {roomResponse.equipmentLines.length ? (
                  <>
                    <div className="subhead">Equipment</div>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th style={{ width: "24%" }}>Category</th><th>Description</th><th className="num" style={{ width: "10%" }}>Qty</th></tr></thead>
                        <tbody>
                          {roomResponse.equipmentLines.map((line) => (
                            <tr key={line.equipmentLineId}><td>{categoryById.get(line.categoryId) ?? line.categoryId}</td><td>{dash(line.description)}</td><td className="num">{line.quantity}</td></tr>
                          ))}
                          {total ? <tr><td className="total" colSpan={2}>Equipment subtotal</td><td className="num total">{money(total.equipmentSubtotalMinor)}</td></tr> : null}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}
                {roomResponse.laborLines.length ? (
                  <>
                    <div className="subhead">Labor</div>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Position</th><th className="num">Days</th><th className="num">Reg hrs</th><th className="num">OT hrs</th><th>Travel</th><th>Notes</th></tr></thead>
                        <tbody>
                          {roomResponse.laborLines.map((line) => (
                            <tr key={line.laborLineId}><td>{roleById.get(line.roleId) ?? line.roleId}</td><td className="num">{line.days}</td><td className="num">{line.regularHours}</td><td className="num">{line.overtimeHours}</td><td>{line.travel ? "Yes" : "No"}</td><td>{dash(line.notes)}</td></tr>
                          ))}
                          {total ? <tr><td className="total" colSpan={5}>Labor subtotal</td><td className="num total">{money(total.laborSubtotalMinor)}</td></tr> : null}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}
                {roomResponse.hybrid ? (
                  <div className="grid2" style={{ marginTop: 8 }}>
                    <div className="note"><b>Feed handoff</b>{dash(roomResponse.hybrid.feedHandoff)}</div>
                    <div className="note"><b>Redundancy</b>{dash(roomResponse.hybrid.redundancy)}</div>
                    <div className="note"><b>Virtual audience experience</b>{dash(roomResponse.hybrid.virtualAudienceExperience)}</div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </Section>

        <Section number={next()} title="Pricing summary" provenance="server">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Line</th><th className="num" style={{ width: "28%" }}>Amount ({currency})</th></tr></thead>
              <tbody>
                <tr><td>Equipment subtotal</td><td className="num">{money(calculation.equipmentSubtotalMinor)}</td></tr>
                <tr><td>Labor subtotal</td><td className="num">{money(calculation.laborSubtotalMinor)}</td></tr>
                <tr><td>Travel subtotal</td><td className="num">{money(calculation.travelSubtotalMinor)}</td></tr>
                {fees.map((fee) => <tr key={fee.feeId}><td>{feeById.get(fee.feeId)?.label ?? fee.feeId}</td><td className="num">{money(fee.amount.amountMinor)}</td></tr>)}
                {taxes.map((fee) => <tr key={fee.feeId}><td>{feeById.get(fee.feeId)?.label ?? fee.feeId}</td><td className="num">{money(fee.amount.amountMinor)}</td></tr>)}
                <tr><td>Discount</td><td className="num">−{money(calculation.discountMinor)}</td></tr>
                <tr><td className="total">Grand total</td><td className="num total">{money(calculation.grandTotalMinor)}</td></tr>
              </tbody>
            </table>
          </div>
          {response.pricing.assumptionsExclusions.length ? (
            <div className="note"><b>Assumptions and exclusions</b><ul className="plain">{response.pricing.assumptionsExclusions.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>
          ) : null}
        </Section>

        <Section number={next()} title="Core team" provenance="vendor">
          {response.crew.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th style={{ width: "22%" }}>Name</th><th style={{ width: "22%" }}>Role</th><th>Bio</th></tr></thead>
                <tbody>{response.crew.map((member) => <tr key={member.crewMemberId}><td><b>{dash(member.name)}</b></td><td>{roleById.get(member.roleId) ?? member.roleId}</td><td>{dash(member.bio)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <div className="empty">No crew listed.</div>}
        </Section>

        <Section number={next()} title="Travel and lodging" provenance="vendor">
          {response.travel.lodgingRequests.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Position</th><th>Room</th><th>Lodging</th><th>Check-in</th><th>Check-out</th></tr></thead>
                <tbody>
                  {response.travel.lodgingRequests.map((lodging) => (
                    <tr key={lodging.laborLineId}>
                      <td>{roleById.get(laborById.get(lodging.laborLineId)?.roleId ?? "") ?? "—"}</td>
                      <td>{roomById.get(lodging.roomId)?.name ?? lodging.roomId}</td>
                      <td>{lodging.clientProvidedRoom ? "Client-provided room" : "Vendor arranges"}</td>
                      <td>{formatAppDate(lodging.checkIn, "—")}</td>
                      <td>{formatAppDate(lodging.checkOut, "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty">No lodging requests.</div>}
          <p className="small muted" style={{ marginTop: 6 }}>Server-calculated room nights: <b>{calculation.requestedRoomNights}</b></p>
        </Section>

        <Section number={next()} title="Alternates" provenance="vendor">
          {response.alternates.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th style={{ width: "22%" }}>Alternate</th><th style={{ width: "16%" }}>Applies to</th><th>Trade-off and impact</th><th className="num" style={{ width: "14%" }}>Cost delta</th></tr></thead>
                <tbody>
                  {response.alternates.map((alternate) => (
                    <tr key={alternate.alternateId}>
                      <td><b>{dash(alternate.title)}</b>{alternate.recommended ? <><br /><span className="pill p-comply">Vendor recommended</span></> : null}</td>
                      <td>{alternate.scope.type === "room" ? roomById.get(alternate.scope.roomId ?? "")?.name ?? "Room" : "Project-wide"}</td>
                      <td>{dash(alternate.tradeoff)}</td>
                      <td className="num">{formatMoney(alternate.costDelta.amountMinor, currency, precision)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty">No alternates were proposed.</div>}
        </Section>

        <Section number={next()} title="References" provenance="vendor">
          {response.references.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th style={{ width: "24%" }}>Client and event</th><th style={{ width: "24%" }}>Contact</th><th style={{ width: "18%" }}>Dates and size</th><th>Services provided</th></tr></thead>
                <tbody>
                  {response.references.map((reference) => (
                    <tr key={reference.referenceId}>
                      <td><b>{dash(reference.clientName)}</b><br />{dash(reference.eventName)}{reference.comparable ? <><br /><span className="pill p-comply">Comparable event</span></> : null}</td>
                      <td>{dash(reference.contact.name)}<br /><span className="muted">{[reference.contact.email, reference.contact.phone].filter(Boolean).join(" · ") || "—"}</span></td>
                      <td>{dateRange(reference.startDate, reference.endDate)}{reference.attendance !== undefined ? <><br /><span className="muted">{reference.attendance} attendees</span></> : null}</td>
                      <td>{dash(reference.servicesProvided)}{reference.currentStatus ? <><br /><span className="muted">Status: {reference.currentStatus}</span></> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty">No structured references were supplied.</div>}
        </Section>

        <Section number={next()} title="Categorized documents" provenance="vendor">
          {version.documents.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>File</th><th style={{ width: "24%" }}>Category</th><th style={{ width: "20%" }}>Applies to</th><th style={{ width: "14%" }}>Scan</th></tr></thead>
                <tbody>
                  {version.documents.map((document) => (
                    <tr key={document.documentId ?? document.name}>
                      <td><b>{displayFileName(document.name)}</b><br /><span className="muted small">{[fileTypeLabel(document.mimeType, document.name), formatFileSize(document.sizeBytes)].filter(Boolean).join(" · ")}</span></td>
                      <td>{purposeById.get(document.purposeId ?? "") ?? "Other attachment"}</td>
                      <td>{scopeLabel(document.scopeType, document.scopeId)}</td>
                      <td><span className={`pill ${document.scanStatus === "clean" ? "p-comply" : "p-neutral"}`}>{document.scanStatus === "clean" ? "Clean" : document.scanStatus === "skipped" ? "Not scanned" : "Unknown"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty">No documents attached.</div>}
        </Section>

        <Section number={next()} title="Acknowledgments" provenance="vendor">
          {response.acknowledgements.length ? response.acknowledgements.map((answer) => {
            const definition = questionnaire.acknowledgements.find((item) => item.acknowledgementId === answer.acknowledgementId);
            return (
              <div className="ack" key={answer.acknowledgementId}>
                <span className={`ack-mark${answer.accepted ? "" : " no"}`} aria-hidden="true">{answer.accepted ? "✓" : ""}</span>
                <div>
                  <div>{definition?.text ?? answer.acknowledgementId}</div>
                  <div className="small muted">{answer.accepted && answer.acceptedAt ? `Accepted ${formatAppDateTime(answer.acceptedAt)}` : "Not accepted"}</div>
                </div>
              </div>
            );
          }) : <div className="empty">No acknowledgments recorded.</div>}
        </Section>

        {response.valueAdds ? (
          <Section number={next()} title="Value-adds" provenance="vendor">
            <div className="note" style={{ marginTop: 0 }}>{response.valueAdds}</div>
          </Section>
        ) : null}

      </article>
    </div>
  );
}
