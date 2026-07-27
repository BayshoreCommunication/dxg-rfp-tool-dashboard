"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import TypingIndicator from "@/components/ai/shared/TypingIndicator";
import type { AssistantDisplayMessage } from "@/lib/aiAssistant/types";
import MessageBubble from "./MessageBubble";
import JumpToLatest from "./JumpToLatest";

export default function MessageList({
  messages,
  streamingAssistant,
  loading,
  responding,
  isNearBottom,
  onNearBottomChange,
  compact = false,
  onNavigate,
}: {
  messages: AssistantDisplayMessage[];
  streamingAssistant: {
    messageId: string;
    content: string;
    receivedFirstDelta: boolean;
  } | null;
  loading: boolean;
  responding: boolean;
  isNearBottom: boolean;
  onNearBottomChange: (value: boolean) => void;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      bottomRef.current?.scrollIntoView({
        block: "end",
        behavior: reduced ? "auto" : behavior,
      });
      onNearBottomChange(true);
    },
    [onNearBottomChange],
  );

  useEffect(() => {
    if (isNearBottom) scrollToLatest("auto");
  }, [
    isNearBottom,
    messages.length,
    scrollToLatest,
    streamingAssistant?.content,
  ]);

  const streamingMessage = useMemo<AssistantDisplayMessage | null>(() => {
    if (!streamingAssistant?.receivedFirstDelta) return null;
    const stamp = new Date().toISOString();
    return {
      id: streamingAssistant.messageId,
      threadId: messages[0]?.threadId || "",
      ordinal:
        messages.reduce(
          (maximum, message) => Math.max(maximum, message.ordinal),
          0,
        ) + 1,
      role: "assistant",
      content: streamingAssistant.content,
      status: "streaming",
      providerResponseId: null,
      model: null,
      inputTokens: null,
      outputTokens: null,
      safeErrorCode: null,
      citations: [],
      createdAt: stamp,
      updatedAt: stamp,
      completedAt: null,
    };
  }, [messages, streamingAssistant]);

  const latestCompleted = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (
        message.role === "assistant" &&
        message.status === "complete" &&
        message.content
      ) {
        return message.content;
      }
    }
    return "";
  }, [messages]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        onScroll={(event) => {
          const node = event.currentTarget;
          const distance =
            node.scrollHeight - node.scrollTop - node.clientHeight;
          onNearBottomChange(distance < 96);
        }}
        className={
          compact
            ? "h-full overflow-y-auto overscroll-contain px-3 pb-4 pt-14"
            : "h-full overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6"
        }
        aria-label="AI Assistant conversation"
      >
        <p aria-live="polite" className="sr-only">
          {latestCompleted}
        </p>
        {loading && (
          <div
            role="status"
            aria-label="Loading conversation"
            className="mx-auto max-w-3xl space-y-5"
          >
            <div className="ml-auto h-16 w-2/3 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-28 w-4/5 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        )}
        {!loading && (
          <ol className="mx-auto max-w-3xl space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onNavigate={onNavigate}
              />
            ))}
            {streamingMessage && (
              <MessageBubble
                key={streamingMessage.id}
                message={streamingMessage}
                streaming
                onNavigate={onNavigate}
              />
            )}
            {responding && !streamingMessage && (
              <li className="flex justify-start">
                <TypingIndicator />
              </li>
            )}
          </ol>
        )}
        <div ref={bottomRef} className="h-px" aria-hidden />
      </div>
      {!isNearBottom && (
        <JumpToLatest onClick={() => scrollToLatest("smooth")} />
      )}
    </div>
  );
}
