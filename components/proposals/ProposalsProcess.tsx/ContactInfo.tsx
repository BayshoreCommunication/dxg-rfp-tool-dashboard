"use client";

import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, PlusCircle, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import GlobalSelect from "@/components/shared/GlobalSelect";
import type { AdditionalContact, ContactData, ProposalSettings } from "../AddNewProposal";
import { InfoTooltip } from "./shared";
import type { ProposalExperienceMode } from "@/lib/proposals/proposalExperience";

/* ─── Style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#222628] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1DBFD3] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20 placeholder:text-[#b0bace]";
const groupLabelClass = "mb-4 text-xs font-bold uppercase tracking-widest text-[#969798]";
const errorClass = "mt-1 text-sm text-red-500 normal-case";

const Group = ({ label }: { label: string }) => (
  <div className="mb-5 mt-8 border-t border-[#f0f0f0] pt-6 first:mt-0 first:border-0 first:pt-0">
    <p className={groupLabelClass}>{label}</p>
  </div>
);

/* ─── Options ─── */
const CONTACT_METHODS = ["Email", "Phone", "Either"] as const;
const REACH_TIMES = [
  "Morning (8am–12pm)",
  "Afternoon (12pm–5pm)",
  "Evening (5pm–8pm)",
  "Anytime",
];
const PHONE_TYPES = [
  { value: "mobile", label: "Mobile (preferred)" },
  { value: "direct_office", label: "Direct Office" },
  { value: "office_main", label: "Office Main Line" },
];
const ADDITIONAL_ROLES = [
  { value: "cc_all", label: "CC on all vendor communications" },
  { value: "technical_av", label: "Technical point of contact (AV questions)" },
  { value: "legal_contracts", label: "Legal / Contracts contact" },
  { value: "creative_approvals", label: "Creative / Content approvals" },
  { value: "onsite_dayof", label: "On-site day-of contact" },
  { value: "executive_sponsor", label: "Executive sponsor (FYI only)" },
];

/* ─── Shared mailbox advisory ─── */
const SHARED_PREFIXES = [
  "info", "hello", "contact", "admin", "events", "support",
  "noreply", "noreplies", "enquiries", "enquiry", "team",
];
const isSharedMailbox = (email: string): boolean => {
  if (!email.includes("@")) return false;
  const local = email.split("@")[0].toLowerCase().replace(/[-_.]/g, "");
  return SHARED_PREFIXES.some(
    (p) => local === p.replace(/[-_.]/g, "") || local.startsWith(p.replace(/[-_.]/g, "")),
  );
};

/* ─── Style helpers ─── */
const pillCls = (active: boolean): string => {
  const base =
    "flex h-10 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-semibold transition-all";
  return active
    ? `${base} border-[#1DBFD3] bg-[#1DBFD3]/10 text-[#222628]`
    : `${base} border-[#e4e4e4] bg-white text-[#969798] hover:border-slate-300`;
};

const phoneTypePillCls = (opt: string, selected: string): string => {
  const base = "rounded-full border px-4 py-1.5 text-xs font-semibold cursor-pointer transition-all";
  return selected === opt
    ? `${base} border-[#1DBFD3] bg-[#1DBFD3]/10 text-[#222628]`
    : `${base} border-[#e4e4e4] bg-white text-slate-500 hover:border-slate-300`;
};

const errInputCls = (val: string, showErrors: boolean): string =>
  showErrors && !val.trim()
    ? `${inputClass} border-red-400 ring-1 ring-red-400/20 bg-red-50/30`
    : inputClass;

