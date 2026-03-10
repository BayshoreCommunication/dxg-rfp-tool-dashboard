"use client";

import { RotateCcw } from "lucide-react";
import { useRef } from "react";
import { ProposalData } from "../AddNewProposal";

/* ─── Pill Radio ─── */
const PillRadio = ({
  name,
  value,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label
    className={`flex items-center gap-2 px-5 py-2 rounded-full border-2 cursor-pointer text-sm font-semibold transition-all select-none ${
      checked
        ? "border-[#35bdf2] bg-white text-[#1f2d5d]"
        : "border-[#d7dce3] bg-white text-[#8f98bf] hover:border-[#35bdf2]/60"
    }`}
  >
    <span
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        checked ? "border-[#35bdf2]" : "border-[#d7dce3]"
      }`}
    >
      {checked && <span className="w-2 h-2 rounded-full bg-[#35bdf2]" />}
    </span>
    <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
    {value}
  </label>
);

/* ─── Upload Box ─── */
const UploadBox = ({
  files,
  onFiles,
  accept = ".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg",
  label = "Accept PDFs, PowerPoint, Docs, Images.",
}: {
  files: File[];
  onFiles: (files: File[]) => void;
  accept?: string;
  label?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFiles([...files, ...Array.from(e.target.files)]);
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

      <label className="cursor-pointer bg-[#35bdf2] hover:bg-[#20A4D5] text-white font-bold text-[13px] py-3 px-8 rounded transition-colors tracking-wide">
        <span>BROWSE FILE</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
      </label>

      {/* File pills */}
      {files.length > 0 && (
        <div className="mt-5 w-full flex flex-wrap gap-2 justify-center">
          {files.map((f, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 bg-sky-50 text-[#1f2d5d] text-xs font-semibold px-3 py-1.5 rounded-full border border-[#38bdf8]"
            >
              {f.name}
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
  data: ProposalData;
  onChange: (updates: Partial<ProposalData>) => void;
  onContinue: () => void;
  onBack: () => void;
}

const UploadsReferenceMaterials = ({
  data,
  onChange,
  onContinue,
  onBack,
}: UploadsReferenceMaterialsProps) => {
  const handleClear = () => {
    onChange({
      supportDocuments: [],
      reviewExistingAvQuote: "",
      avQuoteFiles: [],
    });
  };

  return (
    <section className="flex flex-col min-h-screen rounded-md border border-[#d7dce3] bg-white">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#d7dce3]">
        <h2 className="text-[22px] font-bold text-[#0f1b57]">Uploads &amp; Reference Materials</h2>
      </div>

      {/* Form Body */}
      <div className="flex-1 px-8 py-8 space-y-10">

        {/* Support Documents Upload */}
        <div>
          <label className="mb-4 block text-sm font-bold text-[#1f2d5d] uppercase tracking-wide">
            Upload any support documents
          </label>
          <UploadBox
            files={data.supportDocuments}
            onFiles={(files) => onChange({ supportDocuments: files })}
          />
        </div>

        {/* Review AV Quote */}
        <div>
          <label className="mb-3 block text-sm font-bold text-[#1f2d5d] uppercase tracking-wide">
            Review an existing AV Quote?
          </label>
          <div className="flex gap-3 mb-5">
            {(["YES", "NO"] as const).map((opt) => (
              <PillRadio
                key={opt}
                name="reviewExistingAvQuote"
                value={opt}
                checked={data.reviewExistingAvQuote === opt}
                onChange={() => onChange({ reviewExistingAvQuote: opt, avQuoteFiles: opt === "NO" ? [] : data.avQuoteFiles })}
              />
            ))}
          </div>

          {data.reviewExistingAvQuote === "YES" && (
            <UploadBox
              files={data.avQuoteFiles}
              onFiles={(files) => onChange({ avQuoteFiles: files })}
            />
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