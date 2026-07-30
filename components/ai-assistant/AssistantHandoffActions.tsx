"use client";

import {
  proposalHandoffHref,
  storeProposalHandoffDraft,
} from "@/lib/aiAssistant/handoff";
import type {
  AssistantDisplayMessage,
  AssistantIntent,
} from "@/lib/aiAssistant/types";
import {
  Check,
  ChevronDown,
  ArrowRight,
  Bot,
  FilePenLine,
  Mail,
  Search,
} from "lucide-react";
import {
  markAssistantHandoffPending,
  trackAssistantProductEvent,
} from "@/lib/aiAssistant/analytics";
import Link from "next/link";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

type ProposalOption = {
  id: string;
  label: string;
  canEmail: boolean;
};

const proposalSelectionIntents = new Set<AssistantIntent>([
  "proposal_specific_request",
  "proposal_review",
  "pre_send_checklist",
  "equipment_scope_review",
  "budget_estimation",
  "historical_reference_request",
]);

const approvedDirectActions: Readonly<
  Record<string, { label: string; href: string }>
> = {
  "platform:navigation:create-proposal": {
    label: "Start a proposal",
    href: "/proposals/add-new-proposal",
  },
  "platform:navigation:proposals": {
    label: "Open proposals",
    href: "/proposals",
  },
  "platform:navigation:email": {
    label: "Open email activity",
    href: "/email",
  },
  "platform:navigation:vendor-responses": {
    label: "Review vendor responses",
    href: "/vendor-responses",
  },
  "platform:navigation:settings": {
    label: "Open settings",
    href: "/settings",
  },
  "platform:navigation:dashboard": {
    label: "Open dashboard",
    href: "/dashboard",
  },
};

const proposalOptions = (value: unknown): ProposalOption[] => {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as { data?: unknown }).data)
  ) {
    return [];
  }
  const data = (value as { data: unknown[] }).data;
  return data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const proposal = item as Record<string, unknown>;
    const id = typeof proposal.id === "string" ? proposal.id : "";
    if (!/^[0-9a-f]{24}$/i.test(id)) return [];
    return [
      {
        id,
        label:
          typeof proposal.label === "string" && proposal.label.trim()
            ? proposal.label.trim()
            : "Untitled proposal",
        canEmail: proposal.canEmail === true,
      },
    ];
  });
};

