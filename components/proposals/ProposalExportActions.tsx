"use client";

import type { RfpProposalData } from "@/components/proposalTemplate/ProposalRfpTemplate";
import {
  downloadProposalPdf,
  proposalPdfFilename,
} from "@/lib/proposals/downloadProposalPdf";
import { Download, Printer } from "lucide-react";
import type { RefObject } from "react";
import { useState } from "react";
import { toast } from "react-toastify";

export default function ProposalExportActions({
  proposal,
  containerRef,
}: {
  proposal: RfpProposalData;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const [downloading, setDownloading] = useState(false);
  const title =
    proposal.event?.eventName?.trim() ||
    proposal.contact?.contactOrganization?.trim() ||
    "proposal";

  const handleDirectDownload = async () => {
    if (downloading || !containerRef.current) return;
    setDownloading(true);
    try {
      await downloadProposalPdf(
        containerRef.current,
        proposalPdfFilename(title),
      );
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
    <div className="no-print fixed bottom-4 right-4 z-[99] flex w-[168px] flex-col items-stretch gap-2.5 md:bottom-6 md:right-6">
      <button
        type="button"
        onClick={() => void handleDirectDownload()}
        disabled={downloading}
        className="inline-flex h-11 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl border border-[#007fc2] bg-[#008ad2] !px-5 !py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(0,138,210,0.8)] transition hover:-translate-y-0.5 hover:border-[#006fa9] hover:bg-[#0079ba] hover:shadow-[0_14px_28px_-10px_rgba(0,138,210,0.85)] active:translate-y-0 disabled:cursor-wait disabled:opacity-60"
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
        className="inline-flex h-11 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl border border-slate-200 bg-white/95 !px-5 !py-2.5 text-sm font-bold text-slate-700 shadow-[0_10px_24px_-12px_rgba(15,23,42,0.38)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-[#008ad2]/30 hover:bg-white hover:text-[#0079ba] hover:shadow-[0_14px_28px_-12px_rgba(15,23,42,0.42)] active:translate-y-0 disabled:opacity-60"
      >
        <Printer className="h-4 w-4 shrink-0" aria-hidden />
        <span>Print</span>
      </button>
    </div>
  );
}