/* ─── Additional Contact Card ─── */
const AdditionalContactCard = ({
  contact,
  index,
  onChange,
  onRemove,
  open,
  onToggle,
}: {
  contact: AdditionalContact;
  index: number;
  onChange: (v: AdditionalContact) => void;
  onRemove: () => void;
  open: boolean;
  onToggle: () => void;
}) => {
  const hasData = !!(contact.fullName || contact.email);
  const up = (p: Partial<AdditionalContact>) => onChange({ ...contact, ...p });

  return (
    <div className="overflow-hidden rounded-xl border border-[#e4e4e4] bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#fbfbfb]"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1DBFD3]/10 text-xs font-bold text-[#1DBFD3]">
            {index + 1}
          </span>
          <div>
            <span className="text-sm font-bold text-[#222628]">
              {contact.fullName || `Additional Contact ${index + 1}`}
            </span>
            {contact.titleAndRole && !open && (
              <span className="ml-2 text-xs text-slate-400">{contact.titleAndRole}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasData && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
          {open ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                className={inputClass}
                placeholder="e.g. Michael Torres"
                value={contact.fullName}
                onChange={(e) => up({ fullName: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Title &amp; Role</label>
              <input
                className={inputClass}
                placeholder="e.g. AV Liaison, Events Team"
                value={contact.titleAndRole}
                onChange={(e) => up({ titleAndRole: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                className={inputClass}
                placeholder="e.g. m.torres@company.com"
                value={contact.email}
                onChange={(e) => up({ email: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Phone (optional)</label>
              <input
                type="tel"
                className={inputClass}
                placeholder="e.g. (555) 555-0100"
                value={contact.phone}
                onChange={(e) => up({ phone: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Role in RFP Process</label>
            <GlobalSelect
              value={contact.role}
              onChange={(e) => up({ role: e.target.value })}
              className={inputClass}
            >
              <option value="">Select role…</option>
              {ADDITIONAL_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </GlobalSelect>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-500"
            >
              <X size={13} /> Remove contact
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Props ─── */
interface ContactInfoProps {
  data: ContactData;
  onChange: (updates: Partial<ContactData>) => void;
  onContinue: () => void;
  onBack: () => void;
  onSaveAsDraft?: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
  isEditMode?: boolean;
  isSubmitting?: boolean;
  isSavingDraft?: boolean;
  publishDisabled?: boolean;
  publishBlockReason?: string;
  mode?: ProposalExperienceMode;
  finalReview?: ReactNode;
}

/* ─── Main component ─── */
const ContactInfo = ({
  data,
  onChange,
  onContinue,
  onBack,
  onSaveAsDraft,
  showErrors = false,
  proposalSettings,
  isEditMode = false,
  isSubmitting = false,
  isSavingDraft = false,
  publishDisabled = false,
  publishBlockReason,
  mode = "advanced",
  finalReview,
}: ContactInfoProps) => {
  /* ─── Safe data ─── */
  const safeData: ContactData = {
    ...data,
    additionalContacts: data?.additionalContacts ?? [],
  };

  /* ─── Additional contacts open state ─── */
  const [openAdditional, setOpenAdditional] = useState<boolean[]>([]);

  const toggleAdditional = (i: number) =>
    setOpenAdditional((p) => {
      const next = [...p];
      next[i] = !next[i];
      return next;
    });

  const addAdditionalContact = () => {
    onChange({
      additionalContacts: [
        ...safeData.additionalContacts,
        { fullName: "", titleAndRole: "", email: "", phone: "", role: "" },
      ],
    });
    setOpenAdditional((p) => [...p, true]);
  };

  const updateAdditionalContact = (i: number, val: AdditionalContact) =>
    onChange({
      additionalContacts: safeData.additionalContacts.map((c, idx) =>
        idx === i ? val : c,
      ),
    });

  const removeAdditionalContact = (i: number) => {
    onChange({
      additionalContacts: safeData.additionalContacts.filter((_, idx) => idx !== i),
    });
    setOpenAdditional((p) => p.filter((_, idx) => idx !== i));
  };

  /* ─── Derived state ─── */
  const sharedMailboxAdvisory =
    safeData.contactEmail && isSharedMailbox(safeData.contactEmail);

  const coverPreviewVisible = !!(
    safeData.contactFirstName ||
    safeData.contactTitle ||
    safeData.contactEmail ||
    safeData.organizationLegalName
  );

  return (
    <section
      id="contact-publish-section"
      aria-labelledby="contact-publish-heading"
      tabIndex={-1}
      className="flex min-h-screen scroll-mt-6 flex-col rounded-md border border-[#e4e4e4] bg-white focus:outline-none"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* ── Header ── */}
      <div className="border-b border-[#e4e4e4] px-8 py-6">
        <h2 id="contact-publish-heading" className="text-[22px] font-bold text-[#222628]">Contact &amp; Publish</h2>
        <p className="mt-1 text-sm text-[#969798]">
          Primary contact details for proposal delivery, vendor communications, and the RFPilot portal.
        </p>
      </div>

      <div className="flex-1 px-8 py-8">

        {/* ══════════════════════════════════════════
            BLOCK A — Primary Contact
        ══════════════════════════════════════════ */}
        <div id="primary-contact-section" tabIndex={-1} className="scroll-mt-6 focus:outline-none" />
        <Group label="Primary Contact" />

        {/* Field 1 — First + Last Name */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contactFirstName" className={labelClass}>
              First Name <span className="text-red-500">*</span>
              <InfoTooltip text="Your legal first name as it appears on correspondence. Shown on the proposal cover page and all vendor portal communications." />
            </label>
            <input
              id="contactFirstName"
              type="text"
              value={safeData.contactFirstName}
              onChange={(e) => onChange({ contactFirstName: e.target.value })}
              placeholder="e.g. Sarah"
              className={errInputCls(safeData.contactFirstName, showErrors)}
            />
            {showErrors && !safeData.contactFirstName.trim() && (
              <p className={errorClass}>First name is required.</p>
            )}
          </div>
          <div>
            <label htmlFor="contactLastName" className={labelClass}>
              Last Name <span className="text-red-500">*</span>
              <InfoTooltip text="Your legal last name for correspondence and proposal documentation." />
            </label>
            <input
              id="contactLastName"
              type="text"
              value={safeData.contactLastName}
              onChange={(e) => onChange({ contactLastName: e.target.value })}
              placeholder="e.g. Jennings"
              className={errInputCls(safeData.contactLastName, showErrors)}
            />
            {showErrors && !safeData.contactLastName.trim() && (
              <p className={errorClass}>Last name is required.</p>
            )}
          </div>
        </div>

        {/* Field 2 — Job Title + Organization Display */}
        <div className={`mb-6 grid grid-cols-1 gap-4 ${mode === "advanced" ? "sm:grid-cols-2" : ""}`}>
          {mode === "advanced" && <div>
            <label htmlFor="contactTitle" className={labelClass}>
              Job Title <span className="text-red-500">*</span>
              <InfoTooltip text="Your professional title as it should appear on the RFP. Appears in the Primary Contact box on the cover page alongside your organization." />
            </label>
            <input
              id="contactTitle"
              type="text"
              value={safeData.contactTitle}
              onChange={(e) => onChange({ contactTitle: e.target.value })}
              placeholder="e.g. VP of Global Conferences"
              className={errInputCls(safeData.contactTitle, showErrors)}
            />
            {showErrors && !safeData.contactTitle.trim() && (
              <p className={errorClass}>Job title is required.</p>
            )}
          </div>}
          <div>
            <label htmlFor="contactOrganization" className={labelClass}>
              Organization (Display Name) <span className="text-red-500">*</span>
              <InfoTooltip text="Your organization's common display name for the contact box — e.g. 'Apex Dynamics'. For the full legal name used in document headers, see below." />
            </label>
            <input
              id="contactOrganization"
              type="text"
              value={safeData.contactOrganization}
              onChange={(e) => onChange({ contactOrganization: e.target.value })}
              placeholder="e.g. Apex Dynamics"
              className={errInputCls(safeData.contactOrganization, showErrors)}
            />
            {showErrors && !safeData.contactOrganization.trim() && (
              <p className={errorClass}>Organization name is required.</p>
            )}
          </div>
        </div>

        {/* Field 3 — Email */}
        <div className="mb-6">
          <label htmlFor="contactEmail" className={labelClass}>
            Email Address <span className="text-red-500">*</span>
            <InfoTooltip text="All vendor questions, proposal notifications, and portal activity alerts will be sent here. Use your professional work email — not a personal address or unmonitored shared mailbox." />
          </label>
          <input
            id="contactEmail"
            type="email"
            value={safeData.contactEmail}
            onChange={(e) => onChange({ contactEmail: e.target.value })}
            placeholder="e.g. s.jennings@apexdynamics.com"
            className={
              showErrors && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeData.contactEmail)
                ? `${inputClass} border-red-400 ring-1 ring-red-400/20 bg-red-50/30`
                : inputClass
            }
          />
          {showErrors && !safeData.contactEmail.trim() && (
            <p className={errorClass}>Email address is required.</p>
          )}
          {showErrors && safeData.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeData.contactEmail) && (
            <p className={errorClass}>Enter a valid email address.</p>
          )}
          {sharedMailboxAdvisory && (
            <div className="mt-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="shrink-0 text-amber-500">⚠</span>
              <p className="text-xs text-amber-700">
                This appears to be a shared mailbox. Vendor communications and portal notifications
                will go to this address — confirm it is monitored regularly.
              </p>
            </div>
          )}
        </div>

        {mode === "advanced" && <>
        {/* Field 4 — Phone */}
        <div className="mb-6">
          <label htmlFor="contactPhone" className={labelClass}>
            Phone Number <span className="text-red-500">*</span>
            <InfoTooltip text="Best number to reach you for vendor questions, production calls, and urgent communications. Mobile numbers are preferred for event professionals who are often on-site." />
          </label>
          <div className="flex gap-3">
            <input
              id="contactPhone"
              type="tel"
              value={safeData.contactPhone}
              onChange={(e) => onChange({ contactPhone: e.target.value })}
              placeholder="+1 (415) 555-0177"
              className={`${errInputCls(safeData.contactPhone, showErrors)} flex-1`}
            />
            <input
              type="text"
              value={safeData.contactPhoneExt}
              onChange={(e) => onChange({ contactPhoneExt: e.target.value })}
              placeholder="Ext."
              className="w-24 rounded-lg border border-[#e4e4e4] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1DBFD3] focus:outline-none focus:ring-2 focus:ring-[#1DBFD3]/20 placeholder:text-[#b0bace]"
            />
          </div>
          {showErrors && !safeData.contactPhone.trim() && (
            <p className={errorClass}>Phone number is required.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {PHONE_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => onChange({ contactPhoneType: pt.value })}
                aria-pressed={safeData.contactPhoneType === pt.value}
                className={phoneTypePillCls(pt.value, safeData.contactPhoneType)}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            BLOCK B — Organization Identity
        ══════════════════════════════════════════ */}
        <Group label="Organization Identity" />

        {/* Field 5 — Legal Name */}
        <div className="mb-6">
          <label htmlFor="organizationLegalName" className={labelClass}>
            Organization / Company Legal Name <span className="text-red-500">*</span>
            <InfoTooltip text="Full legal name of your organization as it should appear on all official documents including vendor contracts, NDAs, and the RFP header. May differ from the display name — e.g. 'Apex Dynamics Corporation' vs 'Apex Dynamics'." />
          </label>
          <input
            id="organizationLegalName"
            type="text"
            value={safeData.organizationLegalName}
            onChange={(e) => onChange({ organizationLegalName: e.target.value })}
            placeholder="e.g. Apex Dynamics Corporation"
            className={errInputCls(safeData.organizationLegalName, showErrors)}
          />
          {showErrors && !safeData.organizationLegalName.trim() && (
            <p className={errorClass}>Legal organization name is required.</p>
          )}
          {safeData.organizationLegalName && (
            <div className="mt-2 rounded-lg border border-[#eeeeee] bg-[#f9f9f9] px-3 py-2">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Cover Page Subtitle Preview
              </p>
              <p className="text-xs text-slate-600">
                <span className="font-semibold">{safeData.organizationLegalName}</span>
                {" | "}
                <span className="text-slate-400">[Venue name from Venue &amp; Schedule]</span>
              </p>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════
            BLOCK C — Additional Contacts
        ══════════════════════════════════════════ */}
        <div id="invitation-recipients-section" tabIndex={-1} className="scroll-mt-6 focus:outline-none" />
        <Group label="Additional Contacts" />

        <p className="mb-5 text-xs text-slate-500">
          Add team members who should receive vendor communications or portal notifications — AV
          liaison, contracts manager, or on-site coordinator. Optional, up to 3.
        </p>

        {safeData.additionalContacts.length > 0 && (
          <div className="mb-4 space-y-3">
            {safeData.additionalContacts.map((c, i) => (
              <AdditionalContactCard
                key={i}
                contact={c}
                index={i}
                onChange={(v) => updateAdditionalContact(i, v)}
                onRemove={() => removeAdditionalContact(i)}
                open={openAdditional[i] ?? false}
                onToggle={() => toggleAdditional(i)}
              />
            ))}
          </div>
        )}

        {safeData.additionalContacts.length < 3 && (
          <button
            type="button"
            onClick={addAdditionalContact}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#1DBFD3] hover:underline"
          >
            <PlusCircle size={16} /> Add additional contact
          </button>
        )}

        {/* ══════════════════════════════════════════
            BLOCK D — Contact Preferences
        ══════════════════════════════════════════ */}
        <Group label="Contact Preferences" />

        <div className="mb-6">
          <label className={labelClass}>
            Preferred Contact Method
            <InfoTooltip text="How would you prefer the DXG team to reach you for questions or updates?" />
          </label>
          <div className="flex flex-wrap gap-3">
            {CONTACT_METHODS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  onChange({
                    preferredContactMethod:
                      safeData.preferredContactMethod === opt ? "" : opt,
                  })
                }
                aria-pressed={safeData.preferredContactMethod === opt}
                className={pillCls(safeData.preferredContactMethod === opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className={labelClass}>
            Best Time to Reach You
            <InfoTooltip text="Helps us schedule calls at a time that works best for you." />
          </label>
          <div className="flex flex-wrap gap-3">
            {REACH_TIMES.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  onChange({
                    bestTimeToReach: safeData.bestTimeToReach === opt ? "" : opt,
                  })
                }
                aria-pressed={safeData.bestTimeToReach === opt}
                className={pillCls(safeData.bestTimeToReach === opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            Additional Notes
        ══════════════════════════════════════════ */}
        <Group label="Additional Notes" />

        <div className="mb-6">
          <label htmlFor="anythingElse" className={labelClass}>
            Anything else to share?
            <InfoTooltip text="Any additional context, special requirements, or notes the production team should know before building your proposal." />
          </label>
          <textarea
            id="anythingElse"
            rows={5}
            value={safeData.anythingElse}
            onChange={(e) => onChange({ anythingElse: e.target.value })}
            placeholder="Budget constraints, sensitive topics, VIP considerations, accessibility needs…"
            className={`${inputClass} resize-none`}
          />
        </div>
        </>}

        {finalReview && (
          <div className="mb-6" data-testid="contact-publish-final-review">
            {finalReview}
          </div>
        )}

        {/* ── Cover page contact box preview ── */}
        {coverPreviewVisible && (
          <div className="mb-6 rounded-xl border border-[#eeeeee] bg-[#f9f9f9] p-4">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Cover Page — Primary Contact Box Preview
            </p>
            <div className="space-y-0.5 text-xs text-slate-700">
              {(safeData.contactFirstName || safeData.contactLastName) && (
                <p className="text-sm font-bold text-[#222628]">
                  {safeData.contactFirstName} {safeData.contactLastName}
                </p>
              )}
              {(safeData.contactTitle || safeData.contactOrganization) && (
                <p className="text-slate-500">
                  {[safeData.contactTitle, safeData.contactOrganization]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {safeData.contactEmail && <p>{safeData.contactEmail}</p>}
              {safeData.contactPhone && (
                <p>
                  {safeData.contactPhone}
                  {safeData.contactPhoneExt && ` ext. ${safeData.contactPhoneExt}`}
                </p>
              )}
              {safeData.additionalContacts.filter((c) => c.fullName || c.email).length > 0 && (
                <div className="mt-2 border-t border-[#eeeeee] pt-2">
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    Additional Contacts
                  </p>
                  {safeData.additionalContacts
                    .filter((c) => c.fullName || c.email)
                    .map((c, i) => (
                      <div key={i} className="mt-1">
                        <span className="font-semibold">{c.fullName}</span>
                        {c.titleAndRole && (
                          <span className="text-slate-400"> — {c.titleAndRole}</span>
                        )}
                        {c.email && <span className="block text-slate-500">{c.email}</span>}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Submit banner ── */}
        <div className="rounded-xl border border-[#1DBFD3]/30 bg-[#f0fbff] p-5">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#1DBFD3]">
            {isEditMode ? "Ready to publish your changes?" : "Ready to publish your RFP?"}
          </p>
          <p className="text-sm text-[#4a5a8a]">
            <strong>{isEditMode ? "Publish updated proposal" : "Publish Proposal"}</strong> saves this
            information and makes the proposal live for vendors. It does not email vendors;
            invitations are sent separately.
          </p>
        </div>

      </div>

      {/* ── Footer Nav ── */}
      <div className="flex items-center justify-between border-t border-[#e4e4e4] px-8 py-5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-200"
        >
          <ArrowLeft size={15} className="shrink-0" />
          {mode === "basic" ? "Investment & Timeline" : "Uploads & Co-Vendors"}
        </button>

        <div className="flex items-center gap-3">
          {onSaveAsDraft && (
            <button
              type="button"
              onClick={onSaveAsDraft}
              disabled={isSubmitting || isSavingDraft}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isSavingDraft ? "Saving…" : "Save as Draft"}
            </button>
          )}
          {publishBlockReason && (
            <p id="publish-block-reason" role="status" className="max-w-56 text-right text-xs font-semibold leading-5 text-amber-700">
              {publishBlockReason}
            </p>
          )}
          <button
            type="button"
            onClick={onContinue}
            disabled={isSubmitting || isSavingDraft || publishDisabled}
            aria-describedby={publishBlockReason ? "publish-block-reason" : undefined}
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(14,165,233,0.6)] active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #1DBFD3 100%)" }}
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
            {isSubmitting ? "Publishing…" : isEditMode ? "Publish updated proposal" : "Publish Proposal"}
            {isSubmitting ? null : <ArrowRight size={15} className="shrink-0" />}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ContactInfo;
