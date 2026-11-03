"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Small building blocks shared by the Users, Invitations and Teams screens. Classes follow
// components/settings/* and components/proposals/ProposalDeletionDialog.tsx.

export const labelClass = "mb-2 block text-sm font-semibold text-[#969798]";
export const inputClass =
  "h-10 w-full rounded-md border border-[#e4e4e4] bg-white px-3 text-sm text-[#222628] outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";
export const sectionClass = "rounded-md border border-[#e4e4e4] bg-white px-5 py-6 md:px-8";
export const sectionTitleClass = "text-xl font-semibold leading-none text-[#222628] md:text-[26px]";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";
export const primaryButtonClass =
  `inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_20px_rgba(14,165,233,0.30)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${focusRing}`;
export const primaryButtonStyle = { background: "linear-gradient(135deg, #2fc6f5 0%, #008ad2 100%)" };
export const secondaryButtonClass =
  `inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
export const dangerButtonClass =
  `inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
export const linkButtonClass =
  `rounded px-2 py-1 text-xs font-semibold text-[#008ad2] transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent ${focusRing}`;

const BADGE_TONES = {
  sky: "border-sky-100 bg-sky-50 text-sky-700",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50 text-amber-800",
  rose: "border-rose-100 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
  violet: "border-violet-100 bg-violet-50 text-violet-700",
} as const;
export type BadgeTone = keyof typeof BADGE_TONES;

export const Badge = ({ tone = "slate", children }: { tone?: BadgeTone; children: ReactNode }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${BADGE_TONES[tone]}`}>
    {children}
  </span>
);

export const ROLE_TONES: Record<string, BadgeTone> = {
  owner: "violet",
  organization_admin: "sky",
  team_manager: "amber",
  planner: "emerald",
  viewer: "slate",
};

export const Spinner = ({ size = 14 }: { size?: number }) => (
  <LoaderCircle size={size} className="animate-spin" aria-hidden="true" />
);

export const InlineError = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="break-words rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">
    {children}
  </p>
);

export const EmptyState = ({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[#e4e4e4] bg-[#fafbfc] px-6 py-12 text-center">
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-[#008ad2]">{icon}</div>
    <p className="text-sm font-semibold text-[#222628]">{title}</p>
    {body && <p className="mt-1 max-w-md text-sm text-slate-500">{body}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const TableSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-2" aria-hidden="true">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="h-12 w-full animate-pulse rounded-md bg-slate-100" />
    ))}
  </div>
);

type OrgDialogProps = {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  onClose: () => void;
  wide?: boolean;
};

// A modal on the native top layer, so the sidebar and assistant overlays stay inert behind it.
export const OrgDialog = ({ title, description, children, footer, busy, onClose, wide }: OrgDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    if (dialog && typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (dialog && typeof dialog.close === "function") dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const dismiss = () => {
    if (!busy) onClose();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] ${wide ? "max-w-[640px]" : "max-w-[480px]"} rounded-2xl border border-white/80 bg-white p-0 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.25)] backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm open:flex open:flex-col`}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
        <div className="min-w-0">
          <h2 id={titleId} className="text-xl font-bold tracking-tight text-slate-950">{title}</h2>
          {description && <div id={descriptionId} className="mt-1.5 text-sm leading-6 text-slate-500">{description}</div>}
        </div>
        <button type="button" onClick={dismiss} disabled={busy} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50">
          <X size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4 sm:px-7">{children}</div>
      {footer && (
        <div className="flex shrink-0 flex-col-reverse gap-2.5 rounded-b-2xl border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          {footer}
        </div>
      )}
    </dialog>,
    document.body,
  );
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const formatRelative = (value: string | null | undefined, now = Date.now()): string => {
  if (!value) return "Never";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "Never";
  const minutes = Math.round((now - time) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
};
