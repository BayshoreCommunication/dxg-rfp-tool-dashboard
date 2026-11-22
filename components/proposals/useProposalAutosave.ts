import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export const AUTOSAVE_DELAY_MS = 1500;
/** Automatic retries after a failed save, then it waits for the planner (Retry or another edit). */
export const AUTOSAVE_RETRY_DELAYS_MS = [5_000, 15_000, 45_000] as const;

type Options = {
  /** Autosave runs only while true (a saved draft that has finished loading). */
  enabled: boolean;
  /** Serialized form of everything that would be written. Equal strings mean nothing changed. */
  snapshot: string;
  /** Writes one serialized snapshot; resolves true when the server accepted it. */
  save: (snapshot: string) => Promise<boolean>;
  /** Holds autosave while an explicit save is running. */
  paused?: boolean;
  delayMs?: number;
};

/**
 * Debounced draft autosave with recovery.
 *
 * - The first snapshot after load is recorded as "already on the server", so opening a proposal
 *   and touching nothing writes nothing.
 * - Edits made while a save is in flight are written as soon as it finishes (the previous
 *   implementation dropped the retry and could leave them unsaved until the next edit).
 * - A failed save is retried automatically a few times with backoff, and `retry()` runs one now.
 */
export function useProposalAutosave({ enabled, snapshot, save, paused = false, delayMs = AUTOSAVE_DELAY_MS }: Options) {
  const [state, setState] = useState<AutosaveState>("idle");
  const savedRef = useRef<string | null>(null);
  const latestRef = useRef(snapshot);
  const saveRef = useRef(save);
  const inFlightRef = useRef(false);
  const failuresRef = useRef(0);

  useEffect(() => {
    latestRef.current = snapshot;
    saveRef.current = save;
  });

  const flush = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setState("saving");
    try {
      // Keep writing until the server matches the newest snapshot, including edits that
      // arrived while a request was in flight.
      for (;;) {
        const target = latestRef.current;
        if (target === savedRef.current) {
          setState("saved");
          failuresRef.current = 0;
          return;
        }
        const ok = await saveRef.current(target);
        if (!ok) {
          failuresRef.current += 1;
          setState("error");
          return;
        }
        savedRef.current = target;
        failuresRef.current = 0;
      }
    } catch {
      failuresRef.current += 1;
      setState("error");
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  // Debounced write after a change.
  useEffect(() => {
    if (!enabled) return;
    if (savedRef.current === null) {
      savedRef.current = snapshot;
      return;
    }
    if (snapshot === savedRef.current || paused) return;
    const timer = window.setTimeout(() => void flush(), delayMs);
    return () => window.clearTimeout(timer);
  }, [enabled, snapshot, paused, delayMs, flush]);

  // Bounded automatic retry after a failure.
  useEffect(() => {
    if (!enabled || state !== "error") return;
    const wait = AUTOSAVE_RETRY_DELAYS_MS[failuresRef.current - 1];
    if (wait === undefined) return;
    const timer = window.setTimeout(() => void flush(), wait);
    return () => window.clearTimeout(timer);
  }, [enabled, state, flush]);

  /** Records that an explicit save just wrote this snapshot, so nothing is pending. */
  const markSaved = useCallback((written: string) => {
    savedRef.current = written;
    failuresRef.current = 0;
    setState("saved");
  }, []);

  /** True when the current form differs from what the server last accepted. */
  const hasUnsavedChanges = useCallback(
    () => savedRef.current !== null && latestRef.current !== savedRef.current,
    [],
  );

  return { state, retry: flush, markSaved, hasUnsavedChanges };
}
