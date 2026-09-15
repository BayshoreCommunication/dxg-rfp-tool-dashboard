"use client";

import type { VendorSubmissionVersion } from "@/app/actions/vendorResponse";
import { formatMoney } from "@/lib/vendorResponses/workspaceModel";
import {
  BadgeCheck,
  BedDouble,
  Building2,
  Calculator,
  CheckCircle2,
  Download,
  FileText,
  History,
  Printer,
  Users,
} from "lucide-react";

type Props = {
  responseId: string;
  version: VendorSubmissionVersion;
  parentVersion?: VendorSubmissionVersion;
};

const sections = [
  ["identity", "Identity"],
  ["acknowledgements", "Acknowledgments"],
  ["companyProfile", "Company profile"],
  ["rooms", "Rooms and specifications"],
  ["crew", "Crew"],
  ["travel", "Travel"],
  ["pricing", "Pricing"],
  ["alternates", "Alternates"],
  ["references", "References"],
  ["documents", "Documents"],
  ["valueAdds", "Value-adds"],
] as const;

export const structuredSectionChanges = (
  current: VendorSubmissionVersion,
  parent?: VendorSubmissionVersion,
) => {
  if (!current.structuredResponse || !parent?.structuredResponse) return [];
  return sections.flatMap(([key, label]) =>
    JSON.stringify(current.structuredResponse?.[key])
      === JSON.stringify(parent.structuredResponse?.[key])
      ? []
      : [label],
  );
};

