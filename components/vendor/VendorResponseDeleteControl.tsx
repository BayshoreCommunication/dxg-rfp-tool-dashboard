"use client";

import {
  deleteSelectedVendorResponsesAction,
  deleteVendorResponseAction,
} from "@/app/actions/vendorResponse";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";

type SingleDeleteProps = {
  scope: "single";
  responseId: string;
  vendorName: string;
};

type SelectedDeleteProps = {
  scope: "selected";
  count: number;
  responseIds: string[];
};

type Props = (SingleDeleteProps | SelectedDeleteProps) & {
  emphasis?: "quiet" | "danger";
  onDeleted?: () => void;
};

const responseWord = (count: number) =>
  count === 1 ? "response" : "responses";

export default function VendorResponseDeleteControl(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const warningId = useId();
  const selected = props.scope === "selected";
  const label = selected ? "Delete selected" : "Delete response";
  const dialogTitle = selected
    ? `Delete ${props.count} selected ${responseWord(props.count)}?`
    : `Delete response from “${props.vendorName || "this vendor"}”?`;
  const context = selected
    ? `This will permanently remove the selected vendor ${responseWord(props.count)}, including ${props.count === 1 ? "its" : "their"} attachments and generated analysis.`
    : "This will permanently remove this vendor response, including its attachments, submission history, and generated analysis.";
  const confirmLabel = busy
    ? "Deleting…"
    : selected
      ? `Delete ${props.count} ${responseWord(props.count)}`
      : "Delete response";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  const dismiss = () => {
    if (busy) return;
    setOpen(false);
    setError("");
  };

  const confirmDelete = () => {
    if (busy) return;
    setError("");
    startTransition(async () => {
      const result =
        props.scope === "single"
          ? await deleteVendorResponseAction(props.responseId)
          : await deleteSelectedVendorResponsesAction(props.responseIds);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setOpen(false);
      props.onDeleted?.();
      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          selected
            ? `${label} (${props.count})`
            : `${label} from ${props.vendorName || "vendor"}`
        }
        data-vendor-single-delete={props.scope === "single" ? "true" : undefined}
        className={
          props.emphasis === "danger"
            ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            : "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-gray-border px-3 text-sm font-extrabold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        }
      >
        <Trash2 size={15} aria-hidden="true" /> {label}
      </button>

      {open
        ? createPortal(
            <dialog
              ref={dialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={`${descriptionId} ${warningId}`}
              aria-busy={busy}
              onCancel={(event) => {
                event.preventDefault();
                dismiss();
              }}
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                const outside =
                  event.clientX < bounds.left ||
                  event.clientX > bounds.right ||
                  event.clientY < bounds.top ||
                  event.clientY > bounds.bottom;
                if (outside) dismiss();
              }}
              className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[540px] overflow-hidden rounded-[20px] border border-slate-200 bg-white p-0 text-slate-900 shadow-[0_28px_90px_rgba(2,15,27,0.34)] backdrop:bg-slate-950/55 backdrop:backdrop-blur-[3px] open:flex open:flex-col dark:border-[#2b4352] dark:bg-[#0d1d28] dark:text-slate-100"
            >
              <div className="min-h-0 overflow-y-auto px-6 py-6 sm:px-8">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-300">
                    <Trash2 size={23} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Delete {responseWord(selected ? props.count : 1)}
                    </p>
                    <h2
                      id={titleId}
                      className="mt-1.5 text-[22px] font-bold leading-7 tracking-tight text-slate-950 dark:text-white"
                    >
                      {dialogTitle}
                    </h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Close vendor response deletion dialog"
                    onClick={dismiss}
                    disabled={busy}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-200"
                  >
                    <X size={19} aria-hidden="true" />
                  </button>
                </div>

                <p
                  id={descriptionId}
                  className="mt-5 max-w-[54ch] text-[15px] leading-7 text-slate-600 dark:text-slate-300"
                >
                  {context}
                </p>

                <div
                  id={warningId}
                  className="mt-5 flex items-center gap-3 border-y border-slate-200 py-3 text-rose-700 dark:border-[#263d4c] dark:text-rose-300"
                >
                  <AlertTriangle
                    size={20}
                    className="shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold">
                    This action cannot be undone.
                  </p>
                </div>
                {error ? (
                  <p
                    role="alert"
                    className="mt-4 break-words rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={dismiss}
                    disabled={busy}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-white/5 dark:focus:ring-cyan-400 dark:focus:ring-offset-[#0d1d28]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={busy}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-600 dark:hover:bg-rose-500 dark:focus-visible:ring-offset-[#0d1d28]"
                  >
                    {busy ? (
                      <LoaderCircle
                        size={17}
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 size={17} aria-hidden="true" />
                    )}
                    <span aria-live="polite">{confirmLabel}</span>
                  </button>
                </div>
              </div>
            </dialog>,
            document.body,
          )
        : null}
    </>
  );
}
