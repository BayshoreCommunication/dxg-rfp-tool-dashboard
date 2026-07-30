import {
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Compass,
  FileText,
  MessageCircle,
  Route,
  Search,
  ShieldCheck,
} from "lucide-react";
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

const assistantPopupSuggestions = [
  {
    prompt:
      "How do I create a new proposal? Give me the exact navigation steps.",
    label: "Help me start a proposal",
    icon: MessageCircle,
  },
  {
    prompt: "What should I check before sending a proposal to a client?",
    label: "Review before I send",
    icon: Search,
  },
  {
    prompt: "Explain what I can do on this page.",
    label: "Explain this page",
    icon: CircleHelp,
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
  if (compact) {
    return (
      <div
        data-testid="assistant-compact-empty-state"
        className="mx-auto flex h-full min-h-0 w-full flex-col items-center justify-center px-5 py-2 text-center"
      >
        <div className="relative">
          <AssistantOrb className="h-16 w-16 sm:h-16 sm:w-16" />
          <span className="absolute -bottom-0.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-100 bg-white/95 px-2 py-0.5 text-[10px] font-medium text-slate-500 shadow-sm">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[#19b7bd]"
            />
            Online
          </span>
        </div>

        <div className="mt-3">
          <h2 className="mx-auto max-w-[310px] text-[22px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#0e1b2b]">
            Hi — how can I help
            <br />
            with your proposal?
          </h2>
          <p className="mx-auto mt-1.5 max-w-[300px] text-[12px] leading-4 text-slate-500">
            Ask anything about your proposal, content,
            <br />
            or this page.
          </p>
        </div>

        {children && <div className="mt-4 w-full">{children}</div>}

        {showSuggestions && (
          <div className="mt-3 grid w-full gap-1.5">
            {assistantPopupSuggestions.map(
              ({ prompt, label, icon: Icon }) => {
                return (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onSuggestion(prompt)}
                    className="group flex min-h-[38px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-left text-[12px] font-medium text-slate-600 shadow-[0_8px_24px_-24px_rgba(15,23,42,0.75)] transition duration-200 hover:-translate-y-0.5 hover:border-[#00c2c9]/50 hover:bg-[#f5ffff] hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] motion-reduce:transform-none"
                  >
                    <Icon
                      size={15}
                      aria-hidden
                      className="shrink-0 text-[#00aeb5]"
                    />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <ChevronRight
                      size={14}
                      aria-hidden
                      className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#00aeb5] motion-reduce:transform-none"
                    />
                  </button>
                );
              },
            )}
          </div>
        )}

        <div className="mt-3 flex w-full items-start gap-2 px-1 text-left text-[9px] leading-[13px] text-slate-600">
          <ShieldCheck
            size={12}
            aria-hidden
            className="mt-0.5 shrink-0 text-slate-500"
          />
          <p>
            RFPilot may reference proposal content and page context to provide
            helpful, accurate answers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center px-2 py-8 text-center sm:px-8"
    >
      <AssistantOrb />
      <div className="-mt-3">
        <h2 className="text-[28px] font-extrabold tracking-[-0.03em] text-[#0e1b2b] sm:text-[34px]">
          How can I help?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[15px] leading-6 text-slate-500 sm:text-base sm:leading-7">
          Ask about proposals, event workflows, onboarding, or finding your way
          around RFPilot.
        </p>
      </div>
      {children && (
        <div className="mt-7 w-full max-w-2xl">
          {children}
        </div>
      )}
      {showSuggestions && (
        <div className="mt-5 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
          {suggestions.map(({ prompt, icon: Icon }) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSuggestion(prompt)}
              className="group flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-600 shadow-[0_8px_30px_-28px_rgba(15,23,42,0.75)] transition duration-200 hover:-translate-y-0.5 hover:border-[#00c2c9]/50 hover:bg-[#f4ffff] hover:text-[#0e1b2b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] motion-reduce:transform-none"
            >
              {Icon ? (
                <Icon
                  size={16}
                  aria-hidden
                  className="shrink-0 text-[#00aeb5] transition-transform group-hover:scale-105 motion-reduce:transform-none"
                />
              ) : (
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00b7be]"
                />
              )}
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-5 text-[11px] text-slate-600">
        Guidance only — the assistant won&apos;t change or send anything for
        you.
      </p>
    </div>
  );
}
