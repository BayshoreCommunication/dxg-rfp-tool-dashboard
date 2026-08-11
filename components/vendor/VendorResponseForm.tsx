"use client";

import {
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  LockKeyhole,
  Mail,
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  slug: string;
  proposalId: string;
  proposalTitle: string;
  initialEmail?: string;
  initialTrackingId?: string;
  accessGrant?: string;
};

type FileEntry = {
  file: File;
  id: string;
};

type ExistingDoc = {
  name: string;
  url: string;
};

type ExistingResponse = {
  _id: string;
  vendorName: string;
  submittedBy: string;
  email: string;
  message: string;
  documents: ExistingDoc[];
  updatedAt: string;
};

type RequiredField = "vendorName" | "submittedBy" | "email";
type FieldErrors = Partial<Record<RequiredField, string>>;

const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass = (hasError: boolean) =>
  `h-12 w-full rounded-xl border bg-white px-4 text-[15px] text-slate-950 outline-none transition placeholder:text-slate-400 ${
    hasError
      ? "border-rose-400 ring-2 ring-rose-100 focus:border-rose-500"
      : "border-slate-200 hover:border-slate-300 focus:border-[#008ad2] focus:ring-4 focus:ring-sky-100"
  }`;

const fileSizeLabel = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const validateField = (field: RequiredField, value: string): string => {
  if (!value.trim()) {
    if (field === "vendorName") return "Enter your company or vendor name.";
    if (field === "submittedBy") return "Enter the name of the person submitting this response.";
    return "Enter the email address that should receive confirmation.";
  }
  if (field === "email" && !EMAIL_PATTERN.test(value.trim())) {
    return "Enter a valid email address, such as name@company.com.";
  }
  return "";
};

