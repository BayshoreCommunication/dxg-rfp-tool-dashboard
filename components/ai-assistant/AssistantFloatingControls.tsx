"use client";

import {
  History,
  MoreHorizontal,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function AssistantFloatingControls({
  hasHistory,
  onOpenHistory,
  onNewChat,
  onClose,
  onResetPosition,
  positionModified = false,
}: {
  hasHistory: boolean;
  onOpenHistory: () => void;
  onNewChat: () => void;
  onClose: () => void;
  onResetPosition?: () => void;
  positionModified?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [menuOpen]);

  const runAndClose = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <div
      ref={rootRef}
      data-assistant-menu={menuOpen ? "open" : "closed"}
      className="absolute right-3 top-3 z-30 flex items-center gap-1.5"
    >
      <div className="relative">
        <button
          type="button"
          aria-label="Assistant options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-600 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.75)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2 motion-reduce:transform-none"
        >
          <MoreHorizontal size={17} strokeWidth={2.4} aria-hidden />
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Assistant options"
            className="absolute right-0 top-10 w-48 origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)] motion-safe:animate-[assistant-message-in_160ms_ease-out]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => runAndClose(onNewChat)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
            >
              <Plus size={15} aria-hidden className="text-[#00aeb5]" />
              Start new conversation
            </button>
            <button
              type="button"
              role="menuitem"
              aria-label="Open conversation history"
              disabled={!hasHistory}
              onClick={() => runAndClose(onOpenHistory)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              <History size={15} aria-hidden />
              Conversation history
            </button>
            {onResetPosition && (
              <button
                type="button"
                role="menuitem"
                disabled={!positionModified}
                onClick={() => runAndClose(onResetPosition)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                <RotateCcw size={15} aria-hidden />
                Reset popup position
              </button>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Close AI Assistant"
        onClick={onClose}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-600 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.75)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2 motion-reduce:transform-none"
      >
        <X size={17} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}
