"use client";

import { Archive, ArchiveRestore, FileText, LoaderCircle, ShieldAlert, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export type ProposalDeletionMode = "archive" | "permanent";

type ProposalDeletionDialogProps = {
  proposalName: string;
  mode: ProposalDeletionMode;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ProposalDeletionDialog({
  proposalName, mode, busy, error, onCancel, onConfirm,
}: ProposalDeletionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const warningId = useId();
  const permanent = mode === "permanent";
  const confirmLabel = busy ? (permanent ? "Deleting…" : "Archiving…") : (permanent ? "Delete forever" : "Move to archive");
  const ActionIcon = permanent ? Trash2 : Archive;
  const WarningIcon = permanent ? ShieldAlert : ArchiveRestore;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    // The native top layer keeps background interaction inert, including
    // sticky navigation and assistant overlays.
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const dismiss = () => { if (!busy) onCancel(); };

  return createPortal(
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={`${descriptionId} ${warningId}`}
      aria-busy={busy}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (!first) {
          event.preventDefault();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => { event.preventDefault(); dismiss(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[460px] overflow-hidden rounded-3xl border border-white/80 bg-white p-0 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.25)] backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm open:flex open:flex-col"
    >
      <div className="min-h-0 overflow-y-auto px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6">
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
            <ActionIcon size={26} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <button
            type="button"
            aria-label="Close proposal deletion dialog"
            onClick={dismiss}
            disabled={busy}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <h2 id={titleId} className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
          {permanent ? "Delete proposal forever?" : "Archive this proposal?"}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-500">
          {permanent ? "This will permanently remove the proposal." : "Move this proposal out of your active list."}
        </p>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3.5">
          <FileText size={20} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Proposal</p>
            <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-800 [overflow-wrap:anywhere]">{proposalName}</p>
          </div>
        </div>

        <div id={warningId} className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${permanent ? "border-rose-100 bg-rose-50 text-rose-800" : "border-amber-100 bg-amber-50/80 text-amber-900"}`}>
          <WarningIcon size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">{permanent ? "This cannot be undone" : "30 days to change your mind"}</p>
            <p className="mt-1 text-xs leading-5">
              {permanent ? "You won’t be able to restore it after deletion." : "Restore it from the Archive tab within 30 days. After that, it’s permanently deleted."}
            </p>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 break-words rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">{error}</p>}
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2.5 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:px-7">
        <button
          ref={cancelRef}
          type="button"
          onClick={dismiss}
          disabled={busy}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          aria-label={confirmLabel}
          onClick={() => { if (!busy) onConfirm(); }}
          disabled={busy}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ActionIcon size={17} aria-hidden="true" />}
          <span aria-live="polite">{confirmLabel}</span>
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
