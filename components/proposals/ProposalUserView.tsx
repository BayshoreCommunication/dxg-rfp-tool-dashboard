"use client";

import { getProposalByIdAction } from "@/app/actions/proposals";
import ProposalRfpTemplate, {
  type RfpProposalData,
} from "@/components/proposalTemplate/ProposalRfpTemplate";
import { useEffect, useMemo, useState } from "react";

const extractObjectId = (slugOrId?: string | null) => {
  if (!slugOrId || typeof slugOrId !== "string") return "";
  const match = slugOrId.match(/[a-fA-F0-9]{24}/);
  return match?.[0] || "";
};

const resolveDownloadPreview = (proposal: RfpProposalData): boolean => {
  const snap = (proposal as { proposalSetting?: { proposals?: { downloadPreview?: string } } }).proposalSetting;
  return (snap?.proposals?.downloadPreview ?? "Yes") !== "No";
};

export default function ProposalUserView({
  slug,
  source,
}: {
  slug?: string;
  source?: string;
}) {
  const [proposal, setProposal] = useState<RfpProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const isPublicAccess = source === "email" || source === "public";

  const proposalId = useMemo(() => extractObjectId(slug), [slug]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!proposalId) {
        if (!mounted) return;
        setError("Invalid proposal link.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      const res = await getProposalByIdAction(proposalId);
      if (!mounted) return;
      if (!res.success || !res.data || typeof res.data !== "object") {
        setError(res.message || "Proposal not found.");
        setProposal(null);
        setLoading(false);
        return;
      }
      setProposal(res.data as RfpProposalData);
      setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [proposalId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="h-12 w-60 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-[420px] animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <h2 className="text-lg font-bold">Unable to load proposal</h2>
          <p className="mt-2 text-sm">{error || "Proposal not found."}</p>
        </div>
      </div>
    );
  }

  const isLiveProposal =
    (proposal as { status?: string; isActive?: boolean }).status === "submitted" &&
    (proposal as { isActive?: boolean }).isActive !== false;

  if (isPublicAccess && !isLiveProposal) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-lg font-bold">Proposal is not available</h2>
          <p className="mt-2 text-sm">
            This public proposal link is only available while the proposal is live.
          </p>
        </div>
      </div>
    );
  }

  const handleDownloadProposal = () => {
    if (downloading) return;
    setDownloading(true);

    const originalTitle = document.title;
    const printableTitle =
      proposal.event?.eventName?.trim() ||
      proposal.contact?.contactOrganization?.trim() ||
      "proposal";
    document.title = `${printableTitle}-rfp`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try { window.print(); }
        finally {
          document.title = originalTitle;
          setDownloading(false);
        }
      });
    });
  };

  const canDownload = resolveDownloadPreview(proposal);

  return (
    <div>
      {canDownload && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[99] no-print">
          <button
            type="button"
            onClick={handleDownloadProposal}
            disabled={downloading}
            className="rounded-2xl border border-slate-200 bg-white/90 px-6 py-2.5 text-sm font-bold text-slate-800 shadow-xl backdrop-blur-md disabled:opacity-60 hover:bg-white transition"
          >
            {downloading ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
      )}
      <ProposalRfpTemplate proposal={proposal} />
    </div>
  );
}
