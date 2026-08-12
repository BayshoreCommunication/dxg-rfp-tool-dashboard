"use client";

import type { RfpProposalData } from "@/components/proposalTemplate/ProposalRfpTemplate";
import {
  downloadProposalPdf,
  proposalPdfFilename,
} from "@/lib/proposals/downloadProposalPdf";
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
    <div className="no-print fixed bottom-4 right-4 z-[99] flex flex-col items-stretch gap-2 md:bottom-6 md:right-6">
      <button
        type="button"
        onClick={() => void handleDirectDownload()}
        disabled={downloading}
        className="rounded-2xl bg-[#008ad2] px-6 py-2.5 text-sm font-bold text-white shadow-xl transition hover:bg-[#0079ba] disabled:cursor-wait disabled:opacity-60"
      >
        {downloading ? "Generating PDF..." : "Download PDF"}
      </button>
      <button
        type="button"
        onClick={handlePrint}
        disabled={downloading}
        className="rounded-2xl border border-slate-200 bg-white/90 px-6 py-2.5 text-sm font-bold text-slate-800 shadow-xl backdrop-blur-md transition hover:bg-white disabled:opacity-60"
      >
        Print
      </button>
    </div>
  );
}
