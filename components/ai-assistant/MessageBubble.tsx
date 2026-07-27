"use client";

import { Check, Copy, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AssistantSources, {
  safeAssistantHref,
} from "./AssistantSources";
import type { AssistantDisplayMessage } from "@/lib/aiAssistant/types";
import { cn } from "@/lib/utils";

export default function MessageBubble({
  message,
  streaming = false,
}: {
  message: AssistantDisplayMessage;
  streaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (message.role === "system_event") {
    return (
      <li className="text-center text-xs text-slate-400">
        {message.content}
      </li>
    );
  }
  const user = message.role === "user";
  const interrupted =
    message.status === "failed" || message.status === "aborted";

  const copy = async () => {
    if (!message.content || !navigator.clipboard) return;
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <li
      className={cn(
        "flex w-full motion-safe:animate-[assistant-message-in_180ms_ease-out]",
        user ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "group flex max-w-[92%] items-start gap-2.5 sm:max-w-[84%]",
          user && "flex-row-reverse",
        )}
      >
        {!user && (
          <div
            aria-hidden
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e0f9fa] text-[#009da4]"
          >
            <Sparkles size={15} />
          </div>
        )}
        <div className="min-w-0">
          <div
            className={cn(
              "relative rounded-2xl px-4 py-3 text-[15px] leading-6",
              user
                ? "rounded-br-md bg-[#0e1b2b] text-white shadow-[0_10px_28px_-22px_rgba(14,27,43,0.9)]"
                : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.55)]",
              message.optimistic && "opacity-70",
              interrupted && !user && "border-amber-200 bg-amber-50/50",
            )}
          >
            {user ? (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <div className="assistant-markdown break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => {
                      const safe = safeAssistantHref(href);
                      if (!safe) return <span>{children}</span>;
                      return safe.startsWith("/") ? (
                        <Link
                          href={safe}
                          className="font-semibold text-[#087f69] underline decoration-[#00c2c9]/40 underline-offset-2 hover:text-[#009da4]"
                        >
                          {children}
                        </Link>
                      ) : (
                        <a
                          href={safe}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="font-semibold text-[#087f69] underline decoration-[#00c2c9]/40 underline-offset-2 hover:text-[#009da4]"
                        >
                          {children}
                        </a>
                      );
                    },
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="my-2 list-disc space-y-1 pl-5">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="my-2 list-decimal space-y-1 pl-5">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li>{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-bold text-[#0e1b2b]">
                        {children}
                      </strong>
                    ),
                    code: ({ children }) => (
                      <code className="rounded bg-slate-100 px-1 py-0.5 text-[13px] text-slate-800">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {streaming && (
                  <LoaderCircle
                    size={14}
                    aria-hidden
                    className="ml-1 inline animate-spin text-[#00aeb5]"
                  />
                )}
              </div>
            )}
            {!user && <AssistantSources citations={message.citations} />}
          </div>
          <div
            className={cn(
              "mt-1.5 flex min-h-6 items-center gap-2",
              user ? "justify-end" : "justify-start",
            )}
          >
            {message.optimistic && (
              <span className="text-[11px] text-slate-400">Sending…</span>
            )}
            {interrupted && (
              <span className="text-[11px] font-semibold text-amber-700">
                {message.status === "aborted"
                  ? "Response stopped"
                  : "Response interrupted"}
              </span>
            )}
            {!user && message.content && !streaming && (
              <button
                type="button"
                onClick={() => void copy()}
                aria-label="Copy assistant response"
                className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] text-slate-400 opacity-100 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
              >
                {copied ? (
                  <Check size={12} aria-hidden />
                ) : (
                  <Copy size={12} aria-hidden />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
