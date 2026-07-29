import {
  assistantStarterPromptsForContext,
  assistantUiContextForPathname,
  normalizeAssistantUiContext,
} from "./uiContext";

describe("Assistant UI context", () => {
  test.each([
    ["/dashboard", "dashboard", undefined],
    ["/proposals", "proposals", "proposal_review"],
    [
      "/proposals/add-new-proposal?client=private",
      "proposal_creation",
      "proposal_intake",
    ],
    [
      "/proposals/01890b2e/assistant",
      "proposal_assistant",
      "proposal_assistant",
    ],
    ["/email/send-email?proposalId=private", "email", "proposal_email"],
    [
      "/vendor-responses",
      "vendor_responses",
      "vendor_response_review",
    ],
  ])("classifies %s without preserving URL details", (path, category, workflow) => {
    const context = assistantUiContextForPathname(path);
    expect(context.routeCategory).toBe(category);
    expect(context.workflow).toBe(workflow);
    expect(JSON.stringify(context)).not.toContain("private");
    expect(JSON.stringify(context)).not.toContain("?");
  });

  test("keeps only the bounded allowlisted envelope", () => {
    expect(
      normalizeAssistantUiContext({
        schemaVersion: "assistant-ui-context.v1",
        routeCategory: "proposal_creation",
        workflow: "proposal_intake",
        sectionId: "event_overview",
        fieldKey: "/content/event/name",
        eventFormat: "in_person",
        roomIdentifier: "room:1",
        fullForm: { eventName: "Private event" },
      }),
    ).toEqual({
      schemaVersion: "assistant-ui-context.v1",
      routeCategory: "proposal_creation",
      workflow: "proposal_intake",
      sectionId: "event_overview",
      fieldKey: "/content/event/name",
      eventFormat: "in_person",
      roomIdentifier: "room:1",
    });
    expect(
      normalizeAssistantUiContext({
        schemaVersion: "assistant-ui-context.v1",
        routeCategory: "proposal_creation",
        fieldKey: "https://example.com/private",
      }),
    ).toBeNull();
  });

  test("offers a small route- or field-aware starter set", () => {
    const proposals = assistantStarterPromptsForContext(
      assistantUiContextForPathname("/proposals"),
    );
    expect(proposals).toHaveLength(3);
    expect(proposals[0]?.prompt).toMatch(/start a proposal/i);

    const field = assistantStarterPromptsForContext({
      ...assistantUiContextForPathname("/proposals/add-new-proposal"),
      sectionId: "event_overview",
      fieldKey: "/content/event/sacredConstraints",
    });
    expect(field).toHaveLength(3);
    expect(field[0]?.prompt).toMatch(/this field/i);
  });
});
