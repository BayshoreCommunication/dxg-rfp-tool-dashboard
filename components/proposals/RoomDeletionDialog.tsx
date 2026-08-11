"use client";

import { AlertTriangle, CalendarDays, Trash2, Users, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type RoomDeletionDialogProps = {
  roomName: string;
  roomPosition: string;
  functionCount: number;
  peakAttendance?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function RoomDeletionDialog({
  roomName,
  roomPosition,
  functionCount,
  peakAttendance,
  onCancel,
  onConfirm,
}: RoomDeletionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const keepRoomRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    keepRoomRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-deletion-title"
        aria-describedby="room-deletion-description room-deletion-warning"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
      >
        <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
            <AlertTriangle size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
              Remove room
            </p>
            <h2 id="room-deletion-title" className="mt-1 truncate text-xl font-extrabold text-slate-950">
              Remove “{roomName}”?
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{roomPosition}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close room removal dialog"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5">
          <p id="room-deletion-description" className="text-sm leading-6 text-slate-600">
            This removes the room’s function schedule, AV requirements, staffing, and production settings. Event details and other rooms stay unchanged.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3" aria-label="Room removal impact">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <CalendarDays size={17} className="text-slate-500" aria-hidden="true" />
              <p className="mt-2 text-lg font-extrabold text-slate-900">{functionCount}</p>
              <p className="text-xs text-slate-500">
                scheduled function{functionCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Users size={17} className="text-slate-500" aria-hidden="true" />
              <p className="mt-2 text-lg font-extrabold text-slate-900">{peakAttendance || "—"}</p>
              <p className="text-xs text-slate-500">peak attendees</p>
            </div>
          </div>

          <p id="room-deletion-warning" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-700">
            This action cannot be undone.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            ref={keepRoomRef}
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
          >
            Keep room
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:translate-y-px"
          >
            <Trash2 size={16} aria-hidden="true" />
            Remove room
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
