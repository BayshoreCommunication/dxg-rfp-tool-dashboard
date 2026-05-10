"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ProposalSettings } from "./AddNewProposal";

export type CopyOverrides = {
  eventName: string;
  startDate: string;
  endDate: string;
  templateId: "template-one" | "template-two" | "";
};

const defaultSettings: ProposalSettings = {
  branding: { linkPrefix: "", defaultFont: "Poppins" },
  proposals: {
    proposalLanguage: "English",
    defaultCurrency: "$",
    expiryDate: "None",
    priceSeparator: "NONE",
    dateFormat: "MM/DD/YYYY",
    decimalPrecision: "2",
  },
};

type SaveCopyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (overrides: CopyOverrides) => void;
  saving: boolean;
  defaultEventName: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
  defaultTemplateId?: "template-one" | "template-two" | "";
  proposalSettings?: ProposalSettings;
};

const selectedCard =
  "border-cyan-500 bg-cyan-50 shadow-[0_0_0_2px_rgba(6,182,212,0.2)]";
const unselectedCard =
  "border-slate-200 bg-white hover:border-cyan-300";

export default function SaveCopyModal({
  isOpen,
  onClose,
  onConfirm,
  saving,
  defaultEventName,
  defaultStartDate = "",
  defaultEndDate = "",
  defaultTemplateId = "",
  proposalSettings,
}: SaveCopyModalProps) {
  const settings = proposalSettings ?? defaultSettings;

  const [eventName, setEventName] = useState(defaultEventName);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [templateId, setTemplateId] = useState<"template-one" | "template-two" | "">(
    defaultTemplateId as "template-one" | "template-two" | "",
  );
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEventName(defaultEventName);
      setStartDate(defaultStartDate);
      setEndDate(defaultEndDate);
      setTemplateId(defaultTemplateId as "template-one" | "template-two" | "");
      setShowErrors(false);
    }
  }, [isOpen, defaultEventName, defaultStartDate, defaultEndDate, defaultTemplateId]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setShowErrors(true);
    if (!eventName.trim() || !templateId) return;
    onConfirm({ eventName, startDate, endDate, templateId });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl mx-4"
        style={{
          fontFamily: `"${settings.branding.defaultFont}", var(--font-sans)`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d7dce3]">
          <div>
            <h2 className="text-[18px] font-semibold text-[#0f1b57]">Save a Copy</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Customize the copy. It will be saved as a draft.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Event Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Enter event name for the copy"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-400 ${
                showErrors && !eventName.trim()
                  ? "border-red-400 bg-red-50"
                  : "border-[#d7dce3] bg-white"
              }`}
            />
            {showErrors && !eventName.trim() && (
              <p className="mt-1 text-xs text-red-500">Event name is required.</p>
            )}
          </div>

          {/* Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date
                <span className="ml-1 text-[10px] font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-[#d7dce3] bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date
                <span className="ml-1 text-[10px] font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-[#d7dce3] bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 -mt-2">
            Leave blank to keep the original proposal dates.
          </p>

          {/* Template selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Template <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTemplateId("template-one")}
                className={`cursor-pointer rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 text-left ${
                  templateId === "template-one" ? selectedCard : unselectedCard
                }`}
              >
                <div className="relative h-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <Image
                    src="/assets/template-modern-preview.svg"
                    alt="Modern"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="mt-2 text-xs font-bold text-slate-900">Modern</p>
                <p className="text-[11px] text-slate-500">Bold, sectioned layout</p>
              </button>

              <button
                type="button"
                onClick={() => setTemplateId("template-two")}
                className={`cursor-pointer rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 text-left ${
                  templateId === "template-two" ? selectedCard : unselectedCard
                }`}
              >
                <div className="relative h-28 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <Image
                    src="/assets/template-classic-preview.svg"
                    alt="Classic"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="mt-2 text-xs font-bold text-slate-900">Classic</p>
                <p className="text-[11px] text-slate-500">Executive summary style</p>
              </button>
            </div>
            {showErrors && !templateId && (
              <p className="mt-2 text-xs text-red-500">Please select a template.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#d7dce3]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 px-5 rounded-md border border-[#d7dce3] text-sm font-semibold text-[#1f2d5d] hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="h-9 px-6 rounded-md bg-[#35bdf2] hover:bg-[#20A4D5] text-white text-sm font-bold shadow-[0_4px_14px_0_rgba(56,189,248,0.39)] transition-transform active:scale-95 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
