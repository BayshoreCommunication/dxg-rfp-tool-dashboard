import {
  canChangeTemplate,
  canPublishTemplate,
  canUnpublishTemplate,
  descriptionError,
  eventNameError,
  isRoleRefusal,
  isStaleTemplate,
  isTemplateGone,
  parseTemplate,
  parseTemplatePage,
  parseTemplateRfp,
  planLimitOf,
  planLimitSummary,
  templateAccessForRoles,
  templateAudience,
  templateErrorMessage,
  titleError,
  type RfpTemplate,
} from "./templateModel";

const raw = {
  id: "t1", title: " Annual kickoff ", description: " For sales kickoffs ", scope: "organization", presentationLayout: "template-one",
  published: true, publishedAt: "2026-11-10T00:00:00.000Z", publishedBy: "u1", ownerUserId: "u1", ownedByMe: true, usable: true,
  archived: false, archivedAt: null, eventName: "Annual Sales Kickoff", createdAt: "2026-11-09T00:00:00.000Z", updatedAt: "2026-11-10T00:00:00.000Z",
};
const template = (over: Partial<RfpTemplate> = {}): RfpTemplate => ({ ...parseTemplate(raw)!, ...over });

describe("reading templates from the backend", () => {
  test("a template is read with its scope, layout and state", () => {
    expect(parseTemplate(raw)).toEqual({
      id: "t1", title: "Annual kickoff", description: "For sales kickoffs", scope: "organization", presentationLayout: "template-one",
      published: true, publishedAt: "2026-11-10T00:00:00.000Z", ownedByMe: true, usable: true, archived: false, archivedAt: null,
      eventName: "Annual Sales Kickoff", createdAt: "2026-11-09T00:00:00.000Z", updatedAt: "2026-11-10T00:00:00.000Z",
    });
  });

  test("the snapshot content and other members' ids are not kept", () => {
    const parsed = parseTemplate({ ...raw, content: { event: { eventName: "Secret" } } });
    expect(parsed).not.toHaveProperty("content");
    expect(parsed).not.toHaveProperty("ownerUserId");
    expect(parsed).not.toHaveProperty("publishedBy");
  });

  test.each([null, "text", [], {}, { id: "t1" }, { id: "t1", title: "X", scope: "public" }, { title: "X", scope: "personal" }])(
    "a payload that is not a template is dropped: %j",
    (value) => expect(parseTemplate(value)).toBeNull(),
  );

  test("anything not stated plainly reads as the safer answer", () => {
    const parsed = parseTemplate({ id: "t1", title: "X", scope: "personal", published: "yes", usable: 1, ownedByMe: "true", presentationLayout: "template-nine" })!;
    expect(parsed).toMatchObject({ published: false, usable: false, ownedByMe: false, presentationLayout: null });
  });

  test("a personal template is never published and an archived one is never usable", () => {
    expect(parseTemplate({ ...raw, scope: "personal" })!.published).toBe(false);
    expect(parseTemplate({ ...raw, archived: true })).toMatchObject({ published: false, usable: false, archived: true });
  });

  test("a page keeps readable rows and never reports fewer than it holds", () => {
    expect(parseTemplatePage({ items: [raw, { junk: true }, { ...raw, id: "t2" }], total: 1, limit: 50, offset: 0 })).toMatchObject({ total: 2, limit: 50, offset: 0 });
    expect(parseTemplatePage(null)).toEqual({ items: [], total: 0, limit: 50, offset: 0 });
  });

  test("the RFP created from a template is read with its id and the template's layout", () => {
    expect(parseTemplateRfp({ proposal: { _id: "p1", event: { eventName: "Kickoff" } }, presentationLayout: "template-two" }))
      .toEqual({ proposalId: "p1", eventName: "Kickoff", presentationLayout: "template-two" });
    expect(parseTemplateRfp({ proposal: { id: "p2" }, presentationLayout: null })).toEqual({ proposalId: "p2", eventName: "", presentationLayout: null });
    expect(parseTemplateRfp({ proposal: {} })).toBeNull();
    expect(parseTemplateRfp({ presentationLayout: "template-one" })).toBeNull();
  });
});

describe("what each role may do", () => {
  test.each([
    [["owner"], { canUse: true, canManage: true }],
    [["organization_admin"], { canUse: true, canManage: true }],
    [["team_manager"], { canUse: true, canManage: false }],
    [["planner"], { canUse: true, canManage: false }],
    [["viewer"], { canUse: false, canManage: false }],
    [["knowledge_editor"], { canUse: false, canManage: false }],
    [[], { canUse: false, canManage: false }],
  ])("%j", (roles, expected) => expect(templateAccessForRoles(roles)).toEqual(expected));

  const owner = { canUse: true, canManage: true };
  const planner = { canUse: true, canManage: false };

  test("a personal template is changed only by the member who saved it", () => {
    expect(canChangeTemplate(template({ scope: "personal", ownedByMe: true, published: false }), planner)).toBe(true);
    expect(canChangeTemplate(template({ scope: "personal", ownedByMe: false, published: false }), owner)).toBe(false);
  });

  test("an organization template is changed only by an Owner or Admin, whoever saved it", () => {
    expect(canChangeTemplate(template({ ownedByMe: false }), owner)).toBe(true);
    expect(canChangeTemplate(template({ ownedByMe: true }), planner)).toBe(false);
  });

  test("publish: a manager's own personal template or an unpublished organization one, never an archived one", () => {
    expect(canPublishTemplate(template({ scope: "personal", ownedByMe: true, published: false }), owner)).toBe(true);
    expect(canPublishTemplate(template({ scope: "personal", ownedByMe: false, published: false }), owner)).toBe(false);
    expect(canPublishTemplate(template({ published: false, ownedByMe: false }), owner)).toBe(true);
    expect(canPublishTemplate(template({ published: true }), owner)).toBe(false);
    expect(canPublishTemplate(template({ published: false, archived: true }), owner)).toBe(false);
    expect(canPublishTemplate(template({ scope: "personal", ownedByMe: true, published: false }), planner)).toBe(false);
  });

  test("unpublish: a published organization template, by a manager", () => {
    expect(canUnpublishTemplate(template(), owner)).toBe(true);
    expect(canUnpublishTemplate(template({ published: false }), owner)).toBe(false);
    expect(canUnpublishTemplate(template(), planner)).toBe(false);
  });

  test("who a template is for", () => {
    expect(templateAudience(template())).toBe("Organization");
    expect(templateAudience(template({ published: false }))).toBe("Not published");
    expect(templateAudience(template({ scope: "personal", published: false }))).toBe("Only you");
    expect(templateAudience(template({ archived: true }))).toBe("Archived");
  });
});

