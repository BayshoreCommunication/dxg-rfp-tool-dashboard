"use client";

import { RotateCcw, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import type { ProposalSettings, UploadsData } from "../AddNewProposal";
import { PillRadio } from "./shared";
import { uploadProposalFilesAction } from "@/app/actions/proposals";

/* ─── Upload Box ─── */
const UploadBox = ({
  files,
  onFiles,
  accept = ".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg",
  label = "Accept PDFs, PowerPoint, Docs, Images.",
  uploadField,
}: {
  files: Array<File | string>;
  onFiles: (files: Array<File | string>) => void;
  accept?: string;
  label?: string;
  uploadField: "supportDocuments" | "avQuoteFiles";
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const incoming = Array.from(e.target.files);
      // Deduplicate by name or URL end
      const existing = new Set(
        files.map((f) => {
          if (typeof f === "string") return f.split("/").pop() || f;
          return f.name;
        })
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
    }
  };

  const removeFile = (idx: number) => {
    onFiles(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="w-full rounded-xl border-2 border-dashed border-[#38bdf8] bg-white flex flex-col items-center pt-10 pb-8 px-4">
      {/* Cloud Icon */}
      <div className="mb-3">
        <svg width="84" height="64" viewBox="0 0 84 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M42 0C32.148 0 23.772 5.964 19.824 14.532C8.61 15.666 0 25.032 0 36.5714C0 49.1914 10.29 59.4286 23.1 59.4286H63C74.592 59.4286 84 50.02 84 38.4C84 27.2457 75.348 18.2857 65.436 17.5543C62.454 7.63429 53.088 0 42 0Z" fill="#7DD3FC"/>
          <path d="M42 22.8571L31.5 34.2857H37.8V45.7143H46.2V34.2857H52.5L42 22.8571Z" fill="white"/>
        </svg>
      </div>

      <p className="text-[17px] font-bold text-gray-800 mb-1">File Upload</p>
      <p className="text-[12px] text-gray-400 mb-6 font-medium">{label}</p>

      <label className={`cursor-pointer bg-[#35bdf2] hover:bg-[#20A4D5] text-white font-bold text-[13px] py-3 px-8 rounded transition-colors tracking-wide flex items-center justify-center gap-2 ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}>
        {isUploading && <Loader2 size={16} className="animate-spin" />}
        <span>{isUploading ? "UPLOADING..." : "BROWSE FILE"}</span>
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

      {/* File pills */}
      {files.length > 0 && (
        <div className="mt-5 w-full flex flex-wrap gap-2 justify-center">
          {files.map((f, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 bg-sky-50 text-[#1f2d5d] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#38bdf8] max-w-full"
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
  proposalSettings,
}: UploadsReferenceMaterialsProps) => {
  const handleClear = () => {
    onChange({
      supportDocuments: [],
      reviewExistingAvQuote: {
        reviewExistingAvQuote: "",
        avQuoteFiles: [],
      },
    });
  };

  return (
    <section
      className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white"
      style={{ fontFamily: `"${proposalSettings.branding.defaultFont}", var(--font-sans)` }}
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Uploads &amp; Reference Materials</h2>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-8 py-8 space-y-10">

        {/* Review AV Quote */}
        <div className={`p-4 -m-4 rounded-lg transition-colors ${showErrors && !data.reviewExistingAvQuote.reviewExistingAvQuote ? "bg-red-50" : ""}`}>
          <label className="mb-3 block text-sm font-bold text-[#1f2d5d] uppercase tracking-wide">
            Review an existing AV Quote? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3 mb-5">
            {(["YES", "NO"] as const).map((opt) => (
              <PillRadio
                key={opt}
                name="reviewExistingAvQuote"
                value={opt}
                checked={data.reviewExistingAvQuote.reviewExistingAvQuote === opt}
                onChange={() =>
                  onChange({
                    supportDocuments: [],
                    reviewExistingAvQuote: {
                      reviewExistingAvQuote: opt,
                      avQuoteFiles: opt === "NO" ? [] : data.reviewExistingAvQuote.avQuoteFiles,
                    },
                  })
                }
              />
            ))}
          </div>
          {showErrors && !data.reviewExistingAvQuote.reviewExistingAvQuote && (
            <p className="mt-2 text-sm text-red-500 normal-case">Please select an option.</p>
          )}

          {data.reviewExistingAvQuote.reviewExistingAvQuote === "YES" && (
            <div className={`mt-4 rounded-xl transition-all ${showErrors && data.reviewExistingAvQuote.avQuoteFiles.length === 0 ? "ring-2 ring-red-500 ring-offset-2 ring-offset-red-50" : ""}`}>
              <UploadBox
                files={data.reviewExistingAvQuote.avQuoteFiles}
                onFiles={(files) =>
                  onChange({ reviewExistingAvQuote: { ...data.reviewExistingAvQuote, avQuoteFiles: files } })
                }
                label="Required: Please upload your AV Quote"
                uploadField="avQuoteFiles"
              />
              {showErrors && data.reviewExistingAvQuote.avQuoteFiles.length === 0 && (
                <p className="mt-2 text-sm text-red-500 normal-case mb-2">Please upload at least one AV quote file.</p>
              )}
            </div>
          )}
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
            className="h-10 px-8 rounded-md bg-[#35bdf2] hover:bg-[#20A4D5] text-white text-sm font-bold shadow-[0_4px_14px_0_rgba(56,189,248,0.39)] transition-transform active:scale-95"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </section>
  );
};

export default UploadsReferenceMaterials;
