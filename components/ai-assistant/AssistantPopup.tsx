"use client";

import { LoaderCircle, X } from "lucide-react";
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
  const [bootstrap, setBootstrap] = useState<BootstrapState>({
    status: "idle",
  });

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
      if (event.key === "Escape" && !menuOpen) close(true);
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
      className={`fixed bottom-[135px] left-[102px] z-40 h-[min(420px,calc(100dvh-153px))] w-[min(360px,calc(100vw-116px))] origin-bottom-left overflow-hidden rounded-[20px] border border-slate-200/90 bg-white text-left shadow-[0_24px_64px_-24px_rgba(14,27,43,0.56)] outline-none will-change-[transform,opacity] ${
        open
          ? "assistant-popup-open"
          : "assistant-popup-closed"
      }`}
    >
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
              onClick={() => close()}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-500 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.75)] backdrop-blur transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            onClose={close}
          />
        )}
      </div>
    </section>
  );
}
