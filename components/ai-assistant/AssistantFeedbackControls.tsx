"use client";

import {
  ASSISTANT_FEEDBACK_REASONS,
  type AssistantDisplayMessage,
  type AssistantFeedbackReason,
  type AssistantFeedbackValue,
  type AssistantMessageFeedback,
  isRecord,
  parseAssistantFeedbackResult,
} from "@/lib/aiAssistant/types";
import { Check, ThumbsDown, ThumbsUp } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const reasonLabels: Record<AssistantFeedbackReason, string> = {
  incorrect: "Incorrect",
  outdated: "Outdated",
  did_not_understand: "Didn’t understand",
  missing_steps: "Missing steps",
  irrelevant: "Irrelevant",
  other: "Other",
};

type PendingFeedback = {
  value: AssistantFeedbackValue;
  reason: AssistantFeedbackReason | null;
  idempotencyKey: string;
};

export default function AssistantFeedbackControls({
  message,
}: {
  message: AssistantDisplayMessage;
}) {
  const [feedback, setFeedback] = useState<AssistantMessageFeedback | null>(
    message.feedback ?? null,
  );
  const [reasonOpen, setReasonOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pendingRef = useRef<PendingFeedback | null>(null);

  if (
    message.role !== "assistant" ||
    message.status !== "complete" ||
    !message.content
  ) {
    return null;
  }

  const submit = async (
    value: AssistantFeedbackValue,
    reason: AssistantFeedbackReason | null,
  ) => {
    const current = pendingRef.current;
    const pending =
      current && current.value === value && current.reason === reason
        ? current
        : {
            value,
            reason,
            idempotencyKey: crypto.randomUUID(),
          };
    pendingRef.current = pending;
    setBusy(true);
    setError(undefined);
    let response: Response;
    let payload: unknown;
    try {
      response = await fetch(
        `/api/ai-assistant/threads/${encodeURIComponent(message.threadId)}/messages/${encodeURIComponent(message.id)}/feedback`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            value,
            reason,
            idempotencyKey: pending.idempotencyKey,
          }),
        },
      );
      payload = await response.json();
    } catch {
      setBusy(false);
      setError("Feedback could not be saved. Try again.");
      return;
    }
    setBusy(false);
    if (!response.ok) {
      const body = isRecord(payload) ? payload : {};
      setError(
        typeof body.title === "string"
          ? body.title
          : "Feedback could not be saved. Try again.",
      );
      return;
    }
    const body = isRecord(payload) ? payload : {};
    const result = parseAssistantFeedbackResult(body.data);
    if (!result) {
      setError("Feedback could not be confirmed. Try again.");
      return;
    }
    pendingRef.current = null;
    setFeedback({
      value: result.feedback.value,
      reason: result.feedback.reason,
      updatedAt: result.feedback.updatedAt,
    });
    setReasonOpen(false);
  };

  const retry = () => {
    const pending = pendingRef.current;
    if (pending) {
      void submit(pending.value, pending.reason);
    }
  };

  return (
    <div className="mt-1.5">
      <div
        role="group"
        aria-label="Rate this response"
        className="flex min-h-7 items-center gap-1"
      >
        <button
          type="button"
          disabled={busy}
          aria-pressed={feedback?.value === "helpful"}
          aria-label="Helpful"
          onClick={() => void submit("helpful", null)}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]",
            feedback?.value === "helpful"
              ? "bg-emerald-50 font-semibold text-emerald-700"
              : "text-slate-400 hover:bg-white hover:text-slate-700",
          )}
        >
          {feedback?.value === "helpful" ? (
            <Check size={12} aria-hidden />
          ) : (
            <ThumbsUp size={12} aria-hidden />
          )}
          Helpful
        </button>
        <button
          type="button"
          disabled={busy}
          aria-pressed={feedback?.value === "not_helpful"}
          aria-expanded={reasonOpen}
          aria-label="Not helpful"
          onClick={() => {
            setError(undefined);
            setReasonOpen((current) => !current);
          }}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]",
            feedback?.value === "not_helpful"
              ? "bg-amber-50 font-semibold text-amber-700"
              : "text-slate-400 hover:bg-white hover:text-slate-700",
          )}
        >
          <ThumbsDown size={12} aria-hidden />
          Not helpful
        </button>
        {busy && (
          <span role="status" className="text-[10px] text-slate-400">
            Saving…
          </span>
        )}
      </div>

      {reasonOpen && (
        <div className="mt-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-700">
            What could be better? <span className="font-normal">(optional)</span>
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {ASSISTANT_FEEDBACK_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                disabled={busy}
                onClick={() => void submit("not_helpful", reason)}
                className="rounded-full border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:border-[#00c2c9]/50 hover:text-[#087f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
              >
                {reasonLabels[reason]}
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit("not_helpful", null)}
              className="rounded-full px-2 py-1 text-[10px] font-semibold text-slate-500 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
            >
              Skip reason
            </button>
          </div>
          <p className="mt-1.5 text-[10px] leading-4 text-slate-400">
            Feedback is reviewed for quality improvement. It does not change
            rules or answers automatically.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1 text-[10px] text-red-700">
          {error}{" "}
          <button
            type="button"
            disabled={busy}
            onClick={retry}
            className="font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
