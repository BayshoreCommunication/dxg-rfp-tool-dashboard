"use client";

import { requestComparisonOnThisPage, rerunHref } from "@/lib/proposalIntelligence/rerun";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * "Run a new comparison", usable inside any out-of-date banner. On the
 * Proposal Intelligence home page it starts the run through the panel that
 * is already there; anywhere else it takes the reader to that panel with the
 * run requested.
 */
export default function RerunComparisonButton({ proposalId, className, label = "Run a new comparison" }: { proposalId: string; className?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (!requestComparisonOnThisPage()) router.push(rerunHref(proposalId));
      }}
      className={cn("inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-dark px-4 text-xs font-extrabold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2", className)}
    >
      <RefreshCw size={14} aria-hidden="true" />
      {label}
    </button>
  );
}
