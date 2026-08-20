"use client";

import type { RfpProposalData } from "@/components/proposalTemplate/ProposalRfpTemplate";
import { proposalPdfFilename } from "@/lib/proposals/downloadProposalPdf";
import { Download, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

export default function ProposalExportActions({
  proposal,
}: {
  proposal: RfpProposalData;
}) {
  const [downloading, setDownloading] = useState(false);
  const title =
    proposal.event?.eventName?.trim() ||
    proposal.contact?.contactOrganization?.trim() ||
    "proposal";

  const handleDirectDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const filename = proposalPdfFilename(title);
      const params = new URLSearchParams({
        path: `${window.location.pathname}${window.location.search}`,
        filename,
      });
      const response = await fetch(`/api/proposal-pdf?${params.toString()}`, {
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(`PDF generation failed with status ${response.status}`);
      }

      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Proposal PDF download failed:", error);
      toast.error("PDF could not be generated. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `${title}-rfp`;
    try {
      window.print();
    } finally {
      document.title = originalTitle;
    }
  };

  return (
    <div className="no-print sticky top-0 z-[99] flex w-full items-stretch gap-2 border-b border-slate-200 bg-slate-100/95 p-2 backdrop-blur-md md:fixed md:bottom-6 md:right-6 md:top-auto md:w-[168px] md:flex-col md:gap-2.5 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
      <button
        type="button"
        onClick={() => void handleDirectDownload()}
        disabled={downloading}
        className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#007fc2] bg-[#008ad2] px-3 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(0,138,210,0.8)] transition hover:-translate-y-0.5 hover:border-[#006fa9] hover:bg-[#0079ba] hover:shadow-[0_14px_28px_-10px_rgba(0,138,210,0.85)] active:translate-y-0 disabled:cursor-wait disabled:opacity-60 md:w-full md:flex-none md:rounded-2xl md:px-5"
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">
          {downloading ? "Generating PDF..." : "Download PDF"}
        </span>
      </button>
      <button
        type="button"
        onClick={handlePrint}
        disabled={downloading}
        className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-sm font-bold text-slate-700 shadow-[0_10px_24px_-12px_rgba(15,23,42,0.38)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-[#008ad2]/30 hover:bg-white hover:text-[#0079ba] hover:shadow-[0_14px_28px_-12px_rgba(15,23,42,0.42)] active:translate-y-0 disabled:opacity-60 md:w-full md:flex-none md:rounded-2xl md:px-5"
      >
        <Printer className="h-4 w-4 shrink-0" aria-hidden />
        <span>Print</span>
      </button>
    </div>
  );
}
