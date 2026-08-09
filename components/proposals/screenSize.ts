export const SCREEN_SIZE_VENDOR_RECOMMENDATION = "Vendor Recommendation";
export const SCREEN_SIZE_OTHER = "Other — Specify";

export type ScreenSizeValue = {
  screenSize?: string;
  screenSizeOther?: string;
};

/** Returns the vendor-facing value while keeping the UI selection explicit. */
export const resolveScreenSize = ({
  screenSize = "",
  screenSizeOther = "",
}: ScreenSizeValue): string =>
  screenSize === SCREEN_SIZE_OTHER ? screenSizeOther.trim() : screenSize.trim();

/** Changing away from Other must not retain a hidden custom requirement. */
export const selectScreenSize = (
  current: ScreenSizeValue,
  screenSize: string,
): Required<ScreenSizeValue> => ({
  screenSize,
  screenSizeOther:
    screenSize === SCREEN_SIZE_OTHER ? current.screenSizeOther ?? "" : "",
});

export const customScreenSizeIsMissing = (value: ScreenSizeValue): boolean =>
  value.screenSize === SCREEN_SIZE_OTHER && !value.screenSizeOther?.trim();
