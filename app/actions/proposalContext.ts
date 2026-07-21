"use server";

import { BACKEND_URL } from "@/lib/config";
import { getBackendAccessToken } from "@/lib/server/backendSession";

export type ContextOperation = {
  ordinal: number;
  operation: "add" | "replace";
  path: string;
  value: unknown;
  confidence: number;
  evidence_ids: string[];
};
export type ContextIssue = {
  ordinal: number;
  code: string;
  severity: "info" | "question" | "blocking";
  paths: string[];
};
export type ProposalContextRun = {
  run: Record<string, unknown>;
  operations: ContextOperation[];
  evidence: Array<Record<string, unknown>>;
  issues: ContextIssue[];
  proposalMutation: false;
};
type Result<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };

const call = async <T>(
  path: string,
  init?: RequestInit,
): Promise<Result<T>> => {
  const token = await getBackendAccessToken();
  if (!token)
    return {
      success: false,
      code: "AUTHENTICATION_REQUIRED",
      message: "Your session has expired.",
    };
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
        ...init,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Correlation-ID": crypto.randomUUID(),
          ...(init?.headers ?? {}),
        },
      }),
      body = await response.json().catch(() => ({}));
    if (!response.ok)
      return {
        success: false,
        code: String(body.code || `HTTP_${response.status}`),
        message: String(
          body.title || "The extraction could not be completed safely.",
        ),
      };
    return { success: true, data: body.data as T };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      message: "The extraction service could not be reached.",
    };
  }
};

export const createProposalContextAction = async (
  proposalId: string,
  fixture:
    | "synthetic-conference-simple"
    | "synthetic-conference-medium"
    | "prompt-injection",
  live = true,
) =>
  await call<{
    jobId: string;
    runId: string;
    status: string;
    statusUrl: string;
    resultUrl: string;
  }>(`/api/v1/proposals/${encodeURIComponent(proposalId)}/${live ? "live-context-jobs" : "context-jobs"}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ fixture }),
  });
export const getProposalContextAction = async (
  proposalId: string,
  runId: string,
) =>
  await call<ProposalContextRun>(
    `/api/v1/proposals/${encodeURIComponent(proposalId)}/context-runs/${encodeURIComponent(runId)}`,
  );
export const getLatestProposalContextAction = async (proposalId: string) =>
  await call<ProposalContextRun>(
    `/api/v1/proposals/${encodeURIComponent(proposalId)}/context-runs/latest`,
  );
