"use client";

import { FileText, X } from "lucide-react";
import React from "react";

type AddProposalUploadProps = {
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  isExtracting?: boolean;
  onContinueWithUpload: () => void;
  onContinueWithoutUpload: () => void;
};

export default function AddProposalUpload({
  selectedFile,
  setSelectedFile,
  isExtracting = false,
  onContinueWithUpload,
  onContinueWithoutUpload,
}: AddProposalUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="mt-10 flex justify-center pb-16">
      <div className="w-full">
        <div className="mb-5 w-full rounded-xl border border-sky-100 bg-sky-50 px-4 py-4">
          <p className="text-sm font-semibold text-slate-800">Quick guide</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Upload a file if you want us to prefill the proposal for you. If you
            do not have a file ready, just continue without upload and fill in
            the details manually.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              Upload a file to start
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Upload is optional. You can also continue without a file.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/40 px-6 py-24 text-center">
            <p className="text-sm font-semibold text-slate-700">
              PDF, DOC, DOCX, CSV
            </p>
            <label className="mt-5 inline-flex cursor-pointer rounded-xl bg-[#35bdf2] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#20A4D5]">
              Browse File
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.csv"
              />
            </label>
          </div>

          {selectedFile && (
            <div className="mx-auto mt-6 flex w-full max-w-xl items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                title="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-3">
            {selectedFile ? (
              <button
                type="button"
                onClick={onContinueWithUpload}
                disabled={isExtracting}
                className="mx-auto w-full max-w-[200px] rounded-xl bg-[#35bdf2] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#20A4D5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExtracting ? "Reading document..." : "Continue"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onContinueWithoutUpload}
                className="mx-auto w-full max-w-[200px] rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 "
              >
                Continue without upload
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
