export const durableJobStatuses = [
  "queued", "running", "retry_scheduled", "succeeded", "failed", "cancelled", "dead_letter",
] as const;

export type DurableJobStatus = (typeof durableJobStatuses)[number];

export type DurableJob = {
  id: string;
  type: string;
  status: DurableJobStatus;
  progress: number;
  progressStage: string | null;
  attemptCount: number;
  maxAttempts: number;
  cancellationRequested: boolean;
  errorCode: string | null;
  resultReference: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AsyncPresentation = {
  tone: "progress" | "success" | "warning" | "error";
  title: string;
  detail: string;
  terminal: boolean;
  retryable: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const parseDurableJob = (value: unknown): DurableJob | null => {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.type !== "string") return null;
  if (!durableJobStatuses.includes(value.status as DurableJobStatus)) return null;
  return {
    id: value.id,
    type: value.type,
    status: value.status as DurableJobStatus,
    progress: typeof value.progress === "number" ? Math.min(100, Math.max(0, value.progress)) : 0,
    progressStage: typeof value.progressStage === "string" ? value.progressStage : null,
    attemptCount: typeof value.attemptCount === "number" ? value.attemptCount : 0,
    maxAttempts: typeof value.maxAttempts === "number" ? value.maxAttempts : 0,
    cancellationRequested: value.cancellationRequested === true,
    errorCode: typeof value.errorCode === "string" ? value.errorCode : null,
    resultReference: typeof value.resultReference === "string" ? value.resultReference : null,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
  };
};

export const presentJob = (job: DurableJob, delayed = false): AsyncPresentation => {
  if (delayed && ["queued", "running", "retry_scheduled"].includes(job.status)) {
    return { tone: "warning", title: "This is taking longer than expected", detail: "You can leave this page and return later. The secure check will continue.", terminal: false, retryable: false };
  }
  switch (job.status) {
    case "queued": return { tone: "progress", title: "Your file is waiting to be checked", detail: "It is safely queued. You can leave this page while processing continues.", terminal: false, retryable: false };
    case "running": return { tone: "progress", title: "We’re checking your file", detail: "The private security check is in progress.", terminal: false, retryable: false };
    case "retry_scheduled": return { tone: "warning", title: "The check will retry automatically", detail: "A temporary service problem occurred. No action is needed yet.", terminal: false, retryable: false };
    case "succeeded": return { tone: "success", title: "Your file is ready", detail: "The private security check completed successfully.", terminal: true, retryable: false };
    case "cancelled": return { tone: "warning", title: "Processing was cancelled", detail: "Start a new upload if this file is still required.", terminal: true, retryable: true };
    case "dead_letter": return { tone: "error", title: "We couldn’t finish this check", detail: "Please contact an administrator and provide the correlation ID below.", terminal: true, retryable: false };
    case "failed": return { tone: "error", title: "This file could not be processed", detail: "Choose a supported replacement file or contact support.", terminal: true, retryable: true };
  }
};

export const nextPollDelay = (pollCount: number) => Math.min(10_000, 2_000 * 2 ** Math.min(Math.max(pollCount, 0), 3));
