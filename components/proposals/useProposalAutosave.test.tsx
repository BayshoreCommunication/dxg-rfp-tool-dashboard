import { act, renderHook } from "@testing-library/react";
import { AUTOSAVE_DELAY_MS, AUTOSAVE_RETRY_DELAYS_MS, useProposalAutosave } from "./useProposalAutosave";

type Props = { snapshot: string; enabled?: boolean; paused?: boolean };

const setup = (save: jest.Mock, initial: Props = { snapshot: "A" }) =>
  renderHook((props: Props) => useProposalAutosave({ enabled: true, save, ...props }), { initialProps: initial });

const flushAsync = async () => {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("useProposalAutosave", () => {
  test("writes nothing when the form is opened and left untouched", async () => {
    const save = jest.fn().mockResolvedValue(true);
    const { result } = setup(save);
    act(() => { jest.advanceTimersByTime(60_000); });
    await flushAsync();
    expect(save).not.toHaveBeenCalled();
    expect(result.current.state).toBe("idle");
    expect(result.current.hasUnsavedChanges()).toBe(false);
  });

  test("debounces a change and saves it once", async () => {
    const save = jest.fn().mockResolvedValue(true);
    const { result, rerender } = setup(save);
    rerender({ snapshot: "B" });
    rerender({ snapshot: "C" });
    act(() => { jest.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1); });
    expect(save).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(1); });
    await flushAsync();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("C");
    expect(result.current.state).toBe("saved");
    expect(result.current.hasUnsavedChanges()).toBe(false);
  });

  test("an edit made while a save is in flight is saved right after, not dropped", async () => {
    let release: (ok: boolean) => void = () => {};
    const save = jest.fn()
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => { release = resolve; }))
      .mockResolvedValue(true);
    const { result, rerender } = setup(save);
    rerender({ snapshot: "B" });
    act(() => { jest.advanceTimersByTime(AUTOSAVE_DELAY_MS); });
    expect(save).toHaveBeenCalledWith("B");
    expect(result.current.state).toBe("saving");

    rerender({ snapshot: "C" });
    act(() => { jest.advanceTimersByTime(AUTOSAVE_DELAY_MS); }); // timer fires while in flight
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => { release(true); });
    await flushAsync();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith("C");
    expect(result.current.state).toBe("saved");
    expect(result.current.hasUnsavedChanges()).toBe(false);
  });

  test("a failed save shows an error, keeps the change pending and retries automatically", async () => {
    const save = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const { result, rerender } = setup(save);
    rerender({ snapshot: "B" });
    act(() => { jest.advanceTimersByTime(AUTOSAVE_DELAY_MS); });
    await flushAsync();
    expect(result.current.state).toBe("error");
    expect(result.current.hasUnsavedChanges()).toBe(true);

    act(() => { jest.advanceTimersByTime(AUTOSAVE_RETRY_DELAYS_MS[0]); });
    await flushAsync();
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.state).toBe("saved");
  });

  test("a thrown save is treated as a failure, and manual retry recovers once retries are exhausted", async () => {
    const save = jest.fn().mockRejectedValue(new Error("network"));
    const { result, rerender } = setup(save);
    rerender({ snapshot: "B" });
    act(() => { jest.advanceTimersByTime(AUTOSAVE_DELAY_MS); });
    await flushAsync();
    for (const wait of AUTOSAVE_RETRY_DELAYS_MS) {
      expect(result.current.state).toBe("error");
      act(() => { jest.advanceTimersByTime(wait); });
      await flushAsync();
    }
    expect(save).toHaveBeenCalledTimes(1 + AUTOSAVE_RETRY_DELAYS_MS.length);
    act(() => { jest.advanceTimersByTime(600_000); });
    await flushAsync();
    expect(save).toHaveBeenCalledTimes(1 + AUTOSAVE_RETRY_DELAYS_MS.length); // gave up automatically

    save.mockResolvedValue(true);
    await act(async () => { await result.current.retry(); });
    expect(result.current.state).toBe("saved");
  });

  test("does not save while paused or disabled, and markSaved clears pending changes", async () => {
    const save = jest.fn().mockResolvedValue(true);
    const { result, rerender } = setup(save);
    rerender({ snapshot: "B", paused: true });
    act(() => { jest.advanceTimersByTime(10_000); });
    expect(save).not.toHaveBeenCalled();
    expect(result.current.hasUnsavedChanges()).toBe(true);
    act(() => { result.current.markSaved("B"); });
    expect(result.current.hasUnsavedChanges()).toBe(false);
    expect(result.current.state).toBe("saved");

    rerender({ snapshot: "C", enabled: false });
    act(() => { jest.advanceTimersByTime(10_000); });
    expect(save).not.toHaveBeenCalled();
  });
});
