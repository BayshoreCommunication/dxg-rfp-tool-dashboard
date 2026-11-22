"use client";

import { useState, type ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";
import { controlClasses } from "./Input";

export type TextareaProps = ComponentPropsWithRef<"textarea"> & {
  invalid?: boolean;
  /** Shows "n / maxLength" under the field. Needs `maxLength`. */
  showCount?: boolean;
};

export default function Textarea({ invalid, showCount, className, onChange, ...rest }: TextareaProps) {
  const [typedLength, setTypedLength] = useState(String(rest.defaultValue ?? "").length);
  const length = rest.value !== undefined ? String(rest.value).length : typedLength;
  const ariaInvalid = invalid ? true : rest["aria-invalid"];
  const counter = showCount && rest.maxLength ? (
    <p className="mt-1 text-right text-xs text-muted" data-testid="textarea-count">
      {length} / {rest.maxLength}
    </p>
  ) : null;

  return (
    <div>
      <textarea
        {...rest}
        aria-invalid={ariaInvalid}
        onChange={(event) => {
          setTypedLength(event.target.value.length);
          onChange?.(event);
        }}
        className={cn(controlClasses(Boolean(ariaInvalid)), "min-h-24 resize-y py-2.5 leading-6", className)}
      />
      {counter}
    </div>
  );
}
