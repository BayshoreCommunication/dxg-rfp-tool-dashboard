"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ProposalSettings } from "./AddNewProposal";

export type CopyOverrides = {
  eventName: string;
  startDate: string;
  endDate: string;
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
  proposalSettings?: ProposalSettings;
};

export default function SaveCopyModal({
  isOpen,
  onClose,
  onConfirm,
  saving,
  defaultEventName,
  defaultStartDate = "",
  defaultEndDate = "",
  proposalSettings,
}: SaveCopyModalProps) {
  const settings = proposalSettings ?? defaultSettings;

  const [eventName, setEventName] = useState(defaultEventName);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Opening the modal intentionally resets its draft from current defaults.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEventName(defaultEventName);
      setStartDate(defaultStartDate);
      setEndDate(defaultEndDate);
      setShowErrors(false);
    }
  }, [isOpen, defaultEventName, defaultStartDate, defaultEndDate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, saving]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setShowErrors(true);
    if (!eventName.trim()) return;
    onConfirm({ eventName, startDate, endDate });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-copy-title"
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)]"
        style={{
          fontFamily: `"${settings.branding.defaultFont}", var(--font-sans)`,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#e4e4e4] px-4 py-4 sm:px-6">
          <div>
            <h2 id="save-copy-title" className="text-[18px] font-semibold text-[#222628]">Save a Copy</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Customize the copy. It will be saved as a draft.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Save a Copy dialog"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
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
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#008ad2]/40 ${
                showErrors && !eventName.trim()
                  ? "border-red-400 bg-red-50"
                  : "border-[#e4e4e4] bg-white"
              }`}
            />
            {showErrors && !eventName.trim() && (
              <p className="mt-1 text-xs text-red-500">Event name is required.</p>
            )}
          </div>

          {/* Date row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date
                <span className="ml-1 text-[10px] font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-[#e4e4e4] bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#008ad2]/40"
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
                className="w-full rounded-lg border border-[#e4e4e4] bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#008ad2]/40"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 -mt-2">
            Leave blank to keep the original proposal dates.
          </p>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-2 gap-3 border-t border-[#e4e4e4] px-4 py-4 sm:flex sm:items-center sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-lg border border-[#e4e4e4] px-4 text-sm font-semibold text-[#222628] transition-colors hover:bg-gray-50 disabled:opacity-50 sm:px-5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="h-10 rounded-lg px-4 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(14,165,233,0.35)] transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 sm:px-6"
            style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}
          >
            {saving ? "Saving..." : "Save Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
