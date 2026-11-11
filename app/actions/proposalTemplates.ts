"use server";

import {
  parseTemplate,
  parseTemplatePage,
  parseTemplateRfp,
  templateAccessForRoles,
  type RfpTemplate,
  type SaveTemplateInput,
  type TemplateAccess,
  type TemplateListQuery,
  type TemplatePage,
  type TemplateRfp,
} from "@/components/organization/templates/templateModel";
import { getMemberIdentity } from "@/lib/server/memberIdentity";
import { orgRequest, segment, type OrgActionResult } from "./organizationApi";

// ORG-605: RFP templates (backend routes/proposalTemplatesRoute.ts, ORG-604). Every route acts on
// the caller's own organization: another organization's template is a 404, someone else's
// personal template a 403, and a Viewer gets 403 on every route. Nothing here names an
// organization or a member; the backend takes both from the session.

const BASE = "/api/v1/proposal-templates";
const UNREADABLE = "The template service sent an answer we couldn't read.";

const pickTemplate = (payload: Record<string, unknown>): RfpTemplate | undefined => parseTemplate(payload.data) ?? undefined;

// A 2xx whose body is not a template is reported as a failure, never as an empty success.
const templateResult = (result: OrgActionResult<RfpTemplate | undefined>): OrgActionResult<RfpTemplate> => {
  if (result.success && !result.data) return { success: false, message: UNREADABLE, status: result.status };
  return result as OrgActionResult<RfpTemplate>;
};

const post = (templateId: string, step: string) =>
  orgRequest(`${BASE}/${segment(templateId)}/${step}`, { method: "POST", body: {} }, pickTemplate).then(templateResult);

// What the signed-in member may do with templates, from the roles in their backend access token
// (lib/server/memberIdentity). It only decides what the screen offers; the backend checks the
// role again on every request.
export async function getTemplateAccessAction(): Promise<TemplateAccess> {
  const { roles } = await getMemberIdentity();
  return templateAccessForRoles(roles);
}

// The templates the member may see: their own personal ones, published organization ones, and
// (Owner, Admin) unpublished and archived organization ones. The backend decides; this never filters.
export async function listTemplatesAction(query: TemplateListQuery = {}): Promise<OrgActionResult<TemplatePage>> {
  const params = new URLSearchParams();
  if (query.scope) params.set("scope", query.scope);
  if (query.status) params.set("status", query.status);
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  const suffix = params.toString();
  return orgRequest<TemplatePage>(`${BASE}${suffix ? `?${suffix}` : ""}`, {}, (payload) => parseTemplatePage(payload.data));
}

// "Save as template": copies the RFP's content and layout (no vendors, responses, dates,
// contacts or files; the backend builds the snapshot). `organization` publishes it at once and
// is refused for anyone but an Owner or Admin.
export async function saveTemplateAction(input: SaveTemplateInput): Promise<OrgActionResult<RfpTemplate>> {
  const body = {
    proposalId: input.proposalId,
    title: input.title,
    description: input.description ?? "",
    scope: input.scope,
    ...(input.presentationLayout ? { presentationLayout: input.presentationLayout } : {}),
  };
  return templateResult(await orgRequest(BASE, { method: "POST", body }, pickTemplate));
}

export async function renameTemplateAction(templateId: string, changes: { title?: string; description?: string }): Promise<OrgActionResult<RfpTemplate>> {
  return templateResult(await orgRequest(`${BASE}/${segment(templateId)}`, { method: "PATCH", body: changes }, pickTemplate));
}

export async function publishTemplateAction(templateId: string): Promise<OrgActionResult<RfpTemplate>> {
  return post(templateId, "publish");
}

export async function unpublishTemplateAction(templateId: string): Promise<OrgActionResult<RfpTemplate>> {
  return post(templateId, "unpublish");
}

export async function archiveTemplateAction(templateId: string): Promise<OrgActionResult<RfpTemplate>> {
  return post(templateId, "archive");
}

export async function restoreTemplateAction(templateId: string): Promise<OrgActionResult<RfpTemplate>> {
  return post(templateId, "restore");
}

// Starts a new RFP from a template. It counts toward the plan limit like any new RFP: at the
// limit the result carries code PLAN_LIMIT_REACHED with { plan, limit, created } in `details`.
export async function createRfpFromTemplateAction(templateId: string, eventName?: string): Promise<OrgActionResult<TemplateRfp>> {
  const name = eventName?.trim();
  const result = await orgRequest<TemplateRfp | undefined>(
    `${BASE}/${segment(templateId)}/proposals`,
    { method: "POST", body: name ? { eventName: name } : {} },
    (payload) => parseTemplateRfp(payload.data) ?? undefined,
  );
  if (result.success && !result.data) return { success: false, message: UNREADABLE, status: result.status };
  return result as OrgActionResult<TemplateRfp>;
}
