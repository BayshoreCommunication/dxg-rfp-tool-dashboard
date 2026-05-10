"use client";

import { BACKEND_URL } from "@/lib/config";
import { CheckCircle, Info, Loader2, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";

type Props = {
  slug: string;
  proposalId: string;
  proposalTitle: string;
};

type FileEntry = {
  file: File;
  id: string;
};

export default function VendorResponseForm({
  proposalId,
  proposalTitle,
}: Props) {
  const [vendorName, setVendorName] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEmailBlur = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !proposalId) return;
    setCheckingEmail(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/vendor-responses/check?proposalId=${encodeURIComponent(proposalId)}&email=${encodeURIComponent(trimmed)}`,
      );
      const json = await res.json();
      if (json.alreadySubmitted) setAlreadySubmitted(true);
    } catch {
      // silently ignore — submit will catch it if needed
    } finally {
      setCheckingEmail(false);
    }
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next: FileEntry[] = Array.from(incoming).map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}`,
    }));
    setFiles((prev) => [...prev, ...next].slice(0, 10));
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
      files.forEach(({ file }) => formData.append("documents", file));

      const res = await fetch(`${BACKEND_URL}/api/vendor-responses`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!json.success) {
        if (json.alreadySubmitted) {
          setAlreadySubmitted(true);
          return;
        }
        setError(json.message || "Submission failed. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadySubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-sm border border-slate-100">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <Info size={32} className="text-amber-500" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">Already Submitted</h2>
          <p className="text-sm text-slate-500">
            You have already submitted a response for this proposal. Only one response per email address is allowed.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-10 text-center shadow-sm border border-slate-100">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">Response Submitted!</h2>
          <p className="text-sm text-slate-500">
            Your proposal response has been received. The planner will be in touch with you soon.
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
            Submit Your Proposal
          </h1>
          {proposalTitle && (
            <p className="mt-1 text-sm text-slate-500">
              Responding to:{" "}
              <span className="font-medium text-slate-700">{proposalTitle}</span>
            </p>
          )}
        </div>

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
                onChange={(e) => setEmail(e.target.value)}
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
              <span className="font-normal text-slate-400">(up to 10 files)</span>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 hover:border-cyan-400 hover:text-cyan-600 transition-colors"
            >
              <Paperclip size={15} />
              Attach files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map(({ file, id }) => (
                  <li
                    key={id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700"
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
                Submitting…
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
