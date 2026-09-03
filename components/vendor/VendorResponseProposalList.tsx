import type {
  VendorResponseProposalList as ProposalListData,
  VendorResponseProposalSummary,
} from "@/app/actions/vendorResponse";
import {
  ArrowRight,
  CalendarDays,
  Inbox,
  MailOpen,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

type Props = {
  data: ProposalListData | null;
  errorMessage?: string;
  search: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const pageHref = (page: number, search: string) => {
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("search", search);
  return `/vendor-responses?${params.toString()}`;
};

function ProposalCard({ proposal }: { proposal: VendorResponseProposalSummary }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#008ad2]/30 hover:shadow-lg">
      <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[#008ad2]/5 blur-3xl" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {proposal.unreadCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-extrabold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {proposal.unreadCount} unread
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-700">
                <MailOpen size={11} aria-hidden="true" /> All reviewed
              </span>
            )}
          </div>

          <h2 className="mt-4 truncate text-2xl font-black tracking-tight text-slate-900">
            {proposal.proposalTitle}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={14} className="text-slate-400" aria-hidden="true" />
              Latest response {formatDate(proposal.latestResponseAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              <UsersRound size={14} className="text-slate-400" aria-hidden="true" />
              Latest vendor: <strong className="text-slate-700">{proposal.latestVendorName}</strong>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="min-w-24 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
            <div className="text-3xl font-black leading-none text-slate-800">
              {proposal.responseCount}
            </div>
            <div className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
              {proposal.responseCount === 1 ? "Response" : "Responses"}
            </div>
          </div>
          <Link
            href={`/vendor-responses/proposals/${encodeURIComponent(proposal.proposalId)}`}
            aria-label={`View ${proposal.responseCount} responses for ${proposal.proposalTitle}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#2fc6f5] to-[#008ad2] px-5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            View responses <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function VendorResponseProposalList({
  data,
  errorMessage,
  search,
}: Props) {
  const proposals = data?.proposals ?? [];
  const pagination = data?.pagination;
  const currentPage = pagination?.page ?? 1;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);

  return (
    <section className="space-y-7">
      <header className="relative px-6">
        <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#008ad2]/5 via-[#008ad2]/3 to-slate-900/5 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#008ad2]">
              <Sparkles size={10} className="fill-[#008ad2]" aria-hidden="true" />
              Proposal inbox
            </span>
            <h1 className="text-[30px] font-black leading-none tracking-tight text-slate-900">
              Vendor Responses
            </h1>
            <p className="mt-2 text-[13px] font-medium text-slate-500">
              Open a proposal to review all vendor submissions together.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
              <p className="text-xl font-black leading-none text-slate-800">{data?.responseCount ?? 0}</p>
              <p className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Responses</p>
            </div>
            <div className="rounded-xl border border-[#008ad2]/20 bg-[#eaf7fd] px-4 py-2.5">
              <p className="text-xl font-black leading-none text-[#0076b4]">{data?.unreadCount ?? 0}</p>
              <p className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-[#0076b4]/70">Unread</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6">
        <form action="/vendor-responses" method="get" className="flex flex-col gap-3 sm:flex-row">
          <label className="group relative flex-1">
            <span className="sr-only">Search proposals with vendor responses</span>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#008ad2]" aria-hidden="true" />
            <input
              name="search"
              type="search"
              defaultValue={search}
              placeholder="Search proposals with responses..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-5 text-[13px] text-slate-700 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#008ad2] focus:ring-4 focus:ring-[#008ad2]/10"
            />
          </label>
          <button type="submit" className="h-12 rounded-xl bg-slate-800 px-6 text-[13px] font-bold text-white transition-colors hover:bg-slate-700">
            Search
          </button>
          {search && (
            <Link href="/vendor-responses" className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-bold text-slate-600 hover:bg-slate-50">
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="space-y-4 px-6 pb-6">
        {errorMessage ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="font-bold text-rose-800">Vendor responses could not be loaded</p>
            <p className="mt-1 text-sm text-rose-700">{errorMessage}</p>
          </div>
        ) : proposals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf7fd] text-[#008ad2]">
              {search ? <Search size={23} aria-hidden="true" /> : <Inbox size={23} aria-hidden="true" />}
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-slate-800">
              {search ? "No matching proposals" : "No vendor responses yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {search
                ? "Try another proposal name or clear the search."
                : "Proposals will appear here as soon as their first vendor response is submitted."}
            </p>
          </div>
        ) : (
          proposals.map((proposal) => (
            <ProposalCard key={proposal.proposalId} proposal={proposal} />
          ))
        )}

        {pagination && totalPages > 1 && (
          <nav aria-label="Vendor response proposals pagination" className="flex items-center justify-end gap-3 pt-2">
            {currentPage > 1 ? (
              <Link href={pageHref(currentPage - 1, search)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Previous
              </Link>
            ) : (
              <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-300">Previous</span>
            )}
            <span className="text-xs font-semibold text-slate-500">Page {currentPage} of {totalPages}</span>
            {currentPage < totalPages ? (
              <Link href={pageHref(currentPage + 1, search)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Next
              </Link>
            ) : (
              <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-300">Next</span>
            )}
          </nav>
        )}
      </div>
    </section>
  );
}
