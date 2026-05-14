"use client";

import type { ContactData, ProposalSettings } from "../AddNewProposal";
import { InfoTooltip } from "./shared";

/* ─── Style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#35bdf2] focus:outline-none focus:ring-2 focus:ring-[#35bdf2]/20 placeholder:text-[#b0bace]";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#8f98bf]";
const errorClass = "mt-1 text-sm text-red-500 normal-case";

const Group = ({ label }: { label: string }) => (
  <div className="mb-5 mt-8 border-t border-[#e8edf5] pt-6 first:mt-0 first:border-0 first:pt-0">
    <p className={groupLabelClass}>{label}</p>
  </div>
);

const CONTACT_METHODS = ["Email", "Phone", "Either"] as const;
const REACH_TIMES = ["Morning (8am–12pm)", "Afternoon (12pm–5pm)", "Evening (5pm–8pm)", "Anytime"];

/* ─── Props ─── */
interface ContactInfoProps {
  data: ContactData;
  onChange: (updates: Partial<ContactData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
}

const ContactInfo = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
}: ContactInfoProps) => {
  /* Guard legacy data */
  const safeData: ContactData = {
    contactFirstName: "",
    contactLastName: "",
    contactTitle: "",
    contactOrganization: "",
    contactEmail: "",
    contactPhone: "",
    preferredContactMethod: "",
    bestTimeToReach: "",
    anythingElse: "",
    ...data,
  };

  const field = (
    id: keyof ContactData,
    type: string,
    placeholder: string,
    required: boolean,
    label: string,
    tooltip: string
  ) => {
    const val = safeData[id] as string;
    const hasErr = showErrors && required && !val.trim();
    return (
      <div className="mb-6">
        <label htmlFor={id} className={labelClass}>
          {label} {required && <span className="text-red-500">*</span>}
          <InfoTooltip text={tooltip} />
        </label>
        <input
          id={id}
          type={type}
          value={val}
          onChange={(e) => onChange({ [id]: e.target.value } as Partial<ContactData>)}
          placeholder={placeholder}
          className={`${inputClass} ${hasErr ? "border-red-400 ring-1 ring-red-400/20 bg-red-50/30" : ""}`}
        />
        {hasErr && <p className={errorClass}>{label} is required.</p>}
      </div>
    );
  };

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white">
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#35bdf2]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#35bdf2]">
            Page 9 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Contact &amp; Submit</h2>
        <p className="mt-1 text-sm text-[#8f98bf]">
          Who should we send the completed RFP to?
        </p>
      </div>

      {/* ── Form Body ── */}
      <div className="flex-1 px-8 py-8">

        {/* ══════ GROUP: CONTACT INFORMATION ══════ */}
        <Group label="Contact Information" />

        {/* First + Last name — side by side */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactFirstName" className={labelClass}>
              First Name <span className="text-red-500">*</span>
              <InfoTooltip text="Your legal first name for the proposal contact and any follow-up correspondence." />
            </label>
            <input
              id="contactFirstName"
              type="text"
              value={safeData.contactFirstName}
              onChange={(e) => onChange({ contactFirstName: e.target.value })}
              placeholder="Jane"
              className={`${inputClass} ${showErrors && !safeData.contactFirstName.trim() ? "border-red-400 ring-1 ring-red-400/20 bg-red-50/30" : ""}`}
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
              placeholder="Smith"
              className={`${inputClass} ${showErrors && !safeData.contactLastName.trim() ? "border-red-400 ring-1 ring-red-400/20 bg-red-50/30" : ""}`}
            />
            {showErrors && !safeData.contactLastName.trim() && (
              <p className={errorClass}>Last name is required.</p>
            )}
          </div>
        </div>

        {field("contactTitle", "text", "e.g. Event Director, VP Marketing, Meeting Planner", false, "Title / Role", "Your professional title or role — appears on proposal correspondence.")}
        {field("contactOrganization", "text", "e.g. Acme Corp", false, "Organization", "The company or organization hosting the event. Appears on the proposal cover.")}

        {/* Email + Phone — side by side */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactEmail" className={labelClass}>
              Email <span className="text-red-500">*</span>
              <InfoTooltip text="Your preferred email address for receiving the proposal and follow-up communications." />
            </label>
            <input
              id="contactEmail"
              type="email"
              value={safeData.contactEmail}
              onChange={(e) => onChange({ contactEmail: e.target.value })}
              placeholder="jane@yourcompany.com"
              className={`${inputClass} ${showErrors && !safeData.contactEmail.trim() ? "border-red-400 ring-1 ring-red-400/20 bg-red-50/30" : ""}`}
            />
            {showErrors && !safeData.contactEmail.trim() && (
              <p className={errorClass}>Email is required.</p>
            )}
          </div>
          <div>
            <label htmlFor="contactPhone" className={labelClass}>
              Phone <span className="text-red-500">*</span>
              <InfoTooltip text="Best phone number to reach you for questions or to schedule a producer discovery call." />
            </label>
            <input
              id="contactPhone"
              type="tel"
              value={safeData.contactPhone}
              onChange={(e) => onChange({ contactPhone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              className={`${inputClass} ${showErrors && !safeData.contactPhone.trim() ? "border-red-400 ring-1 ring-red-400/20 bg-red-50/30" : ""}`}
            />
            {showErrors && !safeData.contactPhone.trim() && (
              <p className={errorClass}>Phone number is required.</p>
            )}
          </div>
        </div>

        {/* ══════ GROUP: CONTACT PREFERENCES ══════ */}
        <Group label="Contact Preferences" />

        {/* Preferred contact method */}
        <div className="mb-6">
          <label className={labelClass}>
            Preferred Contact Method
            <InfoTooltip text="How would you prefer the DXG team to reach you for questions or updates?" />
          </label>
          <div className="flex gap-3 flex-wrap">
            {CONTACT_METHODS.map((opt) => {
              const active = safeData.preferredContactMethod === opt;
              const cls = active
                ? "border-[#35bdf2] bg-[#35bdf2]/10 text-[#1f2d5d] font-bold"
                : "border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300";
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    onChange({
                      preferredContactMethod: active ? "" : opt,
                    })
                  }
                  className={`flex h-10 min-w-20 items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Best time to reach */}
        <div className="mb-6">
          <label className={labelClass}>
            Best Time to Reach You
            <InfoTooltip text="Helps us schedule calls at a time that works best for you." />
          </label>
          <div className="flex gap-3 flex-wrap">
            {REACH_TIMES.map((opt) => {
              const active = safeData.bestTimeToReach === opt;
              const cls = active
                ? "border-[#35bdf2] bg-[#35bdf2]/10 text-[#1f2d5d] font-bold"
                : "border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300";
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    onChange({ bestTimeToReach: active ? "" : opt })
                  }
                  className={`flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition-all ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════ GROUP: ADDITIONAL NOTES ══════ */}
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

        {/* ── Submit banner ── */}
        <div className="mt-8 rounded-xl border border-[#35bdf2]/30 bg-[#f0fbff] p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#35bdf2] mb-1">
            Ready to generate your RFP?
          </p>
          <p className="text-sm text-[#4a5a8a]">
            Once you click <strong>Generate RFP</strong>, you'll choose a proposal template and your intake form will be packaged into a professional RFP document for your AV vendor.
          </p>
        </div>

      </div>

      {/* ── Footer Nav ── */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-[#d7dce3] px-5 py-2.5 text-sm font-semibold text-[#1f2d5d] hover:bg-[#f5f7ff] transition-colors"
        >
          ← Uploads &amp; Co-Vendors
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 rounded-lg bg-[#35bdf2] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(53,189,242,0.35)] hover:bg-[#20a9de] transition-colors active:scale-95"
        >
          Generate RFP →
        </button>
      </div>
    </section>
  );
};

export default ContactInfo;
