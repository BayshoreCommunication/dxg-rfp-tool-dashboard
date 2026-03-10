"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const labelClass = "mb-2 block text-sm font-semibold text-[#8f98bf]";
const inputClass =
  "h-10 w-full rounded-md border border-[#d7dce3] bg-white px-3 text-sm text-[#1f2d5d] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";
const selectClass = inputClass + " appearance-none pr-8";

const InfoDot = () => (
  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#7b7ec8] text-[10px] font-bold text-white">
    i
  </span>
);

const SelectCaret = () => (
  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary">
    <ChevronDown size={20} />
  </span>
);

const ProposalsSettings = () => {
  const [enableAiAssistant, setEnableAiAssistant] = useState(true);
  const [contacts, setContacts] = useState({
    email: true,
    call: false,
    whatsapp: false,
  });

  return (
    <section className="rounded-md border border-[#d7dce3] bg-white px-5 py-6 md:px-8">
      <h2 className="md:text-[26px] font-semibold leading-none text-[#0f1b57]">
        Proposals
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2">
        <div>
          <label htmlFor="proposalLanguage" className={labelClass}>
            Proposal Language
          </label>
          <div className="relative">
            <select
              id="proposalLanguage"
              defaultValue="English"
              className={selectClass}
            >
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
            <SelectCaret />
          </div>
        </div>

        <div>
          <label htmlFor="defaultCurrency" className={labelClass}>
            Default Currency
          </label>
          <input id="defaultCurrency" defaultValue="$" className={inputClass} />
        </div>

        <div>
          <label
            htmlFor="expiryDate"
            className="mb-2 flex items-center justify-between text-sm font-semibold text-[#8f98bf]"
          >
            <span>Proposal Expiry Date</span>
            <InfoDot />
          </label>
          <div className="relative">
            <select id="expiryDate" defaultValue="None" className={selectClass}>
              <option>None</option>
              <option>7 Days</option>
              <option>14 Days</option>
              <option>30 Days</option>
            </select>
            <SelectCaret />
          </div>
        </div>

        <div>
          <label htmlFor="priceSeparator" className={labelClass}>
            Price Separator
          </label>
          <div className="relative">
            <select
              id="priceSeparator"
              defaultValue="NONE"
              className={selectClass}
            >
              <option>NONE</option>
              <option>,</option>
              <option>.</option>
            </select>
            <SelectCaret />
          </div>
        </div>

        <div>
          <label htmlFor="dateFormat" className={labelClass}>
            Date Format
          </label>
          <div className="relative">
            <select
              id="dateFormat"
              defaultValue="MM/DD/YYYY"
              className={selectClass}
            >
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
            <SelectCaret />
          </div>
        </div>

        <div>
          <label htmlFor="decimalPrecision" className={labelClass}>
            Decimal Precision
          </label>
          <div className="relative">
            <select
              id="decimalPrecision"
              defaultValue="2"
              className={selectClass}
            >
              <option>0</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
            </select>
            <SelectCaret />
          </div>
        </div>

        <div>
          <label className={labelClass}>Contact Buttons</label>
          <div className="space-y-4 rounded-md border border-[#d7dce3] bg-[#f5f6f8] p-3">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#8f98bf]">
                <input
                  type="checkbox"
                  checked={contacts.email}
                  onChange={(e) =>
                    setContacts((prev) => ({
                      ...prev,
                      email: e.target.checked,
                    }))
                  }
                  className="h-3.5 w-3.5 rounded border-[#cfd4dd] text-[#373798] focus:ring-1 focus:ring-[#373798]/30"
                />
                Email
              </label>
              <input
                className={inputClass + " bg-white"}
                defaultValue="ui.abukawsar@gmail.com"
                disabled={!contacts.email}
              />
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-medium text-[#8f98bf]">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={contacts.call}
                    onChange={(e) =>
                      setContacts((prev) => ({
                        ...prev,
                        call: e.target.checked,
                      }))
                    }
                    className="h-3.5 w-3.5 rounded border-[#cfd4dd] text-[#373798] focus:ring-1 focus:ring-[#373798]/30"
                  />
                  Call
                </span>
                <InfoDot />
              </label>
              <input
                className={inputClass + " bg-white"}
                defaultValue="+12163547758"
                disabled={!contacts.call}
              />
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-medium text-[#8f98bf]">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={contacts.whatsapp}
                    onChange={(e) =>
                      setContacts((prev) => ({
                        ...prev,
                        whatsapp: e.target.checked,
                      }))
                    }
                    className="h-3.5 w-3.5 rounded border-[#cfd4dd] text-[#373798] focus:ring-1 focus:ring-[#373798]/30"
                  />
                  Whatsapp
                </span>
                <InfoDot />
              </label>
              <input
                className={inputClass + " bg-white"}
                defaultValue="+12163547758"
                disabled={!contacts.whatsapp}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 grid grid-cols-[1fr_auto] gap-2 text-sm font-semibold text-[#8f98bf]">
              <span>Redirect Signed Prospect To</span>
              <span>After(seconds)</span>
            </label>
            <div className="grid grid-cols-[1fr_86px] gap-2">
              <input className={inputClass} placeholder="Redirect URL" />
              <input className={inputClass} defaultValue="0" />
            </div>
          </div>

          <div>
            <label htmlFor="downloadPreviewTop" className={labelClass}>
              Enable Download In Preview
            </label>
            <div className="relative">
              <select
                id="downloadPreviewTop"
                defaultValue="Yes"
                className={selectClass}
              >
                <option>Yes</option>
                <option>No</option>
              </select>
              <SelectCaret />
            </div>
          </div>

          <div>
            <label
              htmlFor="teammateEmail"
              className="mb-2 flex items-center justify-between text-sm font-semibold text-[#8f98bf]"
            >
              <span>Send Signed Proposal To Teammate</span>
              <InfoDot />
            </label>
            <div className="flex overflow-hidden rounded-md border border-[#d7dce3] bg-white">
              <input
                id="teammateEmail"
                className="h-10 w-full px-3 text-sm text-[#1f2d5d] outline-none"
                placeholder="example@email.com"
              />
              <button
                type="button"
                className="w-11 border-l border-[#d7dce3] text-xs font-semibold text-[#373798] hover:bg-[#f2f4f8]"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="downloadPreviewBottom" className={labelClass}>
              Enable Download In Preview
            </label>
            <div className="relative">
              <select
                id="downloadPreviewBottom"
                defaultValue="Yes"
                className={selectClass}
              >
                <option>Yes</option>
                <option>No</option>
              </select>
              <SelectCaret />
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1 text-sm font-semibold text-[#8f98bf]">
              AI Assistant
              <InfoDot />
              <span className="ml-1 rounded bg-[#ffe8cf] px-2 py-0.5 text-[10px] font-bold text-[#f28d36]">
                BETA
              </span>
            </label>
            <button
              type="button"
              onClick={() => setEnableAiAssistant((prev) => !prev)}
              className={
                "relative h-6 w-11 rounded-full transition " +
                (enableAiAssistant ? "bg-[#373798]" : "bg-gray-300")
              }
              aria-label="Toggle AI assistant"
            >
              <span
                className={
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition " +
                  (enableAiAssistant ? "right-1" : "left-1")
                }
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProposalsSettings;
