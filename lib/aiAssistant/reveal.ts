const MIN_REVEAL_CHUNK_CHARACTERS = 6;
const MAX_REVEAL_CHUNK_CHARACTERS = 18;
const TARGET_CHUNKS_PER_LARGE_DELTA = 90;
const REVEAL_INTERVAL_MS = 38;

const preferredBreak = (character: string): boolean =>
  /[\s,.;:!?)}\]]/u.test(character);

export const splitAssistantDeltaForReveal = (value: string): string[] => {
  if (!value) return [];
  const characters = Array.from(value);
  if (characters.length <= MIN_REVEAL_CHUNK_CHARACTERS) return [value];

  const targetSize = Math.min(
    MAX_REVEAL_CHUNK_CHARACTERS,
    Math.max(
      MIN_REVEAL_CHUNK_CHARACTERS,
      Math.ceil(characters.length / TARGET_CHUNKS_PER_LARGE_DELTA),
    ),
  );
  const chunks: string[] = [];

  for (let start = 0; start < characters.length; ) {
    let end = Math.min(characters.length, start + targetSize);
    if (end < characters.length) {
      const earliestBreak = start + Math.ceil(targetSize * 0.6);
      for (let cursor = end - 1; cursor >= earliestBreak; cursor -= 1) {
        if (preferredBreak(characters[cursor])) {
          end = cursor + 1;
          break;
        }
      }
    }
    chunks.push(characters.slice(start, end).join(""));
    start = end;
  }

  return chunks;
};

const reducedMotionRequested = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export const waitForAssistantRevealFrame = async (
  signal: AbortSignal,
): Promise<void> => {
  signal.throwIfAborted();
  if (
    typeof window === "undefined" ||
    reducedMotionRequested() ||
    document.visibilityState === "hidden"
  ) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let timer = 0;

    const cleanup = () => {
      if (timer) window.clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const abort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };

    signal.addEventListener("abort", abort, { once: true });
    timer = window.setTimeout(finish, REVEAL_INTERVAL_MS);
  });

  signal.throwIfAborted();
};
