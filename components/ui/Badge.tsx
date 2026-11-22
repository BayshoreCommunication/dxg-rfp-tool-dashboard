import type { ReactNode } from "react";

// A small status pill. Server component: no interactivity. Every tone pairs a tinted surface
// with text that keeps WCAG AA contrast on it, in the light theme and under the dark theme's
// remapping of these classes (app/globals.css).

// The first six tones are the original palette-class tones and keep their classes so the dark
// theme's existing remap still applies. The semantic tones below use the token layer.
export type BadgeTone =
  | "gray" | "blue" | "amber" | "purple" | "green" | "muted"
  | "success" | "warning" | "danger" | "info";

const TONES: Record<BadgeTone, string> = {
  gray: "border-slate-300 bg-slate-50 text-slate-700",
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  purple: "border-violet-200 bg-violet-50 text-violet-800",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  // Quieter than gray: no outline, for things that are out of the way (archived).
  muted: "border-transparent bg-slate-100 text-slate-600",
  success: "border-success/40 bg-success-soft text-success-strong",
  warning: "border-warning/50 bg-warning-soft text-warning-strong",
  danger: "border-danger/40 bg-danger-soft text-danger-strong",
  info: "border-action/40 bg-brand-soft text-action",
};

export type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
};

export default function Badge({ tone = "gray", children, className = "" }: BadgeProps) {
  return (
    <span
      data-tone={tone}
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4 ${TONES[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
