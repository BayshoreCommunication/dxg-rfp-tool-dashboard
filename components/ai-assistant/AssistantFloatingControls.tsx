"use client";

import {
  History,
  Minimize2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

export default function AssistantFloatingControls({
  hasHistory,
  onOpenHistory,
  onNewChat,
  onClose,
  onResetPosition,
  onResetSize,
  positionModified = false,
  sizeModified = false,
}: {
  hasHistory: boolean;
  onOpenHistory: () => void;
  onNewChat: () => void;
  onClose: () => void;
  onResetPosition?: () => void;
  onResetSize?: () => void;
  positionModified?: boolean;
  sizeModified?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };

    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const frame = window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLButtonElement>(
          '[role="menuitem"]:not(:disabled)',
        )
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [menuOpen]);

  const moveMenuFocus = (
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) => {
    if (
      !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
    ) {
      return;
    }
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? [],
    );
    if (!items.length) return;
    event.preventDefault();
    const current = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement));
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowDown"
            ? (current + 1) % items.length
            : (current - 1 + items.length) % items.length;
    items[next]?.focus();
  };

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
      <button
        id="ai-assistant-new-chat"
        type="button"
        aria-label="Start new conversation"
        title="New conversation"
        onClick={() => runAndClose(onNewChat)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#0e1b2b] bg-[#0e1b2b] text-white shadow-[0_12px_28px_-14px_rgba(15,23,42,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2 active:translate-y-0 motion-reduce:transform-none"
      >
        <Plus size={18} strokeWidth={2.35} aria-hidden />
      </button>

      <div className="relative">
        <button
          ref={triggerRef}
          id="ai-assistant-options"
          type="button"
          aria-label="Assistant options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls="ai-assistant-options-menu"
          onClick={() => setMenuOpen((current) => !current)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-600 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.75)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2 motion-reduce:transform-none"
        >
          <MoreHorizontal size={17} strokeWidth={2.4} aria-hidden />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            id="ai-assistant-options-menu"
            role="menu"
            aria-label="Assistant options"
            onKeyDown={moveMenuFocus}
            className="absolute right-0 top-10 w-[210px] origin-top-right overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)] motion-safe:animate-[assistant-message-in_160ms_ease-out]"
          >
            <button
              type="button"
              role="menuitem"
              aria-label="Open conversation history"
              disabled={!hasHistory}
              onClick={() => runAndClose(onOpenHistory)}
              className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
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
                className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                <RotateCcw size={15} aria-hidden />
                Reset popup position
              </button>
            )}
            {onResetSize && (
              <button
                type="button"
                role="menuitem"
                disabled={!sizeModified}
                onClick={() => runAndClose(onResetSize)}
                className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                <Minimize2 size={15} aria-hidden />
                Reset popup size
              </button>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Close AI Assistant"
        onClick={onClose}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-600 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.75)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2 motion-reduce:transform-none"
      >
        <X size={17} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}
