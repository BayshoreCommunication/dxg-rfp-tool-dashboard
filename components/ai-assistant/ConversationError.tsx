import { AlertCircle, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import type { AssistantUiError } from "@/lib/aiAssistant/types";

export default function ConversationError({
  error,
  retryAfterSeconds,
  onRetry,
  onDismiss,
  compact = false,
}: {
  error: AssistantUiError;
  retryAfterSeconds: number;
  onRetry: () => void;
  onDismiss: () => void;
  compact?: boolean;
}) {
  const authentication = error.code === "AUTHENTICATION_REQUIRED";
  if (compact) {
    const compactMessage = authentication
      ? "Sign in to use the Assistant"
      : error.code === "RATE_LIMITED"
        ? "Assistant is busy right now"
        : "Assistant is unavailable";
    return (
      <div
        role="alert"
        aria-label={error.message}
        className="flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-2.5 py-1.5 text-rose-900"
      >
        <AlertCircle size={14} aria-hidden className="shrink-0" />
        <p className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-4">
          {compactMessage}
        </p>
        {authentication ? (
          <Link
            href="/sign-in"
            className="shrink-0 rounded-lg bg-rose-900 px-2 py-1 text-[11px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            Sign in
          </Link>
        ) : (
          error.retryable && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retryAfterSeconds > 0}
              aria-label={
                retryAfterSeconds > 0
                  ? `Try again in ${retryAfterSeconds} seconds`
                  : "Retry"
              }
              title="Retry"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-900 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
            >
              <RefreshCw size={11} aria-hidden />
            </button>
          )
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-100 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-rose-900"
    >
      <AlertCircle size={17} aria-hidden className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{error.message}</p>
        {error.correlationId && (
          <p className="mt-1 break-all text-[11px] text-rose-700/75">
            Reference: {error.correlationId}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {authentication ? (
            <Link
              href="/sign-in"
              className="rounded-lg bg-rose-900 px-3 py-1.5 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
            >
              Sign in again
            </Link>
          ) : (
            error.retryable && (
              <button
                type="button"
                onClick={onRetry}
                disabled={retryAfterSeconds > 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={12} aria-hidden />
                {retryAfterSeconds > 0
                  ? `Try again in ${retryAfterSeconds}s`
                  : "Try again"}
              </button>
            )
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-100 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
      >
        <X size={15} aria-hidden />
      </button>
    </div>
  );
}
