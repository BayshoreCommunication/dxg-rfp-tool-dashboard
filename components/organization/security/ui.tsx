"use client";

import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "react-toastify";

export const labelClass = "mb-2 block text-sm font-semibold text-[#969798]";
export const inputClass =
  "h-10 w-full rounded-md border border-[#e4e4e4] bg-white px-3 text-sm text-[#222628] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(14,165,233,0.30)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
export const primaryButtonStyle = {
  background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)",
};
export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-md border border-[#e4e4e4] bg-white px-4 py-2 text-[13px] font-semibold text-[#222628] transition hover:bg-[#f5f6f8] disabled:cursor-not-allowed disabled:opacity-60";
export const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-4 py-2 text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60";

export const SectionCard = ({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) => (
  <section className="rounded-md border border-[#e4e4e4] bg-white px-5 py-6 md:px-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold leading-tight text-[#222628] md:text-[26px]">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm text-[#6b7280]">{description}</p> : null}
      </div>
      {badge}
    </div>
    <div className="mt-6">{children}</div>
  </section>
);

export const StatusPill = ({ on, onText = "On", offText = "Off" }: { on: boolean; onText?: string; offText?: string }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
      on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-slate-400"}`} />
    {on ? onText : offText}
  </span>
);

export const InlineError = ({ message }: { message?: string | null }) =>
  message ? (
    <p role="alert" className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {message}
    </p>
  ) : null;

export const CopyButton = ({ value, label = "Copy" }: { value: string; label?: string }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it by hand.");
    }
  };
  return (
    <button type="button" onClick={copy} className={secondaryButtonClass + " px-3 py-1.5 text-xs"} aria-label={`${label}`}>
      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
      {copied ? "Copied" : label}
    </button>
  );
};

export const ConfirmDialog = ({
  open,
  title,
  children,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-[#222628]">{title}</h3>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="mt-3 space-y-2 text-sm text-[#4b5563]">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className={secondaryButtonClass}>
            Cancel
          </button>
          {danger ? (
            <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex items-center justify-center rounded-md bg-rose-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-rose-700 disabled:opacity-60">
              {busy ? "Working..." : confirmLabel}
            </button>
          ) : (
            <button type="button" onClick={onConfirm} disabled={busy} className={primaryButtonClass} style={primaryButtonStyle}>
              {busy ? "Working..." : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
