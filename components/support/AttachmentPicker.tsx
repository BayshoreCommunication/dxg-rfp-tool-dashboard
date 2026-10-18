"use client";

import { Paperclip, X } from "lucide-react";
import { useId, useRef, useState } from "react";
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
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

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

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 ${
            disabled ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
          Attach screenshot or PDF
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
        <span className="text-[11px] text-slate-400">
          Up to {SUPPORT_ATTACHMENT_MAX_FILES} files, 10 MB each
        </span>
      </div>
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Files to attach">
          {files.map((file) => (
            <li
              key={`${file.name}-${file.size}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700"
            >
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
        <p role="alert" className="text-[11px] font-semibold text-rose-700">
          {problem}
        </p>
      )}
    </div>
  );
}
