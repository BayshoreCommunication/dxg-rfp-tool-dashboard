"use client";

import { Check, Loader2 } from "lucide-react";

export type SourceIntakePhase = "uploading" | "checking" | "reading";

const phases = {
  uploading: { title: "Uploading your brief", detail: "Keep this page open while your attachment uploads.", step: 0 },
  checking: { title: "Checking your file", detail: "I’ll read the brief once the file checks finish, then ask only about missing details.", step: 1 },
  reading: { title: "Reading your brief", detail: "I’m looking for the event, dates, venue and production needs before asking the next question.", step: 2 },
};

/** One truthful status for the upload → scan → extraction handoff. */
export default function SourceIntakeProgress({ phase }: { phase: SourceIntakePhase }) {
  const current = phases[phase];
  return (
    <div role="status" aria-label="Attachment progress" className="w-full max-w-3xl rounded-2xl border border-cyan-200 bg-cyan-50/50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-xl bg-white p-2 text-cyan-700">
          <Loader2 size={18} className="motion-safe:animate-spin" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{current.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{current.detail}</p>
        </div>
      </div>
      <ol aria-label="File processing steps" className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-cyan-100 pt-3 text-xs">
        {["Upload", "File check", "Read details"].map((label, index) => (
          <li key={label} aria-current={index === current.step ? "step" : undefined} className={`flex items-center gap-1.5 ${index <= current.step ? "font-semibold text-cyan-800" : "text-slate-500"}`}>
            {index < current.step ? <Check size={14} aria-hidden /> : <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full border border-current text-[10px]">{index + 1}</span>}
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}
