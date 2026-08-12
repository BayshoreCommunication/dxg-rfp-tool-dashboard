"use client";

import { getProposalByIdAction } from "@/app/actions/proposals";
import ProposalRfpTemplate, {
  type RfpProposalData,
} from "@/components/proposalTemplate/ProposalRfpTemplate";
import ProposalExportActions from "@/components/proposals/ProposalExportActions";
import { useEffect, useMemo, useRef, useState } from "react";

const extractObjectId = (slugOrId?: string | null) => {
  if (!slugOrId || typeof slugOrId !== "string") return "";
  const match = slugOrId.match(/[a-fA-F0-9]{24}/);
  return match?.[0] || "";
};

const resolveDownloadPreview = (proposal: RfpProposalData): boolean => {
  const snap = (
    proposal as {
      proposalSetting?: { proposals?: { downloadPreview?: string } };
    }
  ).proposalSetting;
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
  const [error, setError] = useState("");
  const proposalDocumentRef = useRef<HTMLDivElement>(null);
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
    return () => {
      mounted = false;
    };
  }, [proposalId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {/* Top action bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-5 w-48 animate-pulse rounded-lg bg-slate-200" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-9 w-32 animate-pulse rounded-xl bg-[#008ad2]/20" />
          </div>
        </div>
        {/* Page 1 skeleton */}
        <div className="mx-auto w-full max-w-[900px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div
            className="h-[140px] animate-pulse"
            style={{
              background:
                "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)",
            }}
          >
            <div className="flex h-full flex-col items-center justify-center gap-3 px-10">
              <div className="h-5 w-48 rounded-lg bg-white/20" />
              <div className="h-8 w-80 rounded-xl bg-white/20" />
              <div className="h-4 w-56 rounded-lg bg-white/20" />
            </div>
          </div>
          <div className="space-y-4 p-8">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-5 w-40 animate-pulse rounded-lg bg-slate-100" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-5 w-40 animate-pulse rounded-lg bg-slate-100" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-5 w-40 animate-pulse rounded-lg bg-slate-100" />
              </div>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="space-y-2">
              <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-4/6 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
        {/* Page 2 skeleton (partial) */}
        <div className="mx-auto mt-4 w-full max-w-[900px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div
            className="h-2 w-full"
            style={{ background: "linear-gradient(90deg, #2fc6f5, #008ad2)" }}
          />
          <div className="space-y-3 p-8">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
        </div>
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
    (proposal as { status?: string; isActive?: boolean }).status ===
      "submitted" && (proposal as { isActive?: boolean }).isActive !== false;

  if (isPublicAccess && !isLiveProposal) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-lg font-bold">Proposal is not available</h2>
          <p className="mt-2 text-sm">
            This public proposal link is only available while the proposal is
            live.
          </p>
        </div>
      </div>
    );
  }

  const canDownload = resolveDownloadPreview(proposal);

  return (
    <div ref={proposalDocumentRef}>
      {canDownload && <ProposalExportActions proposal={proposal} containerRef={proposalDocumentRef} />}
      <ProposalRfpTemplate proposal={proposal} />
    </div>
  );
}
