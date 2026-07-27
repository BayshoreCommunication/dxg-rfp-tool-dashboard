import { History, Plus } from "lucide-react";

export default function AssistantHeader({
  title,
  hasHistory,
  onOpenHistory,
  onNewChat,
}: {
  title: string;
  hasHistory: boolean;
  onOpenHistory: () => void;
  onNewChat: () => void;
}) {
  return (
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 sm:px-6">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#087f69]">
          AI Assistant
        </p>
        <h1 className="truncate text-base font-bold text-[#0e1b2b]">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {hasHistory && (
          <button
            type="button"
            aria-label="Open conversation history"
            onClick={onOpenHistory}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition-colors hover:border-[#00c2c9]/40 hover:bg-[#e0f9fa]/60 hover:text-[#087f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] lg:hidden"
          >
            <History size={16} aria-hidden />
            <span className="hidden sm:inline">History</span>
          </button>
        )}
        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0e1b2b] px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1c3047] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2"
        >
          <Plus size={16} aria-hidden />
          <span className="hidden sm:inline">New chat</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>
    </header>
  );
}
