"use client";

import { FileText, X } from "lucide-react";
import React from "react";

export default function AddProposalUpload({
  selectedFile,
  setSelectedFile,
}: {
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full mt-10 space-y-8 pb-20">
      {/* Top Header Text */}
      <h2 className="text-[13px] font-bold text-gray-500 tracking-wide text-center uppercase">
        *EASILY UPLOAD YOUR DOCUMENT AND HAVE OUR AI ACCURATELY FILL OUT YOUR FORM FOR YOU.*
      </h2>

      {/* Upload Box */}
      <div className="w-full max-w-6xl border-[1.5px] border-dashed border-[#38bdf8] rounded-2xl bg-slate-50/30 flex flex-col items-center pt-16 pb-12 px-4 shadow-sm">
        {/* Cloud Icon SVG */}
        <div className="relative mb-4">
          <svg width="100" height="70" viewBox="0 0 84 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M42 0C32.148 0 23.772 5.964 19.824 14.532C8.61 15.666 0 25.032 0 36.5714C0 49.1914 10.29 59.4286 23.1 59.4286H63C74.592 59.4286 84 50.02 84 38.4C84 27.2457 75.348 18.2857 65.436 17.5543C62.454 7.63429 53.088 0 42 0Z" fill="#7DD3FC"/>
            <path d="M42 22.8571L31.5 34.2857H37.8V45.7143H46.2V34.2857H52.5L42 22.8571Z" fill="white"/>
          </svg>
        </div>

        <h3 className="text-[20px] font-bold text-gray-800 mb-1">File Upload</h3>
        <p className="text-[13px] text-gray-400 mb-8 font-medium">
          Accept PDFs, Docs, CSV.
        </p>

        <label className="cursor-pointer bg-[#35bdf2] hover:bg-[#20A4D5] text-white font-bold text-[13px] py-3.5 px-8 rounded flex items-center justify-center transition-colors tracking-wide">
          <span>BROWSE FILE</span>
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.csv"
          />
        </label>

        {/* Selected file pill — shown after picking a file */}
        {/* {selectedFile && (
          <div className="mt-6 flex items-center gap-2 bg-sky-50 border border-[#38bdf8] rounded-full px-4 py-2 text-sm text-[#1f2d5d] font-semibold">
            <FileText size={15} className="text-[#35bdf2] flex-shrink-0" />
            <span className="max-w-xs truncate">{selectedFile.name}</span>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="ml-1 text-gray-400 hover:text-red-400 transition-colors"
              aria-label="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        )} */}
      </div>
    </div>
  );
}