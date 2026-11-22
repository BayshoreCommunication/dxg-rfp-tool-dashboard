import { Loader2 } from "lucide-react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Semantic-token button. `primary` uses the action colour (5.15:1 with its label), not the
// brand blue, so small labels stay readable. Colours come from app/styles/tokens.css and
// follow the active theme.

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border border-transparent bg-action text-on-action hover:bg-action-hover",
  secondary: "border border-control bg-surface text-heading hover:bg-surface-muted",
  ghost: "border border-transparent bg-transparent text-action hover:bg-brand-soft",
  danger: "border border-danger-strong bg-surface text-danger-strong hover:bg-danger-soft",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 gap-1.5 px-3 text-sm",
  md: "min-h-10 gap-2 px-4 text-sm",
  lg: "min-h-11 gap-2 px-5 text-base",
};

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button, sets aria-busy and swaps the leading icon for a spinner. */
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leadingIcon,
  trailingIcon,
  type = "button",
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      className={cn(
        "inline-flex items-center justify-center rounded-control font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
      ) : (
        leadingIcon
      )}
      {children}
      {trailingIcon}
    </button>
  );
}
