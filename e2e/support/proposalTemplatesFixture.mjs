// ORG-605: synthetic RFP templates for browser checks. It follows the backend's rules (docs/API.md
// "RFP templates (ORG-604)"): Owner, Admin, Team Manager and Planner use templates, Owner and
// Admin manage organization ones, a Viewer is refused on every route, a personal template is its
// owner's alone (403 for anyone else), and another organization's template is a 404. Members
// are the role accounts of roleDashboardFixture.mjs. No database, no real content.
import crypto from "node:crypto";
import { DASHBOARD_ACCOUNTS } from "./roleDashboardFixture.mjs";

const USE_ROLES = ["owner", "organization_admin", "team_manager", "planner", "dxg_producer"];
const MANAGE_ROLES = ["owner", "organization_admin"];
const LAYOUTS = ["template-one", "template-two"];
// A template and an RFP that belong to a different organization.
const FOREIGN_TEMPLATE_ID = "ffffffffffffffffffffffff";
const FOREIGN_RFP_ID = "fefefefefefefefefefefefe";

const OWNER = DASHBOARD_ACCOUNTS["owner-e2e@example.com"].userId;
const PLANNER = DASHBOARD_ACCOUNTS["planner-e2e@example.com"].userId;
// Another Planner in the same organization: nobody else may ever see this member's personal template.
const PETER = "6".repeat(24);

const stamp = () => new Date().toISOString();
const json = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body));
};
const refuse = (response, status, code, message) => json(response, status, { success: false, code, message });
const tidy = (value) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");
const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
};

const actorOf = (request) => {
  try {
    const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const claims = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8"));
    const roles = Array.isArray(claims.roles) ? claims.roles : [];
    return {
      userId: typeof claims.userId === "string" ? claims.userId : "",
      canUse: roles.some((role) => USE_ROLES.includes(role)),
      canManage: roles.some((role) => MANAGE_ROLES.includes(role)),
    };
  } catch {
    return { userId: "", canUse: false, canManage: false };
  }
};

const seed = (title, scope, ownerUserId, { published = false, archived = false, layout = null, description = "", eventName = "" } = {}) => ({
  id: crypto.randomBytes(12).toString("hex"), ownerUserId, scope, title, description, presentationLayout: layout,
  publishedAt: published ? stamp() : null, publishedBy: published ? ownerUserId : null,
  archived, archivedAt: archived ? stamp() : null, eventName, createdAt: stamp(), updatedAt: stamp(),
});

let templates;
let createdRfps;
let saveRequests;
let planLimit;
const reset = () => {
  createdRfps = [];
  saveRequests = [];
  planLimit = false;
  templates = [
    seed("Annual kickoff", "organization", OWNER, { published: true, layout: "template-one", description: "General session, breakouts and a hybrid stream", eventName: "Annual Sales Kickoff" }),
    seed("Draft gala", "organization", OWNER, { description: "Not ready for the team yet" }),
    seed("Old expo booth", "organization", OWNER, { archived: true }),
    seed("My roadshow", "personal", PLANNER, { layout: "template-two", eventName: "Regional Roadshow" }),
    seed("Owner's own checklist", "personal", OWNER),
    seed("Peter's private template", "personal", PETER, { description: "Only Peter may see this" }),
  ];
};
reset();

const canSee = (actor, template) =>
  template.scope === "personal" ? template.ownerUserId === actor.userId : actor.canManage || (template.publishedAt !== null && !template.archived);
const canChange = (actor, template) => (template.scope === "personal" ? template.ownerUserId === actor.userId : actor.canManage);
const summaryOf = (actor, template) => ({
  ...template,
  published: template.scope === "organization" && template.publishedAt !== null,
  ownedByMe: template.ownerUserId === actor.userId,
  usable: !template.archived && (template.scope === "personal" || template.publishedAt !== null),
});
const detailOf = (actor, template) => ({ ...summaryOf(actor, template), content: { event: { eventName: template.eventName } } });

