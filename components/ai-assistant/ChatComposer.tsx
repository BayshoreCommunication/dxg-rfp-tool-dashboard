"use client";

import { ArrowUp, Square } from "lucide-react";
import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { ASSISTANT_MESSAGE_MAX_LENGTH } from "@/lib/aiAssistant/types";
import { cn } from "@/lib/utils";

export default function ChatComposer({
  value,
  busy,
  canSend,
  retryAfterSeconds,
  textareaRef,
  onChange,
  onSend,
  onAbort,
  compact = false,
  showKeyboardHint = true,
}: {
  value: string;
  busy: boolean;
  canSend: boolean;
  retryAfterSeconds: number;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onSend: () => void;
  onAbort: () => void;
  compact?: boolean;
  showKeyboardHint?: boolean;
}) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const composingRef = useRef(false);
  const activeRef = textareaRef ?? internalRef;
  const count = value.length;
  const nearLimit = count >= ASSISTANT_MESSAGE_MAX_LENGTH - 500;

  useEffect(() => {
    const textarea = activeRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > 144 ? "auto" : "hidden";
  }, [activeRef, value]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !composingRef.current &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      if (canSend) onSend();
    }
  };

  return (
    <div className="w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSend) onSend();
        }}
        className={cn(
          "flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_34px_-24px_rgba(15,23,42,0.6)] transition focus-within:border-[#00c2c9]/70 focus-within:ring-4 focus-within:ring-[#00c2c9]/10",
          compact ? "min-h-14" : "min-h-[58px]",
        )}
      >
        <label htmlFor="ai-assistant-composer" className="sr-only">
          Message the AI Assistant
        </label>
        <textarea
          id="ai-assistant-composer"
          ref={activeRef}
          value={value}
          rows={1}
          maxLength={ASSISTANT_MESSAGE_MAX_LENGTH}
          disabled={busy}
          aria-describedby={
            retryAfterSeconds > 0
              ? "ai-assistant-retry-status"
              : nearLimit
                ? "ai-assistant-character-count"
                : undefined
          }
          placeholder={
            compact
              ? "Ask about RFPilot…"
              : "Ask about proposals, events, or using the platform…"
          }
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
          }}
          className={cn(
            "max-h-36 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 leading-5 text-[#0e1b2b] outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60",
            compact
              ? "py-1.5 text-[13px] placeholder-shown:min-h-10"
              : "py-2.5 text-[15px] placeholder-shown:min-h-20 sm:placeholder-shown:min-h-10",
          )}
        />
        {busy ? (
          <button
            type="button"
            onClick={onAbort}
            aria-label="Stop assistant response"
            title="Stop response"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0e1b2b] text-white transition-colors hover:bg-[#1c3047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2"
          >
            <Square size={13} fill="currentColor" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00b8bf] text-white shadow-sm transition duration-200 hover:bg-[#009da4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            <ArrowUp size={17} strokeWidth={2.4} aria-hidden />
          </button>
        )}
      </form>
      {(showKeyboardHint || nearLimit) && (
        <div className="mt-1.5 flex min-h-4 items-center justify-between gap-3 px-1 text-[11px]">
          {showKeyboardHint ? (
            <span className="text-slate-600">
              Enter to send · Shift+Enter for a new line
            </span>
          ) : (
            <span />
          )}
          {nearLimit && (
            <span
              id="ai-assistant-character-count"
              className={cn(
                "shrink-0",
                count >= ASSISTANT_MESSAGE_MAX_LENGTH
                  ? "text-rose-600"
                  : "text-slate-400",
              )}
            >
              {count.toLocaleString()}/
              {ASSISTANT_MESSAGE_MAX_LENGTH.toLocaleString()}
            </span>
          )}
        </div>
      )}
      {retryAfterSeconds > 0 && (
        <p
          id="ai-assistant-retry-status"
          role="status"
          className="mt-1 text-center text-xs text-amber-700"
        >
          You can send again in {retryAfterSeconds}s.
        </p>
      )}
    </div>
  );
}
