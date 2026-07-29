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
  ArrowRight,
  Bot,
  FilePenLine,
  Mail,
} from "lucide-react";
import {
  markAssistantHandoffPending,
  trackAssistantProductEvent,
} from "@/lib/aiAssistant/analytics";
import Link from "next/link";
import { useMemo, useState } from "react";

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

  const needsProposal =
    message.status === "complete" &&
    message.intent !== null &&
    message.intent !== undefined &&
    proposalSelectionIntents.has(message.intent);

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

  if (!needsProposal && directActions.length === 0) return null;

  const openSelector = async () => {
    if (selectorOpen) {
      setSelectorOpen(false);
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
                  <label className="block font-semibold text-slate-600">
                    Proposal
                    <select
                      value={selectedId}
                      onChange={(event) => setSelectedId(event.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-[#00c2c9] focus:outline-none focus:ring-2 focus:ring-[#00c2c9]/20"
                    >
                      {options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
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
