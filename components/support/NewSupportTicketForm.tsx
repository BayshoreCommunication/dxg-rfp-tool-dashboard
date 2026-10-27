"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "react-toastify";
import { createSupportTicketAction, type SupportTicketCategory } from "@/app/actions/supportDesk";
import { uploadSupportAttachments } from "@/lib/support/attachments";
import AttachmentPicker from "./AttachmentPicker";
import { CATEGORY_OPTIONS } from "./supportLabels";

const SUBJECT_MAX = 200;
const BODY_MAX = 5000;

export default function NewSupportTicketForm({
  onCancel,
  initialSubject = "",
  initialBody = "",
}: {
  onCancel?: () => void;
  initialSubject?: string;
  initialBody?: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [category, setCategory] = useState<SupportTicketCategory>("how_to");
  const [body, setBody] = useState(initialBody);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanSubject = subject.trim();
    const cleanBody = body.trim();
    if (!cleanSubject) {
      setError("Give your request a short subject.");
      return;
    }
    if (!cleanBody) {
      setError("Tell us what happened so we can help.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const uploaded = await uploadSupportAttachments(files);
      if (!uploaded.ok) {
        setError(uploaded.message);
        return;
      }
      const result = await createSupportTicketAction({
        subject: cleanSubject,
        category,
        body: cleanBody,
        attachments: uploaded.attachments.map((attachment) => attachment.id),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      toast.success(`Sent to RFPilot support as ticket #${result.data.ticket.ticketNumber}.`);
      router.push(`/support/${result.data.ticket.id}`);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="New support request">
      <div>
        <label htmlFor="support-subject" className="block text-[13px] font-bold text-slate-700">
          Subject
        </label>
        <input
          id="support-subject"
          value={subject}
          onChange={(event) => {
            setSubject(event.target.value);
            if (error) setError(null);
          }}
          maxLength={SUBJECT_MAX}
          placeholder="e.g. Vendors say the response link has expired"
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#008ad2] focus:ring-2 focus:ring-[#008ad2]/15"
        />
      </div>

      <fieldset>
        <legend className="block text-[13px] font-bold text-slate-700">What is this about?</legend>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {CATEGORY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
                category === option.value
                  ? "border-[#008ad2] bg-[#008ad2]/5"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="support-category"
                value={option.value}
                checked={category === option.value}
                onChange={() => {
                  setCategory(option.value);
                  if (error) setError(null);
                }}
                className="mt-1 h-3.5 w-3.5 accent-[#008ad2]"
              />
              <span>
                <span className="block font-semibold text-slate-800">{option.label}</span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="support-body" className="block text-[13px] font-bold text-slate-700">
          What happened?
        </label>
        <textarea
          id="support-body"
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            if (error) setError(null);
          }}
          maxLength={BODY_MAX}
          rows={6}
          placeholder="What were you trying to do, what did you expect, and what happened instead? Include the proposal name and any reference ID from an error message."
          className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#008ad2] focus:ring-2 focus:ring-[#008ad2]/15"
        />
        <p className="mt-1 text-right text-[11px] text-slate-400">
          {body.length}/{BODY_MAX}
        </p>
      </div>

      <AttachmentPicker
        files={files}
        onChange={(nextFiles) => {
          setFiles(nextFiles);
          if (error) setError(null);
        }}
        disabled={isPending}
      />

      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-[#008ad2] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0076b4] disabled:opacity-60"
        >
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          Send to RFPilot support
        </button>
      </div>
    </form>
  );
}
