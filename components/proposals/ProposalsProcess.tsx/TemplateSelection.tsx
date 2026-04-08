"use client";

import Image from "next/image";
import type { ProposalSettings } from "../AddNewProposal";

type TemplateSelectionProps = {
  templateId: string;
  onSelect: (templateId: "template-one" | "template-two") => void;
  onCreate: (status: "draft" | "submitted") => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
  draftActionLabel?: string;
  liveActionLabel?: string;
};

const cardBaseClass =
  "cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5";

export default function TemplateSelection({
  templateId,
  onSelect,
  onCreate,
  onBack,
  showErrors = false,
  proposalSettings,
  draftActionLabel = "SAVE AS DRAFT",
  liveActionLabel = "CREATE LIVE",
}: TemplateSelectionProps) {
  const hasError = showErrors && !templateId;

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{
        fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)`,
      }}
    >
      <div className="px-6 py-5 border-b border-[#d7dce3]">
        <h2 className="text-[20px] font-semibold text-[#0f1b57]">
          Choose Proposal Template
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Select how this proposal will be presented. The selected template is
          saved with the proposal.
        </p>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelect("template-one")}
            className={`${cardBaseClass} ${
              templateId === "template-one"
                ? "border-cyan-500 bg-cyan-50/50 shadow-[0_0_0_2px_rgba(6,182,212,0.2)]"
                : "border-slate-200 bg-white hover:border-cyan-300"
            }`}
          >
            <div className="relative h-40 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Image
                src="/assets/template-modern-preview.svg"
                alt="Modern template preview"
                fill
                className="object-cover"
              />
            </div>
            <div className="mt-3 text-left">
              <p className="text-sm font-bold text-slate-900">Modern</p>
              <p className="text-xs text-slate-500">
                Modern, bold, sectioned presentation layout.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelect("template-two")}
            className={`${cardBaseClass} ${
              templateId === "template-two"
                ? "border-cyan-500 bg-cyan-50/50 shadow-[0_0_0_2px_rgba(6,182,212,0.2)]"
                : "border-slate-200 bg-white hover:border-cyan-300"
            }`}
          >
            <div className="relative h-40 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Image
                src="/assets/template-classic-preview.svg"
                alt="Classic template preview"
                fill
                className="object-cover"
              />
            </div>
            <div className="mt-3 text-left">
              <p className="text-sm font-bold text-slate-900">Classic</p>
              <p className="text-xs text-slate-500">
                Clean executive summary style with compact sections.
              </p>
            </div>
          </button>
        </div>

        {hasError && (
          <p className="mt-3 text-sm font-medium text-red-500">
            Please select a template before continuing.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={onBack}
          className="h-10 px-6 rounded-md border border-[#d7dce3] text-sm font-semibold text-[#1f2d5d] hover:bg-gray-50 transition-colors"
        >
          BACK
        </button>
        <button
          type="button"
          onClick={() => onCreate("draft")}
          className="h-10 px-6 rounded-md border border-[#d7dce3] bg-white hover:bg-gray-50 text-sm font-bold text-[#1f2d5d] transition-colors"
        >
          {draftActionLabel}
        </button>
        <button
          type="button"
          onClick={() => onCreate("submitted")}
          className="h-10 px-8 rounded-md bg-[#35bdf2] hover:bg-[#20A4D5] text-white text-sm font-bold shadow-[0_4px_14px_0_rgba(56,189,248,0.39)] transition-transform active:scale-95"
        >
          {liveActionLabel}
        </button>
      </div>
    </section>
  );
}