export async function handleProposalTemplates(request, response, url) {
  const path = url.pathname;

  // Test control: reset the templates, put the organization at its plan limit, read what was done.
  if (path === "/__e2e/proposal-templates") {
    if (request.method === "POST") {
      const input = await readJson(request);
      if (input.reset === true) reset();
      if (typeof input.planLimit === "boolean") planLimit = input.planLimit;
    }
    json(response, 200, { templates, createdRfps, saveRequests });
    return true;
  }

  if (path !== "/api/v1/proposal-templates" && !path.startsWith("/api/v1/proposal-templates/")) return false;

  const actor = actorOf(request);
  const match = /^\/api\/v1\/proposal-templates\/([^/]+)(?:\/(publish|unpublish|archive|restore|proposals))?$/.exec(path);
  const step = match?.[2];
  // The route guard's refusal: a message and no code.
  if (!actor.canUse || ((step === "publish" || step === "unpublish") && !actor.canManage)) {
    json(response, 403, { success: false, message: "You don't have permission to perform this action" });
    return true;
  }

  if (path === "/api/v1/proposal-templates" && request.method === "GET") {
    const scope = url.searchParams.get("scope") || "all";
    const status = url.searchParams.get("status") || "active";
    if (!["personal", "organization", "all"].includes(scope)) {
      refuse(response, 400, "INVALID_TEMPLATE_SCOPE", "Scope must be personal, organization or all.");
      return true;
    }
    if (!["active", "archived", "all"].includes(status)) {
      refuse(response, 400, "INVALID_TEMPLATE_STATUS", "Status must be active, archived or all.");
      return true;
    }
    const search = tidy(url.searchParams.get("search")).toLowerCase();
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
    const matches = templates
      .filter((template) => canSee(actor, template))
      .filter((template) => scope === "all" || template.scope === scope)
      .filter((template) => status === "all" || template.archived === (status === "archived"))
      .filter((template) => !search || template.title.toLowerCase().includes(search) || template.description.toLowerCase().includes(search))
      .sort((a, b) => a.title.localeCompare(b.title));
    json(response, 200, { success: true, data: { items: matches.slice(offset, offset + limit).map((template) => summaryOf(actor, template)), total: matches.length, limit, offset } });
    return true;
  }

  if (path === "/api/v1/proposal-templates" && request.method === "POST") {
    const input = await readJson(request);
    saveRequests.push(input);
    const scope = input.scope ?? "personal";
    if (!["personal", "organization"].includes(scope)) {
      refuse(response, 400, "INVALID_TEMPLATE_SCOPE", "Scope must be personal or organization.");
      return true;
    }
    if (scope === "organization" && !actor.canManage) {
      refuse(response, 403, "TEMPLATE_PUBLISH_DENIED", "Only Owners and Admins can manage organization templates.");
      return true;
    }
    const title = tidy(input.title);
    if (!title || title.length > 120) {
      refuse(response, 400, "INVALID_TEMPLATE_TITLE", "Template title must be 1 to 120 characters.");
      return true;
    }
    const layout = input.presentationLayout ?? null;
    if (layout !== null && !LAYOUTS.includes(layout)) {
      refuse(response, 400, "INVALID_TEMPLATE_LAYOUT", "Presentation layout must be template-one or template-two.");
      return true;
    }
    if (!/^[a-f0-9]{24}$/.test(String(input.proposalId || ""))) {
      refuse(response, 400, "INVALID_TEMPLATE_SOURCE", "Choose the RFP to save as a template.");
      return true;
    }
    if (input.proposalId === FOREIGN_RFP_ID) {
      refuse(response, 404, "TEMPLATE_SOURCE_NOT_FOUND", "RFP not found.");
      return true;
    }
    const template = seed(title, scope, actor.userId, { published: scope === "organization", layout, description: tidy(input.description) });
    templates.push(template);
    json(response, 201, { success: true, data: detailOf(actor, template) });
    return true;
  }

  const template = match && match[1] !== FOREIGN_TEMPLATE_ID ? templates.find((item) => item.id === match[1]) : null;
  if (!match || !template) {
    refuse(response, 404, "TEMPLATE_NOT_FOUND", "Template not found.");
    return true;
  }
  if (!canSee(actor, template)) {
    refuse(response, 403, "TEMPLATE_ACCESS_DENIED", "You don't have access to this template.");
    return true;
  }
  const answer = (status = 200) => {
    template.updatedAt = stamp();
    json(response, status, { success: true, data: detailOf(actor, template) });
    return true;
  };

  if (!step && request.method === "GET") {
    json(response, 200, { success: true, data: detailOf(actor, template) });
    return true;
  }

  if (step === "proposals" && request.method === "POST") {
    if (template.archived) {
      refuse(response, 409, "TEMPLATE_ARCHIVED", "This template is archived and can't be used.");
      return true;
    }
    if (template.scope === "organization" && template.publishedAt === null) {
      refuse(response, 409, "TEMPLATE_NOT_PUBLISHED", "Publish this template before using it.");
      return true;
    }
    if (planLimit) {
      // The ORG-601 plan refusal body.
      json(response, 403, { success: false, code: "PLAN_LIMIT_REACHED", status: 403, title: "Plan limit reached", message: "Plan limit reached", plan: "free_trial", limit: 2, created: 2 });
      return true;
    }
    const input = await readJson(request);
    const proposal = {
      _id: crypto.randomBytes(12).toString("hex"), status: "unsubmitted", isDraft: true,
      event: { eventName: tidy(input.eventName) || template.eventName || template.title },
    };
    createdRfps.push({ templateId: template.id, ownerUserId: actor.userId, proposal });
    json(response, 201, { success: true, data: { proposal, presentationLayout: template.presentationLayout } });
    return true;
  }

  if (step === "publish" && request.method === "POST") {
    if (template.archived) {
      refuse(response, 409, "TEMPLATE_ARCHIVED", "Restore this template before publishing it.");
      return true;
    }
    template.scope = "organization";
    template.publishedAt = template.publishedAt ?? stamp();
    template.publishedBy = template.publishedBy ?? actor.userId;
    return answer();
  }

  if (step === "unpublish" && request.method === "POST") {
    if (template.scope === "organization") {
      template.publishedAt = null;
      template.publishedBy = null;
    }
    return answer();
  }

  if (!canChange(actor, template)) {
    refuse(response, 403, "TEMPLATE_PUBLISH_DENIED", "Only Owners and Admins can manage organization templates.");
    return true;
  }

  if (!step && request.method === "PATCH") {
    if (template.archived) {
      refuse(response, 409, "TEMPLATE_ARCHIVED", "Restore this template before editing it.");
      return true;
    }
    const input = await readJson(request);
    if (input.title !== undefined) {
      const title = tidy(input.title);
      if (!title || title.length > 120) {
        refuse(response, 400, "INVALID_TEMPLATE_TITLE", "Template title must be 1 to 120 characters.");
        return true;
      }
      template.title = title;
    }
    if (input.description !== undefined) template.description = tidy(input.description);
    return answer();
  }

  if ((step === "archive" || step === "restore") && request.method === "POST") {
    const archive = step === "archive";
    template.archived = archive;
    template.archivedAt = archive ? stamp() : null;
    // Archiving also unpublishes, so a restored organization template is unpublished.
    if (archive) {
      template.publishedAt = null;
      template.publishedBy = null;
    }
    return answer();
  }

  refuse(response, 404, "TEMPLATE_NOT_FOUND", "Template not found.");
  return true;
}
