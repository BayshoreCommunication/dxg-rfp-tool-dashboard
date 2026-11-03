"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type AccessDialogProps = {
  title: string;
  description?: ReactNode;
  busy?: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
};

// Native modal dialog in the same style as ProposalDeletionDialog. The body is not clipped
// (overflow-visible) so GlobalSelect menus can open past the dialog edge.
export default function AccessDialog({ title, description, busy = false, onClose, footer, children }: AccessDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const dismiss = () => { if (!busy) onClose(); };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={busy}
      onCancel={(event) => { event.preventDefault(); dismiss(); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-[560px] overflow-visible rounded-3xl border border-white/80 bg-white p-0 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.25)] backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm open:flex open:flex-col"
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="min-w-0">
          <h2 id={titleId} className="break-words text-xl font-bold tracking-tight text-slate-950 [overflow-wrap:anywhere]">{title}</h2>
          {description && <p id={descriptionId} className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          disabled={busy}
          aria-label="Close"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-50"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="px-5 pb-5 pt-4 sm:px-7 sm:pb-6">{children}</div>
      {footer && (
        <div className="flex shrink-0 flex-col-reverse gap-2.5 rounded-b-3xl border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          {footer}
        </div>
      )}
    </dialog>,
    document.body,
  );
}
