"use client";

import { ChevronDown } from "lucide-react";
import type { ProposalsSettingsForm } from "./SettingsDetials";

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

type ProposalsSettingsProps = {
  value: ProposalsSettingsForm;
  onChange: (next: ProposalsSettingsForm) => void;
};

const ProposalsSettings = ({ value, onChange }: ProposalsSettingsProps) => {
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
              value={value.proposalLanguage}
              onChange={(e) =>
                onChange({ ...value, proposalLanguage: e.target.value })
              }
              className={selectClass}
            >
              <option>English</option>
              {/* <option>Spanish</option>
              <option>French</option> */}
            </select>
            <SelectCaret />
          </div>
        </div>

        <div>
          <label htmlFor="defaultCurrency" className={labelClass}>
            Default Currency
          </label>
          <input
            id="defaultCurrency"
            value={value.defaultCurrency}
            onChange={(e) =>
              onChange({ ...value, defaultCurrency: e.target.value })
            }
            className={inputClass}
          />
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
            <select
              id="expiryDate"
              value={value.expiryDate}
              onChange={(e) =>
                onChange({ ...value, expiryDate: e.target.value })
              }
              className={selectClass}
            >
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
              value={value.priceSeparator}
              onChange={(e) =>
                onChange({ ...value, priceSeparator: e.target.value })
              }
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
              value={value.dateFormat}
              onChange={(e) =>
                onChange({ ...value, dateFormat: e.target.value })
              }
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
              value={value.decimalPrecision}
              onChange={(e) =>
                onChange({ ...value, decimalPrecision: e.target.value })
              }
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
                  checked={value.contacts.email.enabled}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      contacts: {
                        ...value.contacts,
                        email: {
                          ...value.contacts.email,
                          enabled: e.target.checked,
                        },
                      },
                    })
                  }
                  className="h-3.5 w-3.5 rounded border-[#cfd4dd] text-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30"
                />
                Email
              </label>
              <input
                className={inputClass + " bg-white"}
                value={value.contacts.email.value}
                onChange={(e) =>
                  onChange({
                    ...value,
                    contacts: {
                      ...value.contacts,
                      email: {
                        ...value.contacts.email,
                        value: e.target.value,
                      },
                    },
                  })
                }
                disabled={!value.contacts.email.enabled}
              />
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-medium text-[#8f98bf]">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value.contacts.call.enabled}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        contacts: {
                          ...value.contacts,
                          call: {
                            ...value.contacts.call,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="h-3.5 w-3.5 rounded border-[#cfd4dd] text-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30"
                  />
                  Call
                </span>
                <InfoDot />
              </label>
              <input
                className={inputClass + " bg-white"}
                value={value.contacts.call.value}
                onChange={(e) =>
                  onChange({
                    ...value,
                    contacts: {
                      ...value.contacts,
                      call: {
                        ...value.contacts.call,
                        value: e.target.value,
                      },
                    },
                  })
                }
                disabled={!value.contacts.call.enabled}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="downloadPreview" className={labelClass}>
              Enable Download In Preview
            </label>
            <div className="relative">
              <select
                id="downloadPreview"
                value={value.downloadPreview}
                onChange={(e) =>
                  onChange({ ...value, downloadPreview: e.target.value })
                }
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
                value={value.teammateEmail}
                onChange={(e) =>
                  onChange({ ...value, teammateEmail: e.target.value })
                }
              />
              <button
                type="button"
                className="w-11 border-l border-[#d7dce3] text-xs font-semibold text-[#6366f1] hover:bg-[#f2f4f8]"
              >
                Add
              </button>
            </div>
          </div>

         
        </div>
      </div>
    </section>
  );
};

export default ProposalsSettings;
