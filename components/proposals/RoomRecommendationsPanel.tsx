"use client";

import { useEffect, useState } from "react";
import {
  autoApplyRoomRecommendationsAction,
  generateRoomRecommendationsAction,
  getLatestRoomRecommendationsAction,
  type RoomRecItem,
  type RoomRecRoom,
  type RoomRecRun,
} from "@/app/actions/roomRecommendations";

/**
 * Compact auto-fill panel: one click fills still-empty room fields from the
 * planner's confirmed selections and approved production rules. The UI stays
 * deliberately quiet — each filled value is a small chip whose "why" lives in
 * its tooltip; classification/confidence metadata is recorded server-side but
 * not rendered. Fields the planner already set are never overwritten, and
 * every value remains editable in the form below.
 */

const humanizeSegment = (segment: string) =>
  segment.replace(/([A-Z])/g, " $1").toLowerCase().trim();

const FIELD_LABELS: Record<string, string> = {
  "wirelessMics/wirelessMics": "Wireless mics",
  "wirelessMics/wirelessMicsQty": "Mic qty",
  "wirelessMics/wirelessMicsType": "Mic type",
};

const chipLabel = (item: RoomRecItem): string => {
  const relative = item.path.replace(/^\/content\/roomByRoom\/\d+\//, "");
  if (relative === "showCrewNeeded") return item.value;
  const label = FIELD_LABELS[relative] ?? humanizeSegment(relative.split("/").pop() ?? relative);
  return `${label}: ${item.value}`;
};

const chipTitle = (item: RoomRecItem, skipped: boolean): string => {
  const parts = [item.explanation];
  if (item.assumptions.length) parts.push(...item.assumptions.map((assumption) => `Assumes: ${assumption}`));
  if (skipped) parts.push("Left untouched — this field already had a value.");
  return parts.join("\n");
};

type Props = {
  proposalId: string;
  /** Called after fields are filled so the wizard re-seeds its rooms from the saved proposal. */
  onApplied?: () => void | Promise<void>;
};

const RoomRecommendationsPanel = ({ proposalId, onApplied }: Props) => {
  const [run, setRun] = useState<RoomRecRun | null>(null);
  const [appliedPaths, setAppliedPaths] = useState<Set<string>>(new Set());
  const [skippedPaths, setSkippedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await getLatestRoomRecommendationsAction(proposalId);
      if (!active) return;
      if (result.success) setRun(result.data);
      else if (result.code !== "RECOMMENDATIONS_NOT_FOUND" && result.code !== "ROOM_RECOMMENDATIONS_DISABLED") setError(result.message);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [proposalId]);

  const generateAndFill = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setConflict(null);
    const generated = await generateRoomRecommendationsAction(proposalId);
    if (!generated.success) {
      setError(generated.message);
      setBusy(false);
      return;
    }
    setRun(generated.data);
    const applied = await autoApplyRoomRecommendationsAction(proposalId, generated.data.id);
    if (!applied.success) {
      if (["PROPOSAL_VERSION_CONFLICT", "ROOM_IDENTITY_CONFLICT"].includes(applied.code)) setConflict(applied.message);
      else setError(applied.message);
      setBusy(false);
      return;
    }
    setAppliedPaths(new Set(applied.data.appliedPaths));
    setSkippedPaths(new Set(applied.data.skippedPaths ?? []));
    const count = applied.data.appliedPaths.length;
    setNotice(
      count === 0
        ? "Everything that can be filled is already set."
        : `${count} field${count === 1 ? "" : "s"} filled in — adjust anything below.`,
    );
    if (count > 0) await onApplied?.();
    setBusy(false);
  };

  const renderRoom = (room: RoomRecRoom) => {
    const hasContent = room.recommendations.length > 0 || room.clarificationQuestions.length > 0 || room.warnings.length > 0;
    if (!hasContent) return null;
    return (
      <section key={room.roomKey} aria-label={`Suggestions for ${room.roomLabel || `Room ${room.roomIndex + 1}`}`} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold text-slate-700">
            {room.roomLabel || `Room ${room.roomIndex + 1}`}
          </span>
          {room.recommendations.map((item) => {
            const skipped = skippedPaths.has(item.path) && !appliedPaths.has(item.path);
            return (
              <span
                key={item.recommendationKey}
                title={chipTitle(item, skipped)}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${
                  skipped
                    ? "bg-white text-slate-400 ring-slate-200"
                    : "bg-emerald-50 text-emerald-800 ring-emerald-200"
                }`}
              >
                {chipLabel(item)}
              </span>
            );
          })}
        </div>
        {room.warnings.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {room.warnings.map((warning) => (
              <li
                key={warning.code}
                role={warning.severity === "blocking" ? "alert" : undefined}
                className={`rounded-md px-2 py-1 text-xs ${warning.severity === "blocking" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}
              >
                {warning.message}
              </li>
            ))}
          </ul>
        )}
        {room.clarificationQuestions.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {room.clarificationQuestions.map((question) => (
              <li key={question.questionKey} className="rounded-md bg-violet-50 px-2 py-1 text-xs text-violet-900">
                {question.prompt}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  const payload = run?.payload;

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Smart fill</h3>
          <p className="text-xs text-slate-500">
            Fills empty room fields from your selections. Your own entries are never changed.
          </p>
        </div>
        <button
          type="button"
          onClick={generateAndFill}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Filling in…" : run ? "Fill again" : "Fill rooms for me"}
        </button>
      </div>

      {loading && <p role="status" className="mt-2 text-xs text-slate-500">Loading…</p>}
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
      {conflict && (
        <div role="alert" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p>{conflict}</p>
          <button type="button" onClick={generateAndFill} disabled={busy} className="mt-1.5 rounded-md border border-amber-300 px-2 py-0.5 text-xs font-medium">
            Try again
          </button>
        </div>
      )}
      {notice && <p role="status" className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>}

      {payload && (
        <div className="mt-3 space-y-2">
          {payload.globalWarnings.map((warning) => (
            <p key={warning.code} className={`rounded-md px-2 py-1 text-xs ${warning.severity === "blocking" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
              {warning.message}
            </p>
          ))}
          {payload.rooms.map(renderRoom)}
          {payload.globalClarificationQuestions.length > 0 && (
            <ul className="space-y-1">
              {payload.globalClarificationQuestions.map((question) => (
                <li key={question.questionKey} className="rounded-md bg-violet-50 px-2 py-1 text-xs text-violet-900">
                  {question.prompt}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomRecommendationsPanel;
