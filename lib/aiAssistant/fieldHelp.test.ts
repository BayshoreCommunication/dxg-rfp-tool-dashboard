import {
  buildAssistantFieldHelpPrompt,
  normalizeAssistantFieldLabel,
} from "./fieldHelp";

describe("assistant field help", () => {
  test("normalizes required markers and whitespace from a form label", () => {
    expect(
      normalizeAssistantFieldLabel("  Event   Name  * "),
    ).toBe("Event Name");
  });

  test("uses a safe fallback for an empty label", () => {
    expect(normalizeAssistantFieldLabel("  ** ")).toBe(
      "this proposal field",
    );
  });

  test("builds a concise, editable field-help prompt", () => {
    expect(buildAssistantFieldHelpPrompt("Event Name *")).toBe(
      'What should I enter for the "Event Name" field? Explain it simply and give me one short example.',
    );
  });
});
