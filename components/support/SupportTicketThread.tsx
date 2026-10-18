"use client";

import { ArrowLeft, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import {
  replySupportTicketAction,
  resolveSupportTicketAction,
  type SupportMessage,
  type SupportTicket,
} from "@/app/actions/supportDesk";
import { formatAppDateTime } from "@/lib/dateFormat";
import { formatBytes, supportAttachmentHref, uploadSupportAttachments } from "@/lib/support/attachments";
import AttachmentPicker from "./AttachmentPicker";
import { categoryLabel, isTerminal, statusClass, statusLabel } from "./supportLabels";

const BODY_MAX = 5000;

const Bubble = ({
  message,
  assigneeName,
  ticketId,
}: {
  message: SupportMessage;
  assigneeName: string | null;
  ticketId: string;
}) => {
  if (message.kind === "system") {
    return (
      <li className="flex justify-center">
        <p className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
          {message.body} · {formatAppDateTime(message.createdAt)}
        </p>
      </li>
    );
  }
  const mine = message.authorRole === "customer";
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <article
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          mine ? "bg-[#008ad2] text-white" : "border border-slate-200 bg-white text-slate-800"
        }`}
      >
        <header className={`mb-1 flex items-center gap-2 text-[11px] font-bold ${mine ? "text-white/80" : "text-slate-500"}`}>
          <span>{mine ? "You" : assigneeName ? `${assigneeName} · DXG support` : "DXG support"}</span>
          <span className="font-medium">{formatAppDateTime(message.createdAt)}</span>
        </header>
        <p className="whitespace-pre-wrap break-words leading-6">{message.body}</p>
        {message.attachments.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2 text-[11px]" aria-label="Attachments">
            {message.attachments.map((attachment) => (
              <li key={attachment.id}>
                <a
                  href={supportAttachmentHref(ticketId, attachment.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold underline-offset-2 hover:underline ${
                    mine ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {attachment.fileName}
                  <span className={mine ? "text-white/70" : "text-slate-400"}>{formatBytes(attachment.sizeBytes)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </article>
    </li>
  );
};

export default function SupportTicketThread({
  ticket,
  messages,
  assignee,
}: {
  ticket: SupportTicket;
  messages: SupportMessage[];
  assignee: { id: string; name: string } | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();
  const [resolving, startResolving] = useTransition();
  const terminal = isTerminal(ticket.status);

  const send = () => {
    const text = body.trim();
    if (!text) {
      toast.error("Write a message first.");
      return;
    }
    startTransition(async () => {
      const uploaded = await uploadSupportAttachments(files);
      if (!uploaded.ok) {
        toast.error(uploaded.message);
        return;
      }
      const result = await replySupportTicketAction(
        ticket.id,
        text,
        uploaded.attachments.map((attachment) => attachment.id),
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setBody("");
      setFiles([]);
      toast.success(terminal ? "Reopened and sent to DXG support." : "Sent to DXG support.");
      router.refresh();
    });
  };

  const resolve = () => {
    startResolving(async () => {
      const result = await resolveSupportTicketAction(ticket.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Marked as resolved. Thanks for letting us know.");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-6">
      <Link href="/support" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0069a0] hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All requests
      </Link>

      <section className="mt-4 flex min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-400">#{ticket.ticketNumber}</span>
            <h1 className="text-lg font-black tracking-tight text-slate-900">{ticket.subject}</h1>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${statusClass(ticket.status)}`}>
              {statusLabel(ticket.status)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {categoryLabel(ticket.category)} · opened {formatAppDateTime(ticket.createdAt)}
            {assignee ? ` · handled by ${assignee.name}` : " · waiting for a DXG agent"}
          </p>
        </header>

        <ul className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-5 py-5" aria-label="Conversation">
          {messages.map((message) => (
            <Bubble key={message.id} message={message} assigneeName={assignee?.name ?? null} ticketId={ticket.id} />
          ))}
        </ul>

        <footer className="border-t border-slate-100 px-5 py-4">
          {terminal && (
            <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
              This request is {statusLabel(ticket.status).toLowerCase()}. Reply below to reopen it.
            </p>
          )}
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            maxLength={BODY_MAX}
            aria-label="Reply to DXG support"
            placeholder="Write a reply…"
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#008ad2] focus:ring-2 focus:ring-[#008ad2]/15"
          />
          <div className="mt-3">
            <AttachmentPicker files={files} onChange={setFiles} disabled={isPending} compact />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {!terminal ? (
              <button
                type="button"
                onClick={resolve}
                disabled={resolving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
              >
                {resolving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                This is solved
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={send}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#008ad2] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#0076b4] disabled:opacity-60"
            >
              {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {terminal ? "Reopen & send" : "Send"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
