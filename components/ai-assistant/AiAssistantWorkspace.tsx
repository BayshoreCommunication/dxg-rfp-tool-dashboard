"use client";

import { useRef, useState } from "react";
import type {
  AssistantThread,
  AssistantThreadDetail,
  AssistantUiError,
} from "@/lib/aiAssistant/types";
import AssistantEmptyState from "./AssistantEmptyState";
import AssistantHeader from "./AssistantHeader";
import AssistantHistory from "./AssistantHistory";
import ChatComposer from "./ChatComposer";
import ConversationError from "./ConversationError";
import MessageList from "./MessageList";
import { useAiAssistant } from "./useAiAssistant";

export default function AiAssistantWorkspace({
  initialThreads,
  initialDetail,
  initialError = null,
}: {
  initialThreads: AssistantThread[];
  initialDetail: AssistantThreadDetail | null;
  initialError?: AssistantUiError | null;
}) {
  const assistant = useAiAssistant({
    initialThreads,
    initialDetail,
    initialError,
  });
  const { state } = assistant;
  const [historyOpen, setHistoryOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const activeThreads = state.threads.filter(
    (thread) => thread.status === "active",
  );
  const selectedThread = state.threads.find(
    (thread) => thread.id === state.selectedThreadId,
  );
  const loading = state.conversationStatus === "loading";
  const hasConversation =
    loading ||
    state.messages.length > 0 ||
    Boolean(state.streamingAssistant) ||
    state.conversationStatus === "sending" ||
    state.conversationStatus === "streaming";

  const selectThread = (threadId: string) => {
    setHistoryOpen(false);
    void assistant.selectThread(threadId);
  };

  const newChat = () => {
    setHistoryOpen(false);
    assistant.newChat();
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const retry = () => {
    if (state.pendingRequest) {
      void assistant.retry();
      return;
    }
    if (state.selectedThreadId) {
      void assistant.selectThread(state.selectedThreadId);
      return;
    }
    void assistant.refreshThreads();
  };

  const composer = (
    <ChatComposer
      value={state.draft}
      busy={assistant.busy}
      canSend={assistant.canSend}
      retryAfterSeconds={assistant.retryAfterSeconds}
      textareaRef={composerRef}
      onChange={assistant.setDraft}
      onSend={() => void assistant.send()}
      onAbort={assistant.abort}
      compact={hasConversation}
    />
  );

  return (
    <div className="-mx-3 flex min-h-[calc(100vh-3rem)] w-auto max-w-[1152px] flex-col sm:mx-auto sm:w-full">
      <p className="mb-3 shrink-0 text-sm font-semibold text-slate-600">
        AI Assistant
      </p>
      <section
        aria-label="AI Assistant workspace"
        className="flex min-h-[620px] flex-1 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_22px_70px_-50px_rgba(15,23,42,0.65)] sm:rounded-[26px]"
      >
        {activeThreads.length > 0 && (
          <AssistantHistory
            threads={state.threads}
            selectedThreadId={state.selectedThreadId}
            loading={state.threadListStatus === "loading"}
            onSelect={selectThread}
            onArchive={(threadId) => {
              void assistant.archiveThread(threadId);
            }}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <AssistantHeader
            title={selectedThread?.title || "New conversation"}
            hasHistory={activeThreads.length > 0}
            onOpenHistory={() => setHistoryOpen(true)}
            onNewChat={newChat}
          />
          {!hasConversation ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AssistantEmptyState
                onSuggestion={(prompt) => {
                  assistant.setDraft(prompt);
                  window.requestAnimationFrame(() =>
                    composerRef.current?.focus(),
                  );
                }}
              >
                {state.error && (
                  <div className="mb-3 text-left">
                    <ConversationError
                      error={state.error}
                      retryAfterSeconds={assistant.retryAfterSeconds}
                      onRetry={retry}
                      onDismiss={assistant.clearError}
                    />
                  </div>
                )}
                {composer}
              </AssistantEmptyState>
            </div>
          ) : (
            <>
              <MessageList
                messages={state.messages}
                streamingAssistant={state.streamingAssistant}
                loading={loading}
                isNearBottom={state.isNearBottom}
                onNearBottomChange={assistant.setNearBottom}
              />
              <div className="shrink-0 border-t border-slate-100 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-7">
                <div className="mx-auto max-w-3xl">
                  {state.error && (
                    <div className="mb-3">
                      <ConversationError
                        error={state.error}
                        retryAfterSeconds={assistant.retryAfterSeconds}
                        onRetry={retry}
                        onDismiss={assistant.clearError}
                      />
                    </div>
                  )}
                  {composer}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {historyOpen && (
        <div className="fixed bottom-0 left-[90px] right-0 top-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close conversation history"
            onClick={() => setHistoryOpen(false)}
            className="absolute inset-0 bg-[#0e1b2b]/35 backdrop-blur-[2px]"
          />
          <div className="absolute bottom-0 left-0 top-0 w-[min(88vw,320px)] bg-white shadow-2xl motion-safe:animate-[assistant-message-in_180ms_ease-out]">
            <AssistantHistory
              mobile
              threads={state.threads}
              selectedThreadId={state.selectedThreadId}
              loading={state.threadListStatus === "loading"}
              onSelect={selectThread}
              onArchive={(threadId) => {
                void assistant.archiveThread(threadId);
              }}
              onClose={() => setHistoryOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
