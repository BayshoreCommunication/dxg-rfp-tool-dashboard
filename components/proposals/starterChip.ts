// The one look for the "ways to start" chips, shared by the new-proposal entry screen and the
// first-run dashboard / empty proposals list links. Semantic tokens only, so it follows the theme.
// The chip border uses the `control` token so the chip's boundary is visible on its own, and the
// label uses the heading colour for full contrast.

export const STARTER_CHIP_CLASS =
  "inline-flex min-h-10 items-center gap-2 rounded-full border border-control bg-surface px-3.5 py-2 text-sm font-semibold text-heading transition-colors hover:border-action hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-control disabled:hover:bg-surface";

export const STARTER_ICON_CLASS = "shrink-0 text-action";
