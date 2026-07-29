"use client";

import {
  Check,
  Copy,
  LoaderCircle,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AssistantSources, {
  safeAssistantHref,
} from "./AssistantSources";
import AssistantHandoffActions from "./AssistantHandoffActions";
import AssistantFeedbackControls from "./AssistantFeedbackControls";
import type { AssistantDisplayMessage } from "@/lib/aiAssistant/types";
import { cn } from "@/lib/utils";
import { trackAssistantProductEvent } from "@/lib/aiAssistant/analytics";

const escapeMarkdownLabel = (value: string): string =>
  value.replace(/([\\[\]])/g, "\\$1");

export const normalizeAssistantMarkdownLinks = (
  content: string,
  citations: AssistantDisplayMessage["citations"],
): string =>
  [...citations]
    .flatMap((citation) => {
      const href = safeAssistantHref(citation.href);
      return href?.startsWith("/")
        ? [{ href, title: citation.title }]
        : [];
    })
    .sort((left, right) => right.href.length - left.href.length)
    .reduce(
      (markdown, citation) =>
        markdown.replaceAll(
          citation.href,
          (match, offset: number, source: string) => {
            const before = source.slice(Math.max(0, offset - 2), offset);
            const after = source.at(offset + citation.href.length) || "";
            if (before === "](" || /[\w/-]/.test(after)) return match;
            return `[${escapeMarkdownLabel(citation.title)}](${citation.href})`;
          },
        ),
      content,
    );

export const assistantSpeechText = (content: string): string =>
  content
    .replace(/\[([^\]]+)]\((?:[^()]|\([^()]*\))*\)/g, "$1")
    .replace(/[`*_>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function MessageBubble({
  message,
  streaming = false,
  onNavigate,
  handoffDraft,
}: {
  message: AssistantDisplayMessage;
  streaming?: boolean;
  onNavigate?: () => void;
  handoffDraft?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setSpeechSupported(
          "speechSynthesis" in window &&
            typeof window.SpeechSynthesisUtterance !== "undefined",
        ),
      0,
    );
    return () => {
      window.clearTimeout(timer);
      if (utteranceRef.current) window.speechSynthesis?.cancel();
    };
  }, []);

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
  const renderedContent = user
    ? message.content
    : normalizeAssistantMarkdownLinks(message.content, message.citations);

  const copy = async () => {
    if (!message.content || !navigator.clipboard) return;
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  const toggleReadAloud = () => {
    if (!speechSupported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      assistantSpeechText(message.content),
    );
    utterance.onend = () => {
      utteranceRef.current = null;
      setSpeaking(false);
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setSpeaking(false);
    };
    utteranceRef.current = utterance;
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
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
              "relative rounded-2xl px-3 py-2.5 text-[14px] leading-5",
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
                          onClick={() => {
                            void trackAssistantProductEvent({
                              eventType: "internal_route_opened",
                              threadId: message.threadId,
                              messageId: message.id,
                            });
                            onNavigate?.();
                          }}
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
                      <p className="mb-1.5 last:mb-0">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="my-1.5 list-disc space-y-0.5 pl-4">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="my-1.5 list-decimal space-y-0.5 pl-4">
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
                      <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px] text-slate-800">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {renderedContent}
                </ReactMarkdown>
                {streaming && (
                  <LoaderCircle
                    size={14}
                    aria-hidden
                    className="ml-1 inline text-[#00aeb5] motion-safe:animate-spin"
                  />
                )}
              </div>
            )}
            {!user && (
              <AssistantSources
                citations={message.citations}
                threadId={message.threadId}
                messageId={message.id}
                onNavigate={onNavigate}
              />
            )}
          </div>
          {!user && !streaming && (
            <AssistantHandoffActions
              message={message}
              userDraft={handoffDraft}
              onNavigate={onNavigate}
            />
          )}
          {!user && !streaming && (
            <AssistantFeedbackControls message={message} />
          )}
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
              <div className="flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => void copy()}
                  aria-label="Copy assistant response"
                  className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
                >
                  {copied ? (
                    <Check size={12} aria-hidden />
                  ) : (
                    <Copy size={12} aria-hidden />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
                {speechSupported && message.status === "complete" && (
                  <button
                    type="button"
                    onClick={toggleReadAloud}
                    aria-label={
                      speaking
                        ? "Stop reading assistant response"
                        : "Read assistant response aloud"
                    }
                    className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
                  >
                    {speaking ? (
                      <Square size={11} fill="currentColor" aria-hidden />
                    ) : (
                      <Volume2 size={12} aria-hidden />
                    )}
                    {speaking ? "Stop" : "Listen"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
