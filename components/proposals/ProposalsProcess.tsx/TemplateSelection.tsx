"use client";

import Image from "next/image";
import type { ProposalSettings } from "../AddNewProposal";
import { ArrowLeft } from "lucide-react";

type TemplateSelectionProps = {
  templateId: string;
  onSelect: (templateId: "template-one" | "template-two") => void;
  onCreate: (status: "unsubmitted" | "submitted") => void;
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
      className="flex flex-col min-h-screen rounded-md border border-line bg-surface"
      style={{
        fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)`,
      }}
    >
      <div className="px-6 py-5 border-b border-line">
        <h2 className="text-[20px] font-semibold text-heading">
          Choose Proposal Template
        </h2>
        <p className="mt-1 text-sm text-muted">
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
                ? "border-action bg-action/5 shadow-[0_0_0_2px_rgba(33,140,203,0.2)]"
                : "border-line bg-surface hover:border-action/50"
            }`}
          >
            <div className="relative h-40 overflow-hidden rounded-xl border border-line bg-surface">
              <Image
                src="/assets/template-modern-preview.svg"
                alt="Modern template preview"
                fill
                className="object-cover"
              />
            </div>
            <div className="mt-3 text-left">
              <p className="text-sm font-bold text-heading">Modern</p>
              <p className="text-xs text-muted">
                Modern, bold, sectioned presentation layout.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelect("template-two")}
            className={`${cardBaseClass} ${
              templateId === "template-two"
                ? "border-action bg-action/5 shadow-[0_0_0_2px_rgba(33,140,203,0.2)]"
                : "border-line bg-surface hover:border-action/50"
            }`}
          >
            <div className="relative h-40 overflow-hidden rounded-xl border border-line bg-surface">
              <Image
                src="/assets/template-classic-preview.svg"
                alt="Classic template preview"
                fill
                className="object-cover"
              />
            </div>
            <div className="mt-3 text-left">
              <p className="text-sm font-bold text-heading">Classic</p>
              <p className="text-xs text-muted">
                Clean executive summary style with compact sections.
              </p>
            </div>
          </button>
        </div>

        {hasError && (
          <p className="mt-3 text-sm font-medium text-danger-strong">
            Please select a template before continuing.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-body shadow-sm hover:bg-surface-muted hover:-translate-y-0.5 transition-all duration-200"
        >
          <ArrowLeft size={15} className="shrink-0" />
          <ArrowLeft size={15} className="shrink-0" />
          Back
        </button>
        <button
          type="button"
          onClick={() => onCreate("unsubmitted")}
          className="h-10 px-6 rounded-md border border-line bg-surface hover:bg-gray-50 text-sm font-bold text-heading transition-colors"
        >
          {draftActionLabel}
        </button>
        <button
          type="button"
          onClick={() => onCreate("submitted")}
          className="h-10 px-8 rounded-md text-white text-sm font-bold shadow-[0_4px_14px_0_rgba(14,165,233,0.35)] transition-all hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #1DBFD3 100%)" }}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/20 skew-x-[-20deg] transition-transform duration-700 group-hover:translate-x-full" />
          {liveActionLabel}
        </button>
      </div>
    </section>
  );
}
