"use server";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";
type Result<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };
const safeMessages: Record<string, string> = {
  DRAFT_RUN_NOT_REVIEWABLE:
    "Only completed drafts can be reviewed or regenerated.",
  INVALID_SECTION_KEY: "This draft section is no longer available.",
  INVALID_SECTION_DECISION:
    "Choose accept or reject, with an optional reason under 500 characters.",
  PROPOSAL_VERSION_CONFLICT:
    "The proposal changed — regenerate from the latest draft.",
};
const call = async <T>(
  path: string,
  init?: RequestInit,
): Promise<Result<T>> => {
  try {
    const r = await authenticatedBackendFetch(`${BACKEND_URL}${path}`, {
        ...init,
        cache: "no-store",
        headers: {
          "X-Correlation-ID": crypto.randomUUID(),
          ...(init?.headers ?? {}),
        },
      }),
      b = await r.json().catch(() => ({}));
    return r.ok
      ? { success: true, data: b.data as T }
      : {
          success: false,
          code: String(b.code || `HTTP_${r.status}`),
          message:
            safeMessages[String(b.code || "")] ??
            String(b.title || "Draft operation failed."),
        };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      message: "Draft service could not be reached.",
    };
  }
};
export type ProposalDraftSection = {
  id: string;
  key: string;
  heading: string;
  ordinal: number;
  paragraphs: Array<{ text: string; citations: string[] }>;
  decision: "accepted" | "rejected" | null;
  decisionReason: string | null;
};
export type ProposalDraftRegeneration = {
  id: string;
  section_scope: string | null;
  status: string;
  created_at: string;
};
export type ProposalDraft = {
  run: Record<string, unknown>;
  sections: ProposalDraftSection[];
  gaps: Array<{ code: string; paths: string[] }>;
  regenerations: ProposalDraftRegeneration[];
  proposalMutation: false;
};
const normalizeDraft = (raw: ProposalDraft): ProposalDraft => ({
  ...raw,
  sections: (raw.sections ?? []).map((s) => ({
    ...s,
    decision:
      s.decision === "accepted" || s.decision === "rejected"
        ? s.decision
        : null,
    decisionReason:
      typeof s.decisionReason === "string" && s.decisionReason
        ? s.decisionReason
        : null,
  })),
  regenerations: Array.isArray(raw.regenerations)
    ? raw.regenerations.filter(
        (r) => typeof r?.id === "string" && typeof r?.status === "string",
      )
    : [],
});
const readDraft = async (path: string): Promise<Result<ProposalDraft>> => {
  const r = await call<ProposalDraft>(path);
  return r.success ? { ...r, data: normalizeDraft(r.data) } : r;
};
export const createProposalDraftAction = async (
  proposalId: string,
  expectedProposalVersion: number,
  live = true,
) =>
  await call<{ runId: string; jobId: string; status: string }>(
    `/api/v1/proposals/${encodeURIComponent(proposalId)}/${live ? "live-draft-jobs" : "draft-jobs"}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        expectedProposalVersion,
        fixture: "synthetic-proposal-draft",
      }),
    },
  );
export const getProposalDraftAction = async (
  proposalId: string,
  runId: string,
) =>
  await readDraft(
    `/api/v1/proposals/${encodeURIComponent(proposalId)}/draft-runs/${runId}`,
  );
export const getLatestProposalDraftAction = async (proposalId: string) =>
  await readDraft(
    `/api/v1/proposals/${encodeURIComponent(proposalId)}/draft-runs/latest`,
  );
export const decideDraftSectionAction = async (
  proposalId: string,
  runId: string,
  sectionKey: string,
  input: { decision: "accepted" | "rejected"; reason?: string },
) =>
  await call<{
    section_key: string;
    decision: "accepted" | "rejected";
    reason: string | null;
    updated_at: string;
  }>(
    `/api/v1/proposals/${encodeURIComponent(proposalId)}/draft-runs/${encodeURIComponent(runId)}/sections/${encodeURIComponent(sectionKey)}/decision`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: input.decision,
        ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
      }),
    },
  );
export const regenerateDraftSectionAction = async (
  proposalId: string,
  runId: string,
  sectionKey: string,
  expectedProposalVersion: number,
  idempotencyKey: string,
) =>
  await call<{
    runId: string;
    jobId: string;
    status: string;
    sectionScope: string;
    parentRunId: string;
    created: boolean;
  }>(
    `/api/v1/proposals/${encodeURIComponent(proposalId)}/draft-runs/${encodeURIComponent(runId)}/sections/${encodeURIComponent(sectionKey)}/regenerate-jobs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ expectedProposalVersion }),
    },
  );
