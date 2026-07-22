"use client";

// Chat-first AI workspace for creating a proposal. Full-page layout: breadcrumb
// top bar, centered greeting empty state with a single composer, a threaded
// conversation once work starts, and a right rail (sources, suggested tasks,
// suggested questions) that slides in once the conversation has begun. Files
// picked via the paperclip or the rail are STAGED as chips in the composer and
// only uploaded when the message is sent. No proposal exists until the user
// first sends a message or saves notes — then one is created lazily and the
// URL is updated in place.

import {
  type ConversationMessage,
  type ConversationQuestion,
  type ConversationRunType,
} from "@/app/actions/conversation";
import { type PrivateDocumentSource } from "@/app/actions/durableJobs";
import { getCandidateReviewAction } from "@/app/actions/candidateApplication";
import { generateGuidanceAction, type GuidanceReport } from "@/app/actions/guidance";
import { generateInvestmentGuidanceAction, type InvestmentReport } from "@/app/actions/investment";
import { getLatestProposalContextAction, getProposalContextAction } from "@/app/actions/proposalContext";
import { getProposalDraftAction, type ProposalDraftSection } from "@/app/actions/proposalDraft";
import { createProposalAction, getProposalByIdAction } from "@/app/actions/proposals";
import { getUserData } from "@/app/actions/user";
import type { ProposalData } from "@/components/proposals/AddNewProposal";
import { presentJob } from "@/lib/asyncOperations";
import {
  ArrowUp, ClipboardCheck, Copy, FileText, Loader2, Paperclip, PencilLine,
  Sparkles, StickyNote, Upload, X,
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
  | { id: string; kind: "error"; message: string };

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

const copyText = (value: string) => {
  void navigator.clipboard?.writeText(value).catch(() => undefined);
};

const MAX_STAGED_FILES = 3;

const formatFileSize = (bytes: number) => {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${Math.round(bytes / 1_024)} KB`;
  return `${bytes} B`;
};

// ── Small presentational pieces ──────────────────────────────────────────────

function ModelBadge({ model }: { model: unknown }) {
  if (typeof model !== "string" || !model.trim()) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500" title="AI model used for this run">
      <Sparkles size={10} className="text-[#00c2c9]" aria-hidden />
      {model}
    </span>
  );
}

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

function CardFooter({ copyValue, detailsHref, detailsLabel }: { copyValue: string; detailsHref?: string; detailsLabel?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-2.5">
      <button
        type="button"
        onClick={() => { copyText(copyValue); setCopied(true); setTimeout(() => setCopied(false), 1_500); }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
      >
        {copied ? <ClipboardCheck size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </button>
      {detailsHref && (
        <Link href={detailsHref} className="text-xs font-semibold text-[#087f69] underline underline-offset-2">
          {detailsLabel ?? "View details"}
        </Link>
      )}
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
// thread, with progress, an impact tag, an answer input and a Skip action.
// An invalid answer (backend 422) keeps the question and shows the validation
// message so the user can re-answer.
function GuidedQuestionCard({ question, current, total, busy, error, onAnswer, onSkip }: {
  question: ConversationQuestion;
  current: number;
  total: number;
  busy: boolean;
  error: string | null;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
}) {
  // The caller keys this card by question id, so the input resets per question.
  const [value, setValue] = useState("");
  const impactLabel = question.impact ? impactLabels[question.impact] : null;
  return (
    <div className="max-w-[85%] rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Question {current} of {total}</p>
        {impactLabel && (
          <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-800">{impactLabel}</span>
        )}
        {question.severity === "blocking" && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">Blocking</span>
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">{question.prompt || question.code.replaceAll("_", " ").toLowerCase()}</p>
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={event => { event.preventDefault(); if (value.trim() && !busy) onAnswer(value.trim()); }}
      >
        <input
          type="text"
          value={value}
          onChange={event => setValue(event.target.value)}
          disabled={busy}
          placeholder="Type your answer…"
          aria-label="Answer this question"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#00c2c9]"
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="shrink-0 rounded-lg bg-[#087f69] px-3.5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving…" : "Answer"}
        </button>
        <button
          type="button"
          onClick={() => { if (!busy) onSkip(); }}
          disabled={busy}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Skip
        </button>
      </form>
      {error && <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">{error}</p>}
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
  const [model, setModel] = useState<unknown>(null);

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
      setModel(isRecord(result.data.run) ? result.data.run.model : null);
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
      <div className="mt-2"><ModelBadge model={model} /></div>
      <CardFooter copyValue={message.content} detailsHref={reviewHref} />
    </div>
  );
}

// Details of a completed draft run: read-only sections rendered inline.
function DraftRunCard({ proposalId, message }: { proposalId: string; message: ConversationMessage }) {
  const [sections, setSections] = useState<ProposalDraftSection[]>([]);
  const [model, setModel] = useState<unknown>(null);

  useEffect(() => {
    if (!message.runId) return;
    let active = true;
    void getProposalDraftAction(proposalId, message.runId).then(result => {
      if (!active || !result.success) return;
      setSections(result.data.sections ?? []);
      setModel(isRecord(result.data.run) ? result.data.run.model : null);
    });
    return () => { active = false; };
  }, [proposalId, message.runId]);

  const draftText = sections.map(section => `${section.heading}\n${section.paragraphs.map(p => p.text).join("\n")}`).join("\n\n") || message.content;
  const detailsHref = `/proposals/proposal-edit?proposalId=${proposalId}`;
  return (
    <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Results</p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800">{message.content}</p>
      {sections.length > 0 && (
        <div className="mt-3 space-y-2">
          {sections.map(section => (
            <details key={section.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">{section.heading}</summary>
              <div className="mt-2 space-y-2">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-sm text-slate-700">{paragraph.text}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
      <div className="mt-2"><ModelBadge model={model} /></div>
      <CardFooter copyValue={draftText} detailsHref={detailsHref} detailsLabel="View draft" />
    </div>
  );
}

// "Here's what I captured" overview: the key details already on the proposal
// plus the explicit next step (generate the draft). It replaces the old
// no-questions notice and disappears once a draft run exists.
function OverviewCard({ proposalId, eventName, rows, detailCount, pendingReview, busy, error, onGenerateDraft }: {
  proposalId: string;
  eventName: string | null;
  rows: OverviewRow[];
  detailCount: number;
  pendingReview: number;
  busy: boolean;
  error: string | null;
  onGenerateDraft: () => void;
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
          {detailCount} detail{detailCount === 1 ? "" : "s"} captured from your sources.
        </p>
      )}
      {pendingReview > 0 && (
        <p className="mt-1 text-xs text-slate-600">
          {pendingReview} suggestion{pendingReview === 1 ? "" : "s"} need{pendingReview === 1 ? "s" : ""} your review.{" "}
          <Link href={editorHref} className="font-semibold text-[#087f69] underline underline-offset-2">Review suggestions</Link>
        </p>
      )}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onGenerateDraft}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#087f69] px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <Loader2 size={12} className="animate-spin" aria-hidden />}
          Generate proposal draft
        </button>
        <p className="mt-2 text-xs text-slate-500">Or add more details — upload another file, paste notes, or ask me anything.</p>
        <Link href={editorHref} className="mt-1.5 inline-block text-xs font-semibold text-[#087f69] underline underline-offset-2">
          Edit all details
        </Link>
      </div>
      {error && <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">{error}</p>}
    </div>
  );
}

function GuidanceCard({ report }: { report: GuidanceReport }) {
  const blocking = report.findings.filter(f => f.severity === "blocking").length;
  const warnings = report.findings.filter(f => f.severity === "warning").length;
  const summary = `Readiness check: ${Math.round(report.overallCompleteness * 100)}% complete, ${report.findings.length} finding(s) (${blocking} blocking, ${warnings} to review).`;
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
      <p className="mt-2 text-[11px] text-slate-400">Deterministic checks — no AI-generated numbers. Engine {report.engineVersion}</p>
      <CardFooter copyValue={summary} />
    </div>
  );
}

function InvestmentCard({ report }: { report: InvestmentReport }) {
  const summary = report.totalMidMinor !== null && report.currency
    ? `Estimated investment ${money(report.totalLowMinor, report.currency)} – ${money(report.totalHighMinor, report.currency)} (mid ${money(report.totalMidMinor, report.currency)}).`
    : "Investment guidance generated — some categories need more information before an estimate is possible.";
  return (
    <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Results — Investment guidance</p>
      <p className="mt-2 text-sm text-slate-800">{summary}</p>
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
      <p className="mt-2 text-[11px] text-slate-400">Range guidance from approved pricing records. Engine {report.engineVersion}</p>
      <CardFooter copyValue={summary} />
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
  const [createError, setCreateError] = useState<string | null>(null);
  const [localCards, setLocalCards] = useState<LocalCard[]>([]);
  const [guidanceBusy, setGuidanceBusy] = useState(false);
  const [investmentBusy, setInvestmentBusy] = useState(false);
  const [proposalVersion, setProposalVersion] = useState<number>();
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const creatingRef = useRef(false);

  const {
    data, loading, loadError, refresh, pending, sendMessage, retrySend,
    resolveQuestion, questionBusyId, questionError,
  } = useConversation(proposalId);
  const { notesJob, notesJobId, notesError, notesBusy, submitNotes } = useNotesScan(proposalId);
  const { uploadJob, uploadJobId, uploadError, upload } = useSourceUpload(proposalId);
  // Auto-orchestration: a send with attachments queues a watch on the new
  // sources' scans; when all of them are ready one extract_requirements message
  // is sent automatically (exactly once per originating send).
  const { queueAutoExtract, autoScanning, scanCount, failedNotices } = useAutoExtraction(proposalId, sendMessage);
  const { sources } = useProposalSources(proposalId, `${notesJobId ?? ""}:${uploadJobId ?? ""}:${notesJob?.status ?? ""}:${uploadJob?.status ?? ""}:${autoScanning}`);

  const messages = useMemo(() => data?.messages ?? [], [data]);
  const openQuestions = (data?.questions ?? []).filter(item => item.status === "open");
  const readySources = sources.filter(item => item.status === "ready" && item.confidentiality === "non_confidential");
  const sourcesById = useMemo(() => new Map(sources.map(source => [source.id, source])), [sources]);
  const sending = pending.some(item => item.state === "sending");
  const started = !!proposalId || messages.length > 0 || pending.length > 0 || localCards.length > 0;
  const completedContextRuns = messages.filter(m => m.runType === "proposal_context" && m.status === "complete").length;

  // Auto-apply after extraction: the latest completed proposal_context run is
  // handed to useAutoApply, which fires once per runId (sessionStorage guard),
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
  const showOverview = completedContextRuns > 0 && !loading && !!data
    && openQuestions.length === 0 && autoApplySettled && !hasDraftRun;
  const overviewRows = useMemo(() => buildOverviewRows(proposal), [proposal]);
  const overviewDetailCount = autoApply?.phase === "applied" ? autoApply.added : overviewRows.length;
  const overviewPendingReview = autoApply?.phase === "applied" ? autoApply.needsReview : 0;

  // The right rail only exists once the conversation has begun: messages exist
  // (including a resumed ?proposalId with history), a send is pending, or a
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

  // Draft generation needs the reviewed proposal version — same lookup the
  // workflow shell uses (latest context run -> candidate review).
  const fetchProposalVersion = useCallback(async (id: string): Promise<number | undefined> => {
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
  }, [proposalId, completedContextRuns, autoApplyRefreshes, fetchProposalVersion]);

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
    // Stay in place; only reflect the new proposal in the URL for resume/share.
    router.replace(`/proposals/add-new-proposal?proposalId=${id}`);
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
    // A send that carried attachments starts the automatic extraction watch:
    // once every attached source's scan is ready, extraction runs on its own.
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

  // Same code path as the rail's "Generate draft" chip, but the overview card
  // can be clicked before the version lookup settled — in that case the current
  // version is re-read first so the draft never runs against a stale one.
  const runDraftFromOverview = async () => {
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
  const questionProgressTotal = answeredCount + skippedCount + openQuestions.length;
  const questionProgressCurrent = answeredCount + skippedCount + 1;
  const questionsComplete = answeredCount > 0 && !loading && !!data && openQuestions.length === 0;

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
      return (
        <li key={message.id} className="flex justify-end">
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
      return <li key={message.id} className="flex justify-start"><DraftRunCard proposalId={proposalId} message={message} /></li>;
    }
    return (
      <li key={message.id} className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
          <CardFooter copyValue={message.content} />
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
            rows={Math.min(6, Math.max(1, text.split("\n").length))}
            placeholder="Describe your event or ask for help…"
            aria-label="Message the proposal assistant"
            className="max-h-40 flex-1 resize-none bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100/70 px-4 py-4 sm:px-6">
      {/* Shared keyframes: typing dots in the thread, rail slide-in and the
          staggered card entrance. All are gated behind motion-safe classes. */}
      <style>{`
        @keyframes typing-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.45; } 30% { transform: translateY(-0.25rem); opacity: 1; } }
        @keyframes rail-slide-in { from { opacity: 0; transform: translateX(1.5rem); } to { opacity: 1; transform: translateX(0); } }
        @keyframes rail-card-in { from { opacity: 0; transform: translateX(0.75rem) translateY(0.375rem); } to { opacity: 1; transform: translateX(0) translateY(0); } }
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
                className="h-24 w-24 rounded-full"
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
                        pendingReview={overviewPendingReview}
                        busy={draftBusy || sending}
                        error={draftError}
                        onGenerateDraft={() => void runDraftFromOverview()}
                      />
                    </li>
                  )}
                  {localCards.map(card => (
                    <li key={card.id} className="flex justify-start">
                      {card.kind === "guidance" && <GuidanceCard report={card.report} />}
                      {card.kind === "investment" && <InvestmentCard report={card.report} />}
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
                  {currentQuestion && (
                    <li className="flex justify-start">
                      <GuidedQuestionCard
                        key={currentQuestion.id}
                        question={currentQuestion}
                        current={questionProgressCurrent}
                        total={questionProgressTotal}
                        busy={questionBusyId === currentQuestion.id}
                        error={questionError}
                        onAnswer={answer => void answerCurrentQuestion(answer)}
                        onSkip={() => void skipCurrentQuestion()}
                      />
                    </li>
                  )}
                  {questionsComplete && proposalId && (
                    <li className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                        <p className="text-sm font-semibold text-emerald-900">All key questions answered — everything else is optional.</p>
                        <p className="mt-1 text-sm text-emerald-800">Review your full proposal in the editor.</p>
                        <Link
                          href={`/proposals/proposal-edit?proposalId=${proposalId}`}
                          className="mt-2 inline-block rounded-lg bg-[#087f69] px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        >
                          Open the proposal editor
                        </Link>
                      </div>
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
        <aside className="w-full shrink-0 space-y-4 motion-safe:animate-[rail-slide-in_300ms_ease-out_both] lg:max-h-[calc(100vh-8rem)] lg:w-80 lg:overflow-y-auto lg:pr-1">
          {/* Sources — the three rail cards share the slide-in but each fades
              and translates in with a ~100ms stagger for a noticeable entrance. */}
          <section aria-labelledby="rail-sources-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm motion-safe:animate-[rail-card-in_360ms_ease-out_both]">
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
              <ul className="mt-3 space-y-1.5">
                {sources.map(source => (
                  <li key={source.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
                    <span className="min-w-0 flex-1 truncate text-slate-700" title={source.originalFilename}>{source.originalFilename}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${source.status === "ready" ? "bg-emerald-100 text-emerald-800" : source.status === "failed" ? "bg-red-100 text-red-800" : "bg-white text-slate-600"}`}>
                      {source.status.replaceAll("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-400">No sources yet. Add a file or notes to get started.</p>
            )}
            <p className="mt-3 text-[11px] text-slate-400">Files are scanned and processed privately for this proposal.</p>
          </section>

          {/* Suggested tasks */}
          <section aria-labelledby="rail-tasks-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm motion-safe:animate-[rail-card-in_360ms_ease-out_both]" style={{ animationDelay: "100ms" }}>
            <h2 id="rail-tasks-title" className="text-sm font-bold text-slate-900">Suggested tasks</h2>
            <div className="mt-3 flex flex-wrap gap-2">
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
          <section aria-labelledby="rail-questions-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm motion-safe:animate-[rail-card-in_360ms_ease-out_both]" style={{ animationDelay: "200ms" }}>
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
