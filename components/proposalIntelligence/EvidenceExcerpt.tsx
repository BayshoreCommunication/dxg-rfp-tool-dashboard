"use client";

import {
  buildEvidenceExcerpt,
  evidenceQueryTerms,
  looksUnreadable,
  segmentHighlights,
} from "@/lib/proposalIntelligence/evidenceExcerpt";
import { useMemo, useState } from "react";

type Props = {
  /** The stored passage, usually a whole extracted page. */
  content: string;
  /** Requirement or fact wording used to find the relevant lines. */
  context: string[];
  className?: string;
};

/**
 * Shows the part of a stored passage that answers the requirement, with the
 * matching words marked, and keeps the untouched passage one click away.
 */
export default function EvidenceExcerpt({ content, context, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const terms = useMemo(() => evidenceQueryTerms(...context), [context]);
  const result = useMemo(
    () => buildEvidenceExcerpt(content, terms),
    [content, terms],
  );
  const segments = useMemo(
    () => segmentHighlights(result.excerpt, result.highlights),
    [result],
  );

  const body = `mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700 ${className ?? ""}`;
  // Judge what is actually shown: a readable page can still have a noisy excerpt.
  const unreadable = useMemo(() => looksUnreadable(result.excerpt), [result.excerpt]);

  // Scanned pages sometimes come back as noise. Say so instead of quoting it;
  // the raw text stays one click away for anyone who wants to check.
  if (unreadable && !expanded)
    return (
      <>
        <p className={`${body} italic text-slate-500`}>
          RFPilot could not read this part of the page clearly. It is scanned text, so the quote is unreliable; open the file to check it.
        </p>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 text-[11px] font-bold text-[#0076b4] hover:underline"
        >
          Show the raw text anyway
        </button>
      </>
    );

  if (expanded)
    return (
      <>
        <p className={body}>{content.trim()}</p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 text-[11px] font-bold text-[#0076b4] hover:underline"
        >
          {unreadable ? "Hide the raw text" : "Show just the relevant lines"}
        </button>
      </>
    );

  return (
    <>
      <p className={body}>
        {segments.map((segment, index) =>
          segment.match ? (
            <mark
              key={index}
              className="rounded-sm bg-amber-200/70 px-0.5 text-slate-900"
            >
              {segment.text}
            </mark>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </p>
      {result.trimmed && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 text-[11px] font-bold text-[#0076b4] hover:underline"
        >
          Show the full page ({result.hiddenLineCount} more{" "}
          {result.hiddenLineCount === 1 ? "line" : "lines"})
        </button>
      )}
    </>
  );
}