describe("form checks", () => {
  test("a template needs a name of at most 120 characters", () => {
    expect(titleError("   ")).toBe("Give the template a name.");
    expect(titleError("x".repeat(121))).toMatch(/at most 120/);
    expect(titleError(" Kickoff ")).toBeNull();
  });

  test("descriptions and event names have a length limit", () => {
    expect(descriptionError("x".repeat(501))).toMatch(/at most 500/);
    expect(descriptionError("fine")).toBeNull();
    expect(eventNameError("x".repeat(201))).toMatch(/at most 200/);
    expect(eventNameError("")).toBeNull();
  });
});

describe("refusals", () => {
  test("codes become messages that say RFP and never show the code", () => {
    for (const code of ["TEMPLATE_NOT_FOUND", "TEMPLATE_ACCESS_DENIED", "TEMPLATE_PUBLISH_DENIED", "TEMPLATE_ARCHIVED", "TEMPLATE_NOT_PUBLISHED", "TEMPLATE_SOURCE_NOT_FOUND", "PROPOSAL_ACCESS_DENIED", "TEMPLATE_TOO_LARGE", "INVALID_TEMPLATE_TITLE", "PLAN_LIMIT_REACHED", "NETWORK_ERROR"]) {
      const message = templateErrorMessage({ code, status: 400, message: "raw proposal text" });
      expect(message).not.toMatch(/proposal/i);
      expect(message).not.toContain(code);
    }
  });

  test("a missing template and one that is not the member's to see read the same", () => {
    expect(templateErrorMessage({ code: "TEMPLATE_NOT_FOUND", status: 404 })).toBe(templateErrorMessage({ code: "TEMPLATE_ACCESS_DENIED", status: 403 }));
    expect(templateErrorMessage({ status: 404 })).toBe(templateErrorMessage({ code: "TEMPLATE_NOT_FOUND" }));
  });

  test("an unknown refusal falls back without echoing the backend's words", () => {
    expect(templateErrorMessage({ status: 500, message: "stack trace" })).toBe("Something went wrong. Try again.");
    expect(templateErrorMessage({ status: 403, message: "You don't have permission to perform this action" })).toBe("Your role doesn't allow this.");
  });

  test("gone, stale and role refusals are told apart", () => {
    expect(isTemplateGone({ status: 404 })).toBe(true);
    expect(isTemplateGone({ code: "TEMPLATE_ACCESS_DENIED", status: 403 })).toBe(true);
    expect(isTemplateGone({ code: "TEMPLATE_ARCHIVED", status: 409 })).toBe(false);
    expect(isStaleTemplate({ code: "TEMPLATE_ARCHIVED", status: 409 })).toBe(true);
    expect(isStaleTemplate({ code: "TEMPLATE_NOT_PUBLISHED", status: 409 })).toBe(true);
    expect(isRoleRefusal({ status: 403 })).toBe(true);
    expect(isRoleRefusal({ status: 403, code: "TEMPLATE_PUBLISH_DENIED" })).toBe(true);
    expect(isRoleRefusal({ status: 403, code: "TEMPLATE_ACCESS_DENIED" })).toBe(false);
    expect(isRoleRefusal({ status: 403, code: "PLAN_LIMIT_REACHED" })).toBe(false);
  });

  test("the plan limit is read from the refusal, and only from that refusal", () => {
    expect(planLimitOf({ code: "PLAN_LIMIT_REACHED", status: 403, details: { plan: "free_trial", limit: 2, created: 2 } })).toEqual({ plan: "free_trial", limit: 2, created: 2 });
    expect(planLimitOf({ code: "PLAN_LIMIT_REACHED", status: 403 })).toEqual({ plan: "", limit: null, created: null });
    expect(planLimitOf({ code: "TEMPLATE_ARCHIVED", status: 409 })).toBeNull();
    expect(planLimitOf({ status: 403 })).toBeNull();
  });

  test("the at-limit summary counts RFPs", () => {
    expect(planLimitSummary({ plan: "free_trial", limit: 2, created: 2 })).toBe("Your organization has created 2 of the 2 RFPs its plan includes.");
    expect(planLimitSummary({ plan: "free_trial", limit: 1, created: 1 })).toBe("Your organization has created 1 of the 1 RFP its plan includes.");
    expect(planLimitSummary({ plan: "", limit: null, created: null })).toBe("Your organization has created every RFP its plan includes.");
  });
});
