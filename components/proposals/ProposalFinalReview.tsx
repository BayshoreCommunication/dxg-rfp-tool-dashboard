"use client";

import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  Mail,
  MapPin,
  Pencil,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import type {
  BudgetData,
  ContactData,
  EventData,
  RoomByRoomData,
} from "./AddNewProposal";
import type { VenueScheduleData } from "./ProposalsProcess.tsx/VenueScheduleStep";
import type {
  AnswerProvenance,
  BudgetEstimate,
  ProposalChecklistIssue,
} from "@/lib/proposals/proposalExperience";

export type ProposalAuditEntry = {
  id: string;
  label: string;
  source: "user" | "ai" | "assumed";
  createdAt: string;
};

type Props = {
  event: EventData;
  venue: VenueScheduleData;
  rooms: RoomByRoomData[];
  budget: BudgetData;
  contact: ContactData;
  issues: ProposalChecklistIssue[];
  budgetEstimate: BudgetEstimate;
  provenance: Record<string, AnswerProvenance>;
  auditTrail: ProposalAuditEntry[];
  assumptions: string[];
  assumptionsApproved: boolean;
  onAssumptionsApprovedChange: (approved: boolean) => void;
  onEditStep: (step: number) => void;
  onGenerateStatementOfWork: () => void;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const sourcePresentation = {
  user: { label: "User-provided", className: "border-sky-200 bg-sky-50 text-sky-700" },
  ai: { label: "AI-generated", className: "border-violet-200 bg-violet-50 text-violet-700" },
  assumed: { label: "Assumed", className: "border-amber-200 bg-amber-50 text-amber-800" },
} as const;

const SourceBadge = ({ provenance }: { provenance?: AnswerProvenance }) => {
  const source = provenance?.source ?? "user";
  const presentation = sourcePresentation[source];
  return (
    <span
      title={provenance?.explanation}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${presentation.className}`}
    >
      {presentation.label}
      {typeof provenance?.confidence === "number" && ` · ${Math.round(provenance.confidence * 100)}%`}
    </span>
  );
};

const ReviewCard = ({
  title,
  icon,
  step,
  onEdit,
  provenance,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  step: number;
  onEdit: (step: number) => void;
  provenance?: AnswerProvenance;
  children: React.ReactNode;
}) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 text-slate-800">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eef8fd] text-[#0786cf]">
          {icon}
        </span>
        <h3 className="text-sm font-extrabold">{title}</h3>
      </div>
      <button
        type="button"
        onClick={() => onEdit(step)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-[#0786cf] hover:bg-[#eef8fd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0786cf]"
        aria-label={`Edit ${title}`}
      >
        <Pencil size={13} aria-hidden="true" /> Edit
      </button>
    </div>
    <div className="mt-3 text-sm leading-6 text-slate-600">{children}</div>
    <div className="mt-3"><SourceBadge provenance={provenance} /></div>
  </article>
);

export default function ProposalFinalReview({
  event,
  venue,
  rooms,
  budget,
  contact,
  issues,
  budgetEstimate,
  provenance,
  auditTrail,
  assumptions,
  assumptionsApproved,
  onAssumptionsApprovedChange,
  onEditStep,
  onGenerateStatementOfWork,
}: Props) {
  const recipients = [
    contact.contactEmail,
    ...contact.additionalContacts.map((entry) => entry.email),
  ].filter(Boolean);

  return (
    <section
      id="proposal-final-review"
      aria-labelledby="proposal-final-review-title"
      className="border-b border-slate-200 bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.17em] text-[#0786cf]">
            Final review
          </p>
          <h2 id="proposal-final-review-title" className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
            Confirm what vendors will receive
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Review scope, dates, budget, contacts, recipients, and every AI assumption before publishing.
          </p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${issues.length === 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
          {issues.length === 0 ? <CheckCircle2 size={15} aria-hidden="true" /> : <ClipboardCheck size={15} aria-hidden="true" />}
          {issues.length === 0
            ? "Required information complete"
            : `${issues.length} ${issues.length === 1 ? "item" : "items"} still required`}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ReviewCard title="Scope" step={1} onEdit={onEditStep} provenance={provenance.event} icon={<ClipboardCheck size={17} aria-hidden="true" />}>
          <p className="font-bold text-slate-900">{event.eventName || "Event name not provided"}</p>
          <p>{event.eventFormat} · {event.eventType.eventType || "Event type not provided"}</p>
          <p>{event.attendees || "—"} anticipated attendees · {rooms.length} room{rooms.length === 1 ? "" : "s"}</p>
        </ReviewCard>

        <ReviewCard title="Venue and dates" step={2} onEdit={onEditStep} provenance={provenance.venueSchedule} icon={<MapPin size={17} aria-hidden="true" />}>
          <p className="font-bold text-slate-900">{venue.venueName || "Venue not provided"}</p>
          <p>{[venue.venueCity, venue.venueState].filter(Boolean).join(", ") || "Location not provided"}</p>
          <p className="inline-flex items-center gap-1.5"><CalendarDays size={14} aria-hidden="true" />{event.startDate || "Start date"} – {event.endDate || "End date"}</p>
        </ReviewCard>

        <ReviewCard title="Rooms and AV approach" step={3} onEdit={onEditStep} provenance={provenance.roomByRoom} icon={<Sparkles size={17} aria-hidden="true" />}>
          <p className="font-bold text-slate-900">{rooms.length} production room{rooms.length === 1 ? "" : "s"}</p>
          <p>{rooms.map((room, index) => room.roomLocation || room.roomFunction || `Room ${index + 1}`).join(", ")}</p>
          <p>Vendor recommendations remain editable in Advanced production.</p>
        </ReviewCard>

        <ReviewCard title="Budget and procurement" step={8} onEdit={onEditStep} provenance={provenance.budget} icon={<DollarSign size={17} aria-hidden="true" />}>
          <p className="font-bold text-slate-900">{budget.estimatedAvBudget || "Budget range not selected"}</p>
          <p>Proposals due: {budget.proposalSubmissionDueDate || "Not provided"}</p>
          <p>Vendor selection: {budget.vendorSelectionDate || "Not provided"}</p>
        </ReviewCard>

        <ReviewCard title="Primary contact" step={10} onEdit={onEditStep} provenance={provenance.contact} icon={<Users size={17} aria-hidden="true" />}>
          <p className="font-bold text-slate-900">{[contact.contactFirstName, contact.contactLastName].filter(Boolean).join(" ") || "Contact not provided"}</p>
          <p>{contact.contactOrganization || contact.organizationLegalName || "Organization not provided"}</p>
          <p>{contact.contactEmail || "Email not provided"}</p>
        </ReviewCard>

        <ReviewCard title="Invitation recipients" step={10} onEdit={onEditStep} provenance={provenance.contact} icon={<Mail size={17} aria-hidden="true" />}>
          {recipients.length > 0 ? recipients.map((recipient) => <p key={recipient}>{recipient}</p>) : <p>No notification contacts added.</p>}
          <p className="mt-1 text-xs text-slate-500">Vendor invitation recipients are selected after publishing.</p>
        </ReviewCard>

        <article className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-violet-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-violet-700"><Bot size={17} aria-hidden="true" /></span>
            <h3 className="text-sm font-extrabold">AI planning estimate</h3>
          </div>
          <p className="mt-3 text-lg font-extrabold text-violet-950">{money(budgetEstimate.low)}–{money(budgetEstimate.high)}</p>
          <p className="mt-1 text-xs font-bold text-violet-700">Confidence: {budgetEstimate.confidence}%</p>
          <p className="mt-2 text-xs leading-5 text-violet-800">{budgetEstimate.explanation}</p>
        </article>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-violet-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><Sparkles size={16} className="text-violet-600" aria-hidden="true" />Vendor-ready statement of work</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Generate a concise draft from the confirmed event, venue, attendance, room, and date fields.</p>
            </div>
            <button type="button" onClick={onGenerateStatementOfWork} className="min-h-10 shrink-0 rounded-xl bg-violet-600 px-3 text-xs font-extrabold text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
              Generate draft
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><ShieldCheck size={16} className="text-[#0786cf]" aria-hidden="true" />AI activity and assumptions</p>
          {auditTrail.length > 0 ? (
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              {auditTrail.slice(-4).map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3">
                  <span>{entry.label}</span>
                  <SourceBadge provenance={{ source: entry.source }} />
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs text-slate-500">No AI-generated or assumed values have been applied in this session.</p>}
        </div>
      </div>

      {assumptions.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <p className="text-sm font-extrabold">Assumptions requiring approval</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
          </ul>
          <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-amber-300 bg-white px-3 py-3 text-sm font-bold focus-within:ring-2 focus-within:ring-amber-600">
            <input
              type="checkbox"
              checked={assumptionsApproved}
              onChange={(event) => onAssumptionsApprovedChange(event.target.checked)}
              className="mt-0.5 h-5 w-5 accent-amber-700"
            />
            I reviewed these assumptions and approve publishing with unspecified advanced requirements.
          </label>
        </div>
      )}
    </section>
  );
}
