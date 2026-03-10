"use client";

import { RotateCcw } from "lucide-react";
import { ProposalData } from "../AddNewProposal";

/* ─── Shared style constants ─── */
const labelClass = "mb-1.5 block text-xs font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-[#35bdf2] focus:ring-1 focus:ring-[#35bdf2]/20 placeholder:text-gray-300";

interface ContactInfoProps {
  data: ProposalData;
  onChange: (updates: Partial<ProposalData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

const ContactInfo = ({ data, onChange, onContinue, onBack }: ContactInfoProps) => {
  const handleClear = () => {
    onChange({
      contactFirstName: "",
      contactLastName: "",
      contactTitle: "",
      contactOrganization: "",
      contactEmail: "",
      contactPhone: "",
      anythingElse: "",
    });
  };

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#35bdf2] bg-white">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Contact Info</h2>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-8 py-8 space-y-5">

        {/* First Name */}
        <div>
          <label htmlFor="contactFirstName" className={labelClass}>First Name</label>
          <input
            id="contactFirstName"
            className={inputClass}
            placeholder="John"
            value={data.contactFirstName}
            onChange={(e) => onChange({ contactFirstName: e.target.value })}
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="contactLastName" className={labelClass}>Last Name</label>
          <input
            id="contactLastName"
            className={inputClass}
            placeholder="Doe"
            value={data.contactLastName}
            onChange={(e) => onChange({ contactLastName: e.target.value })}
          />
        </div>

        {/* Title */}
        <div>
          <label htmlFor="contactTitle" className={labelClass}>Title</label>
          <input
            id="contactTitle"
            className={inputClass}
            placeholder="Subject..."
            value={data.contactTitle}
            onChange={(e) => onChange({ contactTitle: e.target.value })}
          />
        </div>

        {/* Organization */}
        <div>
          <label htmlFor="contactOrganization" className={labelClass}>Organization</label>
          <input
            id="contactOrganization"
            className={inputClass}
            placeholder="Organization"
            value={data.contactOrganization}
            onChange={(e) => onChange({ contactOrganization: e.target.value })}
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="contactEmail" className={labelClass}>Email</label>
          <input
            id="contactEmail"
            type="email"
            className={inputClass}
            placeholder="johndoe@gmail.com"
            value={data.contactEmail}
            onChange={(e) => onChange({ contactEmail: e.target.value })}
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="contactPhone" className={labelClass}>Phone</label>
          <input
            id="contactPhone"
            type="tel"
            className={inputClass}
            placeholder="Number..."
            value={data.contactPhone}
            onChange={(e) => onChange({ contactPhone: e.target.value })}
          />
        </div>

        {/* Anything else to share */}
        <div>
          <label htmlFor="anythingElse" className={labelClass}>Anything else to share?</label>
          <textarea
            id="anythingElse"
            rows={5}
            className="w-full rounded-md border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-[#1f2d5d] outline-none focus:border-[#35bdf2] focus:ring-1 focus:ring-[#35bdf2]/20 placeholder:text-gray-300 resize-none"
            placeholder="Write here..."
            value={data.anythingElse}
            onChange={(e) => onChange({ anythingElse: e.target.value })}
          />
        </div>

      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-2 text-sm font-semibold text-[#8f98bf] hover:text-red-400 transition-colors"
        >
          <RotateCcw size={15} />
          CLEAR
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-10 px-6 rounded-md border border-[#d7dce3] text-sm font-semibold text-[#1f2d5d] hover:bg-gray-50 transition-colors"
          >
            BACK
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="h-10 px-8 rounded-md bg-[#35bdf2] hover:bg-[#20A4D5] text-white text-sm font-bold shadow-[0_4px_14px_0_rgba(56,189,248,0.39)] transition-transform active:scale-95 tracking-wide"
          >
            CREATE PROPOSAL
          </button>
        </div>
      </div>
    </section>
  );
};

export default ContactInfo;