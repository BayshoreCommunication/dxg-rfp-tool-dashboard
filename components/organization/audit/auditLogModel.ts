// ORG-407: the organization audit log (backend docs/API.md "Organization audit log").
// There is no generated contract for these endpoints, so every response is parsed defensively:
// a field the backend stops sending degrades to an empty value, never a crash.

import { roleLabel } from "../members/orgAccess";

export type AuditActor = {
  kind: "member" | "support" | "unknown" | "system";
  id: string | null;
  name: string;
  email: string | null;
};

export type AuditDetailValue = string | number | boolean;

export type AuditEvent = {
  id: string;
  occurredAt: string;
  action: string;
  label: string;
  category: string;
  decision: string;
  reason: string | null;
  actor: AuditActor;
  target: { type: string; id: string | null; name: string | null };
  details: Record<string, AuditDetailValue>;
};

export type AuditPage = { events: AuditEvent[]; nextCursor: string | null };

export type AuditActionOption = { value: string; label: string };
export type AuditCategoryOption = { key: string; label: string; actions: AuditActionOption[] };
export type AuditFilterOptions = { categories: AuditCategoryOption[]; supportActor: AuditActionOption };

// What the filter bar holds. Dates are the browser's local calendar days (YYYY-MM-DD).
export type AuditFilters = { actor: string; action: string; from: string; to: string };
export const EMPTY_FILTERS: AuditFilters = { actor: "", action: "", from: "", to: "" };

// What is sent to the backend: ISO instants, `to` exclusive.
export type AuditQuery = { actor?: string; action?: string; category?: string; from?: string; to?: string };

export const SUPPORT_ACTOR = "support";
export const SUPPORT_LABEL = "RFPilot Support";

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const nullableText = (value: unknown): string | null => (typeof value === "string" && value ? value : null);

const ACTOR_KINDS = ["member", "support", "unknown", "system"] as const;

const toActor = (value: unknown): AuditActor => {
  const raw = record(value);
  const kind = ACTOR_KINDS.find((candidate) => candidate === raw.kind) ?? "unknown";
  // Staff are never named: whatever the payload says, a support actor reads "RFPilot Support".
  if (kind === "support") return { kind, id: nullableText(raw.id), name: SUPPORT_LABEL, email: null };
  if (kind === "system") return { kind, id: null, name: "System", email: null };
  if (kind === "unknown") return { kind, id: nullableText(raw.id), name: "Unknown user", email: null };
  const email = nullableText(raw.email);
  return { kind, id: nullableText(raw.id), name: text(raw.name) || email || "Unknown user", email };
};

const toDetails = (value: unknown): Record<string, AuditDetailValue> => {
  const details: Record<string, AuditDetailValue> = {};
  for (const [key, entry] of Object.entries(record(value))) {
    if (typeof entry === "string" || typeof entry === "boolean" || (typeof entry === "number" && Number.isFinite(entry))) details[key] = entry;
  }
  return details;
};

const toEvent = (value: unknown): AuditEvent | null => {
  const raw = record(value);
  const id = text(raw.id);
  const occurredAt = text(raw.occurredAt);
  if (!id || Number.isNaN(Date.parse(occurredAt))) return null;
  const target = record(raw.target);
  const action = text(raw.action);
  return {
    id,
    occurredAt,
    action,
    label: text(raw.label) || action || "Activity",
    category: text(raw.category),
    decision: text(raw.decision),
    reason: nullableText(raw.reason),
    actor: toActor(raw.actor),
    target: { type: text(target.type), id: nullableText(target.id), name: nullableText(target.name) },
    details: toDetails(raw.details),
  };
};

export const toAuditPage = (value: unknown): AuditPage => {
  const raw = record(value);
  const events = Array.isArray(raw.events) ? raw.events.map(toEvent).filter((event): event is AuditEvent => event !== null) : [];
  return { events, nextCursor: nullableText(raw.nextCursor) };
};

const toOption = (value: unknown): AuditActionOption | null => {
  const raw = record(value);
  const option = { value: text(raw.value), label: text(raw.label) };
  return option.value && option.label ? option : null;
};

export const toAuditFilterOptions = (value: unknown): AuditFilterOptions => {
  const raw = record(value);
  const categories = (Array.isArray(raw.categories) ? raw.categories : []).map((entry): AuditCategoryOption | null => {
    const category = record(entry);
    const key = text(category.key);
    const label = text(category.label);
    if (!key || !label) return null;
    const actions = (Array.isArray(category.actions) ? category.actions : []).map(toOption).filter((option): option is AuditActionOption => option !== null);
    return { key, label, actions };
  }).filter((category): category is AuditCategoryOption => category !== null);
  return { categories, supportActor: { value: SUPPORT_ACTOR, label: SUPPORT_LABEL } };
};

