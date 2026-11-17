"use client";

import { useEffect, useState } from "react";

/* Pacing for the moment a brief's extraction lands. The data arrives in one
   response; these hooks only decide how fast it is shown, so the conversation
   reads as the assistant working through the brief instead of three cards
   snapping in at once. Nothing here changes what is saved. */

export const REVEAL_ROW_STEP_MS = 140;
export const REVEAL_TYPE_MS = 900;
export const REVEAL_INTRO_MS = 1000;
export const REVEAL_GRACE_MS = 3000;

/** True when motion should be skipped: the user asked for reduced motion, or
 *  the environment cannot say (tests, very old browsers) — show everything
 *  at once rather than guess. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/** Climbs one step at a time toward `target`, at most one step per `stepMs`.
 *  Disabled, it returns the target directly; it never shows more than the
 *  target and follows a falling target down at once. */
export function useStaggeredCount(
  target: number,
  { enabled, stepMs = REVEAL_ROW_STEP_MS }: { enabled: boolean; stepMs?: number },
): number {
  const [shown, setShown] = useState(0);
  const displayed = Math.min(shown, target);
  useEffect(() => {
    if (!enabled || displayed >= target) return;
    const timer = window.setTimeout(
      () => setShown((value) => Math.min(Math.min(value, target) + 1, target)),
      stepMs,
    );
    return () => window.clearTimeout(timer);
  }, [displayed, enabled, stepMs, target]);
  return enabled ? displayed : target;
}

/** Types `parts` out in order over roughly `durationMs`. Disabled, it returns
 *  the full text. Each part comes back separately so callers keep their own
 *  paragraph markup; `done` is true once the last character is shown. */
export function useTypewriter(
  parts: string[],
  { enabled, durationMs = REVEAL_TYPE_MS }: { enabled: boolean; durationMs?: number },
): { parts: string[]; done: boolean } {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const [typed, setTyped] = useState(enabled ? 0 : total);
  useEffect(() => {
    if (!enabled || typed >= total) return;
    const frameMs = 16;
    const perFrame = Math.max(1, Math.ceil(total / Math.max(1, durationMs / frameMs)));
    const timer = window.setTimeout(() => setTyped((value) => Math.min(total, value + perFrame)), frameMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, enabled, total, typed]);
  const count = enabled ? Math.min(typed, total) : total;
  const shown = parts.map((part, index) => {
    const before = parts.slice(0, index).reduce((sum, earlier) => sum + earlier.length, 0);
    return part.slice(0, Math.max(0, count - before));
  });
  return { parts: shown, done: count >= total };
}
