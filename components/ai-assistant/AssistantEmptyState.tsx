import { CalendarDays, Compass, FileText, Route } from "lucide-react";
import AssistantOrb from "@/components/ai/shared/AssistantOrb";
import type { AssistantStarterPrompt } from "@/lib/aiAssistant/uiContext";

export const assistantSuggestions = [
  {
    prompt: "How do I create and send a proposal?",
    label: "Create a proposal",
    icon: FileText,
  },
  {
    prompt: "What information should I gather for an event?",
    label: "Plan an event",
    icon: CalendarDays,
  },
  {
    prompt: "Explain the proposal review workflow.",
    label: "Proposal workflow",
    icon: Route,
  },
  {
    prompt: "Where can I see vendor responses?",
    label: "Vendor responses",
    icon: Compass,
  },
] as const;

export default function AssistantEmptyState({
  onSuggestion,
  children,
  compact = false,
  showSuggestions = true,
  suggestions = assistantSuggestions,
}: {
  onSuggestion: (prompt: string) => void;
  children?: React.ReactNode;
  compact?: boolean;
  showSuggestions?: boolean;
  suggestions?: readonly (AssistantStarterPrompt & {
    icon?: typeof FileText;
  })[];
}) {
  return (
    <div
      className={
        compact
          ? "mx-auto flex min-h-full w-full flex-col items-center justify-center px-3.5 py-4 text-center"
          : "mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center px-2 py-8 text-center sm:px-8"
      }
    >
      <AssistantOrb
        className={
          compact ? "h-12 w-12 sm:h-12 sm:w-12" : undefined
        }
      />
      <div className={compact ? "-mt-0.5" : "-mt-3"}>
        <h2
          className={
            compact
              ? "text-[19px] font-extrabold tracking-[-0.03em] text-[#0e1b2b]"
              : "text-[28px] font-extrabold tracking-[-0.03em] text-[#0e1b2b] sm:text-[34px]"
          }
        >
          How can I help?
        </h2>
        <p
          className={
            compact
              ? "mx-auto mt-1 max-w-[280px] text-[12px] leading-[18px] text-slate-500"
              : "mx-auto mt-2 max-w-xl text-[15px] leading-6 text-slate-500 sm:text-base sm:leading-7"
          }
        >
          {compact
            ? "Proposals, events, and platform guidance."
            : "Ask about proposals, event workflows, onboarding, or finding your way around RFPilot."}
        </p>
      </div>
      {children && (
        <div
          className={
            compact ? "mt-3.5 w-full" : "mt-7 w-full max-w-2xl"
          }
        >
          {children}
        </div>
      )}
      {showSuggestions && (
        <div
          className={
            compact
              ? "mt-2.5 grid w-full grid-cols-2 gap-1.5"
              : "mt-5 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2"
          }
        >
          {(compact
            ? suggestions.slice(0, 2)
            : suggestions
          ).map(({ prompt, label, icon: Icon }) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSuggestion(prompt)}
              className={`group flex items-center rounded-xl border border-slate-200 bg-white text-left text-slate-600 shadow-[0_8px_30px_-28px_rgba(15,23,42,0.75)] transition duration-200 hover:-translate-y-0.5 hover:border-[#00c2c9]/50 hover:bg-[#f4ffff] hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] motion-reduce:transform-none ${
                compact
                  ? "min-h-10 gap-2 px-2.5 py-1.5 text-[11px] leading-4"
                  : "min-h-12 gap-3 px-3.5 py-2.5 text-sm"
              }`}
            >
              {Icon ? (
                <Icon
                  size={compact ? 14 : 16}
                  aria-hidden
                  className="shrink-0 text-[#00aeb5] transition-transform group-hover:scale-105 motion-reduce:transform-none"
                />
              ) : (
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00b7be]"
                />
              )}
              <span>{compact ? label : prompt}</span>
            </button>
          ))}
        </div>
      )}
      {!compact && (
        <p className="mt-5 text-[11px] text-slate-600">
          Guidance only — the assistant won&apos;t change or send anything for
          you.
        </p>
      )}
    </div>
  );
}
