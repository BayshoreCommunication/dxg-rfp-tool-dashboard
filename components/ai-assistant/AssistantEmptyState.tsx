import { CalendarDays, Compass, FileText, Route } from "lucide-react";
import AssistantOrb from "@/components/ai/shared/AssistantOrb";

export const assistantSuggestions = [
  {
    prompt: "How do I create and send a proposal?",
    icon: FileText,
  },
  {
    prompt: "What information should I gather for an event?",
    icon: CalendarDays,
  },
  {
    prompt: "Explain the proposal review workflow.",
    icon: Route,
  },
  {
    prompt: "Where can I see vendor responses?",
    icon: Compass,
  },
] as const;

export default function AssistantEmptyState({
  onSuggestion,
  children,
}: {
  onSuggestion: (prompt: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center px-2 py-8 text-center sm:px-8">
      <AssistantOrb />
      <div className="-mt-3">
        <h2 className="text-[28px] font-extrabold tracking-[-0.03em] text-[#0e1b2b] sm:text-[34px]">
          How can I help?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[15px] leading-6 text-slate-500 sm:text-base sm:leading-7">
          Ask about proposals, event workflows, onboarding, or finding your
          way around RFPilot.
        </p>
      </div>
      <div className="mt-7 w-full max-w-2xl">{children}</div>
      <div className="mt-5 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {assistantSuggestions.map(({ prompt, icon: Icon }) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSuggestion(prompt)}
            className="group flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-600 shadow-[0_8px_30px_-28px_rgba(15,23,42,0.75)] transition duration-200 hover:-translate-y-0.5 hover:border-[#00c2c9]/50 hover:bg-[#f4ffff] hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] motion-reduce:transform-none"
          >
            <Icon
              size={16}
              aria-hidden
              className="shrink-0 text-[#00aeb5] transition-transform group-hover:scale-105 motion-reduce:transform-none"
            />
            <span>{prompt}</span>
          </button>
        ))}
      </div>
      <p className="mt-5 text-[11px] text-slate-600">
        Guidance only — the assistant won&apos;t change or send anything for
        you.
      </p>
    </div>
  );
}
