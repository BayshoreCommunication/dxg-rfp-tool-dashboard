"use client";

import { CheckCircle2, Copy, Eye, List, Mail } from "lucide-react";

type ProposalSuccessfullyCreateProps = {
  proposalTitle: string;
  onBackToList: () => void;
  onSendEmail: () => void;
  onViewProposal: () => void;
  onSaveCopy?: () => void;
};

const ProposalSuccessfullyCreate = ({
  proposalTitle,
  onBackToList,
  onSendEmail,
  onViewProposal,
  onSaveCopy,
}: ProposalSuccessfullyCreateProps) => {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <CheckCircle2 size={34} />
      </div>

      <div className="mt-5 text-center">
        <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
          Proposal published successfully
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
          Your proposal <span className="font-semibold text-slate-800">&quot;{proposalTitle}&quot;</span>{" "}
          is ready to share. Publishing does not send invitation emails. Choose
          your vendors and review the invitation next.
        </p>
      </div>

      <div className="mt-6 w-full max-w-4xl rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-sky-800">Next step · Share with vendors</p>
        <p className="mt-2 text-sm text-slate-600">Send individual invitations from the email page. Vendors cannot see the other recipients.</p>
        <button type="button" onClick={onSendEmail} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#008ad2] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
          <Mail size={16} aria-hidden="true" /> Share with vendors
        </button>
      </div>

      <div className="mt-6 grid w-full max-w-4xl grid-cols-1 justify-center gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <List size={16} />
          Back To Proposal List
        </button>

        <button
          type="button"
          onClick={onViewProposal}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#008ad2]/30 bg-[#008ad2]/5 px-4 py-3 text-sm font-bold text-brand-dark transition-colors hover:bg-[#008ad2]/10"
        >
          <Eye size={16} />
          View Proposal
        </button>

        {onSaveCopy && (
          <button
            type="button"
            onClick={onSaveCopy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-100"
          >
            <Copy size={16} />
            Save a Copy
          </button>
        )}

      </div>
    </section>
  );
};

export default ProposalSuccessfullyCreate;
