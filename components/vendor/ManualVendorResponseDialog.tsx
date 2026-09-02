"use client";

import { createManualVendorResponseAction } from "@/app/actions/vendorResponse";
import {
  MANUAL_RESPONSE_EMAIL_PATTERN,
  MANUAL_RESPONSE_MAX_FILE_BYTES,
  MANUAL_RESPONSE_MAX_FILES,
  MANUAL_RESPONSE_REASONS,
  type ExistingVendorSummary,
  type ManualResponseReason,
} from "@/lib/vendorResponses/manualResponse";
import { cn } from "@/lib/utils";
import { FilePlus2, Loader2, Paperclip, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "react-toastify";

type RequiredField = "vendorName" | "submittedBy" | "email";
type FieldErrors = Partial<Record<RequiredField, string>>;
type FileEntry = { file: File; id: string };

const fileSizeLabel = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const validateField = (field: RequiredField, value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    if (field === "vendorName") return "Enter the vendor or company name.";
    if (field === "submittedBy") return "Enter who sent this response.";
    return "Enter the vendor's email address.";
  }
  if (field === "email" && !MANUAL_RESPONSE_EMAIL_PATTERN.test(trimmed)) {
    return "Enter a valid email address, such as name@company.com.";
  }
  return "";
};

const fieldClass = (hasError: boolean) =>
  cn(
    "min-h-11 w-full rounded-xl border bg-white px-3 text-sm text-navy outline-none transition placeholder:text-gray",
    hasError
      ? "border-red-400 focus:ring-2 focus:ring-red-200"
      : "border-gray-border hover:border-gray focus:border-brand focus:ring-2 focus:ring-brand-muted",
  );

const labelClass = "text-xs font-extrabold uppercase tracking-wide text-gray";

