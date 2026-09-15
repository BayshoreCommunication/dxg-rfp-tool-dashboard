"use client";

import VendorResponseDeleteControl from "@/components/vendor/VendorResponseDeleteControl";
import { cn } from "@/lib/utils";
import { CheckSquare2, SquareMousePointer } from "lucide-react";
import { Children, type ReactNode, useState } from "react";

type SelectableProposal = {
  proposalId: string;
  proposalTitle: string;
  responseIds: string[];
};

const responseWord = (count: number) =>
  count === 1 ? "response" : "responses";

export default function VendorResponseProposalSelectionPanel({
  proposals,
  children,
}: {
  proposals: SelectableProposal[];
  children: ReactNode;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selectedProposalIds, setSelectedProposalIds] = useState<Set<string>>(
    () => new Set(),
  );
  const cards = Children.toArray(children);
  const allSelected =
    proposals.length > 0 && selectedProposalIds.size === proposals.length;
  const selectedResponseIds = proposals.flatMap((proposal) =>
    selectedProposalIds.has(proposal.proposalId) ? proposal.responseIds : [],
  );

  const leaveSelection = () => {
    setSelecting(false);
    setSelectedProposalIds(new Set());
  };

  const toggleProposal = (proposalId: string) => {
    setSelectedProposalIds((current) => {
      const next = new Set(current);
      if (next.has(proposalId)) next.delete(proposalId);
      else next.add(proposalId);
      return next;
    });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {selecting ? (
          <>
            <label className="mr-auto inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 focus-within:ring-2 focus-within:ring-[#008ad2]">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  setSelectedProposalIds(
                    allSelected
                      ? new Set()
                      : new Set(
                          proposals.map((proposal) => proposal.proposalId),
                        ),
                  )
                }
                className="h-4 w-4 accent-[#008ad2]"
              />
              Select all on this page
            </label>
            <span aria-live="polite" className="text-sm font-semibold text-slate-500">
              {selectedProposalIds.size} selected
            </span>
            <button
              type="button"
              onClick={leaveSelection}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-[#008ad2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ad2]"
            >
              Cancel
            </button>
            {selectedResponseIds.length > 0 ? (
              <VendorResponseDeleteControl
                scope="selected"
                count={selectedResponseIds.length}
                responseIds={selectedResponseIds}
                emphasis="danger"
                onDeleted={leaveSelection}
              />
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-400"
              >
                <CheckSquare2 size={15} aria-hidden="true" /> Delete selected
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setSelecting(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-[#008ad2] hover:text-[#0076b4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ad2]"
          >
            <SquareMousePointer size={15} aria-hidden="true" /> Select responses
          </button>
        )}
      </div>

      <div className="space-y-4">
        {proposals.map((proposal, index) => {
          const checked = selectedProposalIds.has(proposal.proposalId);
          const count = proposal.responseIds.length;
          return (
            <div
              key={proposal.proposalId}
              data-selected={checked ? "true" : "false"}
              className={cn(
                "rounded-2xl transition",
                checked &&
                  "[&_article]:border-[#008ad2] [&_article]:shadow-[0_8px_24px_rgba(0,138,210,0.10)]",
              )}
            >
              {selecting ? (
                <label
                  className={cn(
                    "mb-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm font-bold transition focus-within:ring-2 focus-within:ring-[#008ad2]",
                    checked
                      ? "border-[#008ad2] bg-[#eaf7fd] text-[#0076b4]"
                      : "border-slate-200 bg-white text-slate-800 hover:border-[#008ad2]",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProposal(proposal.proposalId)}
                    aria-label={`Select ${count} ${responseWord(count)} for ${proposal.proposalTitle}`}
                    className="h-4 w-4 accent-[#008ad2]"
                  />
                  <span className="min-w-0 truncate">
                    {proposal.proposalTitle}
                  </span>
                  <span className="ml-auto shrink-0 text-xs font-semibold opacity-75">
                    {count} {responseWord(count)}
                  </span>
                </label>
              ) : null}
              {cards[index]}
            </div>
          );
        })}
      </div>
    </>
  );
}
