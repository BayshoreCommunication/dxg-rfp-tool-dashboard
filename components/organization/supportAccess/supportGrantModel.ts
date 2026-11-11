// ORG-405 (PRD P0-9): what the customer sees of RFPilot Support access. Shapes follow the
// backend's docs/API.md "Support access grants"; there is no generated contract, so everything
// from the API is parsed here and a field that is missing or malformed never reaches the screen.

import { orgErrorMessage } from "../members/errorMessages";

export type SupportGrantStatus = "active" | "expired" | "revoked";
export type GrantPerson = { id: string; name: string | null };
export type GrantRfp = { id: string; title: string | null };

export type SupportGrant = {
  id: string;
  scope: "organization" | "rfp";
  rfp: GrantRfp | null;
  reason: string | null;
  status: SupportGrantStatus;
  grantedBy: GrantPerson | null;
  createdAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedBy: GrantPerson | null;
  activity: { useCount: number; lastUsedAt: string | null };
};

export type SupportGrantEvent = {
  at: string | null;
  // Staff are never named: the label is always "RFPilot Support", the reference tells agents apart.
  agentReference: string | null;
  operation: string;
  rfp: GrantRfp | null;
};

export type SupportGrantDetail = SupportGrant & { events: SupportGrantEvent[] };
export type SupportGrantPage = { grants: SupportGrant[]; page: number; totalPages: number; total: number };
export type GrantableRfp = { id: string; title: string; ownerName: string | null };

export const SUPPORT_LABEL = "RFPilot Support";
export const GRANT_DEFAULT_DAYS = 7;
export const GRANT_MAX_DAYS = 30;
export const GRANT_REASON_MAX = 500;
export const EXPIRY_PRESETS = [1, 3, 7, 14, 30] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const instant = (value: unknown): string | null => {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const count = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);

const parsePerson = (value: unknown): GrantPerson | null => {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  return id ? { id, name: text(value.name) } : null;
};

// An RFP nobody has named yet is stored under the backend's placeholder name, which still
// says "proposal"; on screen it is an untitled RFP.
const rfpTitle = (value: unknown): string | null => {
  const title = text(value);
  return title && /^untitled proposal$/i.test(title) ? "Untitled RFP" : title;
};

const parseRfp = (value: unknown): GrantRfp | null => {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  return id ? { id, title: rfpTitle(value.title) } : null;
};

export const parseGrant = (value: unknown, now = Date.now()): SupportGrant | null => {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  if (!id) return null;
  const rfp = parseRfp(value.rfp);
  const expiresAt = instant(value.expiresAt);
  const revokedAt = instant(value.revokedAt);
  // Never show access as active on the strength of a status we don't recognise: work it out
  // from the dates, and treat a grant without a readable expiry as over.
  const status: SupportGrantStatus =
    value.status === "revoked" || revokedAt
      ? "revoked"
      : value.status === "expired" || !expiresAt || new Date(expiresAt).getTime() <= now
        ? "expired"
        : "active";
  const activity = isRecord(value.activity) ? value.activity : {};
  return {
    id,
    scope: value.scope === "rfp" || rfp ? "rfp" : "organization",
    rfp,
    reason: text(value.reason),
    status,
    grantedBy: parsePerson(value.grantedBy),
    createdAt: instant(value.createdAt),
    expiresAt,
    revokedAt,
    revokedBy: parsePerson(value.revokedBy),
    activity: { useCount: count(activity.useCount), lastUsedAt: instant(activity.lastUsedAt) },
  };
};

export const parseGrantPage = (value: unknown, now = Date.now()): SupportGrantPage | null => {
  if (!isRecord(value) || !Array.isArray(value.grants)) return null;
  const grants = value.grants.flatMap((item) => {
    const grant = parseGrant(item, now);
    return grant ? [grant] : [];
  });
  const pagination = isRecord(value.pagination) ? value.pagination : {};
  return {
    grants,
    page: Math.max(1, count(pagination.page)),
    totalPages: Math.max(1, count(pagination.totalPages)),
    total: Math.max(grants.length, count(pagination.total)),
  };
};

export const parseGrantDetail = (value: unknown, now = Date.now()): SupportGrantDetail | null => {
  const grant = parseGrant(value, now);
  if (!grant || !isRecord(value)) return null;
  const events = (Array.isArray(value.events) ? value.events : []).flatMap((item): SupportGrantEvent[] => {
    if (!isRecord(item)) return [];
    const agent = isRecord(item.agent) ? item.agent : {};
    return [{ at: instant(item.at), agentReference: agentReference(text(agent.id)), operation: text(item.operation) ?? "", rfp: parseRfp(item.rfp) }];
  });
  return { ...grant, events };
};

// null when the answer isn't a list at all, so a broken answer is not shown as "no RFPs".
export const parseGrantableRfps = (value: unknown): GrantableRfp[] | null => {
  const items = isRecord(value) && Array.isArray(value.items) ? value.items : Array.isArray(value) ? value : null;
  if (!items) return null;
  return items.flatMap((item): GrantableRfp[] => {
    if (!isRecord(item)) return [];
    const id = text(item.id) ?? text(item._id);
    return id ? [{ id, title: rfpTitle(item.eventName) ?? "Untitled RFP", ownerName: text(item.ownerName) }] : [];
  });
};

