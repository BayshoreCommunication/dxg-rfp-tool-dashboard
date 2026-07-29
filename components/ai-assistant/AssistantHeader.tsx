import { History, Plus, X } from "lucide-react";

export default function AssistantHeader({
  title,
  hasHistory,
  onOpenHistory,
  onNewChat,
  onClose,
  compact = false,
}: {
  title: string;
  hasHistory: boolean;
  onOpenHistory: () => void;
  onNewChat: () => void;
  onClose?: () => void;
  compact?: boolean;
}) {
  return (
    <header
      className={
        compact
          ? "flex min-h-13 shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3.5"
          : "flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 sm:px-6"
      }
    >
      {compact ? (
        <h1 className="truncate text-[15px] font-bold text-[#0e1b2b]">
          AI Assistant
        </h1>
      ) : (
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#087f69]">
            AI Assistant
          </p>
          <h1 className="truncate text-base font-bold text-[#0e1b2b]">
            {title}
          </h1>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        {hasHistory && (
          <button
            id="ai-assistant-history-trigger"
            type="button"
            aria-label="Open conversation history"
            onClick={onOpenHistory}
            className={`items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition-colors hover:border-[#00c2c9]/40 hover:bg-[#e0f9fa]/60 hover:text-[#087f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] ${
              compact
                ? "inline-flex h-8 w-8 px-0"
                : "inline-flex h-10 px-3 lg:hidden"
            }`}
          >
            <History size={16} aria-hidden />
            {!compact && <span className="hidden sm:inline">History</span>}
          </button>
        )}
        <button
          type="button"
          aria-label={compact ? "Start new conversation" : undefined}
          title={compact ? "New conversation" : undefined}
          onClick={onNewChat}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0e1b2b] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1c3047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2 ${
            compact ? "h-8 w-8 px-0" : "h-10 px-3.5"
          }`}
        >
          <Plus size={compact ? 15 : 16} aria-hidden />
          {!compact && (
            <>
              <span className="hidden sm:inline">New chat</span>
              <span className="sm:hidden">New</span>
            </>
          )}
        </button>
        {onClose && (
          <button
            type="button"
            aria-label="Close AI Assistant"
            onClick={onClose}
            className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] ${
              compact ? "h-8 w-8" : "h-10 w-10"
            }`}
          >
            <X size={18} aria-hidden />
          </button>
        )}
      </div>
    </header>
  );
}
