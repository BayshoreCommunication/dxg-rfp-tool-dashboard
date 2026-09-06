import proposalFormUi from "@/contracts/proposal/v1/proposal-form-ui.v1.json";
import {
  audienceOptions,
  eventOverviewFieldHelper,
  eventOverviewFieldKeys,
  eventTypeOptions,
  formatOptions,
  maximumAudienceSelections,
  maximumToneSelections,
  toneGroups,
} from "./eventOverviewFieldUi";

describe("event overview field UI contract", () => {
  test("exposes every Ask AI-enabled Event Overview field", () => {
    expect(proposalFormUi.schemaVersion).toBe("proposal-form-ui.v1");
    expect(eventOverviewFieldKeys).toHaveLength(19);
    expect(eventOverviewFieldKeys).toContain("/content/event/edition");
    expect(eventOverviewFieldKeys).toContain("/content/event/theme");
    expect(eventOverviewFieldKeys).toContain("/content/event/toneDirections/*");
  });

  test("keeps the rendered single-select options contract-backed", () => {
    expect(eventTypeOptions).toHaveLength(14);
    expect(eventTypeOptions).toContain("Annual Meeting");
    expect(eventTypeOptions).toContain("Shareholder Event");
    expect(eventTypeOptions).not.toContain("Annual Meeting / Shareholder Event");
    expect(eventTypeOptions).toContain("Corporate Conference");
    expect(formatOptions).toEqual([
      { value: "In-Person", label: "In-Person Only" },
      { value: "Hybrid", label: "Hybrid (In-Person + Virtual)" },
      { value: "Virtual", label: "Virtual Only" },
    ]);
  });

  test("keeps multi-select choices and limits contract-backed", () => {
    expect(audienceOptions).toHaveLength(14);
    expect(maximumAudienceSelections).toBe(4);
    expect(maximumToneSelections).toBe(5);
    expect(toneGroups.map((group) => group.label)).toEqual([
      "Energy",
      "Style",
      "Mood",
      "Color Direction",
    ]);
    expect(toneGroups.flatMap((group) => group.options)).toHaveLength(18);
    expect(toneGroups[1].options).toContain("Tech-Forward");
  });

  test("shares helper guidance with the rendered field", () => {
    expect(
      eventOverviewFieldHelper("/content/event/toneDirections/*"),
    ).toMatch(/desired energy, visual style, mood, and color direction/i);
  });
});
