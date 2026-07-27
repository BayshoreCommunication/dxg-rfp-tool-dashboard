import { AlertCircle, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import type { AssistantUiError } from "@/lib/aiAssistant/types";

export default function ConversationError({
  error,
  retryAfterSeconds,
  onRetry,
  onDismiss,
}: {
  error: AssistantUiError;
  retryAfterSeconds: number;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const authentication = error.code === "AUTHENTICATION_REQUIRED";
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