export default function VendorResponseForm({
  proposalId,
  proposalTitle,
  initialEmail = "",
  initialTrackingId = "",
  accessGrant = "",
}: Props) {
  const [vendorName, setVendorName] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [wasUpdate, setWasUpdate] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [existingDocs, setExistingDocs] = useState<ExistingDoc[]>([]);
  const [existingUpdatedAt, setExistingUpdatedAt] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const applyExistingResponse = (existing: ExistingResponse) => {
    setIsUpdateMode(true);
    setVendorName(existing.vendorName);
    setSubmittedBy(existing.submittedBy);
    setMessage(existing.message);
    setExistingDocs(existing.documents ?? []);
    setExistingUpdatedAt(existing.updatedAt);
  };

  const checkEmailExists = async (emailValue: string) => {
    const trimmed = emailValue.trim().toLowerCase();
    if (!trimmed || !EMAIL_PATTERN.test(trimmed) || !proposalId) return;
    setCheckingEmail(true);
    try {
      const params = new URLSearchParams({ proposalId, email: trimmed });
      if (initialTrackingId) params.set("emailTrackingId", initialTrackingId);
      if (accessGrant) params.set("accessGrant", accessGrant);
      const res = await fetch(`/api/vendor-responses/check?${params.toString()}`);
      const json = await res.json();
      if (json.alreadySubmitted && json.existingResponse) {
        applyExistingResponse(json.existingResponse as ExistingResponse);
      } else {
        setIsUpdateMode(false);
        setExistingDocs([]);
        setExistingUpdatedAt("");
      }
    } catch {
      // Checking for a prior response should never block a new submission.
    } finally {
      setCheckingEmail(false);
    }
  };

  useEffect(() => {
    if (initialEmail && proposalId) {
      void checkEmailExists(initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setFieldError = (field: RequiredField, value: string) => {
    const validationMessage = validateField(field, value);
    setFieldErrors((current) => ({ ...current, [field]: validationMessage || undefined }));
    return validationMessage;
  };

  const addFiles = (incoming: FileList | File[]) => {
    const incomingFiles = Array.from(incoming);
    if (incomingFiles.length === 0) return;

    const currentIds = new Set(files.map(({ id }) => id));
    const oversized: string[] = [];
    const duplicates: string[] = [];
    const accepted: FileEntry[] = [];

    for (const file of incomingFiles) {
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      if (file.size > MAX_FILE_BYTES) {
        oversized.push(file.name);
        continue;
      }
      if (currentIds.has(id)) {
        duplicates.push(file.name);
        continue;
      }
      currentIds.add(id);
      accepted.push({ file, id });
    }

    const availableSlots = Math.max(0, MAX_FILES - files.length);
    const filesToAdd = accepted.slice(0, availableSlots);
    const omittedCount = accepted.length - filesToAdd.length;
    const problems: string[] = [];
    if (oversized.length > 0) {
      problems.push(`${oversized.join(", ")} exceeded the 10 MB limit`);
    }
    if (duplicates.length > 0) {
      problems.push(`${duplicates.join(", ")} ${duplicates.length === 1 ? "was" : "were"} already selected`);
    }
    if (omittedCount > 0 || (availableSlots === 0 && accepted.length > 0)) {
      problems.push(`only ${MAX_FILES} new files can be attached`);
    }
    setFileError(problems.length > 0 ? `${problems.join("; ")}.` : "");
    setFiles((current) => [...current, ...filesToAdd]);
  };

  const removeFile = (id: string) => {
    setFiles((current) => current.filter((entry) => entry.id !== id));
    setFileError("");
  };

  const validateForm = () => {
    const nextErrors: FieldErrors = {
      vendorName: validateField("vendorName", vendorName) || undefined,
      submittedBy: validateField("submittedBy", submittedBy) || undefined,
      email: validateField("email", email) || undefined,
    };
    setFieldErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!validateForm()) {
      window.requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }

    if (!proposalId) {
      setError("This proposal link is invalid or incomplete. Ask the event planner for a new link.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("proposalId", proposalId);
      formData.append("vendorName", vendorName.trim());
      formData.append("submittedBy", submittedBy.trim());
      formData.append("email", email.trim());
      formData.append("message", message.trim());
      if (initialTrackingId) formData.append("emailTrackingId", initialTrackingId);
      if (accessGrant) formData.append("accessGrant", accessGrant);
      files.forEach(({ file }) => formData.append("documents", file));

      const res = await fetch("/api/vendor-responses", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Your response could not be submitted. Please try again.");
        return;
      }
      setWasUpdate(Boolean(json.isUpdate));
      setSubmitted(true);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#f4f8fb] px-4 py-10 sm:px-6 sm:py-16">
        <section className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <div className="h-1.5 bg-emerald-500" />
          <div className="px-6 py-10 text-center sm:px-10 sm:py-12">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={34} aria-hidden="true" />
            </div>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
              {wasUpdate ? "Response updated" : "Response received"}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              Thank you, {submittedBy.trim() || "your response is complete"}.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-slate-600">
              {wasUpdate
                ? "Your latest changes are saved and ready for the event planner to review."
                : "Your proposal response is now ready for the event planner to review."}
            </p>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
              <div className="flex items-start gap-3">
                <Mail size={18} className="mt-0.5 shrink-0 text-[#008ad2]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Confirmation sent to {email.trim()}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Keep that email for your records. You can safely close this window.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <p className="mt-5 text-center text-xs font-semibold text-slate-400">
          Powered by DXG RFP Tool
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <header className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
          <div className="h-1.5 bg-[#008ad2]" />
          <div className="grid gap-6 px-6 py-7 sm:px-8 lg:grid-cols-[1fr_260px] lg:items-center lg:px-10 lg:py-9">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#0075b4]">
                <FileCheck2 size={15} aria-hidden="true" /> Vendor response
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                {isUpdateMode ? "Update your proposal" : "Submit your proposal"}
              </h1>
              {proposalTitle ? (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-[15px] text-slate-600">
                  <span>Responding to</span>
                  <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 font-bold text-[#0069a0]">
                    {proposalTitle}
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-sm font-semibold text-amber-700">
                  Proposal details could not be loaded. You can still complete the form if the link is valid.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-[#0075b4]">
                  <LockKeyhole size={17} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Secure response portal</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Uploads are scanned and stored privately. A confirmation is sent after submission.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {isUpdateMode ? (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4" role="status">
            <RefreshCw size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-extrabold text-amber-950">We found your earlier response</p>
              <p className="mt-1 text-sm leading-5 text-amber-800">
                Review the details below, attach any additional documents, then update your response.
                {existingUpdatedAt ? ` Last updated ${new Date(existingUpdatedAt).toLocaleString()}.` : ""}
              </p>
            </div>
          </div>
        ) : null}

        <form
          ref={formRef}
          noValidate
          onSubmit={handleSubmit}
          aria-label={isUpdateMode ? "Update vendor response" : "Submit vendor response"}
          className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.09)]"
        >
          <section aria-labelledby="contact-heading" className="px-6 py-7 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#008ad2]">Step 1 of 3</p>
                <h2 id="contact-heading" className="mt-1 text-xl font-extrabold text-slate-950">Contact information</h2>
                <p className="mt-1 text-sm text-slate-500">Tell the planner who is submitting this response.</p>
              </div>
              <p className="text-xs font-semibold text-slate-400"><span className="text-rose-500">*</span> Required fields</p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="vendor-name" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Building2 size={15} className="text-slate-400" aria-hidden="true" /> Company / vendor name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="vendor-name"
                  type="text"
                  autoComplete="organization"
                  value={vendorName}
                  onChange={(event) => {
                    setVendorName(event.target.value);
                    if (fieldErrors.vendorName) setFieldErrors((current) => ({ ...current, vendorName: undefined }));
                  }}
                  onBlur={() => setFieldError("vendorName", vendorName)}
                  aria-invalid={Boolean(fieldErrors.vendorName)}
                  aria-describedby={fieldErrors.vendorName ? "vendor-name-error" : undefined}
                  placeholder="e.g. Acme Events Co."
                  className={inputClass(Boolean(fieldErrors.vendorName))}
                />
                {fieldErrors.vendorName ? <p id="vendor-name-error" role="alert" className="mt-2 text-sm font-semibold text-rose-600">{fieldErrors.vendorName}</p> : null}
              </div>

              <div>
                <label htmlFor="submitted-by" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <UserRound size={15} className="text-slate-400" aria-hidden="true" /> Submitted by <span className="text-rose-500">*</span>
                </label>
                <input
                  id="submitted-by"
                  type="text"
                  autoComplete="name"
                  value={submittedBy}
                  onChange={(event) => {
                    setSubmittedBy(event.target.value);
                    if (fieldErrors.submittedBy) setFieldErrors((current) => ({ ...current, submittedBy: undefined }));
                  }}
                  onBlur={() => setFieldError("submittedBy", submittedBy)}
                  aria-invalid={Boolean(fieldErrors.submittedBy)}
                  aria-describedby={fieldErrors.submittedBy ? "submitted-by-error" : undefined}
                  placeholder="Your full name"
                  className={inputClass(Boolean(fieldErrors.submittedBy))}
                />
                {fieldErrors.submittedBy ? <p id="submitted-by-error" role="alert" className="mt-2 text-sm font-semibold text-rose-600">{fieldErrors.submittedBy}</p> : null}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="response-email" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Mail size={15} className="text-slate-400" aria-hidden="true" /> Email address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="response-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined }));
                      if (isUpdateMode) {
                        setIsUpdateMode(false);
                        setExistingDocs([]);
                        setExistingUpdatedAt("");
                      }
                    }}
                    onBlur={() => {
                      const validationMessage = setFieldError("email", email);
                      if (!validationMessage) void checkEmailExists(email);
                    }}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={`email-help${fieldErrors.email ? " response-email-error" : ""}`}
                    placeholder="you@company.com"
                    className={`${inputClass(Boolean(fieldErrors.email))} pr-11`}
                  />
                  {checkingEmail ? (
                    <Loader2 size={17} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[#008ad2]" aria-label="Checking for an existing response" />
                  ) : null}
                </div>
                <p id="email-help" className="mt-2 text-xs text-slate-500">We’ll send the submission confirmation to this address.</p>
                {fieldErrors.email ? <p id="response-email-error" role="alert" className="mt-2 text-sm font-semibold text-rose-600">{fieldErrors.email}</p> : null}
              </div>
            </div>
          </section>

          <section aria-labelledby="details-heading" className="border-t border-slate-100 bg-slate-50/60 px-6 py-7 sm:px-8 lg:px-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#008ad2]">Step 2 of 3</p>
            <h2 id="details-heading" className="mt-1 text-xl font-extrabold text-slate-950">Proposal details</h2>
            <p className="mt-1 text-sm text-slate-500">Summarize your approach so the planner can evaluate it quickly.</p>

            <label htmlFor="proposal-message" className="mt-6 mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              <FileText size={15} className="text-slate-400" aria-hidden="true" /> Message or executive summary <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="proposal-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              placeholder="Include your approach, pricing overview, availability, assumptions, or anything the planner should know."
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#008ad2] focus:ring-4 focus:ring-sky-100"
            />
            <p className="mt-2 text-xs text-slate-500">You can provide detailed pricing and specifications in the documents below.</p>
          </section>

          <section aria-labelledby="documents-heading" className="border-t border-slate-100 px-6 py-7 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#008ad2]">Step 3 of 3</p>
                <h2 id="documents-heading" className="mt-1 text-xl font-extrabold text-slate-950">Supporting documents</h2>
                <p className="mt-1 text-sm text-slate-500">Attach pricing, equipment lists, schedules, or other supporting files.</p>
              </div>
              <p className="text-xs font-bold text-slate-500">{files.length} / {MAX_FILES} new files</p>
            </div>

            {existingDocs.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-amber-800">Previously uploaded</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {existingDocs.map((doc) => (
                    <li key={`${doc.name}-${doc.url}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2.5">
                      <Paperclip size={15} className="shrink-0 text-amber-600" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{doc.name}</span>
                      <a href={doc.url} target="_blank" rel="noreferrer" aria-label={`Open ${doc.name}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#0075b4] transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ad2]">
                        <ExternalLink size={15} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div
              data-testid="vendor-file-dropzone"
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                addFiles(event.dataTransfer.files);
              }}
              className={`mt-6 rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${
                isDragging
                  ? "border-[#008ad2] bg-sky-50"
                  : "border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/50"
              }`}
            >
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-sky-100 text-[#0075b4]">
                <UploadCloud size={23} aria-hidden="true" />
              </span>
              <p className="mt-4 text-sm font-extrabold text-slate-900">Drop files here or choose from your device</p>
              <p id="file-upload-help" className="mt-1 text-xs leading-5 text-slate-500">Any file type · up to {MAX_FILES} files · 10 MB maximum per file</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= MAX_FILES}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-[#008ad2] hover:text-[#0069a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ad2] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Paperclip size={15} aria-hidden="true" />
                {existingDocs.length > 0 ? "Choose additional files" : "Choose files"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                aria-describedby="file-upload-help"
                onChange={(event) => {
                  if (event.target.files) addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>

            {fileError ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{fileError}</p> : null}

            {files.length > 0 ? (
              <ul className="mt-4 space-y-2" aria-label="Files ready to upload">
                {files.map(({ file, id }) => (
                  <li key={id} className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-3 sm:px-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#008ad2] shadow-sm">
                      <FileText size={17} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">{file.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><Check size={12} className="text-emerald-600" aria-hidden="true" /> Ready to upload · {fileSizeLabel(file.size)}</p>
                    </div>
                    <button type="button" onClick={() => removeFile(id)} aria-label={`Remove ${file.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
                      <X size={17} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-6 sm:px-8 lg:px-10">
            {error ? (
              <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                <X size={17} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
              </div>
            ) : null}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex max-w-md items-start gap-2.5 text-xs leading-5 text-slate-500">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                <p>By submitting, you confirm these details are accurate and ready for the event planner to review.</p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-[#0075b4] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(0,117,180,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0069a0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008ad2] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65 disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <><Loader2 size={17} className="animate-spin" aria-hidden="true" /> {isUpdateMode ? "Updating response…" : "Submitting response…"}</>
                ) : isUpdateMode ? (
                  <><RefreshCw size={17} aria-hidden="true" /> Update response</>
                ) : (
                  <><Send size={17} aria-hidden="true" /> Submit response</>
                )}
              </button>
            </div>
          </div>
        </form>

        <p className="mt-5 text-center text-xs font-semibold text-slate-400">
          Powered by DXG RFP Tool · Secure vendor response portal
        </p>
      </div>
    </main>
  );
}
