"use client";

import { ArrowLeft, CheckCircle2, Copy, Eye, List, Mail, Send } from "lucide-react";
import { useState } from "react";

import EmailSend from "@/components/Email/EmailSend";

type ProposalSuccessfullyCreateProps = {
  proposalId: string;
  proposalTitle: string;
  /** The planner published changes to an existing proposal rather than a new one. */
  isUpdate?: boolean;
  onBackToList: () => void;
  onViewProposal: () => void;
  onSaveCopy?: () => void;
};

type Stage = "invite" | "sent" | "skipped";

const STEPS = [
  { key: "publish", label: "Publish" },
  { key: "invite", label: "Invite vendors" },
  { key: "done", label: "Done" },
] as const;

const stepState = (index: number, stage: Stage): "done" | "current" | "upcoming" => {
  const currentIndex = stage === "invite" ? 1 : 2;
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "current";
  return "upcoming";
};

const secondaryButton =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008ad2]";
const primaryButton =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#008ad2] px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600";

/**
 * What the planner sees after "Publish proposal". Publishing makes the RFP
 * live but emails nobody, so the flow carries straight on to choosing which
 * vendors to invite — in place, with the same composer the email page uses —
 * and ends on a summary of who was invited. Skipping is always allowed; the
 * invitation can be sent later from Email.
 */
const ProposalSuccessfullyCreate = ({
  proposalId,
  proposalTitle,
  isUpdate = false,
  onBackToList,
  onViewProposal,
  onSaveCopy,
}: ProposalSuccessfullyCreateProps) => {
  const [stage, setStage] = useState<Stage>("invite");
  const [invited, setInvited] = useState<string[]>([]);

  const handleSent = (recipients: string[]) => {
    setInvited((previous) => [...new Set([...previous, ...recipients])]);
    setStage("sent");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <ol aria-label="Publishing progress" className="flex items-center gap-2 text-xs font-bold">
        {STEPS.map((step, index) => {
          const state = stepState(index, stage);
          return (
            <li key={step.key} className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
              <span
                className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] ${
                  state === "done"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : state === "current"
                      ? "border-[#008ad2] bg-[#008ad2] text-white"
                      : "border-slate-300 bg-white text-slate-400"
                }`}
                aria-hidden="true"
              >
                {state === "done" ? <CheckCircle2 size={14} /> : index + 1}
              </span>
              <span className={state === "upcoming" ? "text-slate-400" : "text-slate-800"}>
                {step.label}
                {state === "done" && <span className="sr-only"> (complete)</span>}
              </span>
              {index < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-slate-300 sm:w-10" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <section
        role="status"
        className="flex flex-col gap-4 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={30} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            {isUpdate ? "Update published" : "Proposal published"}
          </h2>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            <span className="font-semibold text-slate-800">&quot;{proposalTitle}&quot;</span> is live for vendors.
            {stage === "invite" && " Publishing emails nobody, so choose who to invite below."}
            {stage === "sent" && ` ${invited.length} ${invited.length === 1 ? "vendor has" : "vendors have"} been invited.`}
            {stage === "skipped" && " No invitations have been sent yet."}
          </p>
        </div>
      </section>

      {stage === "invite" && (
        <>
          <EmailSend proposalId={proposalId} onSent={handleSent} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Not ready to invite anyone? You can send invitations any time from Email.
            </p>
            <button type="button" onClick={() => setStage("skipped")} className="min-h-10 rounded-xl px-4 text-sm font-bold text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008ad2]">
              Skip for now
            </button>
          </div>
        </>
      )}

      {stage === "sent" && (
        <section aria-labelledby="invitations-sent-title" className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-800">Invitations sent</p>
          <h3 id="invitations-sent-title" className="mt-1 text-lg font-extrabold text-slate-900">
            {invited.length} {invited.length === 1 ? "vendor" : "vendors"} invited
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Invited vendors">
            {invited.map((email) => (
              <li key={email} className="inline-flex items-center gap-1.5 rounded-md border border-[#008ad2]/30 bg-white px-2.5 py-1 text-[12px] font-medium text-brand-dark">
                <Mail size={12} aria-hidden="true" /> {email}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-600">
            Each vendor received their own secure link and cannot see the other recipients. Replies land in Vendor Responses.
          </p>
          <button type="button" onClick={() => setStage("invite")} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#008ad2]/30 bg-white px-4 text-sm font-bold text-brand-dark hover:bg-[#008ad2]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008ad2]">
            <Send size={14} aria-hidden="true" /> Invite more vendors
          </button>
        </section>
      )}

      {stage === "skipped" && (
        <section aria-labelledby="not-shared-title" className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Not shared yet</p>
          <h3 id="not-shared-title" className="mt-1 text-lg font-extrabold text-slate-900">
            Vendors have not been invited
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            The proposal is live, but no vendor knows about it until you send an invitation. You can do that now or later from Email.
          </p>
          <button type="button" onClick={() => setStage("invite")} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#008ad2] px-4 text-sm font-bold text-white hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
            <ArrowLeft size={14} aria-hidden="true" /> Invite vendors now
          </button>
        </section>
      )}

      {stage !== "invite" && (
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <button type="button" onClick={onViewProposal} className={primaryButton}>
            <Eye size={16} aria-hidden="true" /> View proposal
          </button>
          <button type="button" onClick={onBackToList} className={secondaryButton}>
            <List size={16} aria-hidden="true" /> Back to proposal list
          </button>
          {onSaveCopy && (
            <button type="button" onClick={onSaveCopy} className={secondaryButton}>
              <Copy size={16} aria-hidden="true" /> Save a copy
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProposalSuccessfullyCreate;
