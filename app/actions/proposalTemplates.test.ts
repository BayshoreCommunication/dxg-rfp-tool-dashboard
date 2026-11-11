/** @jest-environment node */

jest.mock("@/lib/server/backendClient", () => ({
  authenticatedBackendFetch: jest.fn(),
}));
jest.mock("@/lib/server/memberIdentity", () => ({
  getMemberIdentity: jest.fn(),
}));

import { authenticatedBackendFetch } from "@/lib/server/backendClient";
import { getMemberIdentity } from "@/lib/server/memberIdentity";
import {
  archiveTemplateAction,
  createRfpFromTemplateAction,
  getTemplateAccessAction,
  listTemplatesAction,
  publishTemplateAction,
  renameTemplateAction,
  restoreTemplateAction,
  saveTemplateAction,
  unpublishTemplateAction,
} from "./proposalTemplates";

const mockedFetch = jest.mocked(authenticatedBackendFetch);
const mockedIdentity = jest.mocked(getMemberIdentity);

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, headers: new Headers(), json: async () => body }) as unknown as Response;

const template = {
  id: "t1", title: "Annual kickoff", description: "", scope: "personal", presentationLayout: null, published: false, publishedAt: null, publishedBy: null,
  ownerUserId: "u1", ownedByMe: true, usable: true, archived: false, archivedAt: null, eventName: "Annual Sales Kickoff",
  createdAt: "2026-11-10T00:00:00.000Z", updatedAt: "2026-11-10T00:00:00.000Z",
};
const lastCall = () => {
  const [url, init] = mockedFetch.mock.calls[mockedFetch.mock.calls.length - 1];
  return { path: new URL(String(url)).pathname + new URL(String(url)).search, method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined };
};

describe("RFP template actions", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedIdentity.mockReset();
  });

  test.each([
    [["owner"], { canUse: true, canManage: true }],
    [["organization_admin"], { canUse: true, canManage: true }],
    [["team_manager"], { canUse: true, canManage: false }],
    [["planner"], { canUse: true, canManage: false }],
    [["viewer"], { canUse: false, canManage: false }],
  ])("access for %j comes from the signed-in member's roles", async (roles, expected) => {
    mockedIdentity.mockResolvedValue({ userId: "u1", roles });
    await expect(getTemplateAccessAction()).resolves.toEqual(expected);
  });

  test("no session means no access", async () => {
    mockedIdentity.mockResolvedValue({ userId: null, roles: [] });
    await expect(getTemplateAccessAction()).resolves.toEqual({ canUse: false, canManage: false });
  });

  test("listing sends scope, status, search and paging to the scoped endpoint, and names no organization or member", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { items: [template], total: 1, limit: 50, offset: 50 } }));
    const result = await listTemplatesAction({ scope: "organization", status: "archived", search: " kick ", limit: 50, offset: 50 });
    expect(lastCall()).toMatchObject({ path: "/api/v1/proposal-templates?scope=organization&status=archived&search=kick&limit=50&offset=50", method: "GET" });
    expect(lastCall().path).not.toMatch(/organizationId|ownerUserId|userId/);
    expect(result.data?.items.map((item) => item.id)).toEqual(["t1"]);
  });

  test("the list is returned as the backend scoped it, without the snapshot content", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { items: [{ ...template, content: { event: { eventName: "Secret" } } }], total: 1, limit: 50, offset: 0 } }));
    const result = await listTemplatesAction();
    expect(lastCall().path).toBe("/api/v1/proposal-templates");
    expect(JSON.stringify(result.data)).not.toContain("Secret");
  });

  test("save as template posts the RFP, name, scope and layout", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(201, { success: true, data: { ...template, scope: "organization", published: true, presentationLayout: "template-two" } }));
    const result = await saveTemplateAction({ proposalId: "p1", title: "Annual kickoff", description: "For kickoffs", scope: "organization", presentationLayout: "template-two" });
    expect(lastCall()).toEqual({
      path: "/api/v1/proposal-templates", method: "POST",
      body: { proposalId: "p1", title: "Annual kickoff", description: "For kickoffs", scope: "organization", presentationLayout: "template-two" },
    });
    expect(result).toMatchObject({ success: true, data: { id: "t1", scope: "organization", published: true } });
  });

  test("a personal save without a layout sends no layout", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(201, { success: true, data: template }));
    await saveTemplateAction({ proposalId: "p1", title: "Annual kickoff", scope: "personal", presentationLayout: null });
    expect(lastCall().body).toEqual({ proposalId: "p1", title: "Annual kickoff", description: "", scope: "personal" });
  });

  test("saving to the organization is refused for a member who can't manage organization templates", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(403, { success: false, code: "TEMPLATE_PUBLISH_DENIED", message: "Only Owners and Admins can manage organization templates." }));
    expect(await saveTemplateAction({ proposalId: "p1", title: "X", scope: "organization" })).toMatchObject({ success: false, code: "TEMPLATE_PUBLISH_DENIED", status: 403 });
  });

  test("rename patches the template with only the fields sent", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { ...template, title: "Kickoff" } }));
    const result = await renameTemplateAction("t1", { title: "Kickoff" });
    expect(lastCall()).toEqual({ path: "/api/v1/proposal-templates/t1", method: "PATCH", body: { title: "Kickoff" } });
    expect(result.data?.title).toBe("Kickoff");
  });

  test.each([
    ["publish", publishTemplateAction],
    ["unpublish", unpublishTemplateAction],
    ["archive", archiveTemplateAction],
    ["restore", restoreTemplateAction],
  ] as const)("%s posts to the template's own route, with the id escaped", async (step, action) => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: template }));
    const result = await action("t/1");
    expect(lastCall()).toMatchObject({ path: `/api/v1/proposal-templates/t%2F1/${step}`, method: "POST" });
    expect(result).toMatchObject({ success: true, data: { id: "t1" } });
  });

  test("another organization's template is a 404, passed on as a failure", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(404, { success: false, code: "TEMPLATE_NOT_FOUND", message: "Template not found." }));
    expect(await publishTemplateAction("foreign")).toMatchObject({ success: false, code: "TEMPLATE_NOT_FOUND", status: 404 });
  });

  test("someone else's personal template is refused, passed on as a failure", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(403, { success: false, code: "TEMPLATE_ACCESS_DENIED", message: "You don't have access to this template." }));
    expect(await createRfpFromTemplateAction("theirs")).toMatchObject({ success: false, code: "TEMPLATE_ACCESS_DENIED", status: 403 });
  });

  test("a role refusal has a status and no code", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(403, { success: false, message: "You don't have permission to perform this action" }));
    const result = await listTemplatesAction();
    expect(result).toMatchObject({ success: false, status: 403 });
    expect(result.code).toBeUndefined();
  });

  test("a success without a readable template is reported as a failure", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(200, { success: true, data: { unexpected: true } }));
    expect(await archiveTemplateAction("t1")).toMatchObject({ success: false });
  });

  test("starting an RFP posts to the template and returns the new RFP's id and the layout", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(201, { success: true, data: { proposal: { _id: "p9", event: { eventName: "Spring summit" } }, presentationLayout: "template-one" } }));
    const result = await createRfpFromTemplateAction("t1", "  Spring summit ");
    expect(lastCall()).toEqual({ path: "/api/v1/proposal-templates/t1/proposals", method: "POST", body: { eventName: "Spring summit" } });
    expect(result).toMatchObject({ success: true, data: { proposalId: "p9", eventName: "Spring summit", presentationLayout: "template-one" } });
  });

  test("without an event name the template's own name is left to the backend", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(201, { success: true, data: { proposal: { _id: "p9" }, presentationLayout: null } }));
    await createRfpFromTemplateAction("t1", "   ");
    expect(lastCall().body).toEqual({});
  });

  test("at the plan limit the refusal keeps its plan, limit and count", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(403, {
      success: false, code: "PLAN_LIMIT_REACHED", status: 403, title: "Plan limit reached", message: "Plan limit reached", plan: "free_trial", limit: 2, created: 2,
    }));
    expect(await createRfpFromTemplateAction("t1")).toMatchObject({
      success: false, code: "PLAN_LIMIT_REACHED", status: 403, details: { plan: "free_trial", limit: 2, created: 2 },
    });
  });

  test("a created RFP the action can't read is a failure, not a silent success", async () => {
    mockedFetch.mockResolvedValue(jsonResponse(201, { success: true, data: { proposal: {} } }));
    expect(await createRfpFromTemplateAction("t1")).toMatchObject({ success: false });
  });
});
