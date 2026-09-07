"use client";

import { useEffect, useState } from "react";

export type SourceIntakePhase = "uploading" | "checking" | "reading";

const phases = {
  uploading: {
    title: "Uploading your brief",
    detail: "Keep this page open while your attachment uploads.",
  },
  checking: {
    title: "Checking your file",
    detail: "The attachment is being checked before it is read.",
  },
  reading: {
    title: "Reading your brief",
    detail: "The event, dates, venue and production needs are being extracted.",
  },
};

// The chevron wave moves right while a second wave enters behind it, matching
// the selected Beautiful UI loader without introducing another progress card.
const pixelDelays = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const column = index % 3;
  return (column + Math.abs(row - 1)) * 90;
});

function formatElapsed(deciseconds: number) {
  const total = deciseconds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

function useElapsed() {
  const [deciseconds, setDeciseconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setDeciseconds(current => current + 1),
      100,
    );
    return () => window.clearInterval(timer);
  }, []);

  return formatElapsed(deciseconds);
}

function PixelGrid() {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]"
    >
      {pixelDelays.map((delay, index) => (
        <span
          key={index}
          data-attachment-loader-pixel
          className="size-1 rounded-[1px] bg-[#087f90]"
          style={{
            opacity: 0.15,
            animation: `dxg-source-pixel-on 650ms ease-in-out ${delay}ms infinite`,
          }}
        />
      ))}
    </span>
  );
}

/** One compact, truthful status for the upload → scan → extraction handoff. */
export default function SourceIntakeProgress({ phase }: { phase: SourceIntakePhase }) {
  const current = phases[phase];
  const elapsed = useElapsed();

  return (
    <div
      role="status"
      aria-label="Attachment progress"
      aria-live="polite"
      aria-atomic="true"
      className="inline-flex max-w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm"
    >
      <PixelGrid />
      <span className="dxg-source-shimmer truncate text-[13px] font-semibold">
        {current.title}
      </span>
      <span aria-hidden="true" className="shrink-0 font-mono text-xs tabular-nums text-slate-400">
        {elapsed}
      </span>
      <span className="sr-only">{current.detail}</span>
    </div>
  );
}
