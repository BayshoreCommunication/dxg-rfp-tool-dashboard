"use client";

import { Loader2, PencilLine, Sparkles, Upload } from "lucide-react";
import type { ReactNode } from "react";
import AssistantOrb from "@/components/ai/shared/AssistantOrb";
import InlineAlert from "@/components/ui/InlineAlert";
import { STARTER_CHIP_CLASS, STARTER_ICON_CLASS } from "./starterChip";

// The empty state of the new-proposal workspace: a greeting, what the product does, the ways to
// start, and the composer. It owns presentation only. Every handler, flag and the composer itself
// come from AssistantWorkspacePage, so behaviour is unchanged.

const EXAMPLE_HINT = "A fictional summit brief, so you can watch RFPilot read a document";
const SCRATCH_HINT = "Drops a sample description into the box for you to edit";

export type ProposalEntryProps = {
  /** e.g. "Good Morning, Sam" or "Welcome"; built by the parent so SSR and first paint agree. */
  greeting: string;
  /** The message composer (textarea, attach, voice, send). */
  composer: ReactNode;
  /** One more way to start, shown after the built-in ones (e.g. "Start from a template"). */
  extraStarter?: ReactNode;
  onExample: () => void;
  onUpload: () => void;
  onScratch: () => void;
  exampleBusy: boolean;
  attachDisabled: boolean;
  attachDisabledTitle: string;
  starterError: string | null;
  /** "PDF, DOCX, XLSX, CSV or TXT" */
  acceptedLabel: string;
  maxFiles: number;
};

export default function ProposalEntry({
  greeting,
  composer,
  extraStarter,
  onExample,
  onUpload,
  onScratch,
  exampleBusy,
  attachDisabled,
  attachDisabledTitle,
  starterError,
  acceptedLabel,
  maxFiles,
}: ProposalEntryProps) {
  const exampleHint = attachDisabled ? attachDisabledTitle : EXAMPLE_HINT;
  const uploadHint = attachDisabled ? attachDisabledTitle : acceptedLabel;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-6 py-6 text-center md:justify-center md:p-0">
        {/* The orb artwork has an opaque white background, which shows as a white square in dark mode.
            In dark only, fade everything outside the orb and its glow to transparent. */}
        <AssistantOrb className="h-24 w-24 sm:h-28 sm:w-28 dark:[-webkit-mask-image:radial-gradient(circle,#000_34%,transparent_52%)] dark:[mask-image:radial-gradient(circle,#000_34%,transparent_52%)]" />
        <div className="max-w-xl">
          <h1 className="text-balance text-2xl font-extrabold tracking-tight text-heading md:text-3xl">{greeting}</h1>
          <p className="mt-2 text-base font-semibold text-action md:text-xl">Let’s build your event proposal</p>
          {/* First-run definition: what the product does, what a proposal is, and that nothing goes
              out without the planner. */}
          <p data-testid="assistant-product-definition" className="mx-auto mt-3 max-w-lg text-sm leading-6 text-body">
            RFPilot turns your event details into an AV production proposal, the request you send to vendors so they can
            quote. Nothing goes out until you pick vendors.
          </p>
        </div>

        <div role="group" aria-label="Ways to start" data-testid="assistant-starters" className="w-full max-w-2xl">
          {/* The hints stay as tooltips for pointer users and are also exposed as descriptions, so
              keyboard and touch users get them too. */}
          <span id="starter-hint-example" className="sr-only">{exampleHint}</span>
          <span id="starter-hint-upload" className="sr-only">{uploadHint}</span>
          <span id="starter-hint-scratch" className="sr-only">{SCRATCH_HINT}</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onExample}
              disabled={exampleBusy || attachDisabled}
              aria-busy={exampleBusy}
              aria-describedby="starter-hint-example"
              title={exampleHint}
              className={STARTER_CHIP_CLASS}
            >
              {exampleBusy ? (
                <Loader2 size={15} aria-hidden className={`${STARTER_ICON_CLASS} animate-spin motion-reduce:animate-none`} />
              ) : (
                <Sparkles size={15} aria-hidden className={STARTER_ICON_CLASS} />
              )}
              Try an example brief
            </button>
            <button
              type="button"
              onClick={onUpload}
              disabled={attachDisabled}
              aria-describedby="starter-hint-upload"
              title={uploadHint}
              className={STARTER_CHIP_CLASS}
            >
              <Upload size={15} aria-hidden className={STARTER_ICON_CLASS} />
              Upload my brief or old proposal
            </button>
            <button
              type="button"
              onClick={onScratch}
              aria-describedby="starter-hint-scratch"
              title={SCRATCH_HINT}
              className={STARTER_CHIP_CLASS}
            >
              <PencilLine size={15} aria-hidden className={STARTER_ICON_CLASS} />
              Describe it from scratch
            </button>
            {extraStarter}
          </div>
          {starterError ? (
            <InlineAlert tone="danger" className="mx-auto mt-2 max-w-lg text-left">
              {starterError}
            </InlineAlert>
          ) : null}
        </div>
      </div>

      <div className="w-full shrink-0 bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-4 md:mx-auto md:max-w-xl md:bg-transparent md:px-0 md:pb-0 md:pt-4">
        {composer}
        {/* The one visible line that says what the paperclip and the drop target accept. */}
        <p data-testid="attachment-caption" className="mt-2 text-center text-xs leading-4 text-muted">
          Drop a file here or use the paperclip: {acceptedLabel}, up to {maxFiles} per message.
        </p>
      </div>
    </div>
  );
}
