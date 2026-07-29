import { Archive, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantThread } from "@/lib/aiAssistant/types";

const dateLabel = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
};

export default function AssistantHistory({
  threads,
  selectedThreadId,
  loading,
  mobile = false,
  onSelect,
  onArchive,
  onClose,
}: {
  threads: AssistantThread[];
  selectedThreadId: string | null;
  loading: boolean;
  mobile?: boolean;
  onSelect: (threadId: string) => void;
  onArchive: (threadId: string) => void;
  onClose?: () => void;
}) {
  const activeThreads = threads.filter((thread) => thread.status === "active");
  return (
    <aside
      aria-label="Recent AI Assistant conversations"
      className={cn(
        "flex min-h-0 flex-col border-r border-slate-100 bg-slate-50/70",
        mobile ? "h-full w-full" : "hidden w-[270px] shrink-0 lg:flex",
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <h2 className="text-sm font-bold text-slate-800">Recent chats</h2>
        {mobile && (
          <button
            type="button"
            data-history-close="true"
            aria-label="Close conversation history"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
          >
            <X size={18} aria-hidden />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {loading && (
          <div role="status" aria-label="Loading conversation history" className="space-y-2 p-2">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-slate-200/70"
              />
            ))}
          </div>
        )}
        {!loading && activeThreads.length === 0 && (
          <div className="px-3 py-8 text-center">
            <MessageCircle
              size={22}
              aria-hidden
              className="mx-auto text-slate-300"
            />
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Your recent conversations will appear here.
            </p>
          </div>
        )}
        {!loading && activeThreads.length > 0 && (
          <ul className="space-y-1">
            {activeThreads.map((thread) => {
              const active = thread.id === selectedThreadId;
              return (
                <li key={thread.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(thread.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 pr-10 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]",
                      active
                        ? "bg-white text-[#0e1b2b] shadow-sm ring-1 ring-slate-200"
                        : "text-slate-600 hover:bg-white hover:text-slate-900",
                    )}
                  >
                    <span className="block truncate text-sm font-semibold">
                      {thread.title}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                      {thread.messageCount} messages
                      <span aria-hidden>·</span>
                      {dateLabel(thread.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Archive ${thread.title}`}
                    title="Archive conversation"
                    onClick={(event) => {
                      event.stopPropagation();
                      onArchive(thread.id);
                    }}
                    className="absolute right-2 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] group-hover:opacity-100"
                  >
                    <Archive size={14} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="shrink-0 border-t border-slate-100 px-4 py-3 text-[10px] leading-relaxed text-slate-400">
        Conversations are private to your account.
      </p>
    </aside>
  );
}
