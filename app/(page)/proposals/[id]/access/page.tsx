import { getRfpAccessAction } from "@/app/actions/rfpSharing";
import ProposalLoadRecovery from "@/components/proposals/ProposalLoadRecovery";
import RfpAccessPanel from "@/components/proposals/sharing/RfpAccessPanel";
import { ArrowLeft, BarChart3, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = { title: "RFP access | RFPilot" };

// Owner, team and sharing for one RFP (ORG-202, ORG-207, ORG-210).
export default async function RfpAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{24}$/i.test(id)) notFound();
  const result = await getRfpAccessAction(id);
  if (!result.success) {
    if (result.status === 404) notFound();
    if (result.status === 401) redirect(`/sign-in?${new URLSearchParams({ callbackUrl: `/proposals/${id}/access`, reason: "session-expired" })}`);
    return <ProposalLoadRecovery denied={result.status === 403} />;
  }
  const snapshot = result.data;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/proposals" className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-500 hover:text-[#008ad2]">
          <ArrowLeft size={14} aria-hidden="true" />Back to RFPs
        </Link>
        <header className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#008ad2]">Access</p>
          <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight text-slate-950 [overflow-wrap:anywhere]">{snapshot.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            See who owns this RFP, which team it belongs to, and who else can open it. Team managers see every RFP on their team.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/proposals/proposal-edit?proposalId=${encodeURIComponent(id)}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-800 hover:border-[#008ad2] hover:text-[#008ad2]">
              <Pencil size={14} aria-hidden="true" />Open RFP
            </Link>
            <Link href={`/proposals/${encodeURIComponent(id)}/intelligence`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-800 hover:border-[#008ad2] hover:text-[#008ad2]">
              <BarChart3 size={14} aria-hidden="true" />Vendor responses
            </Link>
          </div>
        </header>
        <div className="mt-5">
          <RfpAccessPanel proposalId={id} initial={snapshot} />
        </div>
      </div>
    </main>
  );
}
