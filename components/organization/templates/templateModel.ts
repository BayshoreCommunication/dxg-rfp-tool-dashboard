// ORG-605: RFP templates (backend docs/API.md "RFP templates (ORG-604)"). The backend has no
// generated contract for them, so every response is read defensively here. Pure logic only: no
// React, no server imports.

export type TemplateScope = "personal" | "organization";
export type PresentationLayout = "template-one" | "template-two";

export type RfpTemplate = {
  id: string;
  title: string;
  description: string;
  scope: TemplateScope;
  presentationLayout: PresentationLayout | null;
  // An organization template that is in the picker for every member who can create RFPs.
  published: boolean;
  publishedAt: string | null;
  ownedByMe: boolean;
  // Whether an RFP can be started from it now (not archived, and personal or published).
  usable: boolean;
  archived: boolean;
  archivedAt: string | null;
  eventName: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TemplatePage = { items: RfpTemplate[]; total: number; limit: number; offset: number };
export type TemplateListScope = TemplateScope | "all";
export type TemplateListStatus = "active" | "archived" | "all";
export type TemplateListQuery = { scope?: TemplateListScope; status?: TemplateListStatus; search?: string; limit?: number; offset?: number };
export type SaveTemplateInput = {
  proposalId: string;
  title: string;
  description?: string;
  scope: TemplateScope;
  presentationLayout?: PresentationLayout | null;
};

// What the signed-in member may do with templates. The backend enforces it on every request;
// the UI uses this only to hide what would be refused.
export type TemplateAccess = {
  // Owner, Admin, Team Manager, Planner: keep personal templates and start RFPs from templates.
  canUse: boolean;
  // Owner, Admin: save to the organization, publish, unpublish and archive organization templates.
  canManage: boolean;
};

// The RFP a "start from a template" request created, and the template's layout for the client.
export type TemplateRfp = { proposalId: string; eventName: string; presentationLayout: PresentationLayout | null };

// The plan refusal's own fields (ORG-601 body: { code, message, plan, limit, created }).
export type PlanLimit = { plan: string; limit: number | null; created: number | null };

// Limits copied from the backend (manageProposalTemplates.ts).
export const MAX_TEMPLATE_TITLE_LENGTH = 120;
export const MAX_TEMPLATE_DESCRIPTION_LENGTH = 500;
export const MAX_EVENT_NAME_LENGTH = 200;

export const LAYOUT_LABELS: Record<PresentationLayout, string> = {
  "template-one": "Modern",
  "template-two": "Classic",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === "string" ? value : "");
const dateOrNull = (value: unknown): string | null => (typeof value === "string" && value ? value : null);
const tidy = (value: string): string => value.trim().replace(/\s+/g, " ");

export const parseLayout = (value: unknown): PresentationLayout | null =>
  value === "template-one" || value === "template-two" ? value : null;

// Null when the payload is not a template (no id, no title or an unknown scope), so a bad row is
// dropped, not shown. Anything the backend does not state plainly is read as the safer answer:
// not published, not usable, not mine.
export const parseTemplate = (value: unknown): RfpTemplate | null => {
  if (!isRecord(value)) return null;
  const id = str(value.id) || str(value._id);
  const title = str(value.title).trim();
  const scope = value.scope;
  if (!id || !title || (scope !== "personal" && scope !== "organization")) return null;
  const archived = value.archived === true;
  return {
    id,
    title,
    description: str(value.description).trim(),
    scope,
    presentationLayout: parseLayout(value.presentationLayout),
    published: scope === "organization" && value.published === true && !archived,
    publishedAt: dateOrNull(value.publishedAt),
    ownedByMe: value.ownedByMe === true,
    usable: value.usable === true && !archived,
    archived,
    archivedAt: dateOrNull(value.archivedAt),
    eventName: str(value.eventName).trim(),
    createdAt: dateOrNull(value.createdAt),
    updatedAt: dateOrNull(value.updatedAt),
  };
};

const wholeNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;

export const parseTemplatePage = (value: unknown): TemplatePage => {
  const data = isRecord(value) ? value : {};
  const items = (Array.isArray(data.items) ? data.items : []).flatMap((item) => {
    const template = parseTemplate(item);
    return template ? [template] : [];
  });
  return {
    items,
    total: Math.max(wholeNumber(data.total, items.length), items.length),
    limit: wholeNumber(data.limit, 50),
    offset: wholeNumber(data.offset, 0),
  };
};

// `data` of POST …/:templateId/proposals: { proposal, presentationLayout }. Null without an RFP id.
export const parseTemplateRfp = (value: unknown): TemplateRfp | null => {
  if (!isRecord(value) || !isRecord(value.proposal)) return null;
  const proposalId = str(value.proposal._id) || str(value.proposal.id);
  if (!proposalId) return null;
  const event = isRecord(value.proposal.event) ? value.proposal.event : {};
  return { proposalId, eventName: str(event.eventName).trim(), presentationLayout: parseLayout(value.presentationLayout) };
};

// Role names in the backend access token (authorizationPolicy.ts): `template:use` for Owner,
// Admin, Team Manager, Planner (and the legacy producer role); `template:publish` for Owner and
// Admin (and the two platform roles). A Viewer holds neither.
const MANAGE_ROLES = ["owner", "organization_admin", "dxg_admin", "super_admin"];
const USE_ROLES = [...MANAGE_ROLES, "team_manager", "planner", "dxg_producer"];

export const templateAccessForRoles = (roles: readonly string[]): TemplateAccess => ({
  canUse: roles.some((role) => USE_ROLES.includes(role)),
  canManage: roles.some((role) => MANAGE_ROLES.includes(role)),
});

export const NO_TEMPLATE_ACCESS: TemplateAccess = { canUse: false, canManage: false };

// --- What a member may do with one template (the backend's canChange / publish rules) ---

// Rename, archive and restore: a personal template by its owner, an organization one by a manager.
export const canChangeTemplate = (template: RfpTemplate, access: TemplateAccess): boolean =>
  template.scope === "personal" ? template.ownedByMe : access.canManage;
// Publish: a manager's own personal template, or an unpublished organization template.
export const canPublishTemplate = (template: RfpTemplate, access: TemplateAccess): boolean =>
  access.canManage && !template.archived && !template.published && (template.scope === "organization" || template.ownedByMe);
export const canUnpublishTemplate = (template: RfpTemplate, access: TemplateAccess): boolean =>
  access.canManage && template.published;

// "Shared with your organization", "Only you", … for a row or a picker card.
export const templateAudience = (template: RfpTemplate): string => {
  if (template.archived) return "Archived";
  if (template.scope === "personal") return "Only you";
  return template.published ? "Organization" : "Not published";
};

// --- Form checks (same rules as the backend, so most refusals never leave the browser) ---

export const titleError = (title: string): string | null => {
  const value = tidy(title);
  if (!value) return "Give the template a name.";
  if (value.length > MAX_TEMPLATE_TITLE_LENGTH) return `Template names can be at most ${MAX_TEMPLATE_TITLE_LENGTH} characters.`;
  return null;
};

export const descriptionError = (description: string): string | null =>
  description.trim().length > MAX_TEMPLATE_DESCRIPTION_LENGTH ? `Descriptions can be at most ${MAX_TEMPLATE_DESCRIPTION_LENGTH} characters.` : null;

export const eventNameError = (eventName: string): string | null =>
  tidy(eventName).length > MAX_EVENT_NAME_LENGTH ? `Event names can be at most ${MAX_EVENT_NAME_LENGTH} characters.` : null;

export const tidyTitle = tidy;

// --- Error codes as messages people can act on. Raw codes never reach the screen. ---

type ErrorLike = { code?: string; message?: string; status?: number; details?: Record<string, unknown> };

const GONE = "That template is no longer available. It may have been archived or unpublished by someone else.";

const MESSAGES: Record<string, string> = {
  TEMPLATE_NOT_FOUND: GONE,
  TEMPLATE_ACCESS_DENIED: GONE,
  TEMPLATE_USE_DENIED: "Your role can't use proposal templates.",
  TEMPLATE_PUBLISH_DENIED: "Only Owners and Admins can manage organization templates.",
  TEMPLATE_ARCHIVED: "This template is archived. Restore it first.",
  TEMPLATE_NOT_PUBLISHED: "This template isn't published. Publish it before starting a proposal from it.",
  TEMPLATE_SOURCE_NOT_FOUND: "That proposal is no longer available, so it can't be saved as a template.",
  PROPOSAL_ACCESS_DENIED: "You don't have access to this proposal.",
  TEMPLATE_TOO_LARGE: "This proposal is too large to save as a template.",
  INVALID_TEMPLATE_TITLE: `Template names must be 1 to ${MAX_TEMPLATE_TITLE_LENGTH} characters.`,
  INVALID_TEMPLATE_DESCRIPTION: `Descriptions can be at most ${MAX_TEMPLATE_DESCRIPTION_LENGTH} characters.`,
  INVALID_TEMPLATE_SCOPE: "That option isn't available. Reload the page and try again.",
  INVALID_TEMPLATE_STATUS: "That filter isn't available. Reload the page and try again.",
  INVALID_TEMPLATE_LAYOUT: "That layout isn't available. Choose Modern or Classic.",
  INVALID_TEMPLATE_SOURCE: "Choose the proposal to save as a template.",
  INVALID_TEMPLATE_EVENT_NAME: `Event names can be at most ${MAX_EVENT_NAME_LENGTH} characters.`,
  TEMPLATE_VALIDATION_FAILED: "The template couldn't be saved. Check the details and try again.",
  TEMPLATE_INTERNAL_ERROR: "The template request couldn't be completed. Try again.",
  PLAN_LIMIT_REACHED: "Your organization has reached its plan's proposal limit.",
  AUTHENTICATION_REQUIRED: "Your session has ended. Sign in again.",
  NETWORK_ERROR: "We couldn't reach the server. Check your connection and try again.",
};

// A role refusal from the route guard is a 403 with a message and no code.
export const templateErrorMessage = (error: ErrorLike, fallback = "Something went wrong. Try again."): string => {
  const known = error.code ? MESSAGES[error.code] : undefined;
  if (known) return known;
  if (error.status === 403) return "Your role doesn't allow this.";
  if (error.status === 404) return GONE;
  if (error.status === 429) return "Too many requests. Try again in a few minutes.";
  return fallback;
};

export const TEMPLATES_HIDDEN_MESSAGE = MESSAGES.TEMPLATE_USE_DENIED;

// The template is gone for this member: missing, in another organization (404), or no longer
// theirs to see (403 TEMPLATE_ACCESS_DENIED). The screen drops it and reloads the list.
export const isTemplateGone = (error: ErrorLike): boolean =>
  error.code === "TEMPLATE_NOT_FOUND" || error.code === "TEMPLATE_ACCESS_DENIED" || error.status === 404;
// The route guard refused the role (it changed since sign-in): a 403 with no code, or the use
// case's own role refusals.
export const isRoleRefusal = (error: ErrorLike): boolean =>
  error.status === 403 && (!error.code || error.code === "TEMPLATE_USE_DENIED" || error.code === "TEMPLATE_PUBLISH_DENIED");
export const isStaleTemplate = (error: ErrorLike): boolean =>
  isTemplateGone(error) || error.code === "TEMPLATE_ARCHIVED" || error.code === "TEMPLATE_NOT_PUBLISHED";

// The organization has used every RFP its plan allows (ORG-601). Not an error: the screen shows
// the at-limit state with the upgrade prompt.
export const planLimitOf = (error: ErrorLike): PlanLimit | null => {
  if (error.code !== "PLAN_LIMIT_REACHED") return null;
  const details = error.details ?? {};
  const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null);
  return { plan: str(details.plan), limit: count(details.limit), created: count(details.created) };
};

export const planLimitSummary = (limit: PlanLimit): string => {
  if (limit.limit === null) return "Your organization has created every proposal its plan includes.";
  const used = limit.created ?? limit.limit;
  return `Your organization has created ${used} of the ${limit.limit} proposal${limit.limit === 1 ? "" : "s"} its plan includes.`;
};
