// The user-facing noun is "proposal". Tests use these to check that on-screen text does not
// call the document a planner writes an "RFP". See lib/wording.test.ts for the whole-app check.

// "RFP", "RFPs", "RFP's" as a word of its own: not RFPilot, not part of an identifier.
export const RFP_NOUN = /(?<![A-Za-z0-9_])RFP(?:s|'s|’s)?(?![A-Za-z0-9_])/;

// Blanks out comments but keeps the line count, so a finding points at the right line.
// "//" counts as a comment only at the start of a line or after a space (not in "https://").
export const withoutComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/(^|\s)\/\/.*$/gm, "$1");
