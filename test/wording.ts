// The user-facing noun is "proposal". Tests use these to check that on-screen text does not
// call the document a planner writes an "RFP". See lib/wording.test.ts for the whole-app check.

// "RFP", "RFPs", "RFP's" as a word of its own: not RFPilot, not part of an identifier.
export const RFP_NOUN = /(?<![A-Za-z0-9_])RFP(?:s|'s|’s)?(?![A-Za-z0-9_])/;

// Blanks out comments but keeps the line count, so a finding points at the right line. It walks
// the text and knows when it is inside a string, so "/*" in a JSON pointer ("/content/rooms/*/id")
// or "//" in a URL is text, not a comment. Template literals run from one backtick to the next;
// code inside `${...}` is checked as text, which errs towards a finding, never away from one.
export const withoutComments = (source: string): string => {
  let out = "";
  let i = 0;
  let quote: string | null = null;
  const blank = (text: string) => text.replace(/[^\n]/g, " ");
  while (i < source.length) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\" && i + 1 < source.length) { out += ch + source[i + 1]; i += 2; continue; }
      // An unterminated ' or " ends at the line break (those strings are single-line).
      if (ch === quote || (ch === "\n" && quote !== "`")) quote = null;
      out += ch; i += 1; continue;
    }
    if (ch === '"' || ch === "`") { quote = ch; out += ch; i += 1; continue; }
    // An apostrophe after a letter is prose in JSX or HTML text ("isn't"), not a string opener.
    if (ch === "'" && !/[A-Za-z0-9]/.test(source[i - 1] ?? "")) { quote = ch; out += ch; i += 1; continue; }
    if (source.startsWith("/*", i) || source.startsWith("<!--", i)) {
      const close = source.startsWith("/*", i) ? "*/" : "-->";
      const end = source.indexOf(close, i + 2);
      const stop = end === -1 ? source.length : end + close.length;
      out += blank(source.slice(i, stop)); i = stop; continue;
    }
    if (source.startsWith("//", i)) {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      out += blank(source.slice(i, stop)); i = stop; continue;
    }
    out += ch; i += 1;
  }
  return out;
};