export default function ManualVendorResponseDialog({
  proposalId,
  existingVendors,
  emphasis = "secondary",
  defaultOpen = false,
}: {
  proposalId: string;
  existingVendors: ExistingVendorSummary[];
  emphasis?: "primary" | "secondary";
  /** Open immediately, for deep links such as "add the missing figures manually". */
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [vendorName, setVendorName] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState<ManualResponseReason>("vendor_revision");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idempotencyKeyRef = useRef<string>("");

  const matchedVendor = existingVendors.find(
    (vendor) => vendor.email === email.trim().toLowerCase(),
  );

  useEffect(() => {
    if (!open) {
      // Send focus back to the control that opened the dialog — but only after
      // a real close, never on first render.
      if (wasOpenRef.current) triggerRef.current?.focus();
      wasOpenRef.current = false;
      return;
    }
    wasOpenRef.current = true;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setOpen(false);
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    firstFieldRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, submitting]);

  const openDialog = () => {
    setVendorName("");
    setSubmittedBy("");
    setEmail("");
    setMessage("");
    setReason("vendor_revision");
    setFiles([]);
    setFieldErrors({});
    setFileError("");
    setError("");
    idempotencyKeyRef.current = crypto.randomUUID();
    setOpen(true);
  };

  const addFiles = (incoming: FileList | File[]) => {
    const problems: string[] = [];
    const accepted: FileEntry[] = [];
    const seen = new Set(files.map((entry) => entry.id));

    for (const file of Array.from(incoming)) {
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      if (file.size > MANUAL_RESPONSE_MAX_FILE_BYTES) {
        problems.push(`${file.name} exceeds the 10 MB limit`);
        continue;
      }
      if (seen.has(id)) {
        problems.push(`${file.name} was already attached`);
        continue;
      }
      seen.add(id);
      accepted.push({ file, id });
    }

    const room = Math.max(0, MANUAL_RESPONSE_MAX_FILES - files.length);
    const toAdd = accepted.slice(0, room);
    if (toAdd.length < accepted.length) {
      problems.push(`only ${MANUAL_RESPONSE_MAX_FILES} files can be attached`);
    }
    setFileError(problems.length > 0 ? `${problems.join("; ")}.` : "");
    setFiles((current) => [...current, ...toAdd]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const nextErrors: FieldErrors = {
      vendorName: validateField("vendorName", vendorName) || undefined,
      submittedBy: validateField("submittedBy", submittedBy) || undefined,
      email: validateField("email", email) || undefined,
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("proposalId", proposalId);
      formData.set("vendorName", vendorName.trim());
      formData.set("submittedBy", submittedBy.trim());
      formData.set("email", email.trim());
      formData.set("message", message.trim());
      formData.set("submissionIdempotencyKey", idempotencyKeyRef.current);
      if (matchedVendor) formData.set("submissionReason", reason);
      files.forEach(({ file }) => formData.append("documents", file));

      const result = await createManualVendorResponseAction(formData);
      if (!result.success) {
        setError(result.message);
        return;
      }
      toast.success(
        result.extractionStarted
          ? `${result.message} Reading the attached sources now.`
          : result.message,
      );
      setOpen(false);
      router.refresh();
    } catch {
      setError("The response could not be recorded. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={openDialog}
        className={cn(
          "inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:w-auto",
          emphasis === "primary"
            ? "bg-brand text-white hover:bg-brand-dark"
            : "border border-gray-border text-navy hover:border-brand hover:text-brand-dark",
        )}
      >
        <FilePlus2 size={16} aria-hidden="true" /> Add response manually
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy/40 p-0 sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-gray-border bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id={titleId}
                  className="text-lg font-extrabold leading-6 text-navy"
                >
                  Add a response on behalf of a vendor
                </h2>
                <p className="mt-1 text-sm leading-5 text-gray">
                  For responses that arrived outside the portal. The vendor is
                  not emailed, and the response joins the same version history
                  as a portal submission.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                aria-label="Close"
                className="shrink-0 cursor-pointer rounded-lg p-1.5 text-gray hover:bg-gray-panel hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="manual-vendor-name">
                    Vendor or company
                  </label>
                  <input
                    id="manual-vendor-name"
                    ref={firstFieldRef}
                    value={vendorName}
                    onChange={(event) => setVendorName(event.target.value)}
                    onBlur={() =>
                      setFieldErrors((current) => ({
                        ...current,
                        vendorName:
                          validateField("vendorName", vendorName) || undefined,
                      }))
                    }
                    aria-invalid={Boolean(fieldErrors.vendorName)}
                    aria-describedby={
                      fieldErrors.vendorName ? "manual-vendor-name-error" : undefined
                    }
                    placeholder="Apex AV"
                    className={cn("mt-1.5", fieldClass(Boolean(fieldErrors.vendorName)))}
                  />
                  {fieldErrors.vendorName && (
                    <p id="manual-vendor-name-error" className="mt-1 text-xs font-semibold text-red-600">
                      {fieldErrors.vendorName}
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass} htmlFor="manual-submitted-by">
                    Sent by
                  </label>
                  <input
                    id="manual-submitted-by"
                    value={submittedBy}
                    onChange={(event) => setSubmittedBy(event.target.value)}
                    onBlur={() =>
                      setFieldErrors((current) => ({
                        ...current,
                        submittedBy:
                          validateField("submittedBy", submittedBy) || undefined,
                      }))
                    }
                    aria-invalid={Boolean(fieldErrors.submittedBy)}
                    aria-describedby={
                      fieldErrors.submittedBy ? "manual-submitted-by-error" : undefined
                    }
                    placeholder="Avery Vendor"
                    className={cn("mt-1.5", fieldClass(Boolean(fieldErrors.submittedBy)))}
                  />
                  {fieldErrors.submittedBy && (
                    <p id="manual-submitted-by-error" className="mt-1 text-xs font-semibold text-red-600">
                      {fieldErrors.submittedBy}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="manual-email">
                  Vendor email
                </label>
                <input
                  id="manual-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() =>
                    setFieldErrors((current) => ({
                      ...current,
                      email: validateField("email", email) || undefined,
                    }))
                  }
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "manual-email-error" : undefined}
                  placeholder="sales@apex.example"
                  className={cn("mt-1.5", fieldClass(Boolean(fieldErrors.email)))}
                />
                {fieldErrors.email ? (
                  <p id="manual-email-error" className="mt-1 text-xs font-semibold text-red-600">
                    {fieldErrors.email}
                  </p>
                ) : (
                  <p className="mt-1 text-xs leading-4 text-gray">
                    The email identifies the vendor. Reusing an address adds a new
                    version to that vendor&apos;s existing response.
                  </p>
                )}
              </div>

              {matchedVendor && (
                <div className="rounded-2xl border border-gray-border bg-gray-panel p-3">
                  <p className="text-sm font-bold text-navy">
                    This becomes version {matchedVendor.versionNumber + 1} for{" "}
                    {matchedVendor.vendorName}
                  </p>
                  <label className={cn(labelClass, "mt-3 block")} htmlFor="manual-reason">
                    Why is there a new version?
                  </label>
                  <select
                    id="manual-reason"
                    value={reason}
                    onChange={(event) =>
                      setReason(event.target.value as ManualResponseReason)
                    }
                    className={cn("mt-1.5", fieldClass(false))}
                  >
                    {MANUAL_RESPONSE_REASONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelClass} htmlFor="manual-message">
                  Notes <span className="font-bold normal-case">(optional)</span>
                </label>
                <textarea
                  id="manual-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={3}
                  placeholder="How this response arrived, or anything the vendor said in their email."
                  className={cn(
                    "mt-1.5 w-full rounded-xl border border-gray-border bg-white px-3 py-2.5 text-sm text-navy outline-none transition placeholder:text-gray hover:border-gray focus:border-brand focus:ring-2 focus:ring-brand-muted",
                  )}
                />
              </div>

              <div>
                <p className={labelClass}>Attachments</p>
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    addFiles(event.dataTransfer.files);
                  }}
                  className={cn(
                    "mt-1.5 rounded-2xl border border-dashed p-4 text-center transition",
                    isDragging
                      ? "border-brand bg-brand-muted"
                      : "border-gray-border bg-gray-panel",
                  )}
                >
                  <UploadCloud className="mx-auto text-gray" size={22} aria-hidden="true" />
                  <p className="mt-2 text-sm text-gray">
                    Drop the vendor&apos;s files here, or{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer font-extrabold text-brand-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      browse
                    </button>
                  </p>
                  <p className="mt-1 text-xs text-gray">
                    Up to {MANUAL_RESPONSE_MAX_FILES} files, 10 MB each
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    aria-label="Attach vendor files"
                    onChange={(event) => {
                      if (event.target.files) addFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </div>
                {fileError && (
                  <p className="mt-1 text-xs font-semibold text-red-600">{fileError}</p>
                )}
                {files.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {files.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex min-w-0 items-center gap-2 rounded-xl border border-gray-border px-3 py-2"
                      >
                        <Paperclip className="shrink-0 text-gray" size={15} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-sm text-navy">
                          {entry.file.name}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-gray">
                          {fileSizeLabel(entry.file.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setFiles((current) =>
                              current.filter((file) => file.id !== entry.id),
                            )
                          }
                          aria-label={`Remove ${entry.file.name}`}
                          className="shrink-0 cursor-pointer rounded-md p-1 text-gray hover:bg-gray-panel hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <X size={15} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-gray-border pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-gray-border px-4 text-sm font-extrabold text-navy hover:border-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-wait disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                      Recording…
                    </>
                  ) : (
                    "Record response"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
