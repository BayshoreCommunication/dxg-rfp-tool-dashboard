"use client";

import { Download, Printer } from "lucide-react";

/** Floating actions on the printable vendor response, matching the proposal
 *  document view. Hidden from print and from the generated PDF. */
export default function VendorResponseDocumentToolbar({ pdfHref }: { pdfHref: string }) {
  return (
    <div className="no-print fixed bottom-6 right-6 z-50 flex flex-col items-stretch gap-2">
      <a
        href={pdfHref}
        download
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0075b4] px-5 text-sm font-bold text-white shadow-[0_10px_25px_-12px_rgba(0,90,140,0.9)] hover:bg-[#00649a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008ad2]/30"
      >
        <Download size={16} aria-hidden="true" /> Download PDF
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 shadow-[0_10px_25px_-14px_rgba(15,23,42,0.5)] hover:border-[#008ad2] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#008ad2]/25"
      >
        <Printer size={16} aria-hidden="true" /> Print
      </button>
    </div>
  );
}
