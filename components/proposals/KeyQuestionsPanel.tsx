"use client";

import { useState } from "react";
import Link from "next/link";

import type { ConversationQuestion } from "@/app/actions/conversation";
import {
  isStandaloneVideoRecordingPath,
  STANDALONE_VIDEO_RECORDING_STEP_ENABLED,
} from "@/lib/proposals/proposalExperience";
import { useConversation } from "./useConversation";

const impactLabels = {
  schedule: "Schedule",
  cost: "Investment",
  production: "Production",
  scope: "Scope",
} as const;

function QuestionControl({
  question,
  busy,
  error,
  onAnswer,
  onSkip,
}: {
  question: ConversationQuestion;
  busy: boolean;
  error: string | null;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
}) {
  // Seeded from the extraction-sourced suggestion when one exists (the native
  // date input accepts the same YYYY-MM-DD form the backend suggests).
  // Submitting it is still the planner's explicit confirmation.
  const [value, setValue] = useState(question.suggestedAnswer ?? "");
  const answer = value.trim();

  if (question.answerType === "choice") {
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {question.options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={busy}
            onClick={() => onAnswer(option)}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving…" : option}
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={onSkip}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Skip for now
        </button>
        {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <form
      className="mt-4 flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (answer && !busy) onAnswer(answer);
      }}
    >
      <label htmlFor={`question-${question.id}`} className="sr-only">
        Answer this question
      </label>
      <input
        id={`question-${question.id}`}
        type={
          question.answerType === "date"
            ? "date"
            : question.answerType === "number"
              ? "number"
              : "text"
        }
        min={question.answerType === "number" ? 0 : undefined}
        step={question.answerType === "number" ? 1 : undefined}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={busy}
        placeholder={question.answerType === "number" ? "Enter a number" : "Type your answer"}
        className="min-w-[14rem] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:bg-slate-50"
      />
      <button
        type="submit"
        disabled={busy || !answer}
        className="rounded-lg bg-[#087f69] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save answer"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onSkip}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Skip for now
      </button>
      {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
    </form>
  );
}

export default function KeyQuestionsPanel({
  proposalId,
  onQuestionResolved,
}: {
  proposalId: string;
  onQuestionResolved?: () => void | Promise<void>;
}) {
  const {
    data,
    loading,
    loadError,
    resolveQuestion,
    questionBusyId,
    questionError,
  } = useConversation(proposalId);
  const questions = (data?.questions ?? []).filter(
    (question) =>
      STANDALONE_VIDEO_RECORDING_STEP_ENABLED ||
      !question.paths.some(isStandaloneVideoRecordingPath),
  );
  const openQuestions = questions.filter((question) => question.status === "open");
  const answeredCount = questions.filter((question) => question.status === "answered").length;
  const currentQuestion = openQuestions[0];
  const total = answeredCount + openQuestions.length;

  // No count is reported upward. The server derives the open-question count
  // with the workflow phase and every consumer reads it from there; a second
  // count published from here could only ever disagree with it.

  const resolve = async (
    question: ConversationQuestion,
    input: { status: "answered" | "dismissed"; answer?: string },
  ) => {
    const resolved = await resolveQuestion(question.id, input);
    if (resolved) await onQuestionResolved?.();
  };

  if (loading) {
    return <p role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading key questions…</p>;
  }

  if (loadError) {
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</p>;
  }

  if (!currentQuestion) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h3 className="font-semibold text-emerald-900">All key questions answered</h3>
        <p className="mt-1 text-sm text-emerald-800">
          The confirmed answers have been applied to this proposal where possible.
        </p>
        <Link
          href={`/proposals/${proposalId}/assistant`}
          className="mt-3 inline-block text-sm font-semibold text-[#087f69] hover:underline"
        >
          Review the assistant conversation
        </Link>
      </div>
    );
  }

  const current = answeredCount + 1;
  const impact = currentQuestion.impact ? impactLabels[currentQuestion.impact] : null;

  return (
    <section aria-labelledby="key-question-title" className="rounded-xl border border-amber-200 bg-amber-50/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-800">
            Question {current} of {total}
          </p>
          {impact && <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-amber-800">{impact}</span>}
          {currentQuestion.severity === "blocking" && (
            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">Required</span>
          )}
        </div>
        <p className="text-xs text-slate-600">{openQuestions.length} remaining</p>
      </div>
      <h3 id="key-question-title" className="mt-3 text-base font-semibold text-slate-900">
        {currentQuestion.prompt || "Please confirm this proposal detail."}
      </h3>
      <QuestionControl
        key={currentQuestion.id}
        question={currentQuestion}
        busy={questionBusyId === currentQuestion.id}
        error={questionError}
        onAnswer={(answer) => void resolve(currentQuestion, { status: "answered", answer })}
        onSkip={() => void resolve(currentQuestion, { status: "dismissed" })}
      />
    </section>
  );
}