// ── Filters ─────────────────────────────────────────────────────────────────────────────────

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORY_PREFIX = "category:";
export const categoryValue = (key: string) => `${CATEGORY_PREFIX}${key}`;

// Local midnight of a calendar day, `offsetDays` later, as an ISO instant; null when not a real day.
const localMidnight = (day: string, offsetDays = 0): string | null => {
  if (!DAY.test(day)) return null;
  const [year, month, date] = day.split("-").map(Number);
  const instant = new Date(year, month - 1, date + offsetDays);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
};

export const filterProblem = (filters: AuditFilters): string | null => {
  if (filters.from && filters.to && filters.from > filters.to) return "The start date must be on or before the end date.";
  return null;
};

// "From 3 Nov to 5 Nov" means all of both days in the reader's own time zone.
export const toAuditQuery = (filters: AuditFilters): AuditQuery => {
  const query: AuditQuery = {};
  if (filters.actor) query.actor = filters.actor;
  if (filters.action.startsWith(CATEGORY_PREFIX)) query.category = filters.action.slice(CATEGORY_PREFIX.length);
  else if (filters.action) query.action = filters.action;
  const from = localMidnight(filters.from);
  const to = localMidnight(filters.to, 1);
  if (from) query.from = from;
  if (to) query.to = to;
  return query;
};

export const hasFilters = (filters: AuditFilters): boolean => Boolean(filters.actor || filters.action || filters.from || filters.to);

