"use client";

import { ArrowLeft, ArrowUp, Bot, CheckCircle2, FileText, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "react-toastify";
import {
  replySupportTicketAction,
  resolveSupportTicketAction,
  type SupportMessage,
  type SupportTicket,
} from "@/app/actions/supportDesk";
import { formatBytes, supportAttachmentHref, uploadSupportAttachments } from "@/lib/support/attachments";
import { buildThreadItems, isAutomaticReply, timeLabel } from "@/lib/support/thread";
import AttachmentPicker from "./AttachmentPicker";
import SupportAgentIcon from "./SupportAgentIcon";
import SupportDateTime from "./SupportDateTime";
import { categoryLabel, isTerminal, statusClass, statusLabel } from "./supportLabels";
import { useSupportRealtimeRefresh } from "./useSupportRealtimeRefresh";

const BODY_MAX = 5000;
const COMPOSER_MAX_HEIGHT_PX = 160;

const subscribe = () => () => undefined;
const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false);

const Attachments = ({ message, ticketId, mine }: { message: SupportMessage; ticketId: string; mine: boolean }) => (
  <ul className="mt-2 flex flex-wrap gap-2 text-[11px]" aria-label="Attachments">
    {message.attachments.map((attachment) => {
      const href = supportAttachmentHref(ticketId, attachment.id);
      const isImage = attachment.mimeType.startsWith("image/");
      return (
        <li key={attachment.id}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={`${attachment.fileName} · ${formatBytes(attachment.sizeBytes)}`}
            className={`block overflow-hidden rounded-xl ${mine ? "bg-white/15" : "bg-slate-100"}`}
          >
            {isImage ? (
              <span className="block h-40 w-[220px] bg-slate-200/40">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL from our own proxy */}
                <img src={href} alt={attachment.fileName} className="block h-full w-full object-cover" loading="lazy" />
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold ${mine ? "text-white" : "text-slate-700"}`}>
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                {attachment.fileName}
                <span className={mine ? "text-white/70" : "text-slate-400"}>{formatBytes(attachment.sizeBytes)}</span>
              </span>
            )}
            {isImage && (
              <span className={`block truncate px-2 py-1 text-[10px] font-semibold ${mine ? "text-white/80" : "text-slate-500"}`}>
                {attachment.fileName}
              </span>
            )}
          </a>
        </li>
      );
    })}
  </ul>
);

const Avatar = ({ automatic }: { automatic: boolean }) =>
  automatic ? (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
      <Bot className="h-4 w-4" aria-hidden="true" />
    </span>
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[#0076b4]">
      <SupportAgentIcon className="h-6 w-6" />
    </span>
  );

const MessageRow = ({
  message,
  startsGroup,
  endsGroup,
  assigneeName,
  ticketId,
  hydrated,
  pending = false,
}: {
  message: SupportMessage;
  startsGroup: boolean;
  endsGroup: boolean;
  assigneeName: string | null;
  ticketId: string;
  hydrated: boolean;
  pending?: boolean;
}) => {
  const mine = message.authorRole === "customer";
  const automatic = isAutomaticReply(message);
  const name = automatic ? "DXG support" : assigneeName ? `${assigneeName} · DXG support` : "DXG support";

  return (
    <li className={`flex items-end gap-2.5 ${mine ? "justify-end" : "justify-start"} ${startsGroup ? "mt-4 first:mt-0" : "mt-1"}`}>
      {!mine && (endsGroup ? <Avatar automatic={automatic} /> : <span className="w-8 shrink-0" aria-hidden="true" />)}
      <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
        {startsGroup && !mine && (
          <p className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-bold text-slate-500">
            {name}
            {automatic && (
              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">Automatic reply</span>
            )}
          </p>
        )}
        <article
          className={`px-4 py-2.5 text-sm shadow-sm ${
            mine
              ? `bg-[#008ad2] text-white ${endsGroup ? "rounded-2xl rounded-br-md" : "rounded-2xl"}`
              : automatic
                ? `border border-violet-100 bg-violet-50/70 text-slate-800 ${endsGroup ? "rounded-2xl rounded-bl-md" : "rounded-2xl"}`
                : `border border-slate-200 bg-white text-slate-800 ${endsGroup ? "rounded-2xl rounded-bl-md" : "rounded-2xl"}`
          } ${pending ? "opacity-70" : ""}`}
        >
          <p className="whitespace-pre-wrap break-words leading-6">{message.body}</p>
          {message.attachments.length > 0 && <Attachments message={message} ticketId={ticketId} mine={mine} />}
        </article>
        {endsGroup && (
          <p className="mt-1 px-1 text-[10.5px] font-medium text-slate-400">
            {pending ? (
              "Sending…"
            ) : (
              <time dateTime={message.createdAt}>
                {hydrated ? (mine ? `You · ${timeLabel(message.createdAt)}` : timeLabel(message.createdAt)) : mine ? "You" : ""}
              </time>
            )}
          </p>
        )}
      </div>
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
  const hydrated = useHydrated();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState<SupportMessage | null>(null);
  const [isPending, startTransition] = useTransition();
  const [resolving, startResolving] = useTransition();
  const terminal = isTerminal(ticket.status);
  const endOfThread = useRef<HTMLLIElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  useSupportRealtimeRefresh(ticket.id);

  // Day separators and "today/yesterday" depend on the viewer's clock, so they
  // appear only after hydration.
  const items = useMemo(() => buildThreadItems(messages, hydrated ? new Date() : null), [messages, hydrated]);

  // Keep the newest message in view, like a chat: on load and after each change.
  useEffect(() => {
    endOfThread.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, ticket.status, sending]);

  // Grow the composer with its content, up to a cap.
  useEffect(() => {
    const element = composer.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
  }, [body]);

  const situation = ticket.status === "waiting_on_customer"
      ? "DXG replied — your turn"
      : assignee
        ? `${assignee.name} at DXG is on it`
        : "waiting for a DXG agent";

  const send = () => {
    const text = body.trim();
    if (!text) {
      toast.error("Write a message first.");
      return;
    }
    // Shown straight away and replaced by the real message on refresh. The
    // composer clears like a chat; a failed send puts the draft back.
    const draftFiles = files;
    setSending({
      id: "pending",
      authorRole: "customer",
      kind: "message",
      body: text,
      attachments: [],
      createdAt: new Date().toISOString(),
    });
    setBody("");
    setFiles([]);
    const restore = (message: string) => {
      setSending(null);
      setBody(text);
      setFiles(draftFiles);
      toast.error(message);
    };
    startTransition(async () => {
      const uploaded = await uploadSupportAttachments(draftFiles);
      if (!uploaded.ok) {
        restore(uploaded.message);
        return;
      }
      const result = await replySupportTicketAction(
        ticket.id,
        text,
        uploaded.attachments.map((attachment) => attachment.id),
      );
      if (!result.success) {
        restore(result.message);
        return;
      }
      setSending(null);
      if (terminal) toast.success("Reopened and sent to DXG support.");
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
    <div className="mx-auto flex h-[calc(100dvh-4rem-4.5rem-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-4xl flex-col px-4 pb-2 pt-2 sm:px-6 lg:h-[calc(100dvh-2rem)] lg:pb-4 lg:pt-4">
      <Link href="/support" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0069a0] hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All requests
      </Link>

      <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-400">#{ticket.ticketNumber}</span>
              <h1 className="text-lg font-black tracking-tight text-slate-900">{ticket.subject}</h1>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${statusClass(ticket.status)}`}>
                {statusLabel(ticket.status)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {categoryLabel(ticket.category)} · opened <SupportDateTime value={ticket.createdAt} /> ·{" "}
              {terminal ? (
                <>
                  {statusLabel(ticket.status)}{" "}
                  <SupportDateTime value={ticket.resolvedAt ?? ticket.closedAt ?? ticket.lastMessageAt} />
                </>
              ) : (
                situation
              )}
            </p>
          </div>
          {!terminal && (
            <button
              type="button"
              onClick={resolve}
              disabled={resolving}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
            >
              {resolving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
              This is solved
            </button>
          )}
        </header>

        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/60 px-4 py-5 sm:px-6" aria-label="Conversation">
          {items.map((item) => {
            if (item.type === "day") {
              return (
                <li key={item.key} className="my-4 flex items-center gap-3 first:mt-0" aria-label={item.label}>
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{item.label}</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </li>
              );
            }
            if (item.type === "event") {
              return (
                <li key={item.key} className="my-3 flex justify-center">
                  <p className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                    {item.message.body}
                    {hydrated && ` · ${timeLabel(item.message.createdAt)}`}
                  </p>
                </li>
              );
            }
            return (
              <MessageRow
                key={item.key}
                message={item.message}
                startsGroup={item.startsGroup}
                endsGroup={item.endsGroup}
                assigneeName={assignee?.name ?? null}
                ticketId={ticket.id}
                hydrated={hydrated}
              />
            );
          })}
          {sending && (
            <MessageRow
              message={sending}
              startsGroup
              endsGroup
              assigneeName={null}
              ticketId={ticket.id}
              hydrated={hydrated}
              pending
            />
          )}
          <li ref={endOfThread} aria-hidden="true" className="h-px" />
        </ul>

        <footer className="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-5">
          {terminal && (
            <p className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800">
              This request is {statusLabel(ticket.status).toLowerCase()}. Reply below to reopen it.
            </p>
          )}
          <div className="flex flex-wrap items-end gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 transition focus-within:border-[#008ad2] focus-within:ring-2 focus-within:ring-[#008ad2]/15">
            <AttachmentPicker files={files} onChange={setFiles} disabled={isPending} iconOnly />
            <textarea
              ref={composer}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                if (event.shiftKey && !(event.metaKey || event.ctrlKey)) return;
                event.preventDefault();
                send();
              }}
              rows={1}
              maxLength={BODY_MAX}
              aria-label="Reply to DXG support"
              placeholder={terminal ? "Write a reply to reopen this request…" : "Write a reply…"}
              className="order-2 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={send}
              disabled={isPending}
              aria-label={terminal ? "Reopen & send" : "Send"}
              title={terminal ? "Reopen & send" : "Send (Enter)"}
              className={`order-3 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#008ad2] text-sm font-bold text-white shadow-sm transition hover:bg-[#0076b4] disabled:opacity-60 ${
                terminal ? "px-3" : "w-9"
              }`}
            >
              {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-4 w-4" aria-hidden="true" />}
              {terminal && <span>Reopen</span>}
            </button>
          </div>
          <p className="mt-1.5 hidden px-1 text-[11px] text-slate-400 sm:block">
            Enter to send · Shift + Enter for a new line · up to 3 screenshots or PDFs, 10 MB each
          </p>
        </footer>
      </section>
    </div>
  );
}
