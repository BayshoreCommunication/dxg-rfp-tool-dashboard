"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import type { ProposalSettings, UploadsData } from "../AddNewProposal";
import { InfoTooltip } from "./shared";
import { uploadProposalFilesAction } from "@/app/actions/proposals";

/* ─── Style constants ─── */
const labelClass =
  "mb-2 flex items-center gap-1 text-sm font-bold text-[#1f2d5d] uppercase tracking-wide";
const inputClass =
  "w-full rounded-lg border border-[#d7dce3] bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#35bdf2] focus:outline-none focus:ring-2 focus:ring-[#35bdf2]/20";
const groupLabelClass =
  "mb-4 text-xs font-bold uppercase tracking-widest text-[#8f98bf]";
const subPanelClass =
  "mt-3 rounded-xl border border-[#e0e7ff] bg-[#f5f7ff] p-4";
const errorClass = "mt-1 text-sm text-red-500 normal-case";

/* ─── Tailwind-safe YES/NO buttons ─── */
const yesNoCls = (opt: "YES" | "NO", value: string): string => {
  const base =
    "flex h-10 min-w-[72px] cursor-pointer items-center justify-center rounded-md border px-5 text-sm font-semibold transition-all";
  if (value !== opt)
    return `${base} border-[#d7dce3] bg-white text-[#8f98bf] hover:border-slate-300`;
  if (opt === "YES") return `${base} border-emerald-400 bg-emerald-50 text-emerald-700`;
  return `${base} border-rose-400 bg-rose-50 text-rose-700`;
};

const YesNo = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "YES" | "NO") => void;
}) => (
  <div className="flex gap-3">
    <button type="button" className={yesNoCls("YES", value)} onClick={() => onChange("YES")}>
      ✓ Yes
    </button>
    <button type="button" className={yesNoCls("NO", value)} onClick={() => onChange("NO")}>
      ✗ No
    </button>
  </div>
);

const Group = ({ label }: { label: string }) => (
  <div className="mb-5 mt-8 border-t border-[#e8edf5] pt-6 first:mt-0 first:border-0 first:pt-0">
    <p className={groupLabelClass}>{label}</p>
  </div>
);

