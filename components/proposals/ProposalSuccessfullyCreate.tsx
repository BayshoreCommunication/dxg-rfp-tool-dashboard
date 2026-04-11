"use client";

import { CheckCircle2, Eye, List, Mail } from "lucide-react";

type ProposalSuccessfullyCreateProps = {
  proposalTitle: string;
  onBackToList: () => void;
  onSendEmail: () => void;
  onViewProposal: () => void;
};

const ProposalSuccessfullyCreate = ({
  proposalTitle,
  onBackToList,
  onSendEmail,
  onViewProposal,
}: ProposalSuccessfullyCreateProps) => {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <CheckCircle2 size={34} />
      </div>

      <div className="mt-5 text-center">
        <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
          Proposal Created Successfully
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
          Your proposal <span className="font-semibold text-slate-800">&quot;{proposalTitle}&quot;</span>{" "}
          is ready. You can return to the proposals list or send this proposal by
          email now.
        </p>
      </div>

      <div className="mt-8 grid w-full max-w-4xl grid-cols-1 justify-center gap-3 sm:grid-cols-3">
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-700 transition-colors hover:bg-cyan-100"
        >
          <Eye size={16} />
          View Proposal
        </button>

        <button
          type="button"
          onClick={onSendEmail}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95"
        >
          <Mail size={16} />
          Send This Proposal By Email
        </button>
      </div>
    </section>
  );
};

export default ProposalSuccessfullyCreate;