const Provenance = ({ kind }: { kind: "vendor" | "calculated" }) => (
  <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${kind === "vendor" ? "bg-sky-50 text-[#0075b4]" : "bg-emerald-50 text-emerald-700"}`}>
    {kind === "vendor" ? "Vendor stated" : "Server calculated"}
  </span>
);

const Definition = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <dt className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-1 break-words text-sm font-bold text-slate-900">{value || "Not provided"}</dd>
  </div>
);

export default function StructuredResponseDetail({ responseId, version, parentVersion }: Props) {
  const questionnaire = version.questionnaire;
  const response = version.structuredResponse;
  const calculation = version.calculationSnapshot;
  if (!questionnaire || !response || !calculation) return null;
  const precision = questionnaire.context.decimalPrecision;
  const currency = calculation.currency;
  const roomById = new Map(questionnaire.rooms.map((room) => [room.roomId, room]));
  const roleById = new Map(questionnaire.crew.roles.map((role) => [role.id, role.label]));
  const purposeById = new Map(questionnaire.documents.categories.map((item) => [item.purposeId, item.label]));
  const changes = structuredSectionChanges(version, parentVersion);
  const exportBase = `/api/vendor-responses/${encodeURIComponent(responseId)}/submission-export?versionId=${encodeURIComponent(version.versionId)}`;

  return (
    <div className="mt-5 space-y-5" data-testid="structured-response-detail">
      <section className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4" aria-label="Response provenance">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-950">
              <BadgeCheck size={17} className="text-[#008ad2]" aria-hidden="true" />
              Structured response · questionnaire v{questionnaire.questionnaireVersion}
            </h3>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
              Blue labels are answers entered directly by the vendor. Green labels are totals and coverage frozen by the server when this version was received. Document analysis is shown separately below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={() => window.print()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-extrabold text-slate-800 hover:border-[#008ad2]">
              <Printer size={14} aria-hidden="true" /> Print view
            </button>
            <a href={`${exportBase}&format=html`} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-extrabold text-slate-800 hover:border-[#008ad2]">
              <Download size={14} aria-hidden="true" /> Download review
            </a>
            <a href={`${exportBase}&format=json`} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-extrabold text-slate-800 hover:border-[#008ad2]">
              <FileText size={14} aria-hidden="true" /> Export data
            </a>
          </div>
        </div>
      </section>

      {parentVersion ? (
        <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4" aria-label="Version comparison">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-violet-950"><History size={16} aria-hidden="true" />Changes from version {parentVersion.versionNumber}</h3>
          <p className="mt-1 text-xs leading-5 text-violet-800">
            {changes.length ? `${changes.length} section${changes.length === 1 ? "" : "s"} changed in this immutable version.` : "No structured answer sections changed; receipt or attachment metadata may still differ."}
          </p>
          {changes.length ? <ul className="mt-2 flex flex-wrap gap-2">{changes.map((label) => <li key={label} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-violet-800 ring-1 ring-violet-200">{label}</li>)}</ul> : null}
        </section>
      ) : null}

      <section aria-labelledby="structured-overview-heading">
        <div className="flex items-center justify-between gap-3">
          <h3 id="structured-overview-heading" className="text-base font-extrabold text-slate-950">Response overview</h3>
          <Provenance kind="calculated" />
        </div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Definition label="Grand total" value={formatMoney(calculation.grandTotalMinor, currency, precision)} />
          <Definition label="Required completion" value={`${calculation.completion.percent}%`} />
          <Definition label="Specifications answered" value={`${calculation.specCounts.answered} of ${calculation.specCounts.total}`} />
          <Definition label="Requested room nights" value={String(calculation.requestedRoomNights)} />
        </dl>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-[10px] font-extrabold uppercase text-emerald-700">Comply</p><p className="mt-1 text-xl font-extrabold text-emerald-950">{calculation.specCounts.comply}</p></div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-[10px] font-extrabold uppercase text-amber-700">Substitute</p><p className="mt-1 text-xl font-extrabold text-amber-950">{calculation.specCounts.substitute}</p></div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="text-[10px] font-extrabold uppercase text-rose-700">Exception</p><p className="mt-1 text-xl font-extrabold text-rose-950">{calculation.specCounts.exception}</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5" aria-labelledby="company-heading">
        <div className="flex items-center justify-between gap-3"><h3 id="company-heading" className="flex items-center gap-2 text-base font-extrabold text-slate-950"><Building2 size={17} className="text-[#008ad2]" aria-hidden="true" />Company profile</h3><Provenance kind="vendor" /></div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Definition label="Legal name" value={response.companyProfile.legalName} />
          <Definition label="Headquarters" value={response.companyProfile.headquarters} />
          <Definition label="Years in business" value={response.companyProfile.yearsInBusiness?.toString()} />
          <Definition label="Staff count" value={response.companyProfile.staffCount?.toString()} />
        </dl>
        {response.companyProfile.largestComparableEvent ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700"><strong>Comparable event:</strong> {response.companyProfile.largestComparableEvent}</p> : null}
      </section>

      <section aria-labelledby="rooms-heading">
        <div className="flex items-center justify-between gap-3"><h3 id="rooms-heading" className="text-base font-extrabold text-slate-950">Rooms and specifications</h3><Provenance kind="vendor" /></div>
        <div className="mt-3 space-y-3">
          {response.rooms.map((roomResponse) => {
            const room = roomById.get(roomResponse.roomId);
            const total = calculation.roomTotals.find((entry) => entry.roomId === roomResponse.roomId);
            return <details key={roomResponse.roomId} className="group rounded-2xl border border-slate-200 bg-white p-4" open={response.rooms.length === 1}>
              <summary className="cursor-pointer list-none">
                <span className="flex flex-wrap items-start justify-between gap-3"><span><span className="block font-extrabold text-slate-950">{room?.name ?? roomResponse.roomId}</span><span className="mt-1 block text-xs text-slate-500">{roomResponse.specResponses.length} specifications · {roomResponse.equipmentLines.length} equipment lines · {roomResponse.laborLines.length} labor lines</span></span><span className="text-sm font-extrabold text-slate-950">{total ? formatMoney(total.roomTotalMinor, currency, precision) : "—"}</span></span>
              </summary>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {roomResponse.specResponses.map((answer) => {
                    const spec = room?.specs.find((item) => item.specId === answer.specId);
                    return <li key={answer.specId} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-bold text-slate-900">{spec?.label ?? answer.specId}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{spec?.requirementText}</p>{answer.note ? <p className="mt-1 text-xs leading-5 text-slate-700">{answer.note}</p> : null}</div><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${answer.status === "comply" ? "bg-emerald-50 text-emerald-700" : answer.status === "substitute" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700"}`}>{answer.status}</span></li>;
                  })}
                </ul>
              </div>
            </details>;
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5" aria-labelledby="pricing-heading">
        <div className="flex items-center justify-between gap-3"><h3 id="pricing-heading" className="flex items-center gap-2 text-base font-extrabold text-slate-950"><Calculator size={17} className="text-[#008ad2]" aria-hidden="true" />Pricing summary</h3><Provenance kind="calculated" /></div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Definition label="Equipment subtotal" value={formatMoney(calculation.equipmentSubtotalMinor, currency, precision)} />
          <Definition label="Labor subtotal" value={formatMoney(calculation.laborSubtotalMinor, currency, precision)} />
          <Definition label="Travel subtotal" value={formatMoney(calculation.travelSubtotalMinor, currency, precision)} />
          <Definition label="Fees" value={formatMoney(calculation.feeSubtotalMinor, currency, precision)} />
          <Definition label="Tax" value={formatMoney(calculation.taxSubtotalMinor, currency, precision)} />
          <Definition label="Discount" value={formatMoney(calculation.discountMinor, currency, precision)} />
        </dl>
        {response.pricing.assumptionsExclusions.length ? <div className="mt-4"><h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Assumptions and exclusions <Provenance kind="vendor" /></h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{response.pricing.assumptionsExclusions.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div> : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-5"><h3 className="flex items-center gap-2 text-base font-extrabold text-slate-950"><Users size={17} className="text-[#008ad2]" aria-hidden="true" />Crew</h3>{response.crew.length ? <ul className="mt-3 divide-y divide-slate-100">{response.crew.map((member) => <li key={member.crewMemberId} className="py-3"><p className="text-sm font-extrabold text-slate-900">{member.name} <span className="font-semibold text-slate-500">· {roleById.get(member.roleId) ?? member.roleId}</span></p><p className="mt-1 text-xs leading-5 text-slate-600">{member.bio}</p></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No crew listed.</p>}</div>
        <div className="rounded-2xl border border-slate-200 p-5"><h3 className="flex items-center gap-2 text-base font-extrabold text-slate-950"><BedDouble size={17} className="text-[#008ad2]" aria-hidden="true" />Travel and lodging</h3><p className="mt-3 text-sm text-slate-600">{response.travel.lodgingRequests.length} lodging request{response.travel.lodgingRequests.length === 1 ? "" : "s"} · <strong className="text-slate-900">{calculation.requestedRoomNights} server-calculated room nights</strong></p></div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ListSection title="Alternates" empty="No alternates were proposed." items={response.alternates.map((alternate) => ({ id: alternate.alternateId, title: alternate.title, detail: `${alternate.tradeoff} · ${formatMoney(alternate.costDelta.amountMinor, currency, precision)}${alternate.recommended ? " · Vendor recommended" : ""}` }))} />
        <ListSection title="References" empty="No structured references were supplied." items={response.references.map((reference) => ({ id: reference.referenceId, title: `${reference.clientName} · ${reference.eventName}`, detail: `${reference.servicesProvided}${reference.comparable ? " · Comparable event" : ""}` }))} />
      </section>

      <section className="rounded-2xl border border-slate-200 p-5" aria-labelledby="ack-heading">
        <div className="flex items-center justify-between gap-3"><h3 id="ack-heading" className="flex items-center gap-2 text-base font-extrabold text-slate-950"><CheckCircle2 size={17} className="text-emerald-600" aria-hidden="true" />Acknowledgment record</h3><Provenance kind="vendor" /></div>
        <ul className="mt-3 divide-y divide-slate-100">{response.acknowledgements.map((answer) => { const definition = questionnaire.acknowledgements.find((item) => item.acknowledgementId === answer.acknowledgementId); return <li key={answer.acknowledgementId} className="flex gap-3 py-3"><CheckCircle2 size={16} className={answer.accepted ? "mt-0.5 shrink-0 text-emerald-600" : "mt-0.5 shrink-0 text-slate-300"} aria-hidden="true" /><div><p className="text-sm leading-6 text-slate-700">{definition?.text ?? answer.acknowledgementId}</p><p className="mt-0.5 text-[10px] font-bold uppercase text-slate-500">{answer.acceptedAt ? `Accepted ${answer.acceptedAt}` : "Not accepted"}</p></div></li>; })}</ul>
      </section>

      <section className="rounded-2xl border border-slate-200 p-5" aria-labelledby="categorized-documents-heading">
        <h3 id="categorized-documents-heading" className="text-base font-extrabold text-slate-950">Categorized documents</h3>
        {version.documents.length ? <ul className="mt-3 divide-y divide-slate-100">{version.documents.map((document) => <li key={document.documentId} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-900">{document.name}</p><p className="mt-0.5 text-xs text-slate-500">{purposeById.get(document.purposeId ?? "") ?? "Legacy attachment"} · {document.versionDisposition} · {document.scanStatus}</p></div>{document.url ? <a href={document.url} target="_blank" rel="noreferrer" className="text-xs font-extrabold text-[#0075b4]">Open file</a> : null}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No documents attached.</p>}
        {version.retiredDocuments.length ? <p className="mt-3 text-xs font-semibold text-amber-800">{version.retiredDocuments.length} document{version.retiredDocuments.length === 1 ? " was" : "s were"} retired in this version. Earlier immutable versions still retain them.</p> : null}
      </section>

      {response.valueAdds ? <section className="rounded-2xl border border-slate-200 p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-extrabold text-slate-950">Optional value-adds</h3><Provenance kind="vendor" /></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{response.valueAdds}</p></section> : null}
    </div>
  );
}

function ListSection({ title, empty, items }: { title: string; empty: string; items: Array<{ id: string; title: string; detail: string }> }) {
  return <section className="rounded-2xl border border-slate-200 p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-extrabold text-slate-950">{title}</h3><Provenance kind="vendor" /></div>{items.length ? <ul className="mt-3 divide-y divide-slate-100">{items.map((item) => <li key={item.id} className="py-3"><p className="text-sm font-extrabold text-slate-900">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">{empty}</p>}</section>;
}
