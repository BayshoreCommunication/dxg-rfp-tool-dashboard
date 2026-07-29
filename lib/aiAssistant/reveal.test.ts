import {
  splitAssistantDeltaForReveal,
  waitForAssistantRevealFrame,
} from "./reveal";

describe("assistant progressive reveal", () => {
  test("keeps small provider deltas intact", () => {
    expect(splitAssistantDeltaForReveal("Hello")).toEqual(["Hello"]);
  });

  test("splits a buffered response into bounded paintable chunks without changing it", () => {
    const source =
      "Here is a complete proposal readiness checklist with venue, schedule, production, budget, and deadline guidance.";
    const chunks = splitAssistantDeltaForReveal(source);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(source);
    expect(Math.max(...chunks.map((chunk) => Array.from(chunk).length))).toBeLessThanOrEqual(
      18,
    );
  });

  test("preserves Unicode content exactly", () => {
    const source = "Planning guidance 🌊 for hybrid events and captions.";
    expect(splitAssistantDeltaForReveal(source).join("")).toBe(source);
  });

  test("stops a pending reveal frame when the request is aborted", async () => {
    jest.useFakeTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn().mockReturnValue({ matches: false }),
    });
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: undefined,
    });
    const controller = new AbortController();
    const pending = waitForAssistantRevealFrame(controller.signal);

    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    jest.useRealTimers();
  });

  test("paces visible responses instead of resolving in the same frame", async () => {
    jest.useFakeTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn().mockReturnValue({ matches: false }),
    });
    const controller = new AbortController();
    let resolved = false;
    const pending = waitForAssistantRevealFrame(controller.signal).then(
      () => {
        resolved = true;
      },
    );

    jest.advanceTimersByTime(37);
    await Promise.resolve();
    expect(resolved).toBe(false);

    jest.advanceTimersByTime(1);
    await pending;
    expect(resolved).toBe(true);
    jest.useRealTimers();
  });
});