export default function AssistantHandoffActions({
  message,
  userDraft,
  onNavigate,
  proposalAssistantEnabled =
    process.env.NEXT_PUBLIC_CONVERSATIONS_ENABLED === "true",
}: {
  message: AssistantDisplayMessage;
  userDraft?: string;
  onNavigate?: () => void;
  proposalAssistantEnabled?: boolean;
}) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ProposalOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [carryDraft, setCarryDraft] = useState(Boolean(userDraft?.trim()));
  const [error, setError] = useState<string>();
  const [proposalMenuOpen, setProposalMenuOpen] = useState(false);
  const [proposalQuery, setProposalQuery] = useState("");
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const proposalPickerRef = useRef<HTMLDivElement>(null);
  const proposalTriggerRef = useRef<HTMLButtonElement>(null);
  const proposalSearchRef = useRef<HTMLInputElement>(null);
  const proposalListboxId = useId();

  const hasSelectedProposalContext = message.citations.some((citation) =>
    citation.sourceId.startsWith("selected-proposal:"),
  );
  const needsProposal =
    message.status === "complete" &&
    message.intent !== null &&
    message.intent !== undefined &&
    proposalSelectionIntents.has(message.intent) &&
    !hasSelectedProposalContext;

  const directActions = useMemo(() => {
    if (needsProposal || message.status !== "complete") return [];
    const seen = new Set<string>();
    return message.citations.flatMap((citation) => {
      const action = approvedDirectActions[citation.sourceId];
      if (!action || seen.has(action.href)) return [];
      seen.add(action.href);
      return [action];
    }).slice(0, 2);
  }, [message.citations, message.status, needsProposal]);

  const filteredOptions = useMemo(() => {
    const query = proposalQuery.trim().toLocaleLowerCase();
    if (!query) return options;
    return options.filter((option) =>
      option.label.toLocaleLowerCase().includes(query),
    );
  }, [options, proposalQuery]);

  useEffect(() => {
    if (!proposalMenuOpen) return;

    const handleOutsidePointer = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !proposalPickerRef.current?.contains(event.target)
      ) {
        setProposalMenuOpen(false);
        setProposalQuery("");
      }
    };

    document.addEventListener("mousedown", handleOutsidePointer);
    return () => document.removeEventListener("mousedown", handleOutsidePointer);
  }, [proposalMenuOpen]);

  useEffect(() => {
    if (!proposalMenuOpen) return;
    const selectedIndex = filteredOptions.findIndex(
      (option) => option.id === selectedId,
    );
    setActiveOptionIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [filteredOptions, proposalMenuOpen, selectedId]);

  if (!needsProposal && directActions.length === 0) return null;

  const openSelector = async () => {
    if (selectorOpen) {
      setSelectorOpen(false);
      setProposalMenuOpen(false);
      setProposalQuery("");
      return;
    }
    setSelectorOpen(true);
    if (options.length || loading) return;
    setLoading(true);
    setError(undefined);
    let response: Response;
    let payload: unknown;
    try {
      response = await fetch("/api/ai-assistant/proposals", {
        method: "GET",
        cache: "no-store",
      });
      payload = await response.json();
    } catch {
      setLoading(false);
      setError(
        "Your available proposals could not be loaded. Try again.",
      );
      return;
    }
    setLoading(false);
    if (!response.ok) {
      setError("Your available proposals could not be loaded. Try again.");
      return;
    }
    const available = proposalOptions(payload);
    setOptions(available);
    setSelectedId(available[0]?.id ?? "");
  };

  const selected = options.find((option) => option.id === selectedId);
  const assistantHref = selectedId && proposalAssistantEnabled
    ? proposalHandoffHref("assistant", selectedId)
    : null;
  const editorHref = selectedId
    ? proposalHandoffHref("editor", selectedId)
    : null;
  const emailHref = selectedId
    ? proposalHandoffHref("email", selectedId)
    : null;

  const prepareAssistantHandoff = () => {
    if (carryDraft && userDraft && selectedId) {
      storeProposalHandoffDraft(selectedId, userDraft);
    }
    if (assistantHref) beginProposalHandoff(assistantHref);
    else onNavigate?.();
  };

  const beginProposalHandoff = (href: string) => {
    const destinationPath = href.split("?", 1)[0] || href;
    markAssistantHandoffPending({
      threadId: message.threadId,
      messageId: message.id,
      routeCategory: "proposals",
      destinationPath,
    });
    void trackAssistantProductEvent({
      eventType: "proposal_handoff_started",
      threadId: message.threadId,
      messageId: message.id,
      routeCategory: "proposals",
    });
    onNavigate?.();
  };

  const openInternalRoute = () => {
    void trackAssistantProductEvent({
      eventType: "internal_route_opened",
      threadId: message.threadId,
      messageId: message.id,
    });
    onNavigate?.();
  };

  const closeProposalMenu = (restoreFocus = false) => {
    setProposalMenuOpen(false);
    setProposalQuery("");
    if (restoreFocus) proposalTriggerRef.current?.focus();
  };

  const openProposalMenu = () => {
    setProposalMenuOpen(true);
    const selectedIndex = filteredOptions.findIndex(
      (option) => option.id === selectedId,
    );
    setActiveOptionIndex(selectedIndex >= 0 ? selectedIndex : 0);
    window.requestAnimationFrame(() => proposalSearchRef.current?.focus());
  };

  const selectProposal = (option: ProposalOption) => {
    setSelectedId(option.id);
    closeProposalMenu(true);
  };

  const handleProposalMenuKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeProposalMenu(true);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      if (
        event.key === "Enter" &&
        filteredOptions[activeOptionIndex]
      ) {
        event.preventDefault();
        selectProposal(filteredOptions[activeOptionIndex]);
      }
      return;
    }

    event.preventDefault();
    setActiveOptionIndex((current) => {
      if (filteredOptions.length === 0) return 0;
      const movement = event.key === "ArrowDown" ? 1 : -1;
      return (current + movement + filteredOptions.length) %
        filteredOptions.length;
    });
  };

  return (
    <div
      aria-label="Suggested next step"
      className="mt-2 rounded-xl border border-[#00c2c9]/20 bg-[#f4fcfc] p-2.5 text-xs text-slate-700"
    >
      {needsProposal ? (
        <>
          <button
            type="button"
            aria-expanded={selectorOpen}
            onClick={() => void openSelector()}
            className="flex w-full items-center justify-between gap-3 rounded-lg text-left font-semibold text-[#087f69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
          >
            <span>Continue with one of your proposals</span>
            <ArrowRight
              size={14}
              aria-hidden
              className={selectorOpen ? "rotate-90 transition" : "transition"}
            />
          </button>
          {selectorOpen && (
            <div className="mt-2 border-t border-[#00c2c9]/15 pt-2">
              {loading && (
                <p role="status" className="text-slate-500">
                  Loading your available proposals…
                </p>
              )}
              {error && (
                <p role="alert" className="text-red-700">
                  {error}
                </p>
              )}
              {!loading && !error && options.length === 0 && (
                <p className="text-slate-600">
                  No active proposal is available.{" "}
                  <Link
                    href="/proposals/add-new-proposal"
                    onClick={openInternalRoute}
                    className="font-semibold text-[#087f69] underline underline-offset-2"
                  >
                    Start a proposal
                  </Link>
                  .
                </p>
              )}
              {options.length > 0 && (
                <>
                  <div
                    ref={proposalPickerRef}
                    className="relative"
                  >
                    <span className="block font-semibold text-slate-600">
                      Proposal
                    </span>
                    <button
                      ref={proposalTriggerRef}
                      type="button"
                      aria-label={`Proposal: ${selected?.label ?? "Choose a proposal"}`}
                      aria-expanded={proposalMenuOpen}
                      aria-haspopup="listbox"
                      aria-controls={proposalListboxId}
                      onClick={() => {
                        if (proposalMenuOpen) closeProposalMenu();
                        else openProposalMenu();
                      }}
                      onKeyDown={(event) => {
                        if (
                          !proposalMenuOpen &&
                          (event.key === "ArrowDown" ||
                            event.key === "ArrowUp")
                        ) {
                          event.preventDefault();
                          openProposalMenu();
                        }
                      }}
                      className="group mt-1 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#00c2c9]/55 hover:bg-[#fbffff] focus-visible:border-[#00c2c9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]/20"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {selected?.label ?? "Choose a proposal"}
                      </span>
                      <ChevronDown
                        size={15}
                        aria-hidden
                        className={`shrink-0 text-slate-500 transition-transform duration-200 group-hover:text-[#087f69] ${
                          proposalMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {proposalMenuOpen && (
                      <div className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_32px_-12px_rgba(15,23,42,0.3)]">
                        <div className="relative mb-1.5">
                          <Search
                            size={13}
                            aria-hidden
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            ref={proposalSearchRef}
                            type="search"
                            role="searchbox"
                            value={proposalQuery}
                            onChange={(event) => {
                              setProposalQuery(event.target.value);
                              setActiveOptionIndex(0);
                            }}
                            onKeyDown={handleProposalMenuKeyDown}
                            placeholder="Search proposals"
                            aria-label="Search proposals"
                            aria-controls={proposalListboxId}
                            aria-activedescendant={
                              filteredOptions[activeOptionIndex]
                                ? `${proposalListboxId}-${filteredOptions[activeOptionIndex].id}`
                                : undefined
                            }
                            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-8 pr-2.5 text-[11px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#00c2c9]/60 focus:bg-white focus:ring-2 focus:ring-[#00c2c9]/15"
                          />
                        </div>
                        <div
                          id={proposalListboxId}
                          role="listbox"
                          aria-label="Available proposals"
                          className="assistant-select-scrollbar max-h-40 space-y-0.5 overflow-y-auto overscroll-contain pr-0.5"
                        >
                          {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => {
                              const selectedOption =
                                option.id === selectedId;
                              const activeOption =
                                index === activeOptionIndex;
                              return (
                                <button
                                  key={option.id}
                                  id={`${proposalListboxId}-${option.id}`}
                                  type="button"
                                  role="option"
                                  aria-selected={selectedOption}
                                  title={option.label}
                                  onMouseEnter={() =>
                                    setActiveOptionIndex(index)
                                  }
                                  onClick={() => selectProposal(option)}
                                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] transition ${
                                    selectedOption
                                      ? "bg-[#e9fbfb] font-semibold text-[#087f69]"
                                      : activeOption
                                        ? "bg-slate-100 text-slate-900"
                                        : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <span className="min-w-0 truncate">
                                    {option.label}
                                  </span>
                                  <span
                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                                      selectedOption
                                        ? "bg-[#18b8be] text-white"
                                        : "text-transparent"
                                    }`}
                                  >
                                    <Check size={10} aria-hidden />
                                  </span>
                                </button>
                              );
                            })
                          ) : (
                            <p
                              role="status"
                              className="px-2.5 py-5 text-center text-[11px] text-slate-500"
                            >
                              No matching proposal found.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {userDraft?.trim() && (
                    <label className="mt-2 flex items-start gap-2 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={carryDraft}
                        onChange={(event) =>
                          setCarryDraft(event.target.checked)
                        }
                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#087f69]"
                      />
                      Carry my question as an unsent draft
                    </label>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {assistantHref && (
                      <Link
                        href={assistantHref}
                        onClick={prepareAssistantHandoff}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#087f69] px-2.5 py-1.5 font-semibold text-white hover:bg-[#066b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
                      >
                        <Bot size={12} aria-hidden />
                        Proposal assistant
                      </Link>
                    )}
                    {editorHref && (
                      <Link
                        href={editorHref}
                        onClick={() => beginProposalHandoff(editorHref)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:border-[#00c2c9]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
                      >
                        <FilePenLine size={12} aria-hidden />
                        Open editor
                      </Link>
                    )}
                    {selected?.canEmail && emailHref ? (
                      <Link
                        href={emailHref}
                        onClick={() => beginProposalHandoff(emailHref)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:border-[#00c2c9]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
                      >
                        <Mail size={12} aria-hidden />
                        Prepare email
                      </Link>
                    ) : (
                      <span className="self-center text-[10px] text-slate-500">
                        Email is available after submission.
                      </span>
                    )}
                  </div>
                  {!proposalAssistantEnabled && (
                    <p className="mt-2 text-[10px] text-slate-500">
                      The dedicated proposal assistant is not available in
                      this environment. Continue in the editor instead.
                    </p>
                  )}
                  <p className="mt-2 text-[10px] leading-4 text-slate-500">
                    Selection is limited to proposals available to your
                    account. Access is checked again after navigation.
                  </p>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {directActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={openInternalRoute}
              className="inline-flex items-center gap-1 rounded-lg border border-[#00c2c9]/25 bg-white px-2.5 py-1.5 font-semibold text-[#087f69] hover:border-[#00c2c9]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9]"
            >
              {action.label}
              <ArrowRight size={12} aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
