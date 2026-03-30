"use client";

import { CheckCircle2, List, Mail } from "lucide-react";

type ProposalSuccessfullyCreateProps = {
  proposalTitle: string;
  onBackToList: () => void;
  onSendEmail: () => void;
};

const ProposalSuccessfullyCreate = ({
  proposalTitle,
  onBackToList,
  onSendEmail,
}: ProposalSuccessfullyCreateProps) => {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-10">
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

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <List size={16} />
          Back To Proposal List
        </button>

        <button
          type="button"
          onClick={onSendEmail}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95"
        >
          <Mail size={16} />
          Send This Proposal By Email
        </button>
      </div>
    </section>
  );
};

export default ProposalSuccessfullyCreate;
