"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import InlineAlert from "@/components/ui/InlineAlert";

// Shown in place of the Hybrid & Virtual questions when the event is in-person. The section stays
// in the navigator so Advanced mode always lists the same nine sections; this page says why there
// is nothing to do and how to bring the questions back.

export default function HybridNotApplicable({
  onBack,
  onContinue,
  onChangeFormat,
}: {
  onBack: () => void;
  onContinue: () => void;
  /** Takes the planner to Event Overview, where the event format is set. */
  onChangeFormat: () => void;
}) {
  return (
    <section id="hybrid-virtual-section" tabIndex={-1} className="flex scroll-mt-6 flex-col bg-surface focus:outline-none">
      <div className="border-t border-line bg-surface-muted px-5 pb-4 pt-5 sm:px-6 lg:px-7">
        <h2 className="text-2xl font-extrabold tracking-tight text-heading">Hybrid &amp; Virtual Production</h2>
        <p className="mt-1 text-sm leading-6 text-body">Streaming, remote speakers, captions and on-demand recording.</p>
      </div>

      <div className="px-5 py-6 sm:px-6 lg:px-7">
        <InlineAlert
          tone="info"
          title="Not applicable to this event"
          action={
            <Button variant="secondary" size="sm" onClick={onChangeFormat}>
              Change event format
            </Button>
          }
        >
          This is an in-person event, so there is nothing to fill in here and nothing is required. If it will also have a
          remote audience, change the event format in Event Overview and these questions will open up.
        </InlineAlert>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between border-t border-line bg-surface/95 px-5 py-3 backdrop-blur sm:px-6 lg:px-7">
        <Button variant="ghost" leadingIcon={<ArrowLeft size={15} aria-hidden />} onClick={onBack}>
          Back
        </Button>
        <Button trailingIcon={<ArrowRight size={15} aria-hidden />} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </section>
  );
}