/* ─── Upload Box ─── */
const UploadBox = ({
  files,
  onFiles,
  accept = ".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg",
  label = "Accepts PDFs, PowerPoint, Docs, Images",
  uploadField,
  hasError,
}: {
  files: Array<File | string>;
  onFiles: (files: Array<File | string>) => void;
  accept?: string;
  label?: string;
  uploadField: "supportDocuments" | "avQuoteFiles";
  hasError?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const incoming = Array.from(e.target.files);
    const existing = new Set(
      files.map((f) =>
        typeof f === "string" ? f.split("/").pop() || f : f.name
      )
    );
    const unique = incoming.filter((f) => !existing.has(f.name));
    if (unique.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    unique.forEach((f) => formData.append(uploadField, f));
    try {
      const res = await uploadProposalFilesAction(formData);
      if (res.success) {
        const urls =
          uploadField === "supportDocuments"
            ? res.supportDocumentUrls
            : res.avQuoteFileUrls;
        onFiles([...files, ...urls]);
      } else {
        alert(res.message || "Failed to upload files");
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (idx: number) => {
    onFiles(files.filter((_, i) => i !== idx));
  };

  return (
    <div
      className={`w-full rounded-xl border-2 border-dashed flex flex-col items-center pt-8 pb-6 px-4 transition-colors ${
        hasError ? "border-red-400 bg-red-50/20" : "border-[#38bdf8] bg-white"
      }`}
    >
      {/* Cloud icon */}
      <div className="mb-3">
        <svg width="64" height="48" viewBox="0 0 84 64" fill="none">
          <path
            d="M42 0C32.148 0 23.772 5.964 19.824 14.532C8.61 15.666 0 25.032 0 36.5714C0 49.1914 10.29 59.4286 23.1 59.4286H63C74.592 59.4286 84 50.02 84 38.4C84 27.2457 75.348 18.2857 65.436 17.5543C62.454 7.63429 53.088 0 42 0Z"
            fill="#7DD3FC"
          />
          <path d="M42 22.8571L31.5 34.2857H37.8V45.7143H46.2V34.2857H52.5L42 22.8571Z" fill="white" />
        </svg>
      </div>
      <p className="text-sm font-bold text-[#1f2d5d] mb-1">Drag &amp; drop or browse</p>
      <p className="text-xs text-[#8f98bf] mb-5 font-medium">{label}</p>
      <label
        className={`cursor-pointer rounded-lg bg-[#35bdf2] hover:bg-[#20a9de] text-white font-bold text-xs py-2.5 px-7 tracking-wide flex items-center gap-2 transition-colors ${
          isUploading ? "opacity-70 pointer-events-none" : ""
        }`}
      >
        {isUploading && <Loader2 size={14} className="animate-spin" />}
        <span>{isUploading ? "UPLOADING…" : "BROWSE FILES"}</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={handleChange}
          disabled={isUploading}
        />
      </label>

      {files.length > 0 && (
        <div className="mt-5 w-full flex flex-wrap gap-2 justify-center">
          {files.map((f, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 bg-sky-50 text-[#1f2d5d] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#38bdf8]"
            >
              <span className="truncate max-w-[200px]">
                {typeof f === "string" ? f.split("/").pop() || f : f.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-gray-400 hover:text-red-400 ml-1 leading-none"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Props ─── */
interface UploadsReferenceMaterialsProps {
  data: UploadsData;
  onChange: (updates: Partial<UploadsData>) => void;
  onContinue: () => void;
  onBack: () => void;
  showErrors?: boolean;
  proposalSettings: ProposalSettings;
}

const UploadsReferenceMaterials = ({
  data,
  onChange,
  onContinue,
  onBack,
  showErrors = false,
}: UploadsReferenceMaterialsProps) => {
  /* Guard legacy data */
  const safeData: UploadsData = {
    supportDocuments: [],
    reviewExistingAvQuote: { reviewExistingAvQuote: "", avQuoteFiles: [] },
    hasCoVendors: "",
    coVendorDetails: "",
    vendorConflicts: "",
    vendorConflictDetails: "",
    ...data,
    reviewExistingAvQuote: {
      reviewExistingAvQuote: "",
      avQuoteFiles: [],
      ...data?.reviewExistingAvQuote,
    },
  };

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white">
      {/* ── Header ── */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <div className="flex items-center gap-3 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#35bdf2]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#35bdf2]">
            Page 8 of 9
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Uploads &amp; Co-Vendors</h2>
        <p className="mt-1 text-sm text-[#8f98bf]">Reference files, existing quotes, and partner vendors</p>
      </div>

      {/* ── Form Body ── */}
      <div className="flex-1 px-8 py-8">

        {/* ══════ GROUP: REFERENCE MATERIALS ══════ */}
        <Group label="Reference Materials" />

        <div className="mb-6">
          <label className={labelClass}>
            Support Documents
            <InfoTooltip text="Upload any reference materials — run of show, stage plots, floor plans, scripts, brand guides, or previous event bibles." />
          </label>
          <UploadBox
            files={safeData.supportDocuments}
            onFiles={(files) => onChange({ supportDocuments: files })}
            label="Run of show, floor plans, scripts, brand guides…"
            uploadField="supportDocuments"
          />
        </div>

        {/* ══════ GROUP: EXISTING AV QUOTE ══════ */}
        <Group label="Existing AV Quote" />

        <div className="mb-6">
          <label className={labelClass}>
            Review an existing AV quote? <span className="text-red-500">*</span>
            <InfoTooltip text="Upload a previous AV quote so our team can review, match, or improve upon the current pricing and scope." />
          </label>
          <YesNo
            value={safeData.reviewExistingAvQuote.reviewExistingAvQuote}
            onChange={(v) =>
              onChange({
                reviewExistingAvQuote: {
                  reviewExistingAvQuote: v,
                  avQuoteFiles: v === "NO" ? [] : safeData.reviewExistingAvQuote.avQuoteFiles,
                },
              })
            }
          />
          {showErrors && !safeData.reviewExistingAvQuote.reviewExistingAvQuote && (
            <p className={errorClass}>Please indicate whether you have an existing AV quote.</p>
          )}

          {safeData.reviewExistingAvQuote.reviewExistingAvQuote === "YES" && (
            <div className="mt-4">
              <UploadBox
                files={safeData.reviewExistingAvQuote.avQuoteFiles}
                onFiles={(files) =>
                  onChange({
                    reviewExistingAvQuote: {
                      ...safeData.reviewExistingAvQuote,
                      avQuoteFiles: files,
                    },
                  })
                }
                label="Upload your existing AV quote (PDF, Excel, etc.)"
                accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
                uploadField="avQuoteFiles"
                hasError={showErrors && safeData.reviewExistingAvQuote.avQuoteFiles.length === 0}
              />
              {showErrors && safeData.reviewExistingAvQuote.avQuoteFiles.length === 0 && (
                <p className={errorClass}>Please upload at least one AV quote file.</p>
              )}
            </div>
          )}
        </div>

        {/* ══════ GROUP: CO-VENDORS & PARTNERS ══════ */}
        <Group label="Co-Vendors & Partners" />

        {/* Working with co-vendors? */}
        <div className="mb-6">
          <label className={labelClass}>
            Working with co-vendors on this event?
            <InfoTooltip text="Are other vendors (lighting companies, staging, floral, décor, etc.) already contracted for this event? Helps us coordinate scope and avoid overlaps." />
          </label>
          <YesNo
            value={safeData.hasCoVendors}
            onChange={(v) =>
              onChange({ hasCoVendors: v, coVendorDetails: v === "NO" ? "" : safeData.coVendorDetails })
            }
          />
          {safeData.hasCoVendors === "YES" && (
            <div className={subPanelClass}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8f98bf]">
                Co-Vendor Details
              </p>
              <textarea
                rows={4}
                value={safeData.coVendorDetails}
                onChange={(e) => onChange({ coVendorDetails: e.target.value })}
                placeholder="List vendor name, service type, and contact (e.g. ABC Lighting – Stage Wash, contact@abclighting.com)"
                className={`${inputClass} resize-none`}
              />
            </div>
          )}
        </div>

        {/* Vendor conflicts or exclusions? */}
        <div className="mb-6">
          <label className={labelClass}>
            Any vendor conflicts or exclusions?
            <InfoTooltip text="Vendors you cannot work with — e.g. in-house exclusivities, competitive conflicts, or past issues. We'll keep this confidential." />
          </label>
          <YesNo
            value={safeData.vendorConflicts}
            onChange={(v) =>
              onChange({
                vendorConflicts: v,
                vendorConflictDetails: v === "NO" ? "" : safeData.vendorConflictDetails,
              })
            }
          />
          {safeData.vendorConflicts === "YES" && (
            <div className={subPanelClass}>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8f98bf]">
                Conflict / Exclusion Details
              </p>
              <textarea
                rows={3}
                value={safeData.vendorConflictDetails}
                onChange={(e) => onChange({ vendorConflictDetails: e.target.value })}
                placeholder="Describe the conflict or list excluded vendors…"
                className={`${inputClass} resize-none`}
              />
            </div>
          )}
        </div>

      </div>

      {/* ── Footer Nav ── */}
      <div className="flex items-center justify-between px-8 py-5 border-t border-[#d7dce3]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-[#d7dce3] px-5 py-2.5 text-sm font-semibold text-[#1f2d5d] hover:bg-[#f5f7ff] transition-colors"
        >
          ← Budget &amp; Proposal
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex items-center gap-2 rounded-lg bg-[#35bdf2] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(53,189,242,0.35)] hover:bg-[#20a9de] transition-colors active:scale-95"
        >
          Contact &amp; Submit →
        </button>
      </div>
    </section>
  );
};

export default UploadsReferenceMaterials;
