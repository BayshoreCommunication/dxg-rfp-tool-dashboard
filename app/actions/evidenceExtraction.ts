"use server";

import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

type Result<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };

export type EvidencePreview = {
  ordinal: number;
  kind: string;
  content: string;
  locator: Record<string, string | number>;
  trustClass: "untrusted_vendor_content";
};

export type EvidenceExtractionRun = {
  runId: string;
  jobId: string | null;
  sourceKind: "document" | "cover_message";
  sourceLabel: string;
  mimeType: string;
  status: string;
  method: string | null;
  coverage: number;
  fragmentCount: number;
  tableCount: number;
  pageCount: number;
  warnings: Array<{ code: string; message: string; locator?: Record<string, string | number> }>;
  reused: boolean;
  preview: EvidencePreview[];
  createdAt: string;
  completedAt: string | null;
};

export type EvidenceExtractionSummary = {
  status: "not_started" | "processing" | "ready" | "partial" | "unreadable" | "failed";
  runs: EvidenceExtractionRun[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const safeNumber = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const parseLocator = (value: unknown): Record<string, string | number> => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string | number] =>
    typeof entry[1] === "string" || typeof entry[1] === "number"));
};

const parseRun = (value: unknown): EvidenceExtractionRun | null => {
  if (!isRecord(value) || typeof value.runId !== "string" || typeof value.sourceLabel !== "string") return null;
  return {
    runId: value.runId,
    jobId: typeof value.jobId === "string" ? value.jobId : null,
    sourceKind: value.sourceKind === "cover_message" ? "cover_message" : "document",
    sourceLabel: value.sourceLabel,
    mimeType: String(value.mimeType ?? ""),
    status: String(value.status ?? ""),
    method: typeof value.method === "string" ? value.method : null,
    coverage: safeNumber(value.coverage),
    fragmentCount: Math.max(0, Math.floor(safeNumber(value.fragmentCount))),
    tableCount: Math.max(0, Math.floor(safeNumber(value.tableCount))),
    pageCount: Math.max(0, Math.floor(safeNumber(value.pageCount))),
    warnings: (Array.isArray(value.warnings) ? value.warnings : []).flatMap((warning) =>
      isRecord(warning) && typeof warning.code === "string" && typeof warning.message === "string"
        ? [{ code: warning.code, message: warning.message, locator: parseLocator(warning.locator) }]
        : []),
    reused: value.reused === true,
    preview: (Array.isArray(value.preview) ? value.preview : []).flatMap((fragment) =>
      isRecord(fragment) && typeof fragment.content === "string"
        ? [{
            ordinal: Math.max(0, Math.floor(safeNumber(fragment.ordinal))),
            kind: String(fragment.kind ?? "paragraph"),
            content: fragment.content,
            locator: parseLocator(fragment.locator),
            trustClass: "untrusted_vendor_content" as const,
          }]
        : []),
    createdAt: String(value.createdAt ?? ""),
    completedAt: typeof value.completedAt === "string" ? value.completedAt : null,
  };
};

const path = (proposalId: string, submissionId: string, versionId: string) =>
  `/api/v1/proposals/${encodeURIComponent(proposalId)}/intelligence/submissions/${encodeURIComponent(submissionId)}/versions/${encodeURIComponent(versionId)}`;

const safeMessages: Record<string, string> = {
  SOURCE_NOT_REGISTERED: "This attachment has not completed secure source registration.",
  VENDOR_VERSION_NOT_FOUND: "This response version is no longer available.",
  AUTHORIZATION_DENIED: "You do not have permission to extract this response.",
  ORGANIZATION_NOT_READY: "Proposal intelligence storage is not ready yet.",
};

const call = async <T,>(url: string, init: RequestInit | undefined, parse: (value: unknown) => T | null): Promise<Result<T>> => {
  try {
    const response = await authenticatedBackendFetch(`${BACKEND_URL}${url}`, {
      ...init,
      cache: "no-store",
      headers: { "X-Correlation-ID": crypto.randomUUID(), ...(init?.headers ?? {}) },
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const code = String(body.code || `HTTP_${response.status}`);
      return { success: false, code, message: safeMessages[code] ?? String(body.title || "Evidence extraction could not be completed.") };
    }
    const parsed = parse(body.data);
    return parsed ? { success: true, data: parsed } : { success: false, code: "INVALID_RESPONSE", message: "The extraction service returned an unexpected response." };
  } catch {
    return { success: false, code: "NETWORK_ERROR", message: "The extraction service could not be reached." };
  }
};

export const getEvidenceExtractionsAction = async (proposalId: string, submissionId: string, versionId: string): Promise<Result<EvidenceExtractionSummary>> =>
  await call(`${path(proposalId, submissionId, versionId)}/extractions`, undefined, (value) => {
    if (!isRecord(value) || !Array.isArray(value.runs)) return null;
    const allowed = ["not_started", "processing", "ready", "partial", "unreadable", "failed"] as const;
    const status = allowed.includes(value.status as (typeof allowed)[number])
      ? value.status as EvidenceExtractionSummary["status"] : "failed";
    return { status, runs: value.runs.flatMap((run) => parseRun(run) ?? []) };
  });

export const createEvidenceExtractionAction = async (proposalId: string, submissionId: string, versionId: string, idempotencyKey: string): Promise<Result<{ runs: EvidenceExtractionRun[]; unavailable: Array<{ sourceLabel: string; code: string }> }>> =>
  await call(`${path(proposalId, submissionId, versionId)}/extraction-jobs`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
  }, (value) => {
    if (!isRecord(value) || !Array.isArray(value.runs)) return null;
    return {
      runs: value.runs.flatMap((run) => parseRun(run) ?? []),
      unavailable: (Array.isArray(value.unavailable) ? value.unavailable : []).flatMap((item) =>
        isRecord(item) && typeof item.sourceLabel === "string" && typeof item.code === "string"
          ? [{ sourceLabel: item.sourceLabel, code: item.code }] : []),
    };
  });
