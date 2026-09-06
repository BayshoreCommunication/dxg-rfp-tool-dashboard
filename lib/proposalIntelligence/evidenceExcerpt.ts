/**
 * Narrow a stored evidence passage down to the lines that actually answer a
 * requirement.
 *
 * Extraction stores whole pages, so "cited evidence" for a requirement like
 * "Show End Date" arrived as a full page of billing addresses and phone
 * numbers with nothing marked. The reader had to find the answer themselves —
 * the work the product promised to do. This scores each line against the
 * requirement wording, keeps the best run of lines plus one line of context
 * either side, and reports which spans matched so the UI can mark them.
 *
 * The full passage is always still available; this only decides what to show
 * first.
 */

/** Words that match everything and therefore rank nothing. */
const STOP_WORDS = new Set([
  "a", "an", "and", "any", "are", "as", "at", "be", "by", "for", "from", "how",
  "in", "is", "it", "must", "need", "needed", "of", "on", "or", "our", "shall",
  "should", "that", "the", "this", "to", "we", "what", "which", "will", "with",
  "your",
]);

export type EvidenceHighlight = { start: number; end: number };

export type EvidenceExcerptResult = {
  /** The text to show first. Equals the passage when nothing was trimmed. */
  excerpt: string;
  /** Match ranges within `excerpt`, ascending and non-overlapping. */
  highlights: EvidenceHighlight[];
  /** True when `excerpt` is shorter than the passage it came from. */
  trimmed: boolean;
  /** Lines hidden from `excerpt`, for "show the rest" copy. */
  hiddenLineCount: number;
};

export const evidenceQueryTerms = (...sources: string[]): string[] => {
  const terms = sources
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
  return [...new Set(terms)];
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const scoreLine = (line: string, terms: string[]) => {
  const haystack = line.toLowerCase();
  return terms.reduce(
    (total, term) => (haystack.includes(term) ? total + term.length : total),
    0,
  );
};

const highlightsFor = (text: string, terms: string[]): EvidenceHighlight[] => {
  if (!terms.length) return [];
  const pattern = new RegExp(
    `\\b(${terms.map(escapeRegExp).sort((a, b) => b.length - a.length).join("|")})`,
    "gi",
  );
  const spans: EvidenceHighlight[] = [];
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const previous = spans[spans.length - 1];
    if (previous && start <= previous.end) previous.end = Math.max(previous.end, end);
    else spans.push({ start, end });
  }
  return spans;
};

/**
 * @param passage stored evidence text, usually a whole page
 * @param terms requirement wording, from `evidenceQueryTerms`
 * @param maxLines how many lines the excerpt may keep
 */
export const buildEvidenceExcerpt = (
  passage: string,
  terms: string[],
  maxLines = 6,
): EvidenceExcerptResult => {
  const lines = passage.split(/\r?\n/);
  const meaningful = lines.filter((line) => line.trim().length > 0);
  if (meaningful.length <= maxLines || !terms.length) {
    return {
      excerpt: passage.trim(),
      highlights: highlightsFor(passage.trim(), terms),
      trimmed: false,
      hiddenLineCount: 0,
    };
  }

  const scores = lines.map((line) => scoreLine(line, terms));
  if (scores.every((score) => score === 0)) {
    const head = meaningful.slice(0, maxLines).join("\n");
    return {
      excerpt: head,
      highlights: [],
      trimmed: true,
      hiddenLineCount: meaningful.length - maxLines,
    };
  }

  // Best window of `maxLines` consecutive lines, so a matched line keeps the
  // lines around it rather than arriving with no context.
  let bestScore = -1;
  const candidateStarts: number[] = [];
  for (let start = 0; start < lines.length; start += 1) {
    const total = scores
      .slice(start, start + maxLines)
      .reduce((sum, score) => sum + score, 0);
    if (total > bestScore) {
      bestScore = total;
      candidateStarts.length = 0;
    }
    if (total === bestScore) candidateStarts.push(start);
  }

  // Several windows tie whenever they all contain the same matching line.
  // Anchor on the strongest line and keep one line of lead-in, so the answer
  // sits near the top of the excerpt rather than at the bottom underneath
  // unrelated lines.
  const anchor = scores.indexOf(Math.max(...scores));
  const preferredStart = Math.max(0, anchor - 1);
  const bestStart = candidateStarts.reduce((closest, start) =>
    Math.abs(start - preferredStart) < Math.abs(closest - preferredStart)
      ? start
      : closest,
  );

  const window = lines.slice(bestStart, bestStart + maxLines);
  const excerpt = window.join("\n").trim();
  const keptLineCount = window.filter((line) => line.trim().length > 0).length;
  return {
    excerpt,
    highlights: highlightsFor(excerpt, terms),
    trimmed: true,
    hiddenLineCount: Math.max(0, meaningful.length - keptLineCount),
  };
};

/** Split text into alternating plain/highlighted segments for rendering. */
export const segmentHighlights = (
  text: string,
  highlights: EvidenceHighlight[],
): Array<{ text: string; match: boolean }> => {
  if (!highlights.length) return [{ text, match: false }];
  const segments: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  for (const highlight of highlights) {
    if (highlight.start > cursor)
      segments.push({ text: text.slice(cursor, highlight.start), match: false });
    segments.push({ text: text.slice(highlight.start, highlight.end), match: true });
    cursor = highlight.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
};

/**
 * OCR of a scanned page can come back as noise ("mMnoDid ,Jne u1 5 --‐-‐‑ D9T9").
 * Showing that as "cited evidence" makes the product look broken and tells the
 * reader nothing. This is a cheap test for text that is not readable prose:
 * too few word-like tokens, or too many stray symbols. It errs towards
 * "readable" so real quotes are never hidden.
 */
export const looksUnreadable = (text: string): boolean => {
  const trimmed = text.trim();
  if (trimmed.length < 12) return false;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length < 4) return false;
  const wordLike = tokens.filter((token) => /^[A-Za-z][A-Za-z'’-]{1,}$/.test(token) && /[aeiouyAEIOUY]/.test(token)).length;
  const numeric = tokens.filter((token) => /^[$€£]?[\d,.:%()/-]+$/.test(token)).length;
  const symbolHeavy = tokens.filter((token) => /[^A-Za-z0-9$€£,.:%()/'’"\-–—]/.test(token)).length;
  const wordRatio = wordLike / tokens.length;
  const symbolRatio = symbolHeavy / tokens.length;
  // Price tables are mostly numbers and are fine; noise is neither words nor numbers.
  return (wordRatio < 0.35 && (wordLike + numeric) / tokens.length < 0.6) || symbolRatio > 0.3;
};

/**
 * A short, readable preview of a passage for lists and checkboxes: the first
 * lines that read as text, up to `maxChars`. Returns null when nothing in the
 * passage reads clearly, so the caller can say so instead of quoting noise.
 */
export const readablePreview = (content: string, maxChars = 140): string | null => {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  const readable = lines.filter((line) => !looksUnreadable(line) && /[A-Za-z]{2,}/.test(line));
  if (!readable.length) return null;
  let preview = "";
  for (const line of readable) {
    const next = preview ? `${preview} ${line}` : line;
    if (next.length > maxChars) { preview = preview || line.slice(0, maxChars - 1).trimEnd() + "…"; break; }
    preview = next;
  }
  return preview;
};
