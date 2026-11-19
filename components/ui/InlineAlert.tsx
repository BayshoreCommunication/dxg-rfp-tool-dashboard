import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// A message that stays in the page flow. Tone is carried by an icon and the title text as
// well as colour. Danger alerts interrupt screen readers (role="alert"); the rest are polite.

export type InlineAlertTone = "info" | "success" | "warning" | "danger";

const TONES: Record<InlineAlertTone, { box: string; title: string; icon: typeof Info }> = {
  info: { box: "border-action/40 bg-brand-soft", title: "text-action", icon: Info },
  success: { box: "border-success/40 bg-success-soft", title: "text-success-strong", icon: CheckCircle2 },
  warning: { box: "border-warning/50 bg-warning-soft", title: "text-warning-strong", icon: AlertTriangle },
  danger: { box: "border-danger/40 bg-danger-soft", title: "text-danger-strong", icon: AlertCircle },
};

export type InlineAlertProps = {
  tone: InlineAlertTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Optional trailing action, e.g. a retry Button. */
  action?: ReactNode;
  /** Defaults to "assertive" for danger and "polite" otherwise. */
  live?: "polite" | "assertive" | "off";
  className?: string;
};

export default function InlineAlert({ tone, title, children, action, live, className }: InlineAlertProps) {
  const { box, title: titleClass, icon: Icon } = TONES[tone];
  const mode = live ?? (tone === "danger" ? "assertive" : "polite");
  return (
    <div
      role={mode === "assertive" ? "alert" : mode === "polite" ? "status" : undefined}
      data-tone={tone}
      className={cn("flex items-start gap-3 rounded-card border px-4 py-3 text-sm text-body", box, className)}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", titleClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className={cn("font-semibold", titleClass)}>{title}</p> : null}
        {children ? <div className={cn("leading-6", title && "mt-0.5")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
