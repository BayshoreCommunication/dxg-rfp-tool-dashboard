"use client";

// Chat-first AI workspace for creating a proposal. Full-page layout: breadcrumb
// top bar, centered greeting empty state with a single composer, a threaded
// conversation once work starts, and a right rail (sources, suggested tasks,
// suggested questions) that slides in once the conversation has begun. Files
// picked via the paperclip or the rail are STAGED as chips in the composer and
// only uploaded when the message is sent. No proposal exists until the user
// first sends a message or saves notes — then one is created lazily and the
// URL is replaced with that proposal's canonical assistant route
// (/proposals/{id}/assistant), which is also how an existing proposal's
// assistant is reached.

import {
  closeConversationSegmentAction,
  type ConversationMessage,
  type ConversationQuestion,
  type ConversationRunType,
} from "@/app/actions/conversation";
import { deletePrivateDocumentSource, type PrivateDocumentSource } from "@/app/actions/durableJobs";
import GlobalDateInput from "@/components/shared/GlobalDateInput";
import { getCandidateReviewAction } from "@/app/actions/candidateApplication";
import { generateGuidanceAction, type GuidanceReport, type GuidanceSectionCompleteness } from "@/app/actions/guidance";
import { generateInvestmentGuidanceAction, type InvestmentReport } from "@/app/actions/investment";
import { getLatestProposalContextAction, getProposalContextAction } from "@/app/actions/proposalContext";
import { getProposalDraftAction, type ProposalDraftSection } from "@/app/actions/proposalDraft";
import { createProposalAction, getProposalByIdAction } from "@/app/actions/proposals";
import { getUserData } from "@/app/actions/user";
import type { ProposalData } from "@/components/proposals/AddNewProposal";
import { presentJob } from "@/lib/asyncOperations";
import {
  ArrowUp, Download, FileText, Loader2, Paperclip, PencilLine, Sparkles, StickyNote, Upload, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoExtraction, useConversation, useNotesScan, useProposalSources, useSourceUpload } from "./useConversation";
import { useAutoApply } from "./useAutoApply";

const ACCENT = "#00c2c9";
const DEEP = "#087f69";

const runLabels: Record<ConversationRunType, { pending: string; failed: string }> = {
  proposal_context: { pending: "Extracting requirements…", failed: "Requirement extraction did not finish. Try again." },
  proposal_draft: { pending: "Drafting the proposal…", failed: "Draft generation did not finish. Try again." },
};

const taskContent: Record<"extract_requirements" | "generate_draft", string> = {
  extract_requirements: "Extract the requirements from the selected sources.",
  generate_draft: "Generate a proposal draft from the current information.",
};

type LocalCard =
  | { id: string; kind: "guidance"; report: GuidanceReport }
  | { id: string; kind: "investment"; report: InvestmentReport }
  // Extraction from typed messages happens in the background, so without a
  // card the planner sees sources and applied fields appear from nowhere.
  | { id: string; kind: "segment"; created: boolean; reason?: string }
  | { id: string; kind: "error"; message: string };

// Why a "use what I've told you" request produced nothing. Deliberately plain:
// none of these are failures, and the planner should not be made to feel one
// happened.
// Mirrors the backend's CONVERSATION_EXTRACTION_ENABLED gate. Offering the
// task while the gate is closed spends a planner's click to tell them the
// feature is off; the reason belongs on the control instead. Read per render
// so the flag can be flipped without a rebuild.
const isChatExtractionEnabled = () =>
  process.env.NEXT_PUBLIC_CONVERSATION_EXTRACTION_ENABLED === "true";

const segmentSkipReasons: Record<string, string> = {
  open: "I'll use these once you pause or add a bit more.",
  insufficient: "There isn't enough detail in your messages yet for me to pull requirements from.",
  empty: "Nothing new since the last time I read your messages.",
  disabled: "Reading requirements from chat isn't switched on in this environment.",
  ingestion_disabled: "Source handling isn't switched on in this environment.",
};

const impactLabels: Record<string, string> = {
  cost: "affects cost",
  schedule: "affects schedule",
  production: "affects production",
  scope: "affects scope",
};

// Short human label for a single-field question, e.g.
// "/content/venueSchedule/numberOfEventRooms" -> "Number of event rooms".
const questionFieldLabel = (question: ConversationQuestion): string => {
  const segment = question.paths.length === 1 ? question.paths[0].split("/").pop() ?? "" : "";
  if (!segment) return "Answer";
  const words = segment.replace(/([A-Z])/g, " $1").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const citationLabel = (citation: string): string => {
  const segment = citation.split("/").filter(Boolean).pop() ?? citation;
  const labels: Record<string, string> = {
    aboutOrganization: "Organization",
    editionYear: "Edition / year",
    endDate: "End date",
    eventFormat: "Event format",
    eventName: "Event name",
    eventObjectives: "Event objectives",
    eventType: "Event type",
    startDate: "Start date",
    statementOfWork: "Scope of work",
  };
  if (labels[segment]) return labels[segment];
  const words = segment.replace(/([A-Z])/g, " $1").replace(/[_-]+/g, " ").toLowerCase().trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Proposal detail";
};

// A picked calendar day submitted as YYYY-MM-DD from its LOCAL parts:
// toISOString() would shift the day for anyone behind UTC.
const localIsoDay = (date: Date): string => {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

// ── Captured-detail summary ──────────────────────────────────────────────────
// The overview card reads the proposal document itself (legacy field names) and
// renders only the fields that actually carry a value.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PLACEHOLDER_EVENT_NAME = "Untitled proposal";

export type OverviewRow = { label: string; value: string };

const textValue = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

type DayParts = { year: number; month: number; day: number };

// Dates are stored as plain strings ("2027-03-16"); they are read as calendar
// days so a timezone offset can never shift the rendered date.
const parseDay = (value: unknown): DayParts | null => {
  const raw = textValue(value);
  if (!raw) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const month = Number(iso[2]) - 1;
    const day = Number(iso[3]);
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    return { year: Number(iso[1]), month, day };
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return { year: parsed.getFullYear(), month: parsed.getMonth(), day: parsed.getDate() };
};

const formatDay = (parts: DayParts, withYear = true) =>
  `${parts.day} ${MONTHS[parts.month]}${withYear ? ` ${parts.year}` : ""}`;

// "16–18 Mar 2027" when both ends share a month, "28 Feb – 2 Mar 2027" within a
// year, otherwise both ends fully qualified.
const formatDateRange = (start: unknown, end: unknown): string => {
  const from = parseDay(start);
  const to = parseDay(end);
  if (!from && !to) return "";
  if (!from) return formatDay(to as DayParts);
  if (!to) return formatDay(from);
  if (from.year === to.year && from.month === to.month) {
    return from.day === to.day ? formatDay(from) : `${from.day}–${to.day} ${MONTHS[from.month]} ${from.year}`;
  }
  if (from.year === to.year) return `${formatDay(from, false)} – ${formatDay(to)}`;
  return `${formatDay(from)} – ${formatDay(to)}`;
};

const isYes = (value: unknown) => textValue(value).toUpperCase() === "YES";

const budgetTierLabel = (proposal: Record<string, unknown> | null): string => {
  if (!proposal) return "";
  const budget = isRecord(proposal.budget) ? proposal.budget : {};
  const tier = textValue(budget.estimatedAvBudget);
  const ranges: Record<string, string> = {
    Essential: "$10K – $25K",
    Standard: "$25K – $50K",
    Production: "$50K – $100K",
    Premium: "$100K – $250K",
    Enterprise: "$250K – $500K",
    Signature: "$500K+",
    "Not Yet Determined": "Need guidance",
  };
  return tier ? `${tier}${ranges[tier] ? ` (${ranges[tier]})` : ""}` : "";
};

// Key captured details, in reading order, capped so the card stays scannable.
export const buildOverviewRows = (proposal: Record<string, unknown> | null): OverviewRow[] => {
  if (!proposal) return [];
  const event = isRecord(proposal.event) ? proposal.event : {};
  const venueSchedule = isRecord(proposal.venueSchedule) ? proposal.venueSchedule : {};
  const hybridVirtual = isRecord(proposal.hybridVirtual) ? proposal.hybridVirtual : {};
  const videoRecording = isRecord(proposal.videoRecordingStep) ? proposal.videoRecordingStep : {};
  const budget = isRecord(proposal.budget) ? proposal.budget : {};

  const rows: OverviewRow[] = [];
  const push = (label: string, value: string) => { if (value) rows.push({ label, value }); };

  const eventName = textValue(event.eventName);
  push("Event", eventName === PLACEHOLDER_EVENT_NAME ? "" : eventName);
  push("Dates", formatDateRange(event.startDate, event.endDate));
  push("Format", textValue(event.eventFormat));
  push("Attendees", textValue(event.attendees));
  push("Venue", textValue(venueSchedule.venueName));
  push("City", textValue(venueSchedule.venueCity));
  push("Event rooms", textValue(venueSchedule.numberOfEventRooms));
  if (isYes(venueSchedule.isUnionVenue)) rows.push({ label: "Union venue", value: "Yes" });
  push("Streaming platform", textValue(hybridVirtual.streamingPlatform));
  if (isYes(videoRecording.videoRecordingRequired)) {
    const cameras = textValue(videoRecording.numberOfCameras);
    rows.push({ label: "Video recording", value: cameras ? `Yes — ${cameras} camera${cameras === "1" ? "" : "s"}` : "Yes" });
  }
  const due = parseDay(budget.proposalSubmissionDueDate);
  if (due) rows.push({ label: "Proposal due", value: formatDay(due) });

  return rows.slice(0, 10);
};

const firstNameOf = (name: unknown): string | null => {
  if (typeof name !== "string") return null;
  const first = name.trim().split(/\s+/)[0];
  return first || null;
};

const dayPart = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
};

const money = (minor: number | null | undefined, currency: string | null) => {
  if (minor === null || minor === undefined || !currency) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
  } catch {
    return `${(minor / 100).toLocaleString()} ${currency}`;
  }
};

