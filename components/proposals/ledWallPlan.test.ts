import {
  emptyLedWallSpecification,
  ensureLedWallSlots,
  ledWallCount,
  ledWallPlanMissingFields,
  normalizeLedWalls,
} from "./ledWallPlan";

describe("LED wall plan", () => {
  test("loads legacy scalar fields as the first wall", () => {
    const plan = { ledWall: "Yes", ledWallWidth: "40", ledWallHeight: "15" };
    expect(ledWallCount(plan)).toBe(1);
    expect(normalizeLedWalls(plan)[0]).toMatchObject({ width: "40", height: "15" });
  });

  test("growing and shrinking the visible count preserves entered wall drafts", () => {
    const first = { ...emptyLedWallSpecification(), width: "32" };
    const second = { ...emptyLedWallSpecification(), width: "16" };
    expect(ensureLedWallSlots([first, second], 1)).toEqual([first, second]);
    expect(ensureLedWallSlots([first], 2)).toEqual([first, emptyLedWallSpecification()]);
  });

  test("validates required specifications for each active wall", () => {
    expect(ledWallPlanMissingFields({
      ledWall: "Yes",
      ledWallCount: "2",
      ledWalls: [{
        ...emptyLedWallSpecification(), width: "40", height: "15", shape: "Flat / Straight",
        pixelPitch: "2.6mm (Standard)", switcher: "Vendor Recommendation",
      }],
    })).toEqual([
      "LED wall 2 width", "LED wall 2 height", "LED wall 2 shape",
      "LED wall 2 pixel pitch", "LED wall 2 processor",
    ]);
  });
});
