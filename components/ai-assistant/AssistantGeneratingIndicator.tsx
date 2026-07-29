import { Sparkles } from "lucide-react";

export default function AssistantGeneratingIndicator() {
  return (
    <div
      aria-hidden
      data-testid="assistant-generating-indicator"
      className="flex items-center gap-2.5 motion-safe:animate-[assistant-message-in_180ms_ease-out]"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e0f9fa] text-[#009da4]">
        <Sparkles
          size={15}
          className="motion-safe:animate-pulse"
          aria-hidden
        />
      </div>
      <div className="inline-flex min-h-10 items-center gap-2.5 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-500 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.55)]">
        <span>Thinking</span>
        <span className="flex items-center gap-1" aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-[#00aeb5] motion-safe:animate-bounce motion-safe:[animation-delay:-240ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#00aeb5] motion-safe:animate-bounce motion-safe:[animation-delay:-120ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#00aeb5] motion-safe:animate-bounce" />
        </span>
      </div>
    </div>
  );
}