const MAX_STAGED_FILES = 3;

const formatFileSize = (bytes: number) => {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${Math.round(bytes / 1_024)} KB`;
  return `${bytes} B`;
};

// ── Small presentational pieces ──────────────────────────────────────────────

function SourceChips({ chips }: { chips: Array<{ label: string; count: number }> }) {
  if (chips.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Sources</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {chips.map(chip => (
          <li key={chip.label} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
            <FileText size={11} className="shrink-0 text-slate-400" aria-hidden />
            <span className="max-w-[12rem] truncate" title={chip.label}>{chip.label}</span>
            <span className="rounded-full bg-white px-1.5 text-[10px] font-semibold text-slate-500">{chip.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardFooter({ detailsHref, detailsLabel }: { detailsHref?: string; detailsLabel?: string }) {
  if (!detailsHref) return null;
  return (
    <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-2.5">
      <Link href={detailsHref} className="text-xs font-semibold text-[#087f69] underline underline-offset-2">
        {detailsLabel ?? "View details"}
      </Link>
    </div>
  );
}

// ── Shared card action row ───────────────────────────────────────────────────
// Every "what next?" card in the thread offers the same three actions in the
// same order and at the same height: one solid primary (generate/regenerate the
// draft), an outline secondary (readiness check, only while no report is on
// screen) and a quiet tertiary link into the editor. Two cards must never show
// two primary buttons that do the same thing, so the caller decides which card
// owns the row.
const ACTION_BASE =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";
const ACTION_PRIMARY = `${ACTION_BASE} bg-[#087f69] text-white hover:bg-[#0a9a81]`;
const ACTION_SECONDARY = `${ACTION_BASE} border border-[#087f69] bg-white text-[#087f69] hover:bg-emerald-50`;
const ACTION_TERTIARY = `${ACTION_BASE} px-1 text-slate-500 underline underline-offset-2 hover:text-slate-800`;

function CardActionRow({ proposalId, hasDraft, draftBusy, onGenerateDraft, onRunReadiness, readinessBusy = false }: {
  proposalId: string;
  hasDraft: boolean;
  draftBusy: boolean;
  onGenerateDraft: () => void;
  // Omitted when a readiness report is already on screen — the check never
  // competes with a result the user is already reading.
  onRunReadiness?: () => void;
  readinessBusy?: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onGenerateDraft}
        disabled={draftBusy}
        aria-busy={draftBusy}
        className={ACTION_PRIMARY}
      >
        {draftBusy && <Loader2 size={12} className="animate-spin" aria-hidden />}
        {draftBusy ? "Generating…" : hasDraft ? "Regenerate draft" : "Generate proposal draft"}
      </button>
      {onRunReadiness && (
        <button
          type="button"
          onClick={onRunReadiness}
          disabled={readinessBusy}
          aria-busy={readinessBusy}
          className={ACTION_SECONDARY}
        >
          {readinessBusy && <Loader2 size={12} className="animate-spin" aria-hidden />}
          {readinessBusy ? "Checking…" : "Run readiness check"}
        </button>
      )}
      <Link href={`/proposals/proposal-edit?proposalId=${proposalId}`} className={ACTION_TERTIARY}>
        Edit all details
      </Link>
    </div>
  );
}

function SkeletonCard({ label }: { label: string }) {
  return (
    <div role="status" className="max-w-[85%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span aria-hidden className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#00c2c9] border-t-transparent" />
        {label} You can keep working while this finishes.
      </p>
      <div className="mt-3 space-y-2" aria-hidden>
        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

// ChatGPT-style guided clarification flow: ONE question at a time in the
// thread, with progress, an impact tag, a typed answer control (date picker,
// choice pills, number or free text, chosen by the backend) and a Skip action.
// An invalid answer (backend 422) keeps the question and shows the validation
// message so the user can re-answer.
const ANSWER_FIELD_CLASS =
  "min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#00c2c9] focus:ring-2 focus:ring-[#00c2c9]/25 disabled:cursor-not-allowed disabled:bg-slate-50";
const PRIMARY_BUTTON_CLASS =
  "shrink-0 rounded-lg bg-[#087f69] px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";
const SKIP_BUTTON_CLASS =
  "shrink-0 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] disabled:cursor-not-allowed disabled:opacity-50";

export function isBeforeLocalToday(candidate: Date, now = new Date()): boolean {
  const selectedDay = new Date(candidate);
  selectedDay.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return selectedDay < today;
}

const isEventEndDateQuestion = (question: ConversationQuestion) =>
  question.paths.some(path => path.endsWith("/event/endDate"));

const isLoadInDateQuestion = (question: ConversationQuestion) =>
  question.paths.some(path => path.endsWith("/venueSchedule/loadInDate"));

const isLoadInTimeQuestion = (question: ConversationQuestion) =>
  question.paths.some(path => path.endsWith("/venueSchedule/loadInTime"));

export const displayQuestionPrompt = (question: ConversationQuestion): string => {
  if (question.paths.some(path => path.endsWith("/venueSchedule/venueName"))) {
    return "Which venue will host the event? Enter the venue name, or use Skip if it is still undecided.";
  }
  return question.prompt || question.code.replaceAll("_", " ").toLowerCase();
};

export function minimumDateForQuestion(
  question: ConversationQuestion,
  proposal: Record<string, unknown> | null,
  now = new Date(),
): Date {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (!isEventEndDateQuestion(question) || !proposal) return today;

  const event = isRecord(proposal.event) ? proposal.event : {};
  const start = parseDay(event.startDate);
  if (!start) return today;
  const startDate = new Date(start.year, start.month, start.day);
  return startDate > today ? startDate : today;
}

export function maximumDateForQuestion(
  question: ConversationQuestion,
  proposal: Record<string, unknown> | null,
): Date | undefined {
  if (!isLoadInDateQuestion(question) || !proposal) return undefined;
  const event = isRecord(proposal.event) ? proposal.event : {};
  const start = parseDay(event.startDate);
  return start ? new Date(start.year, start.month, start.day) : undefined;
}

function GuidedQuestionCard({ question, current, total, busy, error, minimumDate, maximumDate, onAnswer, onSkip }: {
  question: ConversationQuestion;
  current: number;
  total: number;
  busy: boolean;
  error: string | null;
  minimumDate: Date;
  maximumDate?: Date;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
}) {
  // The caller keys this card by question id, so the control resets per question.
  const [value, setValue] = useState("");
  const [day, setDay] = useState<Date | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [pendingOption, setPendingOption] = useState<string | null>(null);
  const impactLabel = question.impact ? impactLabels[question.impact] : null;
  const answerType = question.answerType;
  const inputId = `guided-answer-${question.id}`;
  const errorId = `guided-answer-error-${question.id}`;
  const displayError = dateError || error;
  // A picked day is submitted from its LOCAL calendar parts; toISOString would
  // shift the date by a day for anyone west of UTC.
  const answer = answerType === "date" ? (day ? localIsoDay(day) : "") : value.trim();
  const skipButton = (
    <button
      type="button"
      onClick={() => { if (!busy) onSkip(); }}
      disabled={busy}
      className={SKIP_BUTTON_CLASS}
    >
      Skip
    </button>
  );

  return (
    <div className="w-full max-w-[85%] rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Question {current} of {total}</p>
        {impactLabel && (
          <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-800">{impactLabel}</span>
        )}
        {question.severity === "blocking" && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">Blocking</span>
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">{displayQuestionPrompt(question)}</p>

      {answerType === "choice" ? (
        // One tap answers: each pill submits its own value, so there is no
        // separate Answer step for a closed set of options. Long lists (e.g.
        // the nine streaming platforms) get tighter pills, and every pill wraps
        // rather than stretching the card on a narrow screen.
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {question.options.map(option => {
            // Only the in-flight pill is highlighted, so a rejected answer (422)
            // never leaves an option looking accepted.
            const active = busy && pendingOption === option;
            return (
              <button
                key={option}
                type="button"
                disabled={busy}
                aria-busy={active}
                onClick={() => { if (busy) return; setPendingOption(option); onAnswer(option); }}
                className={`max-w-full whitespace-normal break-words rounded-full border text-left text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 ${
                  question.options.length > 5 ? "px-3 py-1.5" : "px-4 py-2"
                } ${
                  active
                    ? "border-[#087f69] bg-[#087f69] text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-[#00c2c9] hover:bg-[#00c2c9]/10 hover:text-[#087f69]"
                }`}
              >
                {active ? "Saving…" : option}
              </button>
            );
          })}
          {skipButton}
        </div>
      ) : (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={event => { event.preventDefault(); if (answer && !busy) onAnswer(answer); }}
        >
          {answerType === "date" ? (
            <div className="flex min-w-[11rem] flex-1 basis-48 items-center">
              <label htmlFor={inputId} className="sr-only">Answer this question</label>
              <GlobalDateInput
                id={inputId}
                value={day}
                onChange={nextDay => {
                  if (nextDay && isBeforeLocalToday(nextDay, minimumDate)) {
                    setDay(null);
                    setDateError(isEventEndDateQuestion(question)
                      ? "Event end date cannot be earlier than the event start date."
                      : "Event start date cannot be earlier than today.");
                    return;
                  }
                  if (nextDay && maximumDate && nextDay > maximumDate) {
                    setDay(null);
                    setDateError("Production load-in cannot be after the event start date.");
                    return;
                  }
                  setDateError(null);
                  setDay(nextDay);
                }}
                format="yyyy-MM-dd"
                placeholder="YYYY-MM-DD"
                minDate={minimumDate}
                maxDate={maximumDate}
                hideLabel
                showErrorMessage={false}
                disabled={busy}
                error={displayError ?? undefined}
                ariaInvalid={!!displayError}
                ariaDescribedBy={displayError ? errorId : undefined}
                inputClassName={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#00c2c9] focus:ring-2 focus:ring-[#00c2c9]/25 ${busy ? "cursor-not-allowed bg-slate-50" : ""}`}
                buttonClassName="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#087f69]"
              />
            </div>
          ) : (
            <input
              type={isLoadInTimeQuestion(question) ? "time" : answerType === "number" ? "number" : "text"}
              {...(answerType === "number"
                ? { min: 0, inputMode: "numeric" as const, step: 1 }
                : isLoadInTimeQuestion(question)
                  ? { step: 300 }
                  : {})}
              value={value}
              onChange={event => setValue(event.target.value)}
              disabled={busy}
              placeholder={answerType === "number" ? "Enter a number…" : isLoadInTimeQuestion(question) ? "HH:MM" : "Type your answer…"}
              aria-label="Answer this question"
              aria-invalid={displayError ? true : undefined}
              aria-describedby={displayError ? errorId : undefined}
              className={`${ANSWER_FIELD_CLASS} basis-48`}
            />
          )}
          <button
            type="submit"
            disabled={busy || !answer}
            className={PRIMARY_BUTTON_CLASS}
          >
            {busy ? "Saving…" : "Answer"}
          </button>
          {skipButton}
        </form>
      )}
      {displayError && <p id={errorId} role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">{displayError}</p>}
    </div>
  );
}

// Details of a completed extraction run: evidence chips grouped per source,
// count of suggested fields linking to the review surface, and the model badge.
function ContextRunCard({ proposalId, message, sourcesById }: {
  proposalId: string;
  message: ConversationMessage;
  sourcesById: Map<string, PrivateDocumentSource>;
}) {
  const [chips, setChips] = useState<Array<{ label: string; count: number }>>([]);
  const [fieldCount, setFieldCount] = useState<number | null>(null);

  useEffect(() => {
    if (!message.runId) return;
    let active = true;
    void getProposalContextAction(proposalId, message.runId).then(result => {
      if (!active || !result.success) return;
      const evidence = Array.isArray(result.data.evidence) ? result.data.evidence : [];
      const counts = new Map<string, number>();
      for (const row of evidence) {
        const versionId = isRecord(row) && typeof row.source_version_id === "string" ? row.source_version_id : "";
        const sourceId = versionId.startsWith("source:") ? versionId.slice("source:".length) : versionId;
        const label = sourcesById.get(sourceId)?.originalFilename || "Attached source";
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      setChips([...counts.entries()].map(([label, count]) => ({ label, count })));
      setFieldCount(Array.isArray(result.data.operations) ? result.data.operations.length : 0);
    });
    return () => { active = false; };
  }, [proposalId, message.runId, sourcesById]);

  const reviewHref = `/proposals/proposal-edit?proposalId=${proposalId}`;
  return (
    <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <SourceChips chips={chips} />
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Results</p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800">{message.content}</p>
      {fieldCount !== null && (
        <Link href={reviewHref} className="mt-2 inline-block rounded-lg border border-[#087f69] px-3 py-1.5 text-xs font-semibold text-[#087f69] transition-colors hover:bg-emerald-50">
          Review &amp; apply {fieldCount} extracted field{fieldCount === 1 ? "" : "s"}
        </Link>
      )}
      <CardFooter detailsHref={reviewHref} />
    </div>
  );
}

// The version a draft run was generated against. The run payload is the raw
// database row, so the snake_case column is authoritative; the camelCase name
// is accepted for older/normalised payloads. Anything else stays unknown — the
// staleness hint is never rendered on a guess.
const draftRunVersion = (run: unknown): number | null => {
  if (!isRecord(run)) return null;
  const raw = run.expected_proposal_version ?? run.expectedProposalVersion;
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
};

// Details of a completed draft run: read-only sections rendered inline, plus a
// quiet staleness hint when the proposal moved on after the draft was written.
function DraftRunCard({ proposalId, message, currentProposalVersion, draftBusy, onRegenerate }: {
  proposalId: string;
  message: ConversationMessage;
  currentProposalVersion: number | undefined;
  draftBusy: boolean;
  onRegenerate: () => void;
}) {
  const [sections, setSections] = useState<ProposalDraftSection[]>([]);
  const [run, setRun] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!message.runId) return;
    let active = true;
    void getProposalDraftAction(proposalId, message.runId).then(result => {
      if (!active || !result.success) return;
      setSections(result.data.sections ?? []);
      setRun(isRecord(result.data.run) ? result.data.run : null);
    });
    return () => { active = false; };
  }, [proposalId, message.runId]);

  const draftVersion = draftRunVersion(run);
  // Both versions must be known: a missing version means "unknown", not "stale".
  const stale = draftVersion !== null && typeof currentProposalVersion === "number" && currentProposalVersion > draftVersion;

  const detailsHref = `/proposals/proposal-edit?proposalId=${proposalId}`;
  return (
    <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Results</p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800">{message.content}</p>
      {stale && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="min-w-0 text-xs text-amber-900">This draft was written before your latest answers.</p>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={draftBusy}
            aria-busy={draftBusy}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {draftBusy && <Loader2 size={12} className="animate-spin" aria-hidden />}
            {draftBusy ? "Generating…" : "Regenerate draft"}
          </button>
        </div>
      )}
      {/* The draft reads as a document: every section open, so a planner can
          scan the whole thing without opening eight disclosures. */}
      {sections.length > 0 && (
        <article className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/70">
          {sections.map(section => (
            <section key={section.id} className="p-3">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{section.heading}</h4>
              <div className="mt-1.5 space-y-2">
                {section.paragraphs.length > 0
                  ? section.paragraphs.map((paragraph, index) => (
                      <div key={index}>
                        <p className="text-sm leading-relaxed text-slate-700">{paragraph.text}</p>
                        {paragraph.citations.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1" aria-label="Sources">
                            {paragraph.citations.map(citation => (
                              <span
                                key={citation}
                                data-citation={citation}
                                className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500"
                              >
                                {citationLabel(citation)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  : <p className="text-sm italic text-slate-400">Nothing supported by evidence yet for this section.</p>}
              </div>
            </section>
          ))}
        </article>
      )}
      <CardFooter detailsHref={detailsHref} detailsLabel="View draft" />
    </div>
  );
}

// "Here's what I captured" overview: the key details already on the proposal
// plus the explicit next step (generate the draft). It replaces the old
// no-questions notice and disappears once a draft run exists.
// `showActions` is false when the completion progress card is on screen — that
// card then owns the single primary action for the whole thread.
function OverviewCard({ proposalId, eventName, rows, detailCount, detailSource, pendingReview, busy, error, showActions, hasDraft, onGenerateDraft, onRunReadiness, readinessBusy }: {
  proposalId: string;
  detailSource: "sources" | "answers" | "both";
  eventName: string | null;
  rows: OverviewRow[];
  detailCount: number;
  pendingReview: number;
  busy: boolean;
  error: string | null;
  showActions: boolean;
  hasDraft: boolean;
  onGenerateDraft: () => void;
  onRunReadiness?: () => void;
  readinessBusy: boolean;
}) {
  const editorHref = `/proposals/proposal-edit?proposalId=${proposalId}`;
  const title = eventName && eventName !== PLACEHOLDER_EVENT_NAME ? eventName : "your proposal";
  return (
    <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Here&rsquo;s what I have for {title}</p>
      {rows.length > 0 && (
        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {rows.map(row => (
            <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1">
              <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">{row.label}</dt>
              <dd className="min-w-0 truncate text-right text-sm text-slate-800" title={row.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {detailCount > 0 && (
        <p className="mt-2.5 text-xs text-slate-500">
          {detailCount} detail{detailCount === 1 ? "" : "s"} captured from{" "}
          {detailSource === "sources" ? "your sources" : detailSource === "answers" ? "your answers" : "your sources and answers"}.
        </p>
      )}
      {pendingReview > 0 && (
        <p className="mt-1 text-xs text-slate-600">
          {pendingReview} suggestion{pendingReview === 1 ? "" : "s"} need{pendingReview === 1 ? "s" : ""} your review.{" "}
          <Link href={editorHref} className="font-semibold text-[#087f69] underline underline-offset-2">Review suggestions</Link>
        </p>
      )}
      {showActions && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <CardActionRow
            proposalId={proposalId}
            hasDraft={hasDraft}
            draftBusy={busy}
            onGenerateDraft={onGenerateDraft}
            onRunReadiness={onRunReadiness}
            readinessBusy={readinessBusy}
          />
          <p className="mt-2 text-xs text-slate-500">Or add more details — upload another file, paste notes, or ask me anything.</p>
        </div>
      )}
      {showActions && error && <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">{error}</p>}
    </div>
  );
}

// The 3 thinnest sections, so the card names what is actually worth filling in
// next. Complete sections are never listed — this is a progress moment.
export const weakestSections = (report: GuidanceReport): GuidanceSectionCompleteness[] =>
  [...report.completeness]
    .filter(section => section.total > 0 && section.score < 1)
    .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label))
    .slice(0, 3);

// Shown once every key question is answered: a real progress summary from the
// deterministic guidance engine (percentage, slim bar, weakest sections) rather
// than a vague "everything else is optional". A failed check degrades to the
// plain headline — the actions always stay available.
function CompletionCard({ proposalId, report, checking, hasDraft, draftBusy, draftError, onGenerateDraft, onRunReadiness, readinessBusy }: {
  proposalId: string;
  report: GuidanceReport | null;
  checking: boolean;
  hasDraft: boolean;
  draftBusy: boolean;
  draftError: string | null;
  onGenerateDraft: () => void;
  onRunReadiness?: () => void;
  readinessBusy: boolean;
}) {
  const percent = report ? Math.round(report.overallCompleteness * 100) : null;
  const weakest = report ? weakestSections(report) : [];
  return (
    <div className="max-w-[85%] rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
      <p className="text-sm font-semibold text-emerald-900">
        {/* Not "X% complete": the stepper uses "complete" for how far
            through the workflow a proposal is, and this measures how much of
            the questionnaire is filled in. Two different questions deserve two
            different words, or a planner reads them as contradicting. */}
        {percent === null ? "Key questions answered." : `Your proposal details are ${percent}% filled in`}
      </p>
      {percent !== null && (
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Proposal completeness"
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100"
        >
          <div className="h-full rounded-full bg-[#087f69]" style={{ width: `${percent}%` }} />
        </div>
      )}
      {percent === null && checking && (
        <p role="status" className="mt-1 text-xs text-emerald-800">Checking what&rsquo;s left…</p>
      )}
      {weakest.length > 0 && (
        <ul className="mt-3 space-y-1">
          {weakest.map(section => (
            <li key={section.section || section.label} className="flex items-baseline justify-between gap-3 rounded-lg border border-emerald-100 bg-white px-2.5 py-1.5 text-xs text-slate-700">
              <span className="min-w-0 truncate" title={section.label}>{section.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-500">{section.filled}/{section.total}</span>
            </li>
          ))}
        </ul>
      )}
      {report && report.blockingCount > 0 && (
        <p className="mt-2 text-xs font-medium text-amber-800">
          {report.blockingCount} item{report.blockingCount === 1 ? "" : "s"} need{report.blockingCount === 1 ? "s" : ""} attention before publishing.
        </p>
      )}
      <CardActionRow
        proposalId={proposalId}
        hasDraft={hasDraft}
        draftBusy={draftBusy}
        onGenerateDraft={onGenerateDraft}
        onRunReadiness={onRunReadiness}
        readinessBusy={readinessBusy}
      />
      {draftError && <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">{draftError}</p>}
    </div>
  );
}

function GuidanceCard({ report }: { report: GuidanceReport }) {
  const blocking = report.findings.filter(f => f.severity === "blocking").length;
  const warnings = report.findings.filter(f => f.severity === "warning").length;
  return (
    <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Results — Readiness check</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">Overall completeness</p>
        <p className="text-xl font-bold text-slate-900">{Math.round(report.overallCompleteness * 100)}%</p>
      </div>
      <div aria-hidden className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#087f69]" style={{ width: `${Math.round(report.overallCompleteness * 100)}%` }} />
      </div>
      <p className="mt-2 text-sm text-slate-700">
        {report.findings.length === 0
          ? "No issues found. Your proposal fields look consistent."
          : `${report.findings.length} finding${report.findings.length === 1 ? "" : "s"} — ${blocking} blocking, ${warnings} worth reviewing.`}
      </p>
      {report.findings.slice(0, 3).map(finding => (
        <p key={`${finding.code}-${finding.paths.join(",")}`} className="mt-1.5 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs text-slate-700">
          {finding.message}
        </p>
      ))}
      <p className="mt-2 text-[11px] text-slate-400">Verified checks based on your proposal details.</p>
    </div>
  );
}

function InvestmentCard({ report, declaredBudget }: { report: InvestmentReport; declaredBudget: string }) {
  const summary = report.totalMidMinor !== null && report.currency
    ? `Estimated investment ${money(report.totalLowMinor, report.currency)} – ${money(report.totalHighMinor, report.currency)} (mid ${money(report.totalMidMinor, report.currency)}).`
    : "Investment guidance generated — some categories need more information before an estimate is possible.";
  return (
    <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Results — Investment guidance</p>
      <p className="mt-2 text-sm text-slate-800">{summary}</p>
      {declaredBudget && (
        <p className="mt-2 rounded-lg border border-cyan-100 bg-cyan-50 p-2 text-xs text-slate-700">
          Your stated planning budget is <strong>{declaredBudget}</strong>. The estimate below is scope-based guidance, not a replacement for that budget.
        </p>
      )}
      {report.lineItems.length > 0 && (
        <ul className="mt-2 space-y-1">
          {report.lineItems.slice(0, 5).map(item => (
            <li key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 font-semibold">{money(item.midMinor, item.currency || report.currency)}</span>
            </li>
          ))}
        </ul>
      )}
      {report.refusals.length > 0 && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          {report.refusals.length} categor{report.refusals.length === 1 ? "y" : "ies"} need more information: {report.refusals.map(r => r.ask).join(" ")}
        </p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">Range guidance from approved pricing records.</p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AssistantWorkspacePage({ initialProposalId }: { initialProposalId?: string }) {
  const router = useRouter();
  const [proposalId, setProposalId] = useState<string | null>(initialProposalId ?? null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  // The full proposal document backs the captured-details overview; the
  // breadcrumb reads its event name from the same fetch.
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null);
  const [text, setText] = useState("");
  // Guided clarification flow: progress across this session plus the latest
  // confirmed value ("Rooms: 6") shown after a successful answer.
  const [answeredCount, setAnsweredCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [lastConfirmed, setLastConfirmed] = useState<{ label: string; value: string } | null>(null);
  // ChatGPT-style staged attachments: picking a file only adds a chip to the
  // composer; the actual upload happens when the message is sent.
  const [staged, setStaged] = useState<File[]>([]);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // Files already uploaded during a failed send attempt keep their source id so
  // a retry does not upload them a second time.
  const uploadedRef = useRef(new Map<File, string>());
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesText, setNotesText] = useState("");
  // Rail source removal: which row is asking for confirmation, which one has a
  // delete in flight, and per-row failure messages.
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removingSourceId, setRemovingSourceId] = useState<string | null>(null);
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [localCards, setLocalCards] = useState<LocalCard[]>([]);
  const [guidanceBusy, setGuidanceBusy] = useState(false);
  const [segmentBusy, setSegmentBusy] = useState(false);
  const [investmentBusy, setInvestmentBusy] = useState(false);
  const [proposalVersion, setProposalVersion] = useState<number>();
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  // Completion progress summary: one deterministic guidance run per
  // proposal+version, kept out of render by a ref guard.
  const [completionReport, setCompletionReport] = useState<GuidanceReport | null>(null);
  const [completionChecking, setCompletionChecking] = useState(false);
  const completionRunRef = useRef<{ proposalId: string; version: number | null } | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const creatingRef = useRef(false);

  // Grow for both explicit newlines and browser-wrapped lines. Counting
  // newlines alone leaves long single-line messages hidden inside a one-row
  // textarea.
  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden";
  }, [text]);

  const {
    data, loading, loadError, refresh, pending, sendMessage, retrySend,
    resolveQuestion, questionBusyId, questionError,
  } = useConversation(proposalId);
  const { notesJob, notesJobId, notesError, notesBusy, submitNotes } = useNotesScan(proposalId);
  const { uploadJob, uploadJobId, uploadError, upload } = useSourceUpload(proposalId);
  // Auto-orchestration: a send with attachments queues a watch on the new
  // sources' scans; when all of them are ready one extract_requirements message
  // is sent automatically (exactly once per originating send).
  const { queueAutoExtract, dropSource, autoScanning, scanCount, failedNotices } = useAutoExtraction(proposalId, sendMessage);
  const { sources, refresh: refreshSources } = useProposalSources(proposalId, `${notesJobId ?? ""}:${uploadJobId ?? ""}:${notesJob?.status ?? ""}:${uploadJob?.status ?? ""}:${autoScanning}`);

  const messages = useMemo(() => data?.messages ?? [], [data]);
  const openQuestions = (data?.questions ?? []).filter(item => item.status === "open");
  // answer message id -> the question it answered, so the thread can replay the
  // question above the answer instead of showing a bare value.
  const askedByAnswerMessageId = useMemo(
    () => new Map((data?.questions ?? []).flatMap(item => (item.answeredMessageId ? [[item.answeredMessageId, item] as const] : []))),
    [data],
  );
  const readySources = sources.filter(item => item.status === "ready" && item.confidentiality === "non_confidential");
  const sourcesById = useMemo(() => new Map(sources.map(source => [source.id, source])), [sources]);
  const sending = pending.some(item => item.state === "sending");
  const started = !!proposalId || messages.length > 0 || pending.length > 0 || localCards.length > 0;
  const completedContextRuns = messages.filter(m => m.runType === "proposal_context" && m.status === "complete").length;

  // Auto-apply after extraction: the latest completed proposal_context run is
  // handed to useAutoApply, which fires once per runId across open tabs
  // (localStorage guard),
  // accepts only empty + high-confidence candidates, and polls the application
  // job. A successful application refreshes the conversation and breadcrumb
  // (the event name typically populates from the applied fields).
  const latestContextRunId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.runType === "proposal_context" && message.status === "complete" && message.runId) return message.runId;
    }
    return null;
  }, [messages]);
  const [autoApplyRefreshes, setAutoApplyRefreshes] = useState(0);
  const onAutoApplied = useCallback(() => {
    setAutoApplyRefreshes(count => count + 1);
    void refresh();
  }, [refresh]);
  const autoApply = useAutoApply(proposalId, latestContextRunId, onAutoApplied);

  // Captured-details overview: shown once an extraction has completed, no open
  // clarification question is waiting (the guided flow always goes first), and
  // auto-apply has either finished or had nothing to apply. It retires as soon
  // as a draft run exists — from then on the thread shows the draft itself.
  const hasDraftRun = messages.some(message => message.runType === "proposal_draft");
  const autoApplySettled = !autoApply || autoApply.phase !== "applying";
  const overviewRows = useMemo(() => buildOverviewRows(proposal), [proposal]);
  // A proposal built by conversation alone never has an extraction run, so the
  // hand-off also opens once questions have been answered or the proposal has
  // real content — otherwise that path dead-ends with no way to reach a draft.
  const answeredQuestions = (data?.questions ?? []).filter(question => question.status === "answered").length;
  const hasCapturedContent = completedContextRuns > 0 || answeredQuestions > 0 || overviewRows.length > 0;
  const showOverview = hasCapturedContent && !loading && !!data
    && openQuestions.length === 0 && autoApplySettled && !hasDraftRun;
  const overviewDetailCount = autoApply?.phase === "applied" ? autoApply.added : overviewRows.length;
  const overviewPendingReview = autoApply?.phase === "applied" ? autoApply.needsReview : 0;
  // Details reach a proposal by extraction, by answered questions, or both.
  const overviewDetailSource: "sources" | "answers" | "both" =
    completedContextRuns > 0 && answeredQuestions > 0 ? "both" : completedContextRuns > 0 ? "sources" : "answers";

  // The right rail only exists once the conversation has begun: messages exist
  // (including a proposal resumed from its route with history), a send is pending, or a
  // staged upload is in progress. Once shown it stays shown; its entrance is a
  // CSS-only slide-in-from-right keyframe animation played on mount.
  const conversationActive = messages.length > 0 || pending.length > 0 || sendBusy || localCards.length > 0;
  const [railVisible, setRailVisible] = useState(false);
  useEffect(() => {
    if (!conversationActive || railVisible) return;
    const frame = requestAnimationFrame(() => setRailVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [conversationActive, railVisible]);

  // Greeting name comes from the backend profile via the existing user action.
  useEffect(() => {
    let active = true;
    void getUserData().then(result => {
      if (!active || !result.ok || !isRecord(result.data)) return;
      const name = firstNameOf(result.data.name);
      if (name) setFirstName(name);
    });
    return () => { active = false; };
  }, []);

  // The proposal document backs both the breadcrumb title and the captured
  // details overview — refreshed when the conversation changes (e.g. after
  // extraction results are applied).
  useEffect(() => {
    if (!proposalId) return;
    let active = true;
    void getProposalByIdAction(proposalId).then(result => {
      if (!active || !result.success || !isRecord(result.data)) return;
      setProposal(result.data);
      const event = isRecord(result.data.event) ? result.data.event : null;
      const name = typeof event?.eventName === "string" ? event.eventName.trim() : "";
      if (name) setEventName(name);
    });
    return () => { active = false; };
  }, [proposalId, data?.conversation?.updatedAt, completedContextRuns, autoApplyRefreshes]);

  // The proposal document carries its own version, so a draft can be generated
  // from a conversation-only proposal that has no extraction run at all. The
  // context/review lookup stays as a fallback for older payloads.
  const fetchProposalVersion = useCallback(async (id: string): Promise<number | undefined> => {
    const current = await getProposalByIdAction(id);
    if (current.success && isRecord(current.data) && typeof current.data.version === "number") return current.data.version;
    const latest = await getLatestProposalContextAction(id);
    if (!latest.success || !isRecord(latest.data.run) || typeof latest.data.run.id !== "string") return undefined;
    const review = await getCandidateReviewAction(id, latest.data.run.id);
    return review.success ? review.data.proposalVersion : undefined;
  }, []);

  // The version is re-read after auto-apply (which bumps autoApplyRefreshes) so
  // a draft is never generated against a stale version.
  useEffect(() => {
    if (!proposalId) return;
    let active = true;
    void fetchProposalVersion(proposalId).then(version => {
      if (active && typeof version === "number") setProposalVersion(version);
    });
    return () => { active = false; };
  }, [proposalId, completedContextRuns, autoApplyRefreshes, data?.conversation?.updatedAt, fetchProposalVersion]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, pending.length, localCards.length, autoScanning, failedNotices.length, openQuestions.length, lastConfirmed, autoApply, showOverview]);

  // Lazy creation: the proposal only exists once the user contributes content.
  const ensureProposal = useCallback(async (): Promise<string | null> => {
    if (proposalId) return proposalId;
    if (creatingRef.current) return null;
    creatingRef.current = true;
    setCreateError(null);
    const result = await createProposalAction({
      event: { eventName: "Untitled proposal" },
      status: "unsubmitted",
      isDraft: true,
    } as unknown as ProposalData & { status?: "unsubmitted" });
    creatingRef.current = false;
    const id = isRecord(result.data) && typeof result.data._id === "string" ? result.data._id : null;
    if (!result.success || !id) {
      setCreateError(result.message || "The proposal could not be created. Please try again.");
      return null;
    }
    setProposalId(id);
    // Stay in place; only move the URL to the proposal's canonical assistant
    // route so resume/share links land on one surface.
    router.replace(`/proposals/${id}/assistant`);
    return id;
  }, [proposalId, router]);

  const handleSend = async () => {
    const value = text.trim();
    if (sending || sendBusy) return;
    if (!value && staged.length === 0) return;
    setSendError(null);
    const id = await ensureProposal();
    if (!id) return;
    // Upload every staged file first (sequentially): upload session -> PUT ->
    // complete -> scan job, all as non_confidential. On any failure the chips
    // stay staged and an inline error offers a retry of the whole send; files
    // that already uploaded are not uploaded again.
    const sourceIds: string[] = [];
    if (staged.length > 0) {
      setSendBusy(true);
      for (const file of staged) {
        let sourceId = uploadedRef.current.get(file) ?? null;
        if (!sourceId) sourceId = await upload(file, "non_confidential", id);
        if (!sourceId) {
          setSendBusy(false);
          setSendError(`${file.name} could not be uploaded.`);
          return;
        }
        uploadedRef.current.set(file, sourceId);
        sourceIds.push(sourceId);
      }
      setSendBusy(false);
    }
    const content = value || "Please review the attached file.";
    setText("");
    setStaged([]);
    uploadedRef.current.clear();
    const sent = await sendMessage({ content, intent: "chat", ...(sourceIds.length > 0 ? { sourceIds } : {}) }, id);
    // Attachments enter the governed source boundary and start extraction once
    // scanning succeeds. Ordinary chat remains conversation context; users can
    // explicitly promote longer text through the "Add notes" source control.
    if (sent && sourceIds.length > 0) queueAutoExtract(id, sourceIds);
  };

  // ChatGPT-style staged attach: picking a file only adds a composer chip; the
  // upload runs when the message is sent. Up to three files can be staged.
  const stageFile = useCallback((file: File) => {
    setSendError(null);
    setStaged(prev => (prev.length >= MAX_STAGED_FILES ? prev : [...prev, file]));
  }, []);

  const removeStaged = useCallback((index: number) => {
    setStaged(prev => {
      const file = prev[index];
      if (file) uploadedRef.current.delete(file);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Detaching a source from the rail. The row asks for confirmation inline
  // (never a window.confirm), the source is only dropped from the list once the
  // backend has actually deleted it, and a failure leaves the row in place with
  // the safe message underneath it.
  const handleRemoveSource = useCallback(async (sourceId: string) => {
    if (removingSourceId) return;
    setRemovingSourceId(sourceId);
    setRemoveErrors(prev => {
      const next = { ...prev };
      delete next[sourceId];
      return next;
    });
    const result = await deletePrivateDocumentSource(sourceId);
    setRemovingSourceId(null);
    setConfirmRemoveId(null);
    if (!result.success) {
      setRemoveErrors(prev => ({ ...prev, [sourceId]: result.message }));
      return;
    }
    // A removed source can never become ready, so it leaves any pending
    // extraction selection before the authoritative list is re-read.
    dropSource(sourceId);
    await refreshSources();
  }, [removingSourceId, dropSource, refreshSources]);

  const handleSaveNotes = async () => {
    if (!notesText.trim() || notesBusy) return;
    const id = await ensureProposal();
    if (!id) return;
    const saved = await submitNotes(notesText, "non_confidential", id);
    if (saved) { setNotesText(""); setNotesOpen(false); }
  };

  const runExtract = async () => {
    if (readySources.length === 0 || sending || !proposalId) return;
    await sendMessage({
      content: taskContent.extract_requirements,
      intent: "extract_requirements",
      sourceIds: readySources.slice(0, 5).map(source => source.id),
    });
  };

  const sendDraftMessage = async (version: number) => {
    await sendMessage({
      content: taskContent.generate_draft,
      intent: "generate_draft",
      expectedProposalVersion: version,
    });
  };

  const runDraft = async () => {
    if (typeof proposalVersion !== "number" || sending || !proposalId) return;
    await sendDraftMessage(proposalVersion);
  };

  // Same code path as the rail's "Generate draft" chip, and the single handler
  // behind every card-level generate/regenerate action. A card can be clicked
  // before the version lookup settled — in that case the CURRENT version is
  // re-read first so the draft never runs against a stale one.
  const runDraftFromCard = async () => {
    if (!proposalId || sending || draftBusy) return;
    setDraftError(null);
    let version = proposalVersion;
    if (typeof version !== "number") {
      setDraftBusy(true);
      version = await fetchProposalVersion(proposalId);
      setDraftBusy(false);
      if (typeof version === "number") setProposalVersion(version);
    }
    if (typeof version !== "number") {
      setDraftError("I couldn’t confirm the current version of your proposal. Open the editor, review the details, and try again.");
      return;
    }
    await sendDraftMessage(version);
  };

  // Closes the current run of typed messages into a source and starts
  // extraction, rather than waiting for the idle timer to do it.
  const runUseMessages = async () => {
    if (!proposalId || segmentBusy) return;
    setSegmentBusy(true);
    const result = await closeConversationSegmentAction(proposalId);
    setSegmentBusy(false);
    setLocalCards(prev => [...prev, result.success
      ? { id: crypto.randomUUID(), kind: "segment", created: result.data.created, reason: result.data.reason }
      : { id: crypto.randomUUID(), kind: "error", message: result.message }]);
    // A new source and its extraction run only show up on a refresh.
    if (result.success && result.data.created) await refreshSources();
  };

  const runGuidance = async () => {
    if (!proposalId || guidanceBusy) return;
    setGuidanceBusy(true);
    const result = await generateGuidanceAction(proposalId);
    setGuidanceBusy(false);
    setLocalCards(prev => [...prev, result.success
      ? { id: crypto.randomUUID(), kind: "guidance", report: result.data }
      : { id: crypto.randomUUID(), kind: "error", message: result.message }]);
  };

  const runInvestment = async () => {
    if (!proposalId || investmentBusy) return;
    setInvestmentBusy(true);
    const result = await generateInvestmentGuidanceAction(proposalId);
    setInvestmentBusy(false);
    setLocalCards(prev => [...prev, result.success
      ? { id: crypto.randomUUID(), kind: "investment", report: result.data }
      : { id: crypto.randomUUID(), kind: "error", message: result.message }]);
  };

  // Guided question flow: answer the current question inline; a success
  // confirms the value and advances, a validation failure (422) re-asks with
  // the friendly message. Skip dismisses the question and advances.
  const currentQuestion = openQuestions[0] ?? null;
  // Answers persist, so the resolved count must come from the conversation and
  // not only from this session — otherwise a refresh hides the progress card on
  // a proposal whose questions were all answered earlier.
  const resolvedQuestions = (data?.questions ?? []).filter(question => question.status !== "open").length;
  const answeredTotal = Math.max(answeredCount + skippedCount, resolvedQuestions);
  const questionProgressTotal = answeredTotal + openQuestions.length;
  const questionProgressCurrent = answeredTotal + 1;
  const questionsComplete = answeredTotal > 0 && !loading && !!data && openQuestions.length === 0;

  // Finishing the questions is a progress moment, so the card reports real
  // numbers: the guidance engine is deterministic and synchronous, so it is run
  // once per proposal+version. The ref (not state) is the guard, so a re-render
  // can never refire it; a later version bump refreshes the report exactly once.
  // A failure leaves the report null and the card falls back to a plain
  // headline — the flow is never blocked and no raw error is shown.
  useEffect(() => {
    if (!questionsComplete || !proposalId) return;
    const version = typeof proposalVersion === "number" ? proposalVersion : null;
    const previous = completionRunRef.current;
    const stale = !previous
      || previous.proposalId !== proposalId
      || (version !== null && previous.version !== null && previous.version !== version);
    if (!stale) return;
    completionRunRef.current = { proposalId, version };
    let active = true;
    setCompletionChecking(true);
    void (async () => {
      try {
        const result = await generateGuidanceAction(proposalId);
        if (!active) return;
        setCompletionReport(result?.success ? result.data : null);
        // The report knows the version it was computed for; recording it keeps
        // the "version changed" refresh accurate even if the lookup lagged.
        if (result?.success) completionRunRef.current = { proposalId, version: result.data.proposalVersion || version };
      } catch {
        if (active) setCompletionReport(null);
      } finally {
        if (active) setCompletionChecking(false);
      }
    })();
    return () => { active = false; };
  }, [questionsComplete, proposalId, proposalVersion]);

  const answerCurrentQuestion = async (answer: string) => {
    if (!currentQuestion) return;
    const question = currentQuestion;
    const resolved = await resolveQuestion(question.id, { status: "answered", answer });
    if (resolved) {
      setAnsweredCount(count => count + 1);
      setLastConfirmed({ label: questionFieldLabel(question), value: answer });
    }
  };

  const skipCurrentQuestion = async () => {
    if (!currentQuestion) return;
    const resolved = await resolveQuestion(currentQuestion.id, { status: "dismissed" });
    if (resolved) setSkippedCount(count => count + 1);
  };

  // A readiness report already on screen (the completion card's own numbers, or
  // a card produced by the rail action) retires the secondary button so the
  // user is never offered a check whose result they are already reading.
  const guidanceDisplayed = !!completionReport || localCards.some(card => card.kind === "guidance");

  const onComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const renderMessage = (message: ConversationMessage) => {
    if (message.role === "system_event") {
      return <li key={message.id} className="text-center text-xs text-slate-400">{message.content}</li>;
    }
    const mine = message.role === "user";
    if (mine) {
      // An answer on its own ("2027-04-14") carries no meaning, so the question
      // it resolved is replayed above it as quiet, assistant-side history.
      const asked = message.kind === "question_answer" ? askedByAnswerMessageId.get(message.id) ?? null : null;
      const askedImpact = asked?.impact ? impactLabels[asked.impact] : null;
      return (
        <li key={message.id} className="flex flex-col gap-1.5">
          {asked && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">
                <p className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Asked
                  {askedImpact && <span className="font-semibold normal-case tracking-normal text-slate-400">· {askedImpact}</span>}
                </p>
                <p className="whitespace-pre-wrap">{asked.prompt}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <div className="max-w-[75%] rounded-2xl rounded-br-md border border-[#00c2c9]/30 bg-[#00c2c9]/10 px-4 py-2.5 text-sm text-slate-900">
              {message.kind === "question_answer" && <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#087f69]">Answer</p>}
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.attachments.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {message.attachments.map(attachment => (
                    <li key={attachment.sourceId} className="rounded-full border border-[#00c2c9]/40 bg-white px-2 py-0.5 text-xs text-slate-600">
                      <span className="max-w-[10rem] truncate align-middle" title={attachment.filename}>{attachment.filename || "Attached source"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </li>
      );
    }
    const labels = message.runType ? runLabels[message.runType] : null;
    if (labels && message.status === "pending") {
      return <li key={message.id} className="flex justify-start"><SkeletonCard label={labels.pending} /></li>;
    }
    if (labels && message.status === "failed") {
      return (
        <li key={message.id} className="flex justify-start">
          <p role="alert" className="max-w-[85%] rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{labels.failed}</p>
        </li>
      );
    }
    if (message.runType === "proposal_context" && message.status === "complete" && proposalId) {
      return <li key={message.id} className="flex justify-start"><ContextRunCard proposalId={proposalId} message={message} sourcesById={sourcesById} /></li>;
    }
    if (message.runType === "proposal_draft" && message.status === "complete" && proposalId) {
      return (
        <li key={message.id} className="flex justify-start">
          <DraftRunCard
            proposalId={proposalId}
            message={message}
            currentProposalVersion={proposalVersion}
            draftBusy={draftBusy || sending}
            onRegenerate={() => void runDraftFromCard()}
          />
        </li>
      );
    }
    return (
      <li key={message.id} className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
          {(message.actions?.length ?? 0) > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {message.actions?.includes("download_room_schedule_template") && (
                <a
                  href="/files/RFPilot%20schedule-example-sheet.xlsx"
                  download
                  className="inline-flex items-center gap-2 rounded-lg bg-[#008ad2] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#006fa8]"
                >
                  <Download size={14} aria-hidden />
                  Download Sample Sheet
                </a>
              )}
              {message.actions?.includes("open_room_specifications") && proposalId && (
                <Link
                  href={`/proposals/proposal-edit?proposalId=${encodeURIComponent(proposalId)}&step=3`}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#008ad2] bg-white px-3 py-2 text-xs font-semibold text-[#008ad2] transition-colors hover:bg-[#008ad2]/5"
                >
                  <Upload size={14} aria-hidden />
                  Open Room Specifications &amp; Upload
                </Link>
              )}
            </div>
          )}
        </div>
      </li>
    );
  };

  const notesPresentation = notesJob ? presentJob(notesJob) : null;
  const uploadPresentation = uploadJob ? presentJob(uploadJob) : null;
  // Attaching only stages a chip, so the pickers stay enabled while scans run;
  // they are disabled once three files are staged or while a send uploads.
  const attachDisabled = staged.length >= MAX_STAGED_FILES || sendBusy;
  const attachDisabledTitle = attachDisabled
    ? (sendBusy ? "Wait for the current send to finish." : `You can attach up to ${MAX_STAGED_FILES} files per message.`)
    : undefined;

  const composer = (
    <div className="w-full">
      {sendBusy && (
        <p role="status" className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
          <Loader2 size={13} className="animate-spin text-[#00c2c9]" aria-hidden />
          Uploading {staged.length === 1 ? "your attachment" : "your attachments"}…
        </p>
      )}
      {sendError && (
        <p role="alert" className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <span className="min-w-0 truncate" title={sendError}>{sendError}</span>
          <button type="button" onClick={() => void handleSend()} className="shrink-0 font-semibold underline underline-offset-2">Retry</button>
        </p>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-[#00c2c9]">
        {staged.length > 0 && (
          <ul className="mb-1.5 flex flex-wrap gap-1.5 px-1 pt-1">
            {staged.map((file, index) => (
              <li key={`${file.name}-${index}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                <FileText size={12} className="shrink-0 text-slate-400" aria-hidden />
                <span className="max-w-[10rem] truncate" title={file.name}>{file.name}</span>
                <span className="shrink-0 text-[10px] text-slate-400">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeStaged(index)}
                  disabled={sendBusy}
                  className="shrink-0 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X size={12} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.csv,.txt"
            className="hidden"
            aria-label="Attach a file"
            onChange={event => { const file = event.target.files?.[0]; if (file) stageFile(file); event.target.value = ""; }}
          />
          <button
            type="button"
            aria-label="Attach a file"
            onClick={() => fileInputRef.current?.click()}
            disabled={attachDisabled}
            title={attachDisabledTitle}
            className="shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Paperclip size={17} aria-hidden />
          </button>
          <textarea
            ref={composerRef}
            value={text}
            onChange={event => setText(event.target.value)}
            onKeyDown={onComposerKeyDown}
            rows={1}
            placeholder="Describe your event or ask for help…"
            aria-label="Message the proposal assistant"
            className="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            aria-label="Send message"
            onClick={() => void handleSend()}
            disabled={(!text.trim() && staged.length === 0) || sending || sendBusy}
            className="shrink-0 rounded-full p-2.5 text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${DEEP} 100%)` }}
          >
            <ArrowUp size={16} aria-hidden />
          </button>
        </div>
      </div>
      {createError && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">{createError}</p>}
    </div>
  );

  const aiWorking = sending || autoScanning || draftBusy || guidanceBusy || investmentBusy;
  const aiStatus = autoScanning
    ? { title: "Reading your sources", detail: "Checking evidence and preparing requirements." }
    : draftBusy
      ? { title: "Writing your draft", detail: "Building cited sections from approved details." }
      : guidanceBusy
        ? { title: "Checking readiness", detail: "Reviewing completeness, risks, and open decisions." }
        : investmentBusy
          ? { title: "Building investment guidance", detail: "Calculating a scope-based planning range." }
          : sending
            ? { title: "Thinking through your request", detail: "The assistant is preparing the next response." }
            : { title: "Ready to help", detail: "Add information or choose a suggested next step." };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100/70 px-4 py-4 sm:px-6">
      {/* Shared keyframes: typing dots in the thread, rail slide-in and the
          staggered card entrance. All are gated behind motion-safe classes. */}
      <style>{`
        @keyframes typing-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.45; } 30% { transform: translateY(-0.25rem); opacity: 1; } }
        @keyframes rail-slide-in { from { opacity: 0; transform: translateX(1.5rem); } to { opacity: 1; transform: translateX(0); } }
        @keyframes rail-card-in { from { opacity: 0; transform: translateX(0.75rem) translateY(0.375rem); } to { opacity: 1; transform: translateX(0) translateY(0); } }
        @keyframes ai-glow { 0%, 100% { opacity: 0.35; transform: scale(0.9); } 50% { opacity: 0.75; transform: scale(1.08); } }
        @keyframes ai-orbit { to { transform: rotate(360deg); } }
      `}</style>
      {/* Top bar */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          <Link href="/proposals" className="font-medium text-slate-500 hover:text-slate-800">Proposals</Link>
          {proposalId && (
            <>
              <span aria-hidden className="text-slate-300">/</span>
              <span className="font-semibold text-slate-900">{eventName || "Untitled proposal"}</span>
            </>
          )}
        </nav>
        {/* No proposal exists until the conversation starts, so the edit
            escape hatch only appears once there is something to edit. */}
        {proposalId && (
          <Link
            href={`/proposals/proposal-edit?proposalId=${proposalId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 motion-safe:animate-[rail-card-in_0.3s_ease-out]"
          >
            <PencilLine size={14} aria-hidden />
            Edit all details
          </Link>
        )}
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:flex-row">
        {/* Workspace card */}
        {/* The card is height-bounded so the thread scrolls inside it and the
            composer stays put, instead of the whole page growing. */}
        <section aria-label="Proposal assistant workspace" className="flex max-h-[calc(100vh-8rem)] min-h-[70vh] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {!started ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
              <div
                aria-hidden
                className="h-24 w-24 rounded-full motion-safe:animate-[ai-orbit_8s_linear_infinite]"
                style={{
                  background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${ACCENT}55 35%, ${ACCENT} 70%, ${DEEP} 100%)`,
                  boxShadow: `0 0 60px 18px ${ACCENT}33, 0 0 25px 4px ${ACCENT}44`,
                }}
              />
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  Good {dayPart()}{firstName ? `, ${firstName}` : ""}
                </h1>
                <p className="mt-2 text-xl text-slate-500">
                  What&rsquo;s on{" "}
                  <span className="font-semibold" style={{ color: ACCENT }}>your mind?</span>
                </p>
              </div>
              <div className="w-full max-w-xl">{composer}</div>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1" aria-live="polite">
                {loadError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{loadError}</p>}
                {loading && <p role="status" className="text-sm text-slate-500">Loading the conversation…</p>}
                <ol className="space-y-3">
                  {messages.map(renderMessage)}
                  {autoApply?.phase === "applying" && (
                    <li className="flex justify-start">
                      <p role="status" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-500 shadow-sm">
                        Filling your proposal with {autoApply.count} extracted field{autoApply.count === 1 ? "" : "s"}…
                        <span aria-hidden className="ml-0.5 flex items-center gap-0.5">
                          {[0, 1, 2].map(dot => (
                            <span
                              key={dot}
                              className="h-1 w-1 rounded-full bg-[#00c2c9] motion-safe:animate-[typing-bounce_1.2s_ease-in-out_infinite]"
                              style={{ animationDelay: `${dot * 150}ms` }}
                            />
                          ))}
                        </span>
                      </p>
                    </li>
                  )}
                  {autoApply?.phase === "applied" && proposalId && (
                    <li className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 shadow-sm">
                        <p role="status" className="text-sm font-semibold text-emerald-900">
                          Added {autoApply.added} field{autoApply.added === 1 ? "" : "s"} to your proposal ✓{autoApply.needsReview > 0 ? ` — ${autoApply.needsReview} need${autoApply.needsReview === 1 ? "s" : ""} your review` : ""}
                        </p>
                        {autoApply.needsReview > 0 && (
                          <Link
                            href={`/proposals/proposal-edit?proposalId=${proposalId}`}
                            className="mt-1.5 inline-block text-xs font-semibold text-[#087f69] underline underline-offset-2"
                          >
                            Review &amp; apply
                          </Link>
                        )}
                      </div>
                    </li>
                  )}
                  {autoApply?.phase === "failed" && proposalId && (
                    <li className="flex justify-start">
                      {/* Quiet notice — auto-application never retries; the
                          manual review surface stays the recovery path. */}
                      <p className="max-w-[85%] rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        {autoApply.message}{" "}
                        <Link
                          href={`/proposals/proposal-edit?proposalId=${proposalId}`}
                          className="font-semibold text-[#087f69] underline underline-offset-2"
                        >
                          Review &amp; apply
                        </Link>
                      </p>
                    </li>
                  )}
                  {showOverview && proposalId && (
                    <li className="flex justify-start">
                      <OverviewCard
                        proposalId={proposalId}
                        eventName={eventName}
                        rows={overviewRows}
                        detailCount={overviewDetailCount}
                        detailSource={overviewDetailSource}
                        pendingReview={overviewPendingReview}
                        busy={draftBusy || sending}
                        error={draftError}
                        showActions={!questionsComplete}
                        hasDraft={hasDraftRun}
                        onGenerateDraft={() => void runDraftFromCard()}
                        onRunReadiness={guidanceDisplayed ? undefined : () => void runGuidance()}
                        readinessBusy={guidanceBusy}
                      />
                    </li>
                  )}
                  {localCards.map(card => (
                    <li key={card.id} className="flex justify-start">
                      {card.kind === "guidance" && <GuidanceCard report={card.report} />}
                      {card.kind === "investment" && <InvestmentCard report={card.report} declaredBudget={budgetTierLabel(proposal)} />}
                      {card.kind === "segment" && (
                        // Extraction from typed messages is otherwise silent:
                        // a source and applied fields would simply appear.
                        <p role="status" className="max-w-[85%] rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                          {card.created
                            ? "I saved what you've told me as a source and I'm pulling requirements from it. Anything I'm unsure about will come back as a question."
                            : segmentSkipReasons[card.reason ?? ""] ?? "There's nothing new for me to read yet."}
                        </p>
                      )}
                      {card.kind === "error" && <p role="alert" className="max-w-[85%] rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{card.message}</p>}
                    </li>
                  ))}
                  {pending.map(entry => (
                    <li key={entry.localId} className="flex justify-end">
                      <div className="max-w-[75%] rounded-2xl rounded-br-md border border-[#00c2c9]/30 bg-[#00c2c9]/10 px-4 py-2.5 text-sm text-slate-900 opacity-90">
                        <p className="whitespace-pre-wrap">{entry.content}</p>
                        {entry.state === "sending" && <p role="status" className="mt-1 text-xs text-slate-500">Sending…</p>}
                        {entry.state === "failed" && (
                          <p role="alert" className="mt-1 text-xs text-red-700">
                            {entry.errorMessage ?? "The message could not be sent."}{" "}
                            <button type="button" onClick={() => void retrySend(entry.localId)} className="font-semibold underline underline-offset-2">Retry</button>
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                  {failedNotices.map(notice => (
                    <li key={notice.sourceId} className="flex justify-start">
                      <p role="alert" className="max-w-[85%] rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        {`${notice.filename} couldn’t be processed — try re-uploading.`}
                      </p>
                    </li>
                  ))}
                  {sending && (
                    <li className="flex justify-start">
                      <div role="status" aria-label="The assistant is responding" className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
                        <span aria-hidden className="flex items-center gap-1">
                          {[0, 1, 2].map(dot => (
                            <span
                              key={dot}
                              className="h-1.5 w-1.5 rounded-full bg-slate-400 motion-safe:animate-[typing-bounce_1.2s_ease-in-out_infinite]"
                              style={{ animationDelay: `${dot * 150}ms` }}
                            />
                          ))}
                        </span>
                      </div>
                    </li>
                  )}
                  {autoScanning && !sending && (
                    <li className="flex justify-start">
                      <p role="status" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-500 shadow-sm">
                        Checking your {scanCount === 1 ? "file" : "files"}…
                        <span aria-hidden className="ml-0.5 flex items-center gap-0.5">
                          {[0, 1, 2].map(dot => (
                            <span
                              key={dot}
                              className="h-1 w-1 rounded-full bg-[#00c2c9] motion-safe:animate-[typing-bounce_1.2s_ease-in-out_infinite]"
                              style={{ animationDelay: `${dot * 150}ms` }}
                            />
                          ))}
                        </span>
                      </p>
                    </li>
                  )}
                  {(guidanceBusy || investmentBusy) && (
                    <li className="flex justify-start">
                      <SkeletonCard label={guidanceBusy ? "Running the readiness check…" : "Preparing investment guidance…"} />
                    </li>
                  )}
                  {lastConfirmed && (
                    <li className="flex justify-start">
                      <p role="status" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800">
                        {lastConfirmed.label}: {lastConfirmed.value} ✓
                      </p>
                    </li>
                  )}
                  {/* Keep the conversational turn coherent: field-gap
                      questions may synchronize before the assistant reply is
                      ready, but the next question must not jump ahead of that
                      reply in the thread. */}
                  {currentQuestion && !sending && (
                    <li className="flex justify-start">
                      <GuidedQuestionCard
                        key={currentQuestion.id}
                        question={currentQuestion}
                        current={questionProgressCurrent}
                        total={questionProgressTotal}
                        busy={questionBusyId === currentQuestion.id}
                        error={questionError}
                        minimumDate={minimumDateForQuestion(currentQuestion, proposal)}
                        maximumDate={maximumDateForQuestion(currentQuestion, proposal)}
                        onAnswer={answer => void answerCurrentQuestion(answer)}
                        onSkip={() => void skipCurrentQuestion()}
                      />
                    </li>
                  )}
                  {questionsComplete && proposalId && (
                    <li className="flex justify-start">
                      <CompletionCard
                        proposalId={proposalId}
                        report={completionReport}
                        checking={completionChecking}
                        hasDraft={hasDraftRun}
                        draftBusy={draftBusy || sending}
                        draftError={draftError}
                        onGenerateDraft={() => void runDraftFromCard()}
                        onRunReadiness={guidanceDisplayed ? undefined : () => void runGuidance()}
                        readinessBusy={guidanceBusy}
                      />
                    </li>
                  )}
                </ol>
                <div ref={threadEndRef} />
              </div>
              <div className="mt-4">{composer}</div>
            </>
          )}
        </section>

        {/* Right rail — hidden until the conversation begins, then slides in
            from the right (CSS-only; skipped under prefers-reduced-motion). */}
        {railVisible && (
        <aside aria-label="Proposal assistant tools" className="w-full shrink-0 space-y-4 rounded-3xl border border-slate-200/80 bg-white/45 p-2 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm motion-safe:animate-[rail-slide-in_300ms_ease-out_both] lg:max-h-[calc(100vh-8rem)] lg:w-80 lg:overflow-y-auto">
          <section
            aria-labelledby="rail-ai-title"
            tabIndex={0}
            className="relative overflow-hidden rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-[#062f3a] via-[#075569] to-[#087f69] p-4 text-white shadow-lg outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2 motion-safe:animate-[rail-card-in_360ms_ease-out_both]"
          >
            <div aria-hidden className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#00c2c9]/30 blur-2xl motion-safe:animate-[ai-glow_2.8s_ease-in-out_infinite]" />
            <div className="relative flex items-start gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10">
                {aiWorking && <span className="absolute inset-[-4px] rounded-2xl border border-dashed border-[#67e8f9]/70 motion-safe:animate-[ai-orbit_5s_linear_infinite]" />}
                <Sparkles size={18} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100">AI workspace</p>
                <h2 id="rail-ai-title" className="mt-1 text-sm font-bold">{aiStatus.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-cyan-50/80">{aiStatus.detail}</p>
              </div>
            </div>
            <dl className="relative mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/15 bg-white/10 p-2">
                <dt className="text-[9px] uppercase tracking-wide text-cyan-100/70">Sources</dt>
                <dd className="mt-0.5 text-sm font-bold">{readySources.length}</dd>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-2">
                <dt className="text-[9px] uppercase tracking-wide text-cyan-100/70">Captured</dt>
                <dd className="mt-0.5 text-sm font-bold">{overviewDetailCount}</dd>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-2">
                <dt className="text-[9px] uppercase tracking-wide text-cyan-100/70">Questions</dt>
                <dd className="mt-0.5 text-sm font-bold">{openQuestions.length}</dd>
              </div>
            </dl>
            <div className="relative mt-3 flex items-center gap-2 text-[10px] font-semibold text-cyan-50/80">
              <span className={`h-2 w-2 rounded-full ${aiWorking ? "bg-cyan-300 motion-safe:animate-pulse" : "bg-emerald-300"}`} />
              {aiWorking ? "AI is actively working" : "Secure proposal context is ready"}
            </div>
          </section>
          {/* Sources — the three rail cards share the slide-in but each fades
              and translates in with a ~100ms stagger for a noticeable entrance. */}
          <section aria-labelledby="rail-sources-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 focus-within:border-cyan-300 focus-within:shadow-md hover:-translate-y-0.5 hover:shadow-md motion-safe:animate-[rail-card-in_360ms_ease-out_both]" style={{ animationDelay: "80ms" }}>
            <h2 id="rail-sources-title" className="text-sm font-bold text-slate-900">Sources</h2>
            <p className="mt-0.5 text-xs text-slate-500">Add files or notes to this proposal</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachDisabled}
                title={attachDisabledTitle}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
              >
                <Upload size={13} aria-hidden />
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setNotesOpen(open => !open)}
                aria-expanded={notesOpen}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <StickyNote size={13} aria-hidden />
                Add notes
              </button>
            </div>
            {notesOpen && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Notes
                  <textarea
                    value={notesText}
                    onChange={event => setNotesText(event.target.value)}
                    rows={4}
                    placeholder="Paste or type notes to attach to this proposal…"
                    className="mt-1 w-full resize-none rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleSaveNotes()}
                  disabled={!notesText.trim() || notesBusy}
                  className="mt-2 w-full rounded-lg bg-[#087f69] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {notesBusy ? "Saving notes…" : "Save notes"}
                </button>
              </div>
            )}
            {(uploadPresentation || notesPresentation) && (
              <div role="status" className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-2.5 text-xs text-slate-700">
                {uploadPresentation && <p><span className="font-semibold">File:</span> {uploadPresentation.title}</p>}
                {notesPresentation && <p className={uploadPresentation ? "mt-1" : ""}><span className="font-semibold">Notes:</span> {notesPresentation.title}</p>}
              </div>
            )}
            {(uploadError || notesError) && (
              <p role="alert" className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">{uploadError || notesError}</p>
            )}
            {sources.length > 0 ? (
              <ul aria-label="Attached sources" className="mt-3 space-y-1.5">
                {sources.map(source => {
                  const removing = removingSourceId === source.id;
                  const removeError = removeErrors[source.id];
                  return (
                    <li key={source.id} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-slate-700" title={source.originalFilename}>{source.originalFilename}</span>
                        {source.origin === "conversation" && (
                          // The planner never pressed "add this as a source" for
                          // these — the system built them from what was typed —
                          // so they must not look like an attached file.
                          <span
                            className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800"
                            title="Built from your messages and used for extraction"
                          >
                            from chat
                          </span>
                        )}
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${source.status === "ready" ? "bg-emerald-100 text-emerald-800" : source.status === "failed" ? "bg-red-100 text-red-800" : "bg-white text-slate-600"}`}>
                          {source.status.replaceAll("_", " ")}
                        </span>
                        {confirmRemoveId === source.id ? (
                          // Inline confirmation, so nothing leaves the page and
                          // the row keeps its own context while deciding.
                          <span className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleRemoveSource(source.id)}
                              disabled={removing}
                              className="rounded-full border border-red-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {removing ? "Removing…" : "Remove?"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveId(null)}
                              disabled={removing}
                              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Remove ${source.originalFilename}`}
                            onClick={() => { setConfirmRemoveId(source.id); }}
                            disabled={!!removingSourceId}
                            className="shrink-0 rounded-full p-0.5 text-slate-300 transition-colors hover:bg-slate-200 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <X size={12} aria-hidden />
                          </button>
                        )}
                      </div>
                      {removeError && <p role="alert" className="mt-1 text-[11px] text-red-700">{removeError}</p>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-400">No sources yet. Add a file or notes to get started.</p>
            )}
            <p className="mt-3 text-[11px] text-slate-400">Files are scanned and processed privately for this proposal.</p>
          </section>

          {/* Suggested tasks */}
          <section aria-labelledby="rail-tasks-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 focus-within:border-cyan-300 focus-within:shadow-md hover:-translate-y-0.5 hover:shadow-md motion-safe:animate-[rail-card-in_360ms_ease-out_both]" style={{ animationDelay: "160ms" }}>
            <h2 id="rail-tasks-title" className="text-sm font-bold text-slate-900">Suggested tasks</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runUseMessages()}
                disabled={segmentBusy || sending || messages.length === 0 || !isChatExtractionEnabled()}
                title={
                  !isChatExtractionEnabled()
                    ? segmentSkipReasons.disabled
                    : messages.length === 0
                      ? "Tell me about your event first."
                      : "Turn what you've typed into a source and pull requirements from it."
                }
                aria-busy={segmentBusy}
                className="rounded-full border border-[#087f69] px-3 py-1.5 text-xs font-semibold text-[#087f69] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                {segmentBusy ? "Reading your messages…" : "Use what I've told you"}
              </button>
              <button
                type="button"
                onClick={() => void runExtract()}
                disabled={readySources.length === 0 || sending}
                title={readySources.length === 0 ? "Add at least one ready source first." : undefined}
                className="rounded-full border border-[#087f69] px-3 py-1.5 text-xs font-semibold text-[#087f69] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                Extract requirements
              </button>
              <button
                type="button"
                onClick={() => void runDraft()}
                disabled={typeof proposalVersion !== "number" || sending}
                title={typeof proposalVersion !== "number" ? "Review extracted requirements first to establish the proposal version." : undefined}
                className="rounded-full border border-[#087f69] px-3 py-1.5 text-xs font-semibold text-[#087f69] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                Generate draft
              </button>
              <button
                type="button"
                onClick={() => void runGuidance()}
                disabled={!proposalId || guidanceBusy}
                title={!proposalId ? "Start the conversation to create the proposal first." : undefined}
                className="rounded-full border border-[#087f69] px-3 py-1.5 text-xs font-semibold text-[#087f69] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                {guidanceBusy && <Loader2 size={11} className="mr-1 inline animate-spin" aria-hidden />}
                Run readiness check
              </button>
              <button
                type="button"
                onClick={() => void runInvestment()}
                disabled={!proposalId || investmentBusy}
                title={!proposalId ? "Start the conversation to create the proposal first." : undefined}
                className="rounded-full border border-[#087f69] px-3 py-1.5 text-xs font-semibold text-[#087f69] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                {investmentBusy && <Loader2 size={11} className="mr-1 inline animate-spin" aria-hidden />}
                Investment guidance
              </button>
            </div>
          </section>

          {/* Suggested questions */}
          <section aria-labelledby="rail-questions-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 focus-within:border-cyan-300 focus-within:shadow-md hover:-translate-y-0.5 hover:shadow-md motion-safe:animate-[rail-card-in_360ms_ease-out_both]" style={{ animationDelay: "240ms" }}>
            <h2 id="rail-questions-title" className="text-sm font-bold text-slate-900">Suggested questions</h2>
            {openQuestions.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">
                {questionsComplete
                  ? "All key questions answered."
                  : "Open clarification questions from the assistant will appear here."}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-600">
                {`${openQuestions.length} ${openQuestions.length === 1 ? "question" : "questions"} remaining — answer them one at a time in the conversation.`}
              </p>
            )}
          </section>
        </aside>
        )}
      </div>
    </div>
  );
}
