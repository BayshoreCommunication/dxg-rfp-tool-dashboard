"use client";

import { CheckCircle, ExternalLink, Loader2, Paperclip, RefreshCw, X } from "lucide-react";
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
  const [fileError, setFileError] = useState("");
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [existingDocs, setExistingDocs] = useState<ExistingDoc[]>([]);
  const [existingUpdatedAt, setExistingUpdatedAt] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!trimmed || !proposalId) return;
    setCheckingEmail(true);
    try {
      const params = new URLSearchParams({ proposalId, email: trimmed });
      // When arriving via an email link, pass the tracking ID so the backend
      // only triggers update mode if THIS campaign's link was already responded to.
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
      // silently ignore
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

  const handleEmailBlur = () => void checkEmailExists(email);

  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFileError("");
    const all = Array.from(incoming);
    const oversized = all.filter((f) => f.size > MAX_FILE_BYTES);
    if (oversized.length > 0) {
      setFileError(
        `${oversized.map((f) => f.name).join(", ")} ${oversized.length === 1 ? "exceeds" : "exceed"} the 10 MB limit and ${oversized.length === 1 ? "was" : "were"} not added.`,
      );
    }
    const valid: FileEntry[] = all
      .filter((f) => f.size <= MAX_FILE_BYTES)
      .map((file) => ({ file, id: `${file.name}-${file.size}-${Date.now()}` }));
    setFiles((prev) => [...prev, ...valid].slice(0, 10));
  };

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!proposalId) {
      setError("Invalid proposal link. Please check the URL and try again.");
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

      const res = await fetch(`/api/vendor-responses`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Submission failed. Please try again.");
        return;
      }
      setWasUpdate(!!json.isUpdate);
      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-sm border border-slate-100">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            {wasUpdate ? "Response Updated!" : "Response Submitted!"}
          </h2>
          <p className="text-sm text-slate-500">
            {wasUpdate
              ? "Your response has been updated. A confirmation email has been sent to you."
              : "Your proposal response has been received. A confirmation email has been sent to you."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-600">
            Vendor Response
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {isUpdateMode ? "Update Your Response" : "Submit Your Proposal"}
          </h1>
          {proposalTitle && (
            <p className="mt-1 text-sm text-slate-500">
              Responding to:{" "}
              <span className="font-medium text-slate-700">{proposalTitle}</span>
            </p>
          )}
        </div>

        {/* Update mode banner */}
        {isUpdateMode && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <RefreshCw size={15} className="mt-0.5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                You have already submitted a response
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Your previous submission is shown below. You can update any details or attach additional documents, then click &ldquo;Update Response&rdquo;.
                {existingUpdatedAt && (
                  <span className="ml-1 text-amber-600">
                    Last updated: {new Date(existingUpdatedAt).toLocaleString()}.
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 space-y-5"
        >
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Company / Vendor Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
              placeholder="e.g. Acme Events Co."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Submitted By <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
              required
              placeholder="Your full name"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (isUpdateMode) {
                    setIsUpdateMode(false);
                    setExistingDocs([]);
                    setExistingUpdatedAt("");
                  }
                }}
                onBlur={() => void handleEmailBlur()}
                required
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100"
              />
              {checkingEmail && (
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Message / Proposal Details
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Describe your offering, pricing, availability, or any relevant details…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100 resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Documents{" "}
              <span className="font-normal text-slate-400">(any file type · up to 10 files · max 10 MB each)</span>
            </label>

            {/* Previously uploaded documents */}
            {existingDocs.length > 0 && (
              <div className="mb-3">
                <p className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Previously uploaded
                </p>
                <ul className="space-y-1.5">
                  {existingDocs.map((doc, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700"
                    >
                      <span className="truncate max-w-[80%]">{doc.name}</span>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 shrink-0 text-cyan-500 hover:text-cyan-700 transition-colors"
                        title="Open file"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 hover:border-cyan-400 hover:text-cyan-600 transition-colors"
            >
              <Paperclip size={15} />
              {existingDocs.length > 0 ? "Attach additional files" : "Attach files"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
            {fileError && (
              <p className="mt-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-600">
                {fileError}
              </p>
            )}
            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map(({ file, id }) => (
                  <li
                    key={id}
                    className="flex items-center justify-between rounded-lg bg-cyan-50 border border-cyan-100 px-3 py-2 text-xs text-slate-700"
                  >
                    <span className="truncate max-w-[80%]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(id)}
                      className="ml-2 shrink-0 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 border border-rose-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                {isUpdateMode ? "Updating…" : "Submitting…"}
              </>
            ) : isUpdateMode ? (
              <>
                <RefreshCw size={15} />
                Update Response
              </>
            ) : (
              "Submit Response"
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Powered by DXG RFP Tool
        </p>
      </div>
    </div>
  );
}
