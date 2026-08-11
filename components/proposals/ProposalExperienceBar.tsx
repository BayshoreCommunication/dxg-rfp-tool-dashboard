"use client";

import { CheckCircle2, ChevronDown, ListChecks, SlidersHorizontal, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type {
  ProposalChecklistIssue,
  ProposalExperienceMode,
} from "@/lib/proposals/proposalExperience";

type Props = {
  mode: ProposalExperienceMode;
  onModeChange: (mode: ProposalExperienceMode) => void;
  completedSteps: number;
  totalSteps: number;
  issues: ProposalChecklistIssue[];
  onIssueClick: (issue: ProposalChecklistIssue) => void;
};

export default function ProposalExperienceBar({
  mode,
  onModeChange,
  completedSteps,
  totalSteps,
  issues,
  onIssueClick,
}: Props) {
  const [checklistOpen, setChecklistOpen] = useState(false);
  const checklistId = useId();
  const checklistRef = useRef<HTMLDivElement | null>(null);
  const checklistTriggerRef = useRef<HTMLButtonElement | null>(null);
  const progress = totalSteps === 0
    ? 0
    : Math.round((completedSteps / totalSteps) * 100);

  useEffect(() => {
    if (!checklistOpen) return;

    const closeOutside = (event: PointerEvent) => {
      if (!checklistRef.current?.contains(event.target as Node)) {
        setChecklistOpen(false);
      }
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setChecklistOpen(false);
      window.requestAnimationFrame(() => checklistTriggerRef.current?.focus());
    };

    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [checklistOpen]);

  const selectIssue = (issue: ProposalChecklistIssue) => {
    setChecklistOpen(false);
    onIssueClick(issue);
  };

  return (
    <section
      aria-label="Proposal workflow controls"
      className="rounded-2xl border border-[#dce7ed] bg-white p-4 shadow-[0_8px_28px_rgba(15,42,67,0.06)] sm:p-5"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.17em] text-[#0786cf]">
            Proposal builder
          </p>
          <h1 className="mt-1 text-xl font-extrabold tracking-[-0.02em] text-[#172b3a]">
            Start simple. Add production detail when you need it.
          </h1>
        </div>

        <div
          aria-label="Proposal detail mode"
          className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1 xl:w-auto"
          role="group"
        >
          <button
            type="button"
            aria-pressed={mode === "basic"}
            onClick={() => onModeChange("basic")}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0786cf] xl:flex-none ${
              mode === "basic"
                ? "bg-white text-[#0786cf] shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles size={16} aria-hidden="true" />
            Basic mode
          </button>
          <button
            type="button"
            aria-pressed={mode === "advanced"}
            onClick={() => onModeChange("advanced")}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0786cf] xl:flex-none ${
              mode === "advanced"
                ? "bg-white text-[#0786cf] shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            Advanced production
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-start">
        <div>
          <div className="flex items-center justify-between gap-4 text-xs font-bold text-slate-600">
            <span>Proposal readiness</span>
            <span className="tabular-nums text-slate-900">
              {completedSteps} of {totalSteps} sections complete
            </span>
          </div>
          <div
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Proposal readiness progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#2fc6f5,#0786cf)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {mode === "basic"
              ? "Essential event, venue, room, budget, and contact questions only."
              : "Full technical, creative, recording, vendor, and evaluation controls."}
          </p>
        </div>

        <div ref={checklistRef} className="relative">
          <button
            ref={checklistTriggerRef}
            type="button"
            aria-expanded={checklistOpen}
            aria-controls={checklistId}
            onClick={() => setChecklistOpen((current) => !current)}
            className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold text-slate-800 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0786cf] ${
              checklistOpen
                ? "border-[#b9dfe8] bg-white shadow-sm"
                : "border-slate-200 bg-slate-50 hover:border-[#c9dce4] hover:bg-white"
            }`}
          >
            <span className="flex items-center gap-2">
              {issues.length === 0 ? (
                <CheckCircle2 size={18} className="text-emerald-600" aria-hidden="true" />
              ) : (
                <ListChecks size={18} className="text-[#0786cf]" aria-hidden="true" />
              )}
              {issues.length === 0
                ? "Ready for final review"
                : `${issues.length} ${issues.length === 1 ? "item" : "items"} remaining`}
            </span>
            <ChevronDown
              size={17}
              className={`transition-transform ${checklistOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {checklistOpen && (
            <div
              id={checklistId}
              role="region"
              aria-label="Remaining required items"
              className="absolute right-0 top-[calc(100%+8px)] z-[80] max-h-72 w-full min-w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[#cfe1e8] bg-white p-2 shadow-[0_20px_48px_rgba(15,42,67,0.18),0_4px_12px_rgba(7,134,207,0.08)] motion-safe:animate-[assistant-message-in_160ms_ease-out]"
            >
              {issues.length === 0 ? (
                <p className="px-2 py-3 text-sm text-emerald-700">
                  All required information for this mode is complete.
                </p>
              ) : (
                <ul className="space-y-1">
                  {issues.map((issue) => (
                    <li key={issue.id}>
                      <button
                        type="button"
                        onClick={() => selectIssue(issue)}
                        className="w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-[#eef8fd] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0786cf]"
                      >
                        <span className="block text-[11px] font-extrabold uppercase tracking-wide text-[#0786cf]">
                          {issue.section}
                        </span>
                        <span className="mt-0.5 block text-sm font-semibold text-slate-700">
                          {issue.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
