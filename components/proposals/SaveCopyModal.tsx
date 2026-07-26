"use client";

import { useEffect, useState } from "react";
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

  if (!isOpen) return null;

  const handleConfirm = () => {
    setShowErrors(true);
    if (!eventName.trim()) return;
    onConfirm({ eventName, startDate, endDate });
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e4e4e4]">
          <div>
            <h2 className="text-[18px] font-semibold text-[#222628]">Save a Copy</h2>
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e4e4e4]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 px-5 rounded-md border border-[#e4e4e4] text-sm font-semibold text-[#222628] hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="h-9 px-6 rounded-md text-white text-sm font-bold shadow-[0_4px_14px_0_rgba(14,165,233,0.35)] transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" }}
          >
            {saving ? "Saving..." : "Save Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
