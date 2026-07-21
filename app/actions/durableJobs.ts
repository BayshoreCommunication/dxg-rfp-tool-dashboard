"use server";

import { BACKEND_URL } from "@/lib/config";
import { getBackendAccessToken } from "@/lib/server/backendSession";
import { parseDurableJob, type DurableJob } from "@/lib/asyncOperations";

type ActionResult<T> = { success: true; data: T; correlationId: string } | { success: false; code: string; message: string; correlationId: string };

const safeMessages: Record<string, string> = {
  AUTHENTICATION_REQUIRED: "Your session has expired. Please sign in again.",
  AUTHORIZATION_DENIED: "You do not have permission to perform this action.",
  FEATURE_DISABLED: "Secure background processing is not available in this environment.",
  JOB_NOT_FOUND: "This operation is no longer available.",
  SOURCE_NOT_FOUND: "This document is no longer available.",
  UNSUPPORTED_MEDIA_TYPE: "Choose a PDF, DOCX, XLSX, CSV, or TXT file.",
  FILE_SIZE_INVALID: "Choose a file smaller than the approved upload limit.",
  STORAGE_UNAVAILABLE: "Private file storage is temporarily unavailable.",
};

const request = async <T>(path: string, init?: RequestInit, parse?: (value: unknown) => T | null): Promise<ActionResult<T>> => {
  const correlationId = crypto.randomUUID();
  const token = await getBackendAccessToken();
  if (!token) return { success: false, code: "AUTHENTICATION_REQUIRED", message: safeMessages.AUTHENTICATION_REQUIRED, correlationId };
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, "X-Correlation-ID": correlationId, ...(init?.headers ?? {}) },
    });
    const payload: unknown = await response.json().catch(() => null);
    const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const responseCorrelation = response.headers.get("x-correlation-id") || correlationId;
    if (!response.ok) {
      const code = typeof body.code === "string" ? body.code : `HTTP_${response.status}`;
      return { success: false, code, message: safeMessages[code] ?? "The operation could not be completed safely.", correlationId: responseCorrelation };
    }
    const value = parse ? parse(body.data) : body.data as T;
    if (value === null || value === undefined) return { success: false, code: "INVALID_RESPONSE", message: "The service returned an unexpected response.", correlationId: responseCorrelation };
    return { success: true, data: value, correlationId: responseCorrelation };
  } catch {
    return { success: false, code: "NETWORK_ERROR", message: "The service could not be reached. Try again shortly.", correlationId };
  }
};

export type UploadSession = { sourceId: string; uploadUrl: string; requiredHeaders: Record<string, string> };
export type PrivateDocumentSource = { id: string; status: string; confidentiality: "non_confidential" | "confidential" | "internal" | "restricted"; originalFilename: string; createdAt: string };

export const listPrivateDocumentSources = async (proposalId: string): Promise<ActionResult<PrivateDocumentSource[]>> =>
  request(`/api/v1/proposals/${encodeURIComponent(proposalId)}/sources?limit=100`, undefined, value => {
    if (!Array.isArray(value)) return null;
    return value.flatMap(item => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      return typeof row.id === "string" && typeof row.status === "string" && typeof row.confidentiality === "string" && typeof row.originalFilename === "string" && typeof row.createdAt === "string"
        ? [{ id: row.id, status: row.status, confidentiality: row.confidentiality as PrivateDocumentSource["confidentiality"], originalFilename: row.originalFilename, createdAt: row.createdAt }]
        : [];
    });
  });

export const createPrivateUploadSession = async (proposalId: string, file: { name: string; type: string; size: number }, idempotencyKey: string, classification: "confidential" | "non_confidential" = "confidential"): Promise<ActionResult<UploadSession>> =>
  request(`/api/v1/proposals/${encodeURIComponent(proposalId)}/sources/upload-session`, {
    method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ filename: file.name, mimeType: file.type, sizeBytes: file.size, classification }),
  }, value => {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>; const source = record.source as Record<string, unknown> | undefined;
    if (typeof source?.id !== "string" || typeof record.uploadUrl !== "string") return null;
    return { sourceId: source.id, uploadUrl: record.uploadUrl, requiredHeaders: record.requiredHeaders && typeof record.requiredHeaders === "object" ? record.requiredHeaders as Record<string, string> : {} };
  });

export const completePrivateUpload = async (sourceId: string) => request(`/api/v1/sources/${encodeURIComponent(sourceId)}/complete`, { method: "POST" });

export const createSourceScanJob = async (sourceId: string, idempotencyKey: string): Promise<ActionResult<DurableJob>> =>
  request(`/api/v1/sources/${encodeURIComponent(sourceId)}/scan-jobs`, { method: "POST", headers: { "Idempotency-Key": idempotencyKey } }, value => {
    if (!value || typeof value !== "object") return null;
    return parseDurableJob(value);
  });

export const getDurableJob = async (jobId: string): Promise<ActionResult<DurableJob>> => request(`/api/v1/jobs/${encodeURIComponent(jobId)}`, undefined, parseDurableJob);
