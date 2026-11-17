import { act, renderHook } from "@testing-library/react";
import {
  REVEAL_ROW_STEP_MS,
  usePrefersReducedMotion,
  useStaggeredCount,
  useTypewriter,
} from "./extractionReveal";

describe("extraction reveal pacing", () => {
  afterEach(() => {
    jest.useRealTimers();
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it("treats an environment without matchMedia as reduced motion, so nothing waits", () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it("follows the user's reduced-motion setting when the browser reports it", () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() });
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("adds one row per step and never shows more rows than are saved", () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHook(({ target }) => useStaggeredCount(target, { enabled: true }), {
      initialProps: { target: 3 },
    });
    expect(result.current).toBe(0);
    act(() => { jest.advanceTimersByTime(REVEAL_ROW_STEP_MS); });
    expect(result.current).toBe(1);
    for (let step = 0; step < 5; step += 1) act(() => { jest.advanceTimersByTime(REVEAL_ROW_STEP_MS); });
    expect(result.current).toBe(3);
    rerender({ target: 2 });
    expect(result.current).toBe(2);
    // Rows already seen come straight back; only new ones step in.
    rerender({ target: 5 });
    expect(result.current).toBe(3);
    act(() => { jest.advanceTimersByTime(REVEAL_ROW_STEP_MS); });
    expect(result.current).toBe(4);
  });

  it("shows every row at once when pacing is off", () => {
    const { result } = renderHook(() => useStaggeredCount(9, { enabled: false }));
    expect(result.current).toBe(9);
  });

  it("types paragraphs in order and finishes on the full text", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useTypewriter(["Hello there.", "Second line."], { enabled: true, durationMs: 160 }));
    expect(result.current.parts).toEqual(["", ""]);
    expect(result.current.done).toBe(false);
    act(() => { jest.advanceTimersByTime(64); });
    expect(result.current.parts[0].length).toBeGreaterThan(0);
    for (let frame = 0; frame < 40; frame += 1) act(() => { jest.advanceTimersByTime(16); });
    expect(result.current.parts).toEqual(["Hello there.", "Second line."]);
    expect(result.current.done).toBe(true);
  });

  it("returns the full text immediately when typing is off", () => {
    const { result } = renderHook(() => useTypewriter(["Hello.", "World."], { enabled: false }));
    expect(result.current).toEqual({ parts: ["Hello.", "World."], done: true });
  });
});
