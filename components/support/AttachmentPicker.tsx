"use client";

import { Paperclip, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_ATTACHMENT_MAX_FILES,
  formatBytes,
  validateSupportFile,
} from "@/lib/support/attachments";

export default function AttachmentPicker({
  files,
  onChange,
  disabled = false,
  compact = false,
  iconOnly = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Paperclip button only, for use inside a chat composer. The wrapper uses
   *  `display: contents` so the composer can place the button and the file
   *  chips independently (chips go on their own row above the input). */
  iconOnly?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // Object URLs for image thumbnails; revoked when the selection changes.
  const previews = useMemo(
    () =>
      new Map(
        files
          .filter((file) => file.type.startsWith("image/") && typeof URL !== "undefined" && "createObjectURL" in URL)
          .map((file) => [file, URL.createObjectURL(file)] as const),
      ),
    [files],
  );
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const add = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    let error: string | null = null;
    for (const file of Array.from(incoming)) {
      if (next.length >= SUPPORT_ATTACHMENT_MAX_FILES) {
        error = `At most ${SUPPORT_ATTACHMENT_MAX_FILES} attachments per message.`;
        break;
      }
      const invalid = validateSupportFile(file);
      if (invalid) {
        error = invalid;
        continue;
      }
      if (!next.some((existing) => existing.name === file.name && existing.size === file.size)) next.push(file);
    }
    setProblem(error);
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const hint = `Up to ${SUPPORT_ATTACHMENT_MAX_FILES} files, 10 MB each`;
  return (
    <div className={iconOnly ? "contents" : compact ? "space-y-1.5" : "space-y-2"}>
      <div className={iconOnly ? "order-1 flex" : "flex flex-wrap items-center gap-2"}>
        <label
          htmlFor={inputId}
          title={iconOnly ? `Attach screenshot or PDF (${hint})` : undefined}
          className={
            iconOnly
              ? `inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 ${
                  disabled ? "pointer-events-none opacity-60" : ""
                }`
              : `inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 ${
                  disabled ? "pointer-events-none opacity-60" : ""
                }`
          }
        >
          <Paperclip className={iconOnly ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />
          <span className={iconOnly ? "sr-only" : undefined}>Attach screenshot or PDF</span>
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={SUPPORT_ATTACHMENT_ACCEPT}
          disabled={disabled}
          onChange={(event) => add(event.target.files)}
          className="sr-only"
        />
        {!iconOnly && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {files.length > 0 && (
        <ul className={`flex flex-wrap gap-2 ${iconOnly ? "order-first basis-full" : ""}`} aria-label="Files to attach">
          {files.map((file) => (
            <li
              key={`${file.name}-${file.size}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700"
            >
              {previews.get(file) && (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img src={previews.get(file)} alt="" className="h-8 w-8 rounded object-cover" />
              )}
              <span className="max-w-[180px] truncate">{file.name}</span>
              <span className="text-slate-400">{formatBytes(file.size)}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((item) => item !== file))}
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {problem && (
        <p role="alert" className={`text-[11px] font-semibold text-rose-700 ${iconOnly ? "order-first basis-full" : ""}`}>
          {problem}
        </p>
      )}
    </div>
  );
}
