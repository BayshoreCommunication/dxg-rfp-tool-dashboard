import { getProposalByIdAction } from "@/app/actions/proposals";
import { getVendorResponsesAction, type VendorResponseItem } from "@/app/actions/vendorResponse";
import { ArrowLeft, FileText, History } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export default async function IntelligenceSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{24}$/i.test(id)) notFound();
  const [proposal, responseResult] = await Promise.all([getProposalByIdAction(id), getVendorResponsesAction({ proposalId: id, page: 1, limit: 100 })]);
  if (!proposal.success || !record(proposal.data)) notFound();
  const responses = Array.isArray(responseResult?.data) ? responseResult.data as VendorResponseItem[] : [];
  return <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
    <Link href={`/proposals/${id}/intelligence`} className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-500 hover:text-[#008ad2]"><ArrowLeft size={14} />Proposal intelligence home</Link>
    <header className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#008ad2]">Proposal intelligence</p><h1 className="mt-2 text-3xl font-extrabold text-slate-950">Submission versions</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Open each vendor&apos;s immutable response timeline, extraction status, cited requirement facts, and evaluation resources.</p></header>
    {responses.length ? <section className="mt-5 grid gap-3 sm:grid-cols-2">{responses.map((response) => <Link key={response._id} href={`/vendor-responses/${response._id}`} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-[#008ad2]"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-[#008ad2]"><FileText size={19} /></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-700">{response.currentVersionNumber ? `Version ${response.currentVersionNumber}` : "Legacy response"}</span></div><h2 className="mt-4 font-extrabold text-slate-950">{response.vendorName}</h2><p className="mt-1 text-xs text-slate-500">Received {new Date(response.versionReceivedAt ?? response.createdAt).toLocaleString()}</p><p className="mt-3 inline-flex items-center gap-2 text-xs font-extrabold text-[#0077b6]"><History size={13} />Open response history</p></Link>)}</section> : <section className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><FileText className="mx-auto text-slate-400" size={30} /><h2 className="mt-3 font-extrabold text-slate-900">No vendor responses yet</h2><p className="mt-1 text-sm text-slate-500">Responses submitted to this proposal will appear here.</p></section>}
  </div></main>;
}