const QUERY_KEYS = ["actor", "action", "category", "from", "to"] as const;
export const auditQueryString = (query: AuditQuery, extra: Record<string, string> = {}): string => {
  const params = new URLSearchParams();
  for (const key of QUERY_KEYS) {
    const value = query[key];
    if (typeof value === "string" && value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
  const built = params.toString();
  return built ? `?${built}` : "";
};

// ── Display ─────────────────────────────────────────────────────────────────────────────────

export const DECISIONS: Record<string, { label: string; tone: "emerald" | "rose" | "amber" | "slate" | "sky" }> = {
  allowed: { label: "Allowed", tone: "emerald" },
  created: { label: "Created", tone: "sky" },
  revoked: { label: "Removed", tone: "slate" },
  denied: { label: "Refused", tone: "rose" },
  detected: { label: "Detected", tone: "amber" },
};
export const decisionOf = (decision: string) => DECISIONS[decision] ?? { label: "Recorded", tone: "slate" as const };

const TARGET_LABELS: Record<string, string> = {
  user: "Member",
  organization_membership: "Member",
  organization: "Organization",
  proposal: "RFP",
  team: "Team",
  invitation: "Invitation",
  access_request: "Access request",
  organization_domain: "Domain",
  organization_vendor: "Vendor",
  refresh_session: "Session",
  support_access_grant: "Support access",
};
const sentence = (code: string) => {
  const words = code.replace(/[_.:-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
};
export const targetLabel = (target: AuditEvent["target"]): string => {
  const kind = TARGET_LABELS[target.type] ?? sentence(target.type);
  if (target.name) return `${kind}: ${target.name}`;
  // A session or organization id tells a reader nothing; other ids are a usable reference.
  if (!target.id || target.type === "organization" || target.type === "refresh_session") return kind || "—";
  return `${kind} ${shortId(target.id)}`;
};
export const shortId = (id: string): string => (id.length > 10 ? `…${id.slice(-6)}` : id);

const OPERATIONS: Record<string, string> = {
  "rfp.list": "Listed RFPs",
  "rfp.read": "Opened an RFP",
  "vendor_responses.list": "Listed vendor responses",
  "ticket.rfp.list": "Listed RFPs from a support ticket",
};
const SCOPES: Record<string, string> = { rfp: "One RFP", organization: "Whole organization" };
const SETTINGS: Record<string, string> = {
  requireTwoFactor: "Require two-factor",
  requireSso: "Require company sign-in",
  autoApproveDomain: "Auto-approve access requests",
  allowManagerInvites: "Team Managers can invite",
};
const REASONS: Record<string, string> = {
  wrong_password: "Wrong password",
  account_blocked: "Account blocked",
  no_active_grant: "No active support access",
};
const DETAIL_LABELS: Record<string, string> = {
  role: "Role",
  previousRole: "Previous role",
  newOwnerPreviousRole: "New Owner's previous role",
  previousOwnerNewRole: "Previous Owner's new role",
  previousStatus: "Previous status",
  domain: "Domain",
  expiresAt: "Expires",
  method: "Method",
  reauthentication: "Confirmed with",
  recoveryCodesRemaining: "Recovery codes left",
  revokedSessions: "Sessions signed out",
  signedOutMembers: "Members signed out",
  placedInTeam: "Placed in team",
  teamId: "Team ID",
  grantId: "Support access ID",
  ticketId: "Support ticket ID",
  proposalId: "RFP ID",
  contactCount: "Contacts",
  secretChanged: "Client secret changed",
  fromPlan: "Previous plan",
  toPlan: "New plan",
};
const PLAN_KEYS = new Set(["fromPlan", "toPlan"]);
const ROLE_KEYS = new Set(["role", "previousRole", "newOwnerPreviousRole", "previousOwnerNewRole"]);
const ID_KEYS = new Set(["teamId", "grantId", "ticketId", "proposalId"]);

const scalar = (value: AuditDetailValue): string => (typeof value === "boolean" ? (value ? "Yes" : "No") : String(value));
const settingValue = (value: AuditDetailValue | undefined): string =>
  value === undefined ? "" : typeof value === "boolean" ? (value ? "On" : "Off") : String(value);

// One readable line per fact. Role codes become role labels, and nothing says "proposal".
export const detailLines = (event: Pick<AuditEvent, "details" | "reason" | "decision">): string[] => {
  const { details } = event;
  const lines: string[] = [];
  if (typeof details.operation === "string") lines.push(OPERATIONS[details.operation] ?? sentence(details.operation));
  if (typeof details.scope === "string") lines.push(`Scope: ${SCOPES[details.scope] ?? sentence(details.scope)}`);
  if (typeof details.setting === "string") {
    const name = SETTINGS[details.setting] ?? sentence(details.setting);
    const before = settingValue(details.from);
    const after = settingValue(details.to ?? details.value);
    lines.push(before && after ? `${name}: ${before} → ${after}` : after ? `${name}: ${after}` : name);
  }
  for (const [key, value] of Object.entries(details)) {
    if (["operation", "scope", "setting", "from", "to", "value"].includes(key)) continue;
    // Only a label made from a key is reworded; recorded values (a domain, a team) are shown as stored.
    const label = DETAIL_LABELS[key] ?? sentence(key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()).replace(/proposal/gi, "RFP");
    if (ROLE_KEYS.has(key)) {
      const role = roleLabel(String(value));
      lines.push(`${label}: ${role === "No role" ? sentence(String(value)) : role}`);
    }
    else if (PLAN_KEYS.has(key)) lines.push(`${label}: ${sentence(String(value))}`);
    else if (key === "expiresAt" && typeof value === "string" && !Number.isNaN(Date.parse(value))) lines.push(`${label}: ${formatAuditTime(value, "UTC")} UTC`);
    else if (ID_KEYS.has(key)) lines.push(`${label}: ${shortId(String(value))}`);
    else lines.push(`${label}: ${scalar(value)}`);
  }
  if (event.reason && (event.decision === "denied" || event.decision === "detected")) lines.push(`Reason: ${REASONS[event.reason] ?? sentence(event.reason)}`);
  return lines;
};

// Fixed format so the server render and the browser agree until the browser's zone is known.
export const formatAuditTime = (iso: string, timeZone?: string): string => {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit",
    ...(timeZone ? { timeZone } : {}),
    // Some engines put a narrow no-break space before AM/PM and some a plain one; use one form so
    // the server render and every browser agree.
  }).format(instant).replace(/[\u202f\u00a0]/g, " ");
};

type ErrorLike = { code?: string; status?: number };
export const auditErrorMessage = (error: ErrorLike, fallback: string): string => {
  if (error.code === "AUDIT_FILTER_INVALID") return "Those filters aren't valid. Check the dates and try again.";
  if (error.status === 403 || error.code === "AUDIT_LOG_FORBIDDEN") return "Only an Owner or Admin can read the audit log.";
  if (error.status === 429) return "Too many requests in a short time. Wait a few minutes and try again.";
  if (error.status === 401) return "Your session has ended. Sign in again.";
  if (error.code === "NETWORK_ERROR") return "We couldn't reach RFPilot. Check your connection and try again.";
  return fallback;
};

// The backend already neutralizes formula cells; this is the same rule, applied again in case a
// proxy or an older backend hands back a row that isn't. Idempotent: a neutralized cell is left alone.
const FORMULA_CELL = /(^|,|\r\n|\n)"(\s*[=+\-@]|[\t\r])/g;
export const neutralizeCsv = (csv: string): string => csv.replace(FORMULA_CELL, (_match, lead: string, start: string) => `${lead}"'${start}`);

export const exportFileName = (now: Date = new Date()): string => `audit-log-${now.toISOString().slice(0, 10)}.csv`;
