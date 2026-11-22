"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Owns the label, hint and error of one form control and hands the matching ids to the
// control, so every field is programmatically labelled and its error is announced.
//
//   <Field label="Event name" required error={error}>
//     {(a) => <Input {...a} value={v} onChange={...} />}
//   </Field>

export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

export type FieldProps = {
  label: ReactNode;
  /** Reuse an existing control id; one is generated otherwise. */
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  /** Shows a visible "Required" marker and aria-required. Colour is never the only cue. */
  required?: boolean;
  /** Shows a visible "Optional" marker. Ignored when `required`. */
  optional?: boolean;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

export default function Field({ label, htmlFor, hint, error, required, optional, className, children }: FieldProps) {
  const generated = useId();
  const id = htmlFor ?? generated;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-heading">
        {label}
        {required ? <span className="ml-1.5 text-xs font-normal text-muted">Required</span> : null}
        {!required && optional ? <span className="ml-1.5 text-xs font-normal text-muted">Optional</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs leading-5 text-muted">
          {hint}
        </p>
      ) : null}
      {children({
        id,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(error ? { "aria-invalid": true as const } : {}),
        ...(required ? { "aria-required": true as const } : {}),
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-semibold leading-5 text-danger-strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}
