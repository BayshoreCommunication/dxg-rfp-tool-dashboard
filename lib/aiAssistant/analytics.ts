import type { AssistantRouteCategory } from "./uiContext";

export const ASSISTANT_CLIENT_EVENT_TYPES = [
  "assistant_opened",
  "suggestion_shown",
  "suggestion_selected",
  "response_retried",
  "citation_opened",
  "internal_route_opened",
  "proposal_handoff_started",
  "proposal_handoff_completed",
  "finding_reviewed",
] as const;

export type AssistantClientEventType =
  (typeof ASSISTANT_CLIENT_EVENT_TYPES)[number];

type AssistantProductEvent = {
  eventType: AssistantClientEventType;
  threadId?: string | null;
  messageId?: string | null;
  routeCategory?: AssistantRouteCategory | null;
  findingCategory?:
    | "completeness"
    | "schedule"
    | "production"
    | "budget"
    | "risk"
    | "scope"
    | "room"
    | "application"
    | "other"
    | null;
};

const SESSION_KEY = "rfpilot:assistant-analytics-session:v1";
const SESSION_TTL_MS = 30 * 60 * 1_000;

type StoredSession = {
  id: string;
  touchedAt: number;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const readSession = (): StoredSession | null => {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredSession>;
    return typeof value.id === "string" &&
      uuidPattern.test(value.id) &&
      Number.isFinite(value.touchedAt)
      ? { id: value.id.toLowerCase(), touchedAt: Number(value.touchedAt) }
      : null;
  } catch {
    return null;
  }
};

export const assistantAnalyticsSessionId = (): string => {
  if (typeof window === "undefined") return "";
  const now = Date.now();
  const current = readSession();
  const session =
    current && now - current.touchedAt <= SESSION_TTL_MS
      ? { ...current, touchedAt: now }
      : { id: crypto.randomUUID(), touchedAt: now };
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // The in-memory identifier is still safe for this one event.
  }
  return session.id;
};

export const trackAssistantProductEvent = async (
  event: AssistantProductEvent,
): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  const sessionId = assistantAnalyticsSessionId();
  if (!sessionId) return false;
  try {
    const response = await fetch("/api/ai-assistant/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...event,
        sessionId,
        idempotencyKey: `assistant-event:${crypto.randomUUID()}`,
      }),
      cache: "no-store",
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
};

const HANDOFF_KEY = "rfpilot:assistant-analytics-handoff:v1";

type PendingHandoff = {
  threadId: string;
  messageId: string;
  routeCategory: AssistantRouteCategory;
  destinationPath: string;
  createdAt: number;
};

export const markAssistantHandoffPending = (
  value: Omit<PendingHandoff, "createdAt">,
): void => {
  try {
    window.sessionStorage.setItem(
      HANDOFF_KEY,
      JSON.stringify({ ...value, createdAt: Date.now() }),
    );
  } catch {
    // Navigation still proceeds when analytics storage is unavailable.
  }
};

export const completePendingAssistantHandoff = async (
  pathname: string,
): Promise<boolean> => {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(HANDOFF_KEY);
    window.sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;
  try {
    const value = JSON.parse(raw) as Partial<PendingHandoff>;
    if (
      typeof value.threadId !== "string" ||
      typeof value.messageId !== "string" ||
      typeof value.destinationPath !== "string" ||
      typeof value.routeCategory !== "string" ||
      !Number.isFinite(value.createdAt) ||
      Date.now() - Number(value.createdAt) > 2 * 60 * 60 * 1_000 ||
      !pathname.startsWith(value.destinationPath)
    ) {
      return false;
    }
    return trackAssistantProductEvent({
      eventType: "proposal_handoff_completed",
      threadId: value.threadId,
      messageId: value.messageId,
      routeCategory: value.routeCategory as AssistantRouteCategory,
    });
  } catch {
    return false;
  }
};
