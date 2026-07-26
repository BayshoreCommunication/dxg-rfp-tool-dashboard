import { nextPollDelay, parseDurableJob, presentJob, type DurableJob } from "./asyncOperations";

const job = (status: DurableJob["status"]): DurableJob => ({
  id: "01981e6d-9ad0-7000-8000-000000000001", type: "source_security_scan", status,
  progress: 25, progressStage: "running", attemptCount: 1, maxAttempts: 5,
  cancellationRequested: false, errorCode: null, resultReference: null,
  createdAt: "2026-07-19T00:00:00.000Z", updatedAt: "2026-07-19T00:00:01.000Z",
});

describe("async operation contract", () => {
  test("rejects unknown job states at the frontend trust boundary", () => {
    expect(parseDurableJob({ ...job("queued"), status: "made_up" })).toBeNull();
  });

  test("bounds backend progress before presentation", () => {
    expect(parseDurableJob({ ...job("running"), progress: 500 })?.progress).toBe(100);
    expect(parseDurableJob({ ...job("running"), progress: -3 })?.progress).toBe(0);
  });

  test.each([
    ["queued", false, false], ["running", false, false], ["retry_scheduled", false, false],
    ["succeeded", true, false], ["failed", true, true], ["cancelled", true, true], ["dead_letter", true, false],
  ] as const)("maps %s to safe terminal and retry behavior", (status, terminal, retryable) => {
    expect(presentJob(job(status))).toMatchObject({ terminal, retryable });
  });

  test("uses bounded polling backoff", () => {
    expect([0, 1, 2, 3, 20].map(nextPollDelay)).toEqual([2000, 4000, 8000, 10000, 10000]);
  });

  test("delayed presentation does not falsely mark work complete", () => {
    expect(presentJob(job("running"), true)).toMatchObject({ tone: "warning", terminal: false });
  });
});
