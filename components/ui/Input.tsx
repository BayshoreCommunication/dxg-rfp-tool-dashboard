import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

// Control styles shared by Input and Textarea. The border uses the `control` token (3:1 on
// the surface) so the field boundary is perceivable without relying on fill colour.
export const controlClasses = (invalid?: boolean) =>
  cn(
    "w-full rounded-control border bg-surface px-3.5 text-sm text-heading placeholder:text-muted",
    "transition-colors hover:border-heading/40",
    "focus-visible:outline-none focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus",
    "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
    invalid ? "border-danger-strong" : "border-control",
  );

export type InputProps = ComponentPropsWithRef<"input"> & {
  /** Marks the control invalid (aria-invalid plus the danger border). */
  invalid?: boolean;
};

export default function Input({ invalid, className, type = "text", ...rest }: InputProps) {
  const ariaInvalid = invalid ? true : rest["aria-invalid"];
  return <input type={type} {...rest} aria-invalid={ariaInvalid} className={cn(controlClasses(Boolean(ariaInvalid)), "h-11", className)} />;
}
