import {
  SCREEN_SIZE_OTHER,
  SCREEN_SIZE_VENDOR_RECOMMENDATION,
  customScreenSizeIsMissing,
  resolveScreenSize,
  selectScreenSize,
} from "./screenSize";

describe("screen-size selections", () => {
  it("preserves standard and vendor-recommendation values", () => {
    expect(resolveScreenSize({ screenSize: "16' Wide Fastfold" })).toBe("16' Wide Fastfold");
    expect(resolveScreenSize({ screenSize: SCREEN_SIZE_VENDOR_RECOMMENDATION })).toBe(
      SCREEN_SIZE_VENDOR_RECOMMENDATION,
    );
  });

  it("resolves Other to the explicit custom size", () => {
    expect(resolveScreenSize({
      screenSize: SCREEN_SIZE_OTHER,
      screenSizeOther: "  22' × 12' rear projection  ",
    })).toBe("22' × 12' rear projection");
  });

  it("requires custom text only for Other", () => {
    expect(customScreenSizeIsMissing({ screenSize: SCREEN_SIZE_OTHER })).toBe(true);
    expect(customScreenSizeIsMissing({ screenSize: SCREEN_SIZE_VENDOR_RECOMMENDATION })).toBe(false);
  });

  it("clears stale custom text when changing away from Other", () => {
    expect(selectScreenSize({
      screenSize: SCREEN_SIZE_OTHER,
      screenSizeOther: "22' × 12'",
    }, SCREEN_SIZE_VENDOR_RECOMMENDATION)).toEqual({
      screenSize: SCREEN_SIZE_VENDOR_RECOMMENDATION,
      screenSizeOther: "",
    });
  });
});
