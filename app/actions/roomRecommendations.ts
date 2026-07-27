"use server";
import { BACKEND_URL } from "@/lib/config";
import { authenticatedBackendFetch } from "@/lib/server/backendClient";

type Result<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };

const safeMessages: Record<string, string> = {
  ROOM_RECOMMENDATIONS_DISABLED: "Room recommendations are not enabled for this environment yet.",
  RECOMMENDATIONS_NOT_FOUND: "No room recommendations have been generated for this proposal yet.",
  PROPOSAL_NOT_FOUND: "This proposal could not be found.",
  RECOMMENDATION_RUN_NOT_FOUND: "This recommendation run could not be found.",
  REVIEW_REVISION_CONFLICT: "Someone saved this review more recently. Refresh and try again.",
  REVIEW_REQUIRED: "Save your review decisions before applying.",
  PROPOSAL_VERSION_CONFLICT: "The proposal changed since these recommendations were generated. Regenerate and review again.",
  ROOM_IDENTITY_CONFLICT: "A room was renamed, moved or removed since these recommendations were generated. Regenerate and review again.",
  RECOMMENDATION_NOT_APPLICABLE: "This suggestion is review-only and cannot be written to the proposal.",
  INVALID_APPLICATION_SELECTION: "Only accepted or edited suggestions can be applied.",
  CONFLICTING_APPLICATION_SELECTION: "Two selected suggestions target the same field. Keep one.",
  INVALID_RECOMMENDATION_VALUE: "The edited value is not valid for this field.",
};

export type RoomRecClassification = "confirmed_fact" | "deterministic_derivation" | "recommended_assumption" | "unknown";
export type RoomRecEvidence = { path: string; value: string };
export type RoomRecItem = {
  recommendationKey: string;
  path: string;
  value: string;
  classification: RoomRecClassification;
  confidence: number;
  explanation: string;
  evidence: RoomRecEvidence[];
  ruleIds: string[];
  knowledgeIds: string[];
  assumptions: string[];
  requiresHumanReview: boolean;
  applyEligible: boolean;
};
export type RoomRecQuestion = { questionKey: string; ruleId: string; prompt: string; paths: string[] };
export type RoomRecWarning = { code: string; ruleId: string; severity: "warning" | "blocking"; message: string; paths: string[] };
export type RoomRecRoom = {
  roomKey: string;
  roomIndex: number;
  roomLabel: string;
  recommendations: RoomRecItem[];
  clarificationQuestions: RoomRecQuestion[];
  warnings: RoomRecWarning[];
};
export type RoomRecRun = {
  id: string;
  proposalVersion: number;
  schemaVersion: string;
  engineVersion: string;
  payload: {
    schemaVersion: string;
    proposalId: string;
    proposalVersion: number;
    rooms: RoomRecRoom[];
    globalClarificationQuestions: RoomRecQuestion[];
    globalWarnings: RoomRecWarning[];
    knowledgeIds: string[];
  };
  roomCount: number;
  recommendationCount: number;
  questionCount: number;
  warningCount: number;
  blockingCount: number;
  createdAt: string;
  created?: boolean;
};
export type RoomRecDecision = {
  recommendationKey: string;
  decision: "pending" | "accepted" | "edited" | "rejected";
  value?: string;
  reasonCode?: string | null;
  note?: string | null;
};
export type RoomRecReview = {
  reviewId: string | null;
  revision: number;
  decisions: Array<{ recommendation_key: string; decision: string; decided_value: string | null; reason_code: string | null; note: string | null }>;
};
export type RoomRecApplication = {
  id: string;
  status: "applied" | "conflict";
  automatic?: boolean;
  expectedProposalVersion: number;
  resultingProposalVersion: number | null;
  selectedCount: number;
  appliedPaths: string[];
  skippedPaths?: string[];
  safeErrorCode: string | null;
  createdAt: string;
  created?: boolean;
};

const call = async <T>(path: string, init?: RequestInit): Promise<Result<T>> => {
  try {
    const r = await authenticatedBackendFetch(`${BACKEND_URL}/api/v1${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "X-Correlation-ID": crypto.randomUUID(),
        ...(init?.headers ?? {}),
      },
    });
    const b = await r.json().catch(() => ({}));
    return r.ok
      ? { success: true, data: b.data as T }
      : {
          success: false,
          code: String(b.code || `HTTP_${r.status}`),
          message: safeMessages[String(b.code || "")] ?? String(b.title || "The room recommendation request could not be completed."),
        };
  } catch {
    return { success: false, code: "NETWORK_ERROR", message: "The room recommendation service could not be reached." };
  }
};

export const generateRoomRecommendationsAction = async (proposalId: string) =>
  await call<RoomRecRun>(`/proposals/${encodeURIComponent(proposalId)}/room-recommendations`, { method: "POST" });

export const getLatestRoomRecommendationsAction = async (proposalId: string) =>
  await call<RoomRecRun>(`/proposals/${encodeURIComponent(proposalId)}/room-recommendations/latest`);

export const getRoomRecommendationReviewAction = async (proposalId: string, runId: string) =>
  await call<RoomRecReview>(`/proposals/${encodeURIComponent(proposalId)}/room-recommendations/${encodeURIComponent(runId)}/review`);

export const saveRoomRecommendationReviewAction = async (
  proposalId: string,
  runId: string,
  revision: number,
  decisions: RoomRecDecision[],
) =>
  await call<{ reviewId: string; revision: number; savedCount: number }>(
    `/proposals/${encodeURIComponent(proposalId)}/room-recommendations/${encodeURIComponent(runId)}/review`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision, decisions }),
    },
  );

export const applyRoomRecommendationsAction = async (
  proposalId: string,
  runId: string,
  expectedProposalVersion: number,
  recommendationKeys: string[],
) =>
  await call<RoomRecApplication>(
    `/proposals/${encodeURIComponent(proposalId)}/room-recommendations/${encodeURIComponent(runId)}/applications`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ expectedProposalVersion, recommendationKeys }),
    },
  );

/** Fills every allowlisted recommendation into still-empty room fields; the planner adjusts values in the form afterwards. */
export const autoApplyRoomRecommendationsAction = async (proposalId: string, runId: string) =>
  await call<RoomRecApplication>(
    `/proposals/${encodeURIComponent(proposalId)}/room-recommendations/${encodeURIComponent(runId)}/applications`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ automatic: true }),
    },
  );
