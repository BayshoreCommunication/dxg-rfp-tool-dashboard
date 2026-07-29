import { ASSISTANT_MESSAGE_MAX_LENGTH } from "./types";

export const ASSISTANT_HANDOFF_DRAFT_VERSION = 1;
export const ASSISTANT_HANDOFF_DRAFT_TTL_MS = 2 * 60 * 60 * 1_000;

export type ProposalHandoffDestination =
  | "assistant"
  | "editor"
  | "email";

const proposalIdPattern = /^[0-9a-f]{24}$/i;

export const isSafeProposalId = (value: string): boolean =>
  proposalIdPattern.test(value);

export const proposalHandoffHref = (
  destination: ProposalHandoffDestination,
  proposalId: string,
): string | null => {
  if (!isSafeProposalId(proposalId)) return null;
  const encoded = encodeURIComponent(proposalId);
  if (destination === "assistant") {
    return `/proposals/${encoded}/assistant`;
  }
  if (destination === "editor") {
    return `/proposals/proposal-edit?proposalId=${encoded}`;
  }
  return `/email/send-email?proposalId=${encoded}`;
};

const draftStorageKey = (proposalId: string) =>
  `rfpilot:proposal-assistant-draft:${proposalId}`;

type StoredHandoffDraft = {
  version: typeof ASSISTANT_HANDOFF_DRAFT_VERSION;
  content: string;
  createdAt: number;
};

export const storeProposalHandoffDraft = (
  proposalId: string,
  content: string,
): boolean => {
  if (
    typeof window === "undefined" ||
    !isSafeProposalId(proposalId)
  ) {
    return false;
  }
  const bounded = content.trim().slice(0, ASSISTANT_MESSAGE_MAX_LENGTH);
  if (!bounded) return false;
  const value: StoredHandoffDraft = {
    version: ASSISTANT_HANDOFF_DRAFT_VERSION,
    content: bounded,
    createdAt: Date.now(),
  };
  try {
    window.sessionStorage.setItem(
      draftStorageKey(proposalId),
      JSON.stringify(value),
    );
    return true;
  } catch {
    return false;
  }
};

export const takeProposalHandoffDraft = (
  proposalId: string,
): string | null => {
  if (
    typeof window === "undefined" ||
    !isSafeProposalId(proposalId)
  ) {
    return null;
  }
  const key = draftStorageKey(proposalId);
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredHandoffDraft>;
    if (
      value.version !== ASSISTANT_HANDOFF_DRAFT_VERSION ||
      typeof value.content !== "string" ||
      !Number.isFinite(value.createdAt) ||
      Date.now() - Number(value.createdAt) > ASSISTANT_HANDOFF_DRAFT_TTL_MS
    ) {
      return null;
    }
    const bounded = value.content
      .trim()
      .slice(0, ASSISTANT_MESSAGE_MAX_LENGTH);
    return bounded || null;
  } catch {
    return null;
  }
};
