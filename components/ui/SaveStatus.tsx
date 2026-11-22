"use client";

import { AlertCircle, CheckCircle2, Cloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "./Button";

// Autosave feedback for an editor: what is happening now, in words, with a way to recover from a
// failure. The text, not just the icon or colour, carries the state. It is a polite live region
// so a screen reader hears "Saving" and "All changes saved" without being interrupted.

export type SaveState = "idle" | "saving" | "saved" | "error";

const COPY: Record<SaveState, string> = {
  idle: "Autosave on",
  saving: "Saving…",
  saved: "All changes saved",
  error: "Save failed. Latest changes are not saved.",
};

export type SaveStatusProps = {
  state: SaveState;
  /** Shown as a Retry button while the state is "error". */
  onRetry?: () => void;
  className?: string;
};

export default function SaveStatus({ state, onRetry, className }: SaveStatusProps) {
  const tone =
    state === "error" ? "text-danger-strong" : state === "saved" ? "text-success-strong" : "text-body";
  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-xs font-semibold", className)}>
      <p role="status" aria-live="polite" data-state={state} className={cn("flex items-center gap-1.5", tone)}>
        {state === "saving" ? (
          <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden />
        ) : state === "saved" ? (
          <CheckCircle2 size={14} aria-hidden />
        ) : state === "error" ? (
          <AlertCircle size={14} aria-hidden />
        ) : (
          <Cloud size={14} aria-hidden />
        )}
        {COPY[state]}
      </p>
      {state === "error" && onRetry ? (
        <Button variant="danger" size="sm" onClick={onRetry} className="min-h-8 px-2.5 text-xs">
          Retry save
        </Button>
      ) : null}
    </div>
  );
}