// A short, stable reference so a customer can tell two agents apart without learning who they are.
export const agentReference = (agentId: string | null): string | null => (agentId ? agentId.slice(-6).toUpperCase() : null);

// The list can sit open past an expiry, so the clock has the last word on "active".
export const currentStatus = (grant: Pick<SupportGrant, "status" | "expiresAt">, now = Date.now()): SupportGrantStatus =>
  grant.status === "active" && (!grant.expiresAt || new Date(grant.expiresAt).getTime() <= now) ? "expired" : grant.status;

export const STATUS_LABELS: Record<SupportGrantStatus, string> = { active: "Active", expired: "Expired", revoked: "Revoked" };

export const grantTarget = (grant: Pick<SupportGrant, "scope" | "rfp">): string =>
  grant.scope === "organization" ? "Whole organization" : grant.rfp?.title ?? "An RFP that was deleted";

export const grantScopeLabel = (grant: Pick<SupportGrant, "scope">): string => (grant.scope === "organization" ? "Every RFP" : "One RFP");

const plural = (value: number, word: string) => `${value} ${word}${value === 1 ? "" : "s"}`;

// Rounded to the nearest unit, so a grant made for 7 days reads "7 days", not "6 days".
export const timeLeft = (expiresAt: string | null, now = Date.now()): string => {
  const remaining = expiresAt ? new Date(expiresAt).getTime() - now : 0;
  if (!(remaining > 0)) return "Expired";
  if (remaining < 60_000) return "Expires in less than a minute";
  if (remaining < 59.5 * 60_000) return `Expires in ${plural(Math.round(remaining / 60_000), "minute")}`;
  if (remaining < 23.5 * 60 * 60_000) return `Expires in ${plural(Math.round(remaining / (60 * 60_000)), "hour")}`;
  return `Expires in ${plural(Math.round(remaining / DAY_MS), "day")}`;
};

// "last used 2 h ago", or "last used on Oct 3, 2026" once it is more than a month back.
export const lastUsedLabel = (lastUsedAt: string | null, now = Date.now()): string | null => {
  if (!lastUsedAt) return null;
  const time = new Date(lastUsedAt).getTime();
  if (Number.isNaN(time)) return null;
  const minutes = Math.round((now - time) / 60_000);
  if (minutes < 1) return "last used just now";
  if (minutes < 60) return `last used ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `last used ${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `last used ${plural(days, "day")} ago`;
  return `last used on ${new Date(time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
};

export const formatDateTime = (value: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

export const accessUseLabel = (useCount: number): string => (useCount === 0 ? "Not used" : `Used ${plural(useCount, "time")}`);

// Whole days, 1 to 30; anything else is refused before it is sent.
export const parseExpiryDays = (value: string | number): number | null => {
  const days = typeof value === "number" ? value : /^\d{1,2}$/.test(value.trim()) ? Number(value.trim()) : Number.NaN;
  return Number.isInteger(days) && days >= 1 && days <= GRANT_MAX_DAYS ? days : null;
};

export const expiryFromNow = (days: number, now = Date.now()): string => new Date(now + days * DAY_MS).toISOString();

const OPERATIONS: Record<string, string> = {
  "rfp.list": "Listed the RFPs covered by this access",
  "rfp.read": "Opened an RFP",
  "vendor_responses.list": "Viewed an RFP's vendor responses",
  "ticket.rfp.list": "Listed RFPs from a support ticket",
};

// Internal operation names never reach the screen.
export const operationLabel = (operation: string): string => OPERATIONS[operation] ?? "Read RFP data";

type ErrorLike = { code?: string; message?: string; status?: number; details?: Record<string, unknown> };

const MESSAGES: Record<string, string> = {
  INVALID_GRANT_EXPIRY: `Choose an expiry between 1 and ${GRANT_MAX_DAYS} days.`,
  INVALID_GRANT_REASON: `Keep the reason to ${GRANT_REASON_MAX} characters or fewer.`,
  PROPOSAL_NOT_FOUND: "That RFP wasn't found. It may have been deleted, so choose another.",
  SUPPORT_GRANT_NOT_FOUND: "That support access wasn't found. Reload the page.",
  SUPPORT_GRANT_EXPIRED: "This support access has already expired, so there is nothing to revoke.",
  SUPPORT_GRANT_FORBIDDEN: `Only an Owner or Admin can manage ${SUPPORT_LABEL} access.`,
  SUPPORT_ACCESS_INTERNAL_ERROR: "The request couldn't be completed. Try again.",
  // The RFP picker's list (ORG-401); its own wording is about the dashboard.
  DASHBOARD_INTERNAL_ERROR: "Your RFPs couldn't be loaded. Try again.",
  DASHBOARD_FILTER_INVALID: "Your RFPs couldn't be loaded. Try again.",
  INVALID_RESPONSE: "We couldn't read the server's answer. Reload the page.",
};

export const supportGrantErrorMessage = (error: ErrorLike, fallback = "Something went wrong. Try again."): string => {
  const known = error.code ? MESSAGES[error.code] : undefined;
  if (known) return known;
  // Other roles get a plain 403 with no code.
  if (error.status === 403) return MESSAGES.SUPPORT_GRANT_FORBIDDEN;
  const message = orgErrorMessage(error, fallback);
  // The backend's own wording is shown for codes we don't know, but never its internal noun.
  return /proposal/i.test(message) ? fallback : message;
};
