"use client";

import {
  GripVertical,
  LoaderCircle,
  Move,
  Scaling,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { getAssistantBootstrapAction } from "@/app/actions/aiAssistant";
import type {
  AssistantThread,
  AssistantThreadDetail,
  AssistantUiError,
} from "@/lib/aiAssistant/types";
import AiAssistantWorkspace from "./AiAssistantWorkspace";
import useDraggablePopup from "./useDraggablePopup";
import useAssistantUiContext from "./useAssistantUiContext";
import { trackAssistantProductEvent } from "@/lib/aiAssistant/analytics";

type BootstrapState =
  | { status: "idle" }
  | {
      status: "ready";
      threads: AssistantThread[];
      detail: AssistantThreadDetail | null;
      error: AssistantUiError | null;
    };

const toUiError = (
  result: Extract<
    Awaited<ReturnType<typeof getAssistantBootstrapAction>>,
    { success: false }
  >,
): AssistantUiError => ({
  code: result.code,
  message: result.message,
  correlationId: result.correlationId,
  retryable: result.retryable,
  ...(result.retryAfterSeconds
    ? { retryAfterSeconds: result.retryAfterSeconds }
    : {}),
});

export default function AssistantPopup({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const popupRef = useRef<HTMLElement | null>(null);
  const openedTrackedRef = useRef(false);
  const uiContext = useAssistantUiContext();
  const [bootstrap, setBootstrap] = useState<BootstrapState>({
    status: "idle",
  });
  const {
    position,
    size,
    dragging,
    resizing,
    positionModified,
    sizeModified,
    interactionAnnouncement,
    resetPosition,
    resetSize,
    dragHandleProps,
    resizeHandleProps,
  } = useDraggablePopup(popupRef);

  const load = useCallback(async () => {
    const result = await getAssistantBootstrapAction();
    if (!result.success) {
      setBootstrap({
        status: "ready",
        threads: [],
        detail: null,
        error: toUiError(result),
      });
      return;
    }
    setBootstrap({
      status: "ready",
      threads: result.data.threads,
      detail: result.data.detail,
      error: null,
    });
  }, []);

  useEffect(() => {
    if (!open || bootstrap.status !== "idle") return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [bootstrap.status, load, open]);

  const close = useCallback((restoreFocus = false) => {
    onOpenChange(false);
    if (!restoreFocus) return;
    window.setTimeout(() => {
      document.getElementById("ai-assistant-launcher")?.focus({
        preventScroll: true,
      });
    }, 330);
  }, [onOpenChange]);

  useLayoutEffect(() => {
    if (!open) return;
    if (popupRef.current) {
      popupRef.current.dataset.everOpened = "true";
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const menuOpen = popupRef.current?.querySelector(
        '[data-assistant-menu="open"]',
      );
      const historyOpen = popupRef.current?.querySelector(
        '[data-assistant-history="open"]',
      );
      if (event.key === "Escape" && !menuOpen && !historyOpen) close(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  useEffect(() => {
    if (!open || bootstrap.status !== "ready") return;
    const timer = window.setTimeout(() => {
      popupRef.current
        ?.querySelector<HTMLTextAreaElement>("#ai-assistant-composer")
        ?.focus();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [bootstrap.status, open]);

  useEffect(() => {
    if (!open) {
      openedTrackedRef.current = false;
      return;
    }
    if (bootstrap.status !== "ready" || openedTrackedRef.current) return;
    openedTrackedRef.current = true;
    void trackAssistantProductEvent({
      eventType: "assistant_opened",
      threadId: bootstrap.detail?.thread.id ?? null,
      routeCategory: uiContext.routeCategory,
    });
  }, [bootstrap, open, uiContext.routeCategory]);

  return (
    <section
      ref={popupRef}
      role="dialog"
      aria-label="AI Assistant"
      aria-modal="false"
      aria-hidden={!open}
      inert={!open}
      data-state={open ? "open" : "closed"}
      data-motion-origin="launcher"
      data-dragging={dragging ? "true" : "false"}
      data-resizing={resizing ? "true" : "false"}
      style={{
        left: position?.x ?? 12,
        top: position?.y ?? 12,
        ...(size
          ? { width: size.width, height: size.height }
          : {}),
      }}
      className={`fixed z-[60] h-[min(460px,calc(100dvh-24px))] w-[min(384px,calc(100vw-24px))] origin-bottom-left overflow-hidden rounded-[20px] border border-slate-200/90 bg-white text-left outline-none transition-[box-shadow,border-color] duration-200 ${
        dragging || resizing
          ? "cursor-grabbing border-[#00c2c9]/45 shadow-[0_30px_80px_-24px_rgba(14,27,43,0.68)]"
          : "shadow-[0_24px_64px_-24px_rgba(14,27,43,0.56)]"
      } ${
        open
          ? "assistant-popup-open"
          : "assistant-popup-closed"
      }`}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {interactionAnnouncement}
      </p>
      <p id="ai-assistant-move-instructions" className="sr-only">
        Use arrow keys to move the Assistant, Shift plus an arrow for a larger
        step, and Home to reset its position.
      </p>
      <p id="ai-assistant-resize-instructions" className="sr-only">
        Use arrow keys to resize the Assistant, Shift plus an arrow for a
        larger step, and Home to reset its size.
      </p>
      <button
        type="button"
        aria-label="Move AI Assistant"
        aria-describedby="ai-assistant-move-instructions"
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home"
        title="Drag to move · Arrow keys to nudge · Home to reset"
        data-testid="assistant-drag-handle"
        {...dragHandleProps}
        className={`absolute left-3 top-3 z-40 inline-flex h-10 w-10 touch-none items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-500 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.75)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-[#00aeb5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2 motion-reduce:transform-none ${
          dragging ? "cursor-grabbing text-[#00aeb5]" : "cursor-grab"
        }`}
      >
        <Move size={15} strokeWidth={2.2} aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Resize AI Assistant from upper right"
        aria-describedby="ai-assistant-resize-instructions"
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home"
        title="Drag to resize · Arrow keys resize · Home resets size"
        data-testid="assistant-resize-top-right"
        {...resizeHandleProps("topRight")}
        className="group absolute right-0 top-14 z-50 flex h-16 w-6 touch-none cursor-nesw-resize items-center justify-center rounded-l-xl opacity-0 transition duration-200 hover:bg-white/90 hover:opacity-100 focus-visible:bg-white/95 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00c2c9]"
      >
        <span className="flex h-9 w-2.5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition group-hover:text-[#00aeb5] group-focus-visible:text-[#00aeb5]">
          <GripVertical size={10} strokeWidth={2.3} aria-hidden />
        </span>
      </button>
      <button
        type="button"
        aria-label="Resize AI Assistant from lower right"
        aria-describedby="ai-assistant-resize-instructions"
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home"
        data-testid="assistant-resize-bottom-right"
        {...resizeHandleProps("bottomRight")}
        className="group absolute bottom-1 right-1 z-50 flex h-8 w-8 touch-none cursor-nwse-resize items-end justify-end rounded-lg opacity-70 transition duration-200 hover:bg-white/70 hover:opacity-100 focus-visible:bg-white/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00c2c9]"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200/90 bg-white/95 text-slate-400 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.75)] transition duration-150 group-hover:border-[#00c2c9]/40 group-hover:bg-[#f0fdfe] group-hover:text-[#00aeb5] group-focus-visible:border-[#00c2c9]/40 group-focus-visible:text-[#00aeb5]">
          <Scaling size={12} strokeWidth={2.2} aria-hidden />
        </span>
      </button>
      <div
        className={`h-full transition-opacity motion-reduce:transition-none ${
          open
            ? "opacity-100 delay-200 duration-150"
            : "opacity-0 delay-0 duration-75"
        }`}
      >
        {bootstrap.status !== "ready" ? (
          <div className="relative flex h-full flex-col bg-white">
            <button
              type="button"
              aria-label="Close AI Assistant"
              onClick={() => close(true)}
              className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-500 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.75)] backdrop-blur transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X size={17} aria-hidden />
            </button>
            <div
              role="status"
              aria-label="Loading AI Assistant"
              className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 px-6 text-center"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LoaderCircle
                  size={21}
                  aria-hidden
                  className="motion-safe:animate-spin"
                />
              </span>
              <p className="text-sm font-semibold text-[#0e1b2b]">
                Opening Assistant…
              </p>
            </div>
          </div>
        ) : (
          <AiAssistantWorkspace
            initialThreads={bootstrap.threads}
            initialDetail={bootstrap.detail}
            initialError={bootstrap.error}
            presentation="popup"
            onClose={() => close(true)}
            onResetPosition={resetPosition}
            onResetSize={resetSize}
            positionModified={positionModified}
            sizeModified={sizeModified}
            uiContext={uiContext}
          />
        )}
      </div>
    </section>
  );
}
